# Safe multisig proposals

The repository keeps Safe proposal submission separate from deployment. Never place a private key in a command line, committed file, or proposal artifact.

## Signed proposal

`propose_gnosis_tx.ts` submits an already signed Safe transaction to a compatible Transaction Service. Set `SAFE_ADDRESS`, `TX_SERVICE_URL`, `TX_SERVICE_API_KEY` when required, and pass:

```bash
pnpm multisig:propose -- \
  --safe "$SAFE_ADDRESS" \
  --to "$ROOT_REGISTRY" \
  --data "$ANCHOR_CALLDATA" \
  --value 0 \
  --contractTransactionHash "$SAFE_TX_HASH" \
  --sender "$SAFE_OWNER" \
  --signature "$SAFE_OWNER_SIGNATURE"
```

The sender must be an owner of the Safe. Generate and review the Safe transaction hash with an approved Safe-compatible signer or hardware wallet before submitting.

Unsigned submissions are rejected unless `--allowUnsigned` is passed for a service-specific staging workflow. The script cannot execute or approve a Safe transaction.

## Network compatibility

The public Safe Transaction Service only supports selected EVM networks. Verify that the service supports the target chain before sending anything. VeChain deployments should use the native multisig/governance process unless a compatible service is explicitly available.

Artifacts under `deploy/` are local audit records and must be treated as sensitive. Do not upload private keys or raw secrets.
