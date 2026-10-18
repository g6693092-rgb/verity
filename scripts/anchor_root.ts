import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import hardhat from "hardhat"

const { ethers } = hardhat as typeof hardhat & { ethers: any }

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function requireRoot(value: string | undefined) {
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("ROOT must be 0x followed by 64 hexadecimal characters")
  }
  return value
}

async function main() {
  const root = requireRoot(arg("root") ?? process.env.ROOT)
  const schemaId = arg("schema") ?? process.env.SCHEMA_ID ?? "verity/v1"
  const registryAddress = arg("contract") ?? process.env.ROOT_REGISTRY
  const multisig = arg("multisig") ?? process.env.MULTISIG_ADDRESS
  if (!registryAddress || !ethers.utils.isAddress(registryAddress)) {
    throw new Error("ROOT_REGISTRY must be a deployed contract address")
  }
  if (!schemaId.trim()) throw new Error("SCHEMA_ID cannot be empty")

  const [attester] = await ethers.getSigners()
  if (!attester) throw new Error("No signer configured")
  const provider = ethers.provider
  const network = await provider.getNetwork()
  const expectedChainId = process.env.EXPECTED_CHAIN_ID
  if (expectedChainId && network.chainId.toString() !== expectedChainId) {
    throw new Error(`Wrong network: expected ${expectedChainId}, got ${network.chainId}`)
  }

  const registry = new ethers.Contract(registryAddress, [
    "function anchorRoot(bytes32 root,string schemaId) external",
    "function isAnchored(bytes32 root) view returns (bool)",
  ], attester)
  if (await registry.isAnchored(root)) {
    console.log(JSON.stringify({ status: "already-anchored", root, registryAddress, chainId: network.chainId.toString() }, null, 2))
    return
  }

  const calldata = registry.interface.encodeFunctionData("anchorRoot", [root, schemaId])
  if (multisig) {
    if (!ethers.utils.isAddress(multisig)) throw new Error("MULTISIG_ADDRESS must be a valid address")
    const proposal = { network: network.name, chainId: network.chainId.toString(), multisig, to: registryAddress, value: "0", data: calldata, root, schemaId, createdAt: new Date().toISOString() }
    await mkdir("deploy", { recursive: true })
    const file = path.join("deploy", `anchor-proposal-${Date.now()}.json`)
    await writeFile(file, `${JSON.stringify(proposal, null, 2)}\n`)
    console.log(JSON.stringify({ status: "proposal-created", file, ...proposal }, null, 2))
    return
  }

  const tx = await registry.anchorRoot(root, schemaId)
  const receipt = await tx.wait()
  const result = { status: "anchored", root, schemaId, registryAddress, chainId: network.chainId.toString(), transactionHash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString() }
  await mkdir("deploy", { recursive: true })
  await writeFile(path.join("deploy", `anchor-${Date.now()}.json`), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error("anchor_root failed:", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
