# Production deployment

## Local development

```bash
JWT_SECRET='use-a-long-random-secret' docker compose -f docker-compose.dev.yml up --build
```

The development stack uses Redis and a persistent filesystem volume for claims and sessions. PostgreSQL is intentionally not required because this deployment keeps filesystem persistence.

## GHCR and CI

The repository publishes `ghcr.io/g6693092-rgb/verity-backend` from the main-branch workflow using the built-in `GITHUB_TOKEN`. No personal token is committed.

## Kubernetes

1. Install the External Secrets Operator and configure the `external-secrets-sa` AWS IAM role.
2. Create namespace and apply `k8s/pvc-verity.yaml` for `DATA_DIR`. The PVC must use an RWX-capable storage class when running multiple backend replicas; set `storageClassName` for the target cluster.
3. Apply `k8s/externalsecret-aws.yaml` and `k8s/pdb-backend.yaml`.
4. Install the chart with production values:

```bash
helm upgrade --install verity helm/verity --namespace verity --create-namespace -f helm/verity/values.prod.yaml
```

Keep `JWT_SECRET`, `DEPLOYER_PRIVATE_KEY`, and RPC URLs in the secret manager. Never put plaintext values in manifests or CI files.

## RootRegistry release runbook

1. Deploy to VeChain testnet first with `VECHAIN_TESTNET_RPC` and `DEPLOYER_PRIVATE_KEY_TESTNET`.
2. Confirm `deploy/rootregistry.json` has the expected chain ID and verify the contract bytecode/address.
3. Run the backend smoke flow: authenticated claim, batch, async proof, verification, then anchor.
4. Configure the protected GitHub `production` environment with `VECHAIN_MAINNET_RPC`, `DEPLOYER_PRIVATE_KEY_MAINNET`, and `VECHAIN_MAINNET_CHAIN_ID`.
5. Trigger `Deploy RootRegistry mainnet` manually and review the uploaded deployment artifact.
6. Update `ROOT_REGISTRY` only after independently verifying the deployed address. Never deploy mainnet from a local unreviewed checkout.
7. For a controlled manual anchor, set `ROOT`, `ROOT_REGISTRY`, `SCHEMA_ID`, and the appropriate deployer key, then run `pnpm anchor:root:testnet` first. The script is idempotent and refuses malformed roots or addresses.
8. Run the mainnet anchor only from the protected production environment after reviewing the transaction hash and receipt.
