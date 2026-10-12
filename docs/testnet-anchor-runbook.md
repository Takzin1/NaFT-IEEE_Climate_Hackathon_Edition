> **Historical deployment instructions. Ethereum Sepolia deploy + P1 + P2 were already completed and independently verified. Do not rerun the signing/deploy process for IEEE.** For verification only, run `bash scripts/verify-live-sepolia.sh` without a private key. [Current judge-ready pack](ieee-submission-pack.md).

# ClimateChain testnet anchor runbook

This runbook starts **after** the repository CI is green. It intentionally does not store private keys, RPC credentials, or wallet secrets.

## Goal

Produce verifiable evidence for one NaFT claim lineage:

1. deploy `NaFTMRVAnchor.sol` to a public EVM testnet;
2. anchor the existing package `P1` as the genesis package;
3. anchor the successor package `P2` with `previousPackageHash = P1`;
4. record the chain ID, contract address and both transaction hashes in the submission docs.

## Required local inputs

First freeze the exact green commit that will be deployed:

```bash
git rev-parse HEAD
```

Use that SHA as `source_commit`. Do not change the contract or MRV/ClimateChain source between generating the anchor plan and deploying/anchoring it.

Generate the exact transaction arguments in either of two equivalent ways.

### Browser

1. open `naft-app.html#/climatechain`;
2. run the 100-claim methodology update;
3. click **Prepare blockchain anchor plan**;
4. download `naft-climatechain-anchor-plan.json`.

### CLI

```bash
node scripts/generate-climatechain-anchor-plan.mjs > /tmp/naft-climatechain-anchor-plan.json
cat /tmp/naft-climatechain-anchor-plan.json
```

The browser and CLI both call the same deterministic NaFT compiler path. The JSON must remain `chain_status: NOT_SUBMITTED` until real transactions are confirmed.

## Deployment boundary

Use a human-controlled wallet on the chosen public testnet. Do **not** commit:

- private keys;
- seed phrases;
- RPC credentials;
- signed raw transactions containing secrets.

The contract has one narrow provenance-writer role: the deployment wallet becomes `anchorWriter` and only that wallet may append lineage. This is not a certification role. The contract has no minting, payment, marketplace or carbon-credit issuance path.

## Verification checklist

Before claiming that NaFT is anchored on-chain, record all of the following:

- network name and numeric chain ID;
- deployed contract address;
- exact source commit SHA;
- compiler version (`solc 0.8.24`);
- deployment transaction hash;
- genesis anchor transaction hash;
- successor anchor transaction hash;
- `claimIdHash`;
- genesis `packageHash`;
- successor `packageHash`;
- successor `previousPackageHash`;
- explorer links.

Confirm on the explorer that:

- both `MRVPackageAnchored` events exist;
- the successor's previous package equals the genesis package;
- `headByClaim(claimIdHash)` equals the successor package hash.

Then perform a read-only RPC verification from the repository root:

```bash
RPC_URL="https://<your-public-testnet-rpc>" node scripts/verify-climatechain-testnet.mjs
```

The verifier checks:

- the recorded numeric chain ID against `eth_chainId`;
- the exact `source_commit` exists locally and can be reconstructed with Git;
- deployment creation bytecode and deployed runtime bytecode exactly match `NaFTMRVAnchor.sol` compiled from that commit with `solc 0.8.24`;
- the deterministic P1 → P2 anchor plan is reconstructed from the same recorded commit;
- deployment receipt success and contract-address equality;
- `anchorWriter()` equals the deployment sender;
- genesis and successor transactions are sent by that writer;
- exact `anchorPackage(bytes32,bytes32,bytes32,bytes32)` selector and four-`bytes32` calldata against the deterministic NaFT anchor plan;
- the full `MRVPackageAnchored` event signature, indexed topics, methodology hash, submitter and block timestamp;
- exact P1 → P2 lineage and final `headByClaim(claimIdHash) == P2`.

It never needs a private key and does not send a transaction.

## What the submission may say after verification

> NaFT anchors the version lineage of MRV packages on a public testnet. The chain witnesses package hashes and parentage only; it does not certify climate impact or issue a carbon credit.

The public testnet evidence is now **VERIFIED_TESTNET**. A browser-generated *local* anchor plan still has `chain_status: NOT_SUBMITTED` because the browser does not send a new transaction. These are separate statuses.

## Update the repository record

After all public-testnet evidence above is confirmed, update `src/climatechain-testnet-record.js` in one commit:

- set `status` to `VERIFIED_TESTNET`;
- populate every required network / address / transaction / source-commit / explorer / timestamp field;
- leave the compiler field as `solc 0.8.24` unless the deployment compiler genuinely differs and the documentation is updated accordingly.

Do not populate only some fields while keeping `NOT_SUBMITTED`. The test suite deliberately rejects that state. Do not set `VERIFIED_TESTNET` with missing or malformed evidence. The browser status changes only after the record validates.

After the record change, require the push CI and its CI-gated Pages deployment to pass on the exact same head SHA before using the explorer evidence in the video or Devpost text. The ClimateChain PR-triggered duplicate job is intentionally skipped.

The repository also contains `tests/climatechain-rpc-verifier.test.mjs`, which runs the same verifier against a local mock JSON-RPC service in CI. A valid P1 → P2 flow must pass; a deliberately corrupted successor calldata must fail closed.

## Contract behavior gate

Regular CI also executes the Solidity contract on a local EVM and verifies:

- deployer becomes the only `anchorWriter`;
- a different account cannot append a successor;
- duplicate package hashes fail;
- stale-parent forks fail;
- cross-claim parents fail;
- the authorized P2 remains the final `headByClaim`.

This behavior test is separate from the public-RPC verifier: one validates contract security semantics locally, the other validates the real public-testnet evidence after human signing.
