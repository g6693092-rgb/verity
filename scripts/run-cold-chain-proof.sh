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

if [[ ! -f pot12_final.ptau ]]; then
  npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
  npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="first contribution" -v
  npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
fi

npx snarkjs plonk setup circuits/build/cold_chain.r1cs pot12_final.ptau proofs/circuit_final.zkey
npx snarkjs plonk prove proofs/circuit_final.zkey proofs/witness.wtns proofs/proof.json proofs/public.json
npx snarkjs plonk verify proofs/circuit_final.zkey proofs/public.json proofs/proof.json
