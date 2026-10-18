import hardhat from "hardhat"
import { mkdir, writeFile } from "node:fs/promises"

const { ethers } = hardhat as typeof hardhat & { ethers: any }

async function main() {
  const [deployer] = await ethers.getSigners()
  if (!deployer) throw new Error("No deployer signer configured")

  const network = await ethers.provider.getNetwork()
  const expectedChainId = process.env.EXPECTED_CHAIN_ID
  if (expectedChainId && network.chainId.toString() !== expectedChainId) {
    throw new Error(`Wrong network: expected chain ${expectedChainId}, got ${network.chainId}`)
  }

  const balance = await deployer.getBalance()
  if (balance.isZero()) throw new Error(`Deployer ${deployer.address} has zero balance`)
  console.log(`Deploying RootRegistry from ${deployer.address}`)
  console.log(`Network chain ID: ${network.chainId.toString()}`)
  console.log(`Balance: ${balance.toString()}`)

  const factory = await ethers.getContractFactory("RootRegistry")
  const registry = await factory.deploy()
  await registry.deployed()

  const deployment = {
    address: registry.address,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).chainId.toString(),
    transactionHash: registry.deployTransaction.hash,
    deployedAt: new Date().toISOString(),
  }

  await mkdir("deploy", { recursive: true })
  await writeFile("deploy/rootregistry.json", `${JSON.stringify(deployment, null, 2)}\n`)
  console.log(`RootRegistry deployed at ${registry.address}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
