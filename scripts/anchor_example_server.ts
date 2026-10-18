import { Contract, JsonRpcProvider, Wallet } from 'ethers'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

async function main() {
  const [registryAddress, root] = process.argv.slice(2)
  const rpc = process.env.VECHAIN_TESTNET_RPC ?? process.env.VECHAIN_MAINNET_RPC
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY
  if (!registryAddress || !/^0x[\da-fA-F]{40}$/.test(registryAddress)) throw new Error('Usage: ts-node scripts/anchor_example_server.ts <registryAddress> <root>')
  if (!/^0x[\da-fA-F]{64}$/.test(root ?? '')) throw new Error('root must be a 32-byte 0x-prefixed hex value')
  if (!rpc || !privateKey) throw new Error('VECHAIN_*_RPC and DEPLOYER_PRIVATE_KEY are required')
  const provider = new JsonRpcProvider(rpc)
  const wallet = new Wallet(privateKey, provider)
  const contract = new Contract(registryAddress, ['function anchorRoot(bytes32 root,string schemaId) external'], wallet)
  const schemaId = process.env.SCHEMA_ID ?? 'verity/v1'
  const tx = await contract.anchorRoot(root, schemaId)
  const receipt = await tx.wait()
  const result = { registryAddress, root, schemaId, txHash: tx.hash, blockNumber: receipt?.blockNumber, createdAt: new Date().toISOString() }
  await mkdir('deploy', { recursive: true })
  await writeFile(path.join('deploy', `anchor-example-${Date.now()}.json`), `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
