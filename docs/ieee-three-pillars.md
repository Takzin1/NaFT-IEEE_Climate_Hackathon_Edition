# IEEE ClimateChain — Three-pillar integrity demonstration

**Goal:** Make the chain of reasoning inspectable, rather than suggesting that an on-chain hash proves a real-world climate outcome.

## 1. Detect corrupted evidence

Open the [public NaFT demo](https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain) and click **Run 100-claim methodology update**. Then click **Verify all 3 pillars**.

NaFT runs a local, deterministic adversarial test: modify one printable byte of a synthetic evidence file without updating its SHA-256 manifest. The compiler must emit a `content_hash` integrity issue, retain successful JSON parsing, and fail closed with `UNSUPPORTED` status. This is **integrity checking**, not verification that the original observation was factually true.

## 2. Re-verify only affected synthetic claims

The reviewer proof deliberately **does not trust the impact analyzer's counts**. It separately recompiles every one of the 100 synthetic claims under both methodology versions and compares effective active projections, old package hashes, target status and full successor package hashes. It rejects missing IDs, altered counts, hidden re-verification requirements, altered inputs and spurious successor packages. Expected fixture breakdown:

| Synthetic outcome | Claims |
| --- | ---: |
| Candidate claims | 100 |
| Require re-verification | 30 |
| Unaffected | 70 |
| Automatically re-evaluated | 15 |
| Missing evidence; blocked | 15 |

**Boundary:** The full-compilation check uses the same versioned compiler primitives as the selective analyzer, so it is a source-bound engineering cross-check, **not** a separately implemented scientific oracle or measurement of real-world costs. The published 614-case adversarial benchmark is a separate bounded test corpus.

## 3. Inspect the Sepolia lineage witness

The proof checks that the locally constructed successor references the exact P1 package and claim and that the existing testnet record has the expected Sepolia network, distinct transaction hashes and public explorer links. The browser's plan is **NOT_SUBMITTED** and makes no RPC request; the referenced *historical* P1/P2 transactions were recorded previously. On-chain reality must be confirmed independently:

```sh
bash scripts/verify-live-sepolia.sh
```

This read-only command checks recorded source bytecode, deployment, P1/P2 transaction calldata, events and final claim head. It depends on an available public Sepolia RPC endpoint. Failure to fetch data is not automatically evidence that the original transaction was invalid.

Ethereum witnesses **package hashes and lineage, not correctness of environmental data, credits, verification approval or certification**.

## Repeat the three-pillar proof offline (no network)

Use Node.js 24 or later, from the checked-out repository. The CLI runs real deterministic logic; it does not replay a prerecorded success string.

```sh
node scripts/ieee-triad-proof.mjs generate /tmp/naft-three-pillars.json
node scripts/ieee-triad-proof.mjs verify /tmp/naft-three-pillars.json
```

An exported JSON from the browser's **Download 3-pillar proof JSON** can also be used with `verify`. It contains an SHA-256 digest and is rejected if its contents differ from fresh, source-bound recomputation — **even when an attacker recalculates the top-level digest**.

**Fail-closed tests:** `node tests/climatechain.test.js` mutates IDs, counts, change classifications, successor hashes, and version-bound inputs. `node tests/ieee-triad-proof.test.mjs` checks deterministic repeatability and rejects both basic tampering and rehashed forgery.

**Do not claim:** measured CO₂ abatement, 70% financial/labor savings, 100 participating farms, actual credit issuance, authenticated source evidence or independent live RPC verification by the browser. The existing recorded demo video predates this extra proof action; capture a new walkthrough if the proof button should be shown.
