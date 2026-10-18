#!/usr/bin/env ts-node
import fs from "node:fs"
import path from "node:path"
import { Interface } from "ethers"

function args(): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 2; i < process.argv.length; i += 1) {
    const key = process.argv[i]
    if (!key?.startsWith("--")) continue
    result[key.slice(2)] = process.argv[i + 1]?.startsWith("--") ? "" : process.argv[++i] ?? ""
  }
  return result
}

function main() {
  const options = args()
  const contract = options.contract
  const abiPath = options.abi
  const method = options.method
  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(contract)) throw new Error("--contract must be a valid address")
  if (!abiPath) throw new Error("--abi is required")
  if (!method) throw new Error("--method is required")

  const resolvedAbi = path.resolve(abiPath)
  if (!fs.existsSync(resolvedAbi)) throw new Error(`ABI file not found: ${resolvedAbi}`)
  const artifact = JSON.parse(fs.readFileSync(resolvedAbi, "utf8"))
  const abi = artifact.abi ?? artifact
  if (!Array.isArray(abi)) throw new Error("ABI must be an array or a Hardhat artifact")

  let parsedArgs: unknown[] = []
  try {
    parsedArgs = JSON.parse(options.args ?? "[]")
    if (!Array.isArray(parsedArgs)) throw new Error("must be an array")
  } catch (error) {
    throw new Error(`--args must be valid JSON array: ${error instanceof Error ? error.message : String(error)}`)
  }

  const data = new Interface(abi).encodeFunctionData(method, parsedArgs)
  const output = { to: contract, data, method, args: parsedArgs, createdAt: new Date().toISOString() }
  fs.mkdirSync(path.resolve("deploy"), { recursive: true })
  const outputPath = path.resolve("deploy", `encoded_tx_${method}_${Date.now()}.json`)
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { mode: 0o600 })
  console.log(JSON.stringify({ ...output, outputPath }, null, 2))
}

try { main() } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
