# Worker queue per prove asincrone

Il backend espone una coda Bull chiamata `proofs` per eseguire la generazione delle prove ZK fuori dal processo HTTP.

## Prerequisiti

- Redis raggiungibile tramite `REDIS_URL` (default: `redis://127.0.0.1:6379`)
- dipendenze installate con pnpm
- artefatti dei circuiti disponibili per `scripts/run-cold-chain-proof.sh`

Per avviare Redis localmente:

```bash
docker run --name verity-redis -p 6379:6379 -d redis:7-alpine
```

## Avvio

```bash
pnpm start:worker
```

Il worker usa concorrenza 1 perché il proof script scrive artefatti condivisi in `sample/` e `proofs/`.

## API

1. Creare e indicizzare una claim con `POST /claims`.
2. Accodare una prova:

```bash
curl -X POST http://localhost:3001/prove-async \
  -H 'content-type: application/json' \
  -d '{"claimId":"claim-id"}'
```

3. Consultare lo stato:

```bash
curl http://localhost:3001/jobs/<jobId>
```

Gli stati possibili sono `queued`, `running`, `completed` e `failed`. I risultati vengono salvati in `DATA_DIR/jobs/<jobId>.json` per mantenere lo stato anche dopo il riavvio del server.

## Produzione

Impostare `REDIS_URL` e `DATA_DIR` come variabili d'ambiente. Non eseguire il worker nello stesso processo del server web: avviarlo come processo/servizio separato e usare un volume persistente per `DATA_DIR`, `sample` e `proofs`.
