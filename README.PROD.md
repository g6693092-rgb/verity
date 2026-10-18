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
2. Create namespace and storage/PVC resources for `DATA_DIR`.
3. Apply `k8s/externalsecret-aws.yaml` and `k8s/pdb-backend.yaml`.
4. Install the chart with production values:

```bash
helm upgrade --install verity helm/verity --namespace verity --create-namespace -f helm/verity/values.prod.yaml
```

Keep `JWT_SECRET`, `DEPLOYER_PRIVATE_KEY`, and RPC URLs in the secret manager. Never put plaintext values in manifests or CI files.
