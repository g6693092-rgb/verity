import "dotenv/config"
import express, { type Request, type Response } from "express"
import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import keccak256 from "keccak256"
import { MerkleTree } from "merkletreejs"
import buildPoseidon from "circomlibjs"
import { ethers } from "ethers"

const app = express()
app.use(express.json())
const port = Number(process.env.PORT ?? 3000)
const dataDir = path.resolve("data")
const proofDir = path.resolve("proofs")
for (const dir of [dataDir, proofDir]) fs.mkdirSync(dir, { recursive: true })
const json = (file: string, value?: unknown) => {
  if (value !== undefined) fs.writeFileSync(file, JSON.stringify(value, null, 2))
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null
}
const bytes32 = (value: bigint) => Buffer.from(value.toString(16).padStart(64, "0"), "hex")
async function poseidonLeaf(claim: unknown) {
  const poseidon = await buildPoseidon()
  const input = BigInt(`0x${keccak256(Buffer.from(JSON.stringify(claim))).toString("hex")}`)
  return BigInt(poseidon.F.toString(poseidon([input])))
}
async function rootForClaims(items: Array<{ claim: unknown }>) {
  const leaves = await Promise.all(items.map(async ({ claim }) => bytes32(await poseidonLeaf(claim))))
  return `0x${new MerkleTree(leaves, (value: Buffer) => Buffer.from(value), { sortPairs: true }).getRoot().toString("hex")}`
}

app.post("/claims", async (req, res) => {
  try {
    const claim = req.body
    if (!claim || typeof claim !== "object") return res.status(400).json({ error: "Empty body" })
    const id = String(claim.claimId ?? `claim-${randomUUID()}`)
    const saved = { ...claim, claimId: id }
    json(path.join(dataDir, `${id}.json`), saved)
    const leaf = await poseidonLeaf(saved)
    const index = json(path.join(dataDir, "index.json")) ?? []
    index.push({ id, poseidonLeaf: leaf.toString(10), commitment: `0x${keccak256(Buffer.from(JSON.stringify(saved))).toString("hex")}` })
    json(path.join(dataDir, "index.json"), index)
    res.json({ id, poseidonLeaf: leaf.toString(10), commitment: index.at(-1).commitment })
  } catch (error) { res.status(500).json({ error: String(error) }) }
})

app.get("/claims/:id", (req, res) => {
  const claim = json(path.join(dataDir, `${req.params.id}.json`))
  claim ? res.json(claim) : res.status(404).json({ error: "Not found" })
})

app.post("/batch", async (_req, res) => {
  try {
    const index = json(path.join(dataDir, "index.json")) ?? []
    const claims = index.map((item: { id: string }) => ({ claim: json(path.join(dataDir, `${item.id}.json`)) })).filter((item: { claim: unknown }) => item.claim)
    if (!claims.length) return res.status(400).json({ error: "No claims to batch" })
    const batch = { id: `batch-${randomUUID()}`, root: await rootForClaims(claims), timestamp: new Date().toISOString(), count: claims.length }
    const batches = json(path.join(dataDir, "batches.json")) ?? []
    json(path.join(dataDir, "batches.json"), [...batches, batch])
    res.json({ batch })
  } catch (error) { res.status(500).json({ error: String(error) }) }
})

app.post("/verify", async (req, res) => {
  try {
    const { root, rpc, contract } = req.body
    let anchored: boolean | null = null
    if (root && (rpc ?? process.env.VECHAIN_TESTNET_RPC) && (contract ?? process.env.ROOT_REGISTRY)) {
      const provider = new ethers.JsonRpcProvider(rpc ?? process.env.VECHAIN_TESTNET_RPC)
      anchored = await new ethers.Contract(contract ?? process.env.ROOT_REGISTRY, ["function isAnchored(bytes32) view returns (bool)"], provider).isAnchored(root)
    }
    res.json({ valid: true, anchored, normalized: root ?? null })
  } catch (error) { res.status(500).json({ error: String(error) }) }
})

app.listen(port, () => console.log(`Verity PoC backend listening on http://localhost:${port}`))
