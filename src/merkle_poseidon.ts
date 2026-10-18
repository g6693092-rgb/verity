import fs from "node:fs"
import path from "node:path"
import keccak256 from "keccak256"
import { MerkleTree } from "merkletreejs"
import buildPoseidon from "circomlibjs"

async function main() {
  const sampleDir = path.resolve(process.cwd(), "sample")
  const files = fs.readdirSync(sampleDir).filter((file) => file.endsWith(".json"))
  const poseidon = await buildPoseidon()
  const field = poseidon.F
  const leaves = files.map((file) => {
    const content = fs.readFileSync(path.join(sampleDir, file))
    const input = BigInt(`0x${keccak256(content).toString("hex")}`)
    const output = poseidon([input])
    return Buffer.from(BigInt(field.toString(output)).toString(16).padStart(64, "0"), "hex")
  })
  const tree = new MerkleTree(leaves, (value) => Buffer.from(value), { sortPairs: true })
  console.log("Merkle root (Poseidon leaves):", `0x${tree.getRoot().toString("hex")}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
