import "dotenv/config"
import express from "express"
import fs from "node:fs"
import path from "node:path"
import { execFile } from "node:child_process"
import { randomUUID } from "node:crypto"
import { promisify } from "node:util"
import keccak256 from "keccak256"
import { MerkleTree } from "merkletreejs"
import * as circomlibjs from "circomlibjs"
import { ethers } from "ethers"
import snarkjs from "snarkjs"

export const app = express()
app.use(express.json({ limit: "1mb" }))
const dataDir = path.resolve(process.env.DATA_DIR ?? "data")
const sampleDir = path.resolve("sample")
const proofDir = path.resolve("proofs")
const run = promisify(execFile)
for (const dir of [dataDir, sampleDir, proofDir]) fs.mkdirSync(dir, { recursive: true })

function json<T = any>(file: string, value?: unknown): T | null {
  if (value !== undefined) fs.writeFileSync(file, JSON.stringify(value, null, 2))
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null
}
const bytes32 = (value: bigint) => Buffer.from(value.toString(16).padStart(64, "0"), "hex")
const commitment = (claim: unknown) => `0x${keccak256(Buffer.from(JSON.stringify(claim))).toString("hex")}`
let poseidonPromise: Promise<any> | undefined
async function getPoseidon() {
  const factory = (circomlibjs as any).buildPoseidon ?? (circomlibjs as any).default
  if (typeof factory !== "function") throw new Error("circomlibjs Poseidon factory is unavailable")
  poseidonPromise ??= factory()
  return poseidonPromise
}
async function poseidonLeaf(claim: unknown) {
  const poseidon = await getPoseidon()
  const input = BigInt(`0x${keccak256(Buffer.from(JSON.stringify(claim))).toString("hex")}`)
  return BigInt(poseidon.F.toString(poseidon([input])))
}
async function rootForClaims(items: Array<{ claim: unknown }>) { const leaves = await Promise.all(items.map(async ({ claim }) => bytes32(await poseidonLeaf(claim)))); return `0x${new MerkleTree(leaves, (value: Buffer) => Buffer.from(value), { sortPairs: true }).getRoot().toString("hex")}` }
function normalizeRoot(value: string) { if (!value) return null; try { return ethers.zeroPadValue(value.startsWith("0x") ? value : `0x${value}`, 32) } catch { return null } }

