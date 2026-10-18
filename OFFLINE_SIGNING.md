# Offline signing and broadcasting

1. Configure `DEPLOYER_PRIVATE_KEY`, `VECHAIN_TESTNET_RPC`, and `ROOT_REGISTRY` in a secure local environment.
2. Generate a signed transaction without broadcasting:

```bash
./scripts/create_signed_anchor.sh 0x<32-byte-root>
```

3. Move `signed_tx.txt` to an online broadcaster through a secure, authenticated channel.
4. Broadcast it with `tsx scripts/send_signed_tx.ts signed_tx.txt`.

Never commit private keys or signed transaction files to the repository. Verify the destination contract and chain ID before signing.
