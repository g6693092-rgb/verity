#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT_DIR"

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/create_signed_anchor.sh <root>" >&2
  exit 1
fi

ROOT_HEX="$1"
SIGNED_OUT="${SIGNED_OUT:-signed_tx.txt}"

node -e '
const fs = require("fs")
const ethers = require("ethers")
require("dotenv").config()
const [root, output] = process.argv.slice(1)
const pk = process.env.DEPLOYER_PRIVATE_KEY
const rpc = process.env.VECHAIN_TESTNET_RPC || process.env.VECHAIN_MAINNET_RPC
const contract = process.env.ROOT_REGISTRY
if (!pk || !rpc || !contract) throw new Error("Missing DEPLOYER_PRIVATE_KEY, RPC, or ROOT_REGISTRY")
const provider = new ethers.providers.JsonRpcProvider(rpc)
const wallet = new ethers.Wallet(pk, provider)
const iface = new ethers.utils.Interface(["function anchorRoot(bytes32 root, string calldata schemaId)"])
const data = iface.encodeFunctionData("anchorRoot", [root, "cold-chain-v1"])
wallet.signTransaction({ to: contract, data, value: 0, gasLimit: 500000 }).then((signed) => {
  fs.writeFileSync(output, signed + "\n", { mode: 0o600 })
  console.log("Signed transaction written to", output)
})
' "$ROOT_HEX" "$SIGNED_OUT"