app.get("/health", (_req, res) => res.json({ ok: true, network: "vechain-testnet", timestamp: new Date().toISOString() }))
app.post("/claims", async (req, res) => { try { const claim = req.body; if (!claim || typeof claim !== "object" || Array.isArray(claim)) return res.status(400).json({ error: "Claim must be a JSON object" }); const id = String(claim.claimId ?? `claim-${randomUUID()}`).replace(/[^a-zA-Z0-9_-]/g, "-"); const saved = { ...claim, claimId: id }; json(path.join(dataDir, `${id}.json`), saved); const leaf = await poseidonLeaf(saved); const index = json<any[]>(path.join(dataDir, "index.json")) ?? []; const entry = { id, poseidonLeaf: leaf.toString(10), commitment: commitment(saved) }; json(path.join(dataDir, "index.json"), [...index.filter(item => item.id !== id), entry]); res.status(201).json(entry) } catch (error) { res.status(500).json({ error: String(error) }) } })
app.get("/claims/:id", (req, res) => { const claim = json(path.join(dataDir, `${req.params.id}.json`)); claim ? res.json(claim) : res.status(404).json({ error: "Claim not found" }) })
app.post("/batch", async (_req, res) => { try { const index = json<any[]>(path.join(dataDir, "index.json")) ?? []; const claims = index.map(item => ({ claim: json(path.join(dataDir, `${item.id}.json`)) })).filter(item => item.claim); if (!claims.length) return res.status(400).json({ error: "No claims to batch" }); const batch = { id: `batch-${randomUUID()}`, root: await rootForClaims(claims), timestamp: new Date().toISOString(), count: claims.length }; const batches = json<any[]>(path.join(dataDir, "batches.json")) ?? []; json(path.join(dataDir, "batches.json"), [...batches, batch]); res.status(201).json({ batch }) } catch (error) { res.status(500).json({ error: String(error) }) } })
app.post("/batch/inclusion", async (req, res) => { try { const batchId = String(req.body?.batchId ?? ""); const claimId = String(req.body?.claimId ?? ""); const batches = json<any[]>(path.join(dataDir, "batches.json")) ?? []; const batch = batches.find(item => item.id === batchId); if (!batch) return res.status(404).json({ error: "Batch not found" }); if (!claimId) return res.status(400).json({ error: "claimId required" }); const claim = json(path.join(dataDir, `${claimId}.json`)); if (!claim) return res.status(404).json({ error: "Claim not found" }); const index = json<any[]>(path.join(dataDir, "index.json")) ?? []; const claims = index.map(item => ({ id: item.id, claim: json(path.join(dataDir, `${item.id}.json`)) })).filter(item => item.claim); const leaves = await Promise.all(claims.map(async ({ claim: item }) => bytes32(await poseidonLeaf(item)))); const tree = new MerkleTree(leaves, (value: Buffer) => Buffer.from(value), { sortPairs: true }); const position = claims.findIndex(item => item.id === claimId); if (position < 0) return res.status(404).json({ error: "Claim is not indexed" }); res.json({ batchId, claimId, root: batch.root, leaf: `0x${leaves[position].toString("hex")}`, position, proof: tree.getProof(leaves[position]).map(node => `0x${node.data.toString("hex")}`) }) } catch (error) { res.status(500).json({ error: String(error) }) } })
app.post("/prove", async (req, res) => {
  try {
    const claimId = String(req.body?.claimId ?? "")
    if (!claimId) return res.status(400).json({ error: "claimId required" })
    const claim = json<any>(path.join(dataDir, `${claimId}.json`))
    if (!claim) return res.status(404).json({ error: "Claim not found" })

    const samples = (Array.isArray(claim.temperatureSamples) ? claim.temperatureSamples : [])
      .slice(0, 16).map((value: unknown) => Math.round(Number(value)))
    const sampleCount = samples.length
    while (samples.length < 16) samples.push(0)
    const threshold = Math.round(Number(claim.transportCheck?.maxTemp ?? 40))
    json(path.join(sampleDir, "input-cold-chain.json"), { samples, threshold, sampleCount })

    const script = path.resolve("scripts/run-cold-chain-proof.sh")
    if (!fs.existsSync(script)) return res.status(500).json({ error: "Proof script not found" })
    await run("bash", [script], { cwd: process.cwd(), env: process.env })

    const proof = json(path.join(proofDir, "proof.json"))
    const publicSignals = json(path.join(proofDir, "public.json"))
    const vk = json(path.join(proofDir, "verification_key.json"))
    if (!proof || !publicSignals || !vk) return res.status(500).json({ error: "Proof artifacts missing after run" })
    const valid = await (snarkjs as any).plonk.verify(vk, publicSignals, proof)
    res.status(201).json({ claimId, valid, publicSignals, proof })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post("/verify", async (req, res) => { try { const { proof, publicSignals, vk, root, rpc, contract } = req.body ?? {}; let valid: boolean | null = null; if (proof && publicSignals && vk) valid = await (snarkjs as any).plonk.verify(vk, publicSignals, proof); const normalized = root ? normalizeRoot(root) : null; let anchored: boolean | null = null; if (normalized && (rpc ?? process.env.VECHAIN_TESTNET_RPC) && (contract ?? process.env.ROOT_REGISTRY)) { const provider = new ethers.JsonRpcProvider(rpc ?? process.env.VECHAIN_TESTNET_RPC); anchored = await new ethers.Contract(contract ?? process.env.ROOT_REGISTRY, ["function isAnchored(bytes32) view returns (bool)"], provider).isAnchored(normalized) } res.json({ valid, anchored, normalized }) } catch (error) { res.status(500).json({ error: String(error) }) } })
app.post("/anchor", async (req, res) => { try { const root = normalizeRoot(String(req.body?.root ?? "")); if (!root) return res.status(400).json({ error: "A valid bytes32 root is required" }); const rpc = process.env.VECHAIN_TESTNET_RPC; const key = process.env.DEPLOYER_PRIVATE_KEY; const address = process.env.ROOT_REGISTRY; if (!rpc || !key || !address) return res.status(503).json({ error: "Anchoring is not configured" }); const wallet = new ethers.Wallet(key, new ethers.JsonRpcProvider(rpc)); const tx = await new ethers.Contract(address, ["function anchorRoot(bytes32,string)"], wallet).anchorRoot(root, String(req.body?.schemaId ?? "cold-chain-v1")); const receipt = await tx.wait(); res.status(201).json({ anchored: true, txHash: tx.hash, root, blockNumber: receipt?.blockNumber }) } catch (error) { res.status(500).json({ error: String(error) }) } })

export default app
