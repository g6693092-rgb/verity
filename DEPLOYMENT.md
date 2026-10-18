# Deployment guide

## Prerequisites

- Node.js 22 and pnpm 12
- Docker and Docker Compose
- Redis
- VeChain testnet RPC and a funded deployer account
- `circom` and `snarkjs` for local proof generation

Never commit `DEPLOYER_PRIVATE_KEY`. Use Vercel project variables, GitHub Actions secrets, or a KMS/HSM.

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
pnpm run smoke:test
```

Start Redis, API, and worker separately when testing async proofs:

```bash
docker run -d --name verity-redis -p 6379:6379 redis:7-alpine
pnpm start:worker
pnpm backend
```

Health endpoints:

```bash
curl -f http://localhost:3000/healthz
curl -f http://localhost:3000/metrics
```

## Testnet configuration

Copy `.env.production.example` to a secret-managed environment and set at least:

```env
NODE_ENV=production
PORT=3000
REDIS_URL=redis://127.0.0.1:6379
VECHAIN_TESTNET_RPC=https://node-testnet.vechain.energy
ROOT_REGISTRY=0x0000000000000000000000000000000000000000
PTAU_FILE=./pot12_final.ptau
```

Use the actual deployed registry address; the zero address above is only a shape example. Keep the private key outside the repository.

## Docker Compose

```bash
cp .env.production.example .env
# edit .env with real testnet values
docker compose -f docker-compose.prod.yml up -d --build
curl -f http://localhost:3000/healthz
```

The production compose file runs the API, worker, and Redis with separate health checks. The worker consumes proof jobs from the API queue.

## GHCR image

The `main` workflow runs tests and circuit builds, then publishes:

```text
ghcr.io/<owner>/verity-backend:latest
ghcr.io/<owner>/verity-backend:<commit-sha>
```

GHCR publishing uses the built-in `GITHUB_TOKEN`; no additional repository secret is required. Pull and run an image with environment variables supplied by your secret manager:

```bash
docker pull ghcr.io/<owner>/verity-backend:<commit-sha>
docker run --rm -p 3000:3000 --env-file .env.production \
  ghcr.io/<owner>/verity-backend:<commit-sha>
```

## API flow

Create a claim, compute a batch root, and enqueue a proof:

```bash
curl -X POST http://localhost:3000/claims \
  -H 'Content-Type: application/json' \
  --data @sample/claim-example.json
curl -X POST http://localhost:3000/batch
curl -X POST http://localhost:3000/prove-async \
  -H 'Content-Type: application/json' \
  -d '{"claimId":"<CLAIM_ID>"}'
curl http://localhost:3000/jobs/<JOB_ID>
```

Only expose anchoring routes behind authentication and authorization in production. Validate proof inputs server-side and verify the generated proof before any on-chain transaction.

## Testnet to mainnet checklist

Before mainnet deployment:

- Run circuit and contract audits.
- Verify the registry address and chain ID.
- Confirm proof verification and root anchoring on testnet.
- Store signing keys in KMS/HSM and rotate compromised keys.
- Estimate gas/VTHO costs and fund the deployer account.
- Configure monitoring, backups, and rollback to a known image digest.
- Deploy mainnet only after an explicit release approval.

Do not place mainnet credentials in CI logs, Docker images, example files, or pull requests.
