# IEEE Audit Receipt + Adversarial Replay Lab

## Purpose

The IEEE ClimateChain interface can now export a **100-claim synthetic audit receipt** and run an **offline raw-evidence tamper challenge**. A portable Node script verifies that the receipt SHA-256 is intact **and** independently re-executes the deterministic application workload from the checked-out code. It is source-bound replay, **not** an independent semantic oracle: the latter is covered separately by `tests/impact-proof.test.js`.

This is an engineering reproducibility control, not a digital signature, independent custody of raw evidence, greenhouse-gas verification, method eligibility assertion, official registry acceptance, blockchain transaction, carbon-credit issuance, or measured efficiency saving.

## Reproduce from a checked-out commit

Use Node 24 (no npm dependencies or API credentials required):

```bash
bash tests/run.sh
node scripts/ieee-replay-audit.mjs generate /tmp/naft-ieee-audit-receipt.json
node scripts/ieee-replay-audit.mjs verify /tmp/naft-ieee-audit-receipt.json
```

In the English `#/climatechain` page:
1. Run the synthetic 100-claim methodology update.
2. Download the reproducible audit receipt JSON.
3. Run `verify` locally against **the same Git commit / methodology pack versions**.
4. Optionally run **evidence tamper challenge** and inspect its rejection status and failure code.

## Machine-readable receipt

`naft-ieee-audit-receipt-1` includes the synthetic workload hash, both pinned methodology Pack hashes, actual analyzer change/counts, every claim's previous/successor package hashes, reasons and dependency node IDs, and the prepared **NOT_SUBMITTED** lineage argument pair. The receipt SHA-256 hashes the canonical payload (excluding its own digest). Its output is deterministic: no clock, random number, RPC access or credential.

Verification fails if:
- The JSON is malformed, the declared digest is missing, or the payload has been altered without matching the SHA-256.
- A party recomputes a fresh digest after rewriting a status, claim, count or lineage record but the contents disagree with deterministic replay.
- The local source/Pack/fixture no longer reproduces the receipt.

The verifier checks equality with **this repository's local implementation**; a malicious party controlling both code and receipt can rewrite both. Independent trust requires external code review, signatures/public timestamping and authentic evidence sources beyond this demo.

## Negative-control demonstration

The tamper test uses fictional `CLIMATE-086` raw content and deliberately preserves its original expected hash after changing the bytes. The compiler flags `content_hash:<evidence ID>` as **UNSUPPORTED**, and the resulting package hash changes. This proves detection only for that controlled synthetic modification; it does not validate observation truth or the already anchored Sepolia P1/P2.

## CI acceptance

`tests/ieee-audit.test.mjs` is part of `bash tests/run.sh` and covers deterministic output, independent SHA-256 parity, positive replay, altered payload, rehashed forgery, omitted claim, forged count, missing file and tamper fail-closed behavior. The existing full compiler, independent semantic oracle, local EVM, real-Chrome and Sepolia workflows remain unchanged.
