#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOYER_PRIVATE_KEY:?Set DEPLOYER_PRIVATE_KEY in the environment}"
: "${VECHAIN_MAINNET_RPC:?Set VECHAIN_MAINNET_RPC in the environment}"
: "${VECHAIN_TESTNET_RPC:?Set VECHAIN_TESTNET_RPC in the environment}"
: "${ROOT_REGISTRY:?Set ROOT_REGISTRY in the environment}"
: "${PTAU_URL:?Set PTAU_URL in the environment}"

CERT_PATH="${KUBESEAL_CERT:-pub-cert.pem}"
OUTPUT_PATH="${SEALED_SECRET_OUTPUT:-k8s/sealedsecret.yaml}"

if [[ ! -f "$CERT_PATH" ]]; then
  kubeseal --fetch-cert > "$CERT_PATH"
fi

kubectl create secret generic verity-secrets \
  --namespace verity \
  --from-literal=DEPLOYER_PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY" \
  --from-literal=VECHAIN_MAINNET_RPC="$VECHAIN_MAINNET_RPC" \
  --from-literal=VECHAIN_TESTNET_RPC="$VECHAIN_TESTNET_RPC" \
  --from-literal=ROOT_REGISTRY="$ROOT_REGISTRY" \
  --from-literal=PTAU_URL="$PTAU_URL" \
  --dry-run=client -o yaml \
  | kubeseal --cert "$CERT_PATH" --format yaml > "$OUTPUT_PATH"

echo "Wrote $OUTPUT_PATH"
