import hardhat from "hardhat"

const { ethers } = hardhat as typeof hardhat & { ethers: any }

async function main() {
  const root = process.env.ROOT?.trim()
  const schemaId = process.env.SCHEMA_ID?.trim() ?? "verity/v1"
  const registryAddress = process.env.ROOT_REGISTRY?.trim()

  if (!root || !/^0x[0-9a-fA-F]{64}$/.test(root)) {
    throw new Error("ROOT must be a 32-byte hex value (0x + 64 hex characters)")
  }
  if (!registryAddress || !ethers.utils.isAddress(registryAddress)) {
    throw new Error("ROOT_REGISTRY must be a deployed contract address")
  }

  const [attester] = await ethers.getSigners()
  if (!attester) throw new Error("No deployer signer configured")

  const registry = await ethers.getContractAt("RootRegistry", registryAddress, attester)
  const alreadyAnchored = await registry.isAnchored(root)
  if (alreadyAnchored) {
    console.log(`Root already anchored: ${root}`)
    return
  }

  const transaction = await registry.anchorRoot(root, schemaId)
  const receipt = await transaction.wait()
  console.log(JSON.stringify({ root, schemaId, registryAddress, transactionHash: transaction.hash, blockNumber: receipt.blockNumber }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
