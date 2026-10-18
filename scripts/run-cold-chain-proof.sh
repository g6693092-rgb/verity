#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT_DIR"

mkdir -p circuits/build proofs
command -v circom >/dev/null 2>&1 || { echo "circom is required" >&2; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "npx is required" >&2; exit 1; }

circom circuits/cold_chain.circom --r1cs --wasm --sym -o circuits/build

if [[ ! -f sample/input-cold-chain.json ]]; then
  echo "sample/input-cold-chain.json missing" >&2
  exit 1
fi

node circuits/build/cold_chain_js/generate_witness.js \
  circuits/build/cold_chain.wasm \
  sample/input-cold-chain.json \
  proofs/witness.wtns

PTAU_FILE="${PTAU_FILE:-${PTAU:-$ROOT_DIR/pot12_final.ptau}}"
PTAU_URL="${PTAU_URL:-}"
if [[ ! -f "$PTAU_FILE" ]]; then
  if [[ -n "$PTAU_URL" ]]; then
    command -v curl >/dev/null 2>&1 || { echo "curl is required to download PTAU" >&2; exit 1; }
    echo "Downloading PTAU from configured URL"
    curl --fail --location --retry 3 --output "$PTAU_FILE" "$PTAU_URL"
  else
    echo "No trusted PTAU found. Set PTAU_FILE or PTAU_URL; refusing to generate ceremony parameters." >&2
    exit 1
  fi
fi

npx snarkjs plonk setup circuits/build/cold_chain.r1cs pot12_final.ptau proofs/circuit_final.zkey
npx snarkjs zkey export verificationkey proofs/circuit_final.zkey proofs/verification_key.json
npx snarkjs plonk prove proofs/circuit_final.zkey proofs/witness.wtns proofs/proof.json proofs/public.json
npx snarkjs plonk verify proofs/verification_key.json proofs/public.json proofs/proof.json
