# Kubernetes, Helm e SealedSecrets

Il repository include:

- `k8s/base`: manifest base per backend, worker, Redis, ingress e autoscaling
- `k8s/overlays/{dev,staging,prod}`: configurazioni per ambiente
- `helm/verity`: chart Helm per backend, worker e Redis opzionale
- `deploy/kubectl-apply-prod.sh`: applicazione dell'overlay production
- `scripts/kubeseal.sh`: generazione di un SealedSecret senza salvare segreti in Git

## Kustomize

```bash
kubectl apply -k k8s/overlays/dev
kubectl get pods -n verity
kubectl port-forward -n verity svc/verity-backend 3000:3000
curl http://localhost:3000/healthz
```

Per production:

```bash
./deploy/kubectl-apply-prod.sh
```

Le immagini predefinite sono esempi: impostare repository e tag negli overlay prima del deploy.

## Helm

```bash
helm lint helm/verity
helm upgrade --install verity helm/verity \
  --namespace verity --create-namespace
kubectl get all -n verity
```

Disabilitare Redis incluso nel chart quando si usa un servizio gestito:

```bash
helm upgrade --install verity helm/verity -n verity \
  --set redis.enabled=false
```

## SealedSecrets

Installare il controller SealedSecrets nel cluster e il CLI `kubeseal`, poi esportare i valori solo nella shell locale:

```bash
export DEPLOYER_PRIVATE_KEY='0x...'
export VECHAIN_MAINNET_RPC='https://...'
export VECHAIN_TESTNET_RPC='https://...'
export ROOT_REGISTRY='0x...'
export PTAU_URL='https://...'
./scripts/kubeseal.sh
kubectl apply -f k8s/sealedsecret.yaml
```

Il file `k8s/sealedsecret-example.yaml` è deliberatamente un placeholder non applicabile. Non committare mai chiavi private o valori in chiaro; usa invece un Secret manager o il SealedSecret generato per il cluster corretto.
