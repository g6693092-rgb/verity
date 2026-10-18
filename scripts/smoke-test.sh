#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
CLAIM_FILE="${CLAIM_FILE:-sample/claim-example.json}"

curl -sSf "$BASE_URL/health" >/tmp/verity_health.json
CLAIM_RESPONSE=$(curl -sSf "$BASE_URL/claims" -X POST -H "Content-Type: application/json" --data-binary "@$CLAIM_FILE")
CLAIM_ID=$(node -e 'const value=JSON.parse(process.argv[1]); process.stdout.write(value.id)' "$CLAIM_RESPONSE")
[ -n "$CLAIM_ID" ]

BATCH_RESPONSE=$(curl -sSf "$BASE_URL/batch" -X POST)
node -e 'const value=JSON.parse(process.argv[1]); if (!value.batch?.root) process.exit(1)' "$BATCH_RESPONSE"

PROOF_RESPONSE=$(curl -sS "$BASE_URL/prove" -X POST -H "Content-Type: application/json" -d "{\"claimId\":\"$CLAIM_ID\"}")
node -e 'const value=JSON.parse(process.argv[1]); if (!value.valid && !value.error) process.exit(1)' "$PROOF_RESPONSE"

echo "Smoke test passed for $BASE_URL"
