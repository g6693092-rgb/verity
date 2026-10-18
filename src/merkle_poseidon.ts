import fs from "node:fs"
import path from "node:path"
import keccak256 from "keccak256"
import { MerkleTree } from "merkletreejs"
import buildPoseidon from "circomlibjs"

const toBytes32 = (value: bigint) => Buffer.from(value.toString(16).padStart(64, "0"), "hex")

async function main() {
  const poseidon = await buildPoseidon()
  const sampleDir = path.resolve("sample")
  const leaves = fs.readdirSync(sampleDir).filter((file) => file.endsWith(".json")).map((file) => {
    const claim = fs.readFileSync(path.join(sampleDir, file))
    const input = BigInt(`0x${keccak256(claim).toString("hex")}`)
    return toBytes32(BigInt(poseidon.F.toString(poseidon([input]))))
  })
  const tree = new MerkleTree(leaves, (value: Buffer) => Buffer.from(value), { sortPairs: true })
  console.log("Merkle root (Poseidon leaves):", `0x${tree.getRoot().toString("hex")}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
