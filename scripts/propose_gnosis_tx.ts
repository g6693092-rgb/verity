#!/usr/bin/env ts-node
import axios from "axios"
import fs from "node:fs"
import path from "node:path"

function args(): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 2; i < process.argv.length; i += 1) {
    const key = process.argv[i]
    if (!key?.startsWith("--")) continue
    result[key.slice(2)] = process.argv[i + 1]?.startsWith("--") ? "" : process.argv[++i] ?? ""
  }
  return result
}

function address(value: string, name: string): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error(`${name} must be a valid address`)
  return value
}

async function main() {
  const options = args()
  const safe = options.safe ?? process.env.SAFE_ADDRESS
  const to = options.to
  if (!safe) throw new Error("--safe or SAFE_ADDRESS is required")
  if (!to) throw new Error("--to is required")
  address(safe, "safe"); address(to, "to")
  const service = (options.txServiceUrl ?? process.env.TX_SERVICE_URL)?.replace(/\/$/, "")
  if (!service) throw new Error("--txServiceUrl or TX_SERVICE_URL is required")
  const operation = Number(options.operation ?? "0")
  if (![0, 1].includes(operation)) throw new Error("operation must be 0 (CALL) or 1 (DELEGATE_CALL)")
  const data = options.data || null
  if (data && !/^0x[0-9a-fA-F]*$/.test(data)) throw new Error("--data must be hex calldata")

  const contractTransactionHash = options.contractTransactionHash ?? process.env.SAFE_TX_HASH
  const sender = options.sender ?? process.env.SAFE_SENDER
  const signature = options.signature ?? process.env.SAFE_SIGNATURE
  const allowUnsigned = options.allowUnsigned === "true" || options.allowUnsigned === "1"
  if (!allowUnsigned && (!contractTransactionHash || !sender || !signature)) {
    throw new Error("Signed proposals require --contractTransactionHash, --sender, and --signature; use --allowUnsigned only for staging")
  }
  if (contractTransactionHash && !/^0x[0-9a-fA-F]{64}$/.test(contractTransactionHash)) throw new Error("contractTransactionHash must be a 32-byte hex hash")
  if (sender) address(sender, "sender")
  if (signature && !/^0x[0-9a-fA-F]+$/.test(signature)) throw new Error("signature must be hex")

  const payload = {
    to, value: options.value ?? "0", data, operation, safeTxGas: options.safeTxGas ?? "0",
    baseGas: options.baseGas ?? "0", gasPrice: options.gasPrice ?? "0",
    gasToken: options.gasToken ?? "0x0000000000000000000000000000000000000000",
    refundReceiver: options.refundReceiver ?? "0x0000000000000000000000000000000000000000",
    contractTransactionHash: contractTransactionHash ?? null,
    sender: sender ?? null, signature: signature ?? null,
    origin: options.origin ?? "verity-multisig-proposal",
  }
  const url = `${service}/api/v1/safes/${safe}/multisig-transactions/`
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const apiKey = options.apiKey ?? process.env.TX_SERVICE_API_KEY
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  const response = await axios.post(url, payload, { headers })
  fs.mkdirSync(path.resolve("deploy"), { recursive: true })
  const outputPath = path.resolve("deploy", `gnosis_proposal_${Date.now()}.json`)
  fs.writeFileSync(outputPath, `${JSON.stringify({ request: payload, response: response.data }, null, 2)}\n`, { mode: 0o600 })
  console.log(JSON.stringify({ response: response.data, outputPath }, null, 2))
}

main().catch((error) => {
  console.error(error.response?.data ?? (error instanceof Error ? error.message : error))
  process.exitCode = 1
})
