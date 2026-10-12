> **Deployment completed: historical reference only.** Do not run this signing procedure again for the IEEE submission. Use `bash scripts/verify-live-sepolia.sh` for read-only verification instead. No private key is required for verification.

# Public testnet signing — Codespaces one-command flow

This is the only ClimateChain step that needs the human-controlled testnet wallet.

**No Infura account and no GitHub Codespaces secret are required.**

The Sepolia helper:

1. asks for the NaFT_Dev Ethereum private key using **hidden terminal input**;
2. never prints or writes that key to a file;
3. automatically selects a working public Sepolia RPC;
4. freezes the exact clean Git HEAD;
5. reconstructs and compiles `NaFTMRVAnchor.sol` with Solidity 0.8.24;
6. reconstructs the deterministic P1 → P2 anchor plan from the same commit;
7. deploys the contract;
8. anchors P1;
9. anchors P2;
10. verifies `headByClaim == P2`;
11. runs the independent source-to-chain verifier;
12. writes the public `VERIFIED_TESTNET` record.

## Install once

From the repository root:

```bash
cd tools/climatechain-testnet-deploy
npm install --package-lock=false
cd ../..
```

## Run in Codespaces

From the repository root:

```bash
npm --prefix tools/climatechain-testnet-deploy run deploy:sepolia
```

The terminal will ask:

```text
Paste NaFT_Dev Ethereum private key (hidden):
```

Paste the **Ethereum private key for the testnet-only NaFT_Dev account** and press Enter.

Nothing will appear while you paste. That is intentional.

Do not paste the key into chat, GitHub issues, source files, screenshots, or shell commands.

## RPC behavior

If `CLIMATECHAIN_RPC_URL` is not set, the helper probes public Sepolia RPC endpoints and uses the first endpoint that returns chain ID `11155111`.

You therefore do **not** need an Infura key for the normal path.

An explicit `CLIMATECHAIN_RPC_URL` remains available only as an emergency override.

## If the wallet has no Sepolia ETH

The helper prints the derived signer address and stops safely with:

```text
signer has zero native testnet balance
```

Fund that public address with Sepolia test ETH, then run the same command again.

## Safety gates

The helper refuses to proceed when:

- the Git working tree is dirty;
- the private key format is invalid;
- the selected RPC is not Sepolia;
- the signer has zero native testnet balance;
- deterministic P1 → P2 lineage is malformed;
- deployment, P1, or P2 reverts;
- `anchorWriter` is not the deployer;
- final `headByClaim` is not P2;
- the independent read-only verifier rejects source, bytecode, calldata, event, writer, or final-state identity.

## Output

A successful run writes:

```text
.climatechain-output/verified-testnet-record.json
```

The output contains only public chain evidence and is gitignored until reviewed.

After success, copy that record into `src/climatechain-testnet-record.js`, commit it, and require the exact final SHA to pass push CI and CI-gated Pages deployment before changing the public demo wording to `VERIFIED_TESTNET`.
