import fs from "node:fs"
import dotenv from "dotenv"
import { ethers } from "ethers"

dotenv.config()

async function main() {
  const signedPath = process.argv[2] ?? "signed_tx.txt"
  if (!fs.existsSync(signedPath)) throw new Error(`Signed tx file not found: ${signedPath}`)
  const signed = fs.readFileSync(signedPath, "utf8").trim()
  const rpc = process.env.VECHAIN_TESTNET_RPC ?? process.env.VECHAIN_MAINNET_RPC
  if (!rpc) throw new Error("Set VECHAIN_TESTNET_RPC or VECHAIN_MAINNET_RPC")
  const provider = new ethers.providers.JsonRpcProvider(rpc)
  const tx = await provider.sendTransaction(signed)
  console.log("Tx sent:", tx.hash)
  const receipt = await tx.wait()
  console.log("Tx mined:", receipt.transactionHash)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
