# IEEE: Source-Bound Observation Replay Receipt v1

**Scope: reproducible local input and code lineage only.** This is not a digital signature, source publisher attestation, independent sensor validation, AG-005 authorized calculation, actual climate mitigation or verified carbon credit.

## Motivation and reused mechanisms

The previously merged Japan CSV intake (`scripts/lib/japan-observation-adapters.mjs`) already checks SHA-256 of input CSV, typed units, timestamp order, coverage, and excludes imputed observations. The IEEE synthetic 100-claim audit (`scripts/ieee-replay-audit.mjs`) verifies a **different, frozen scenario**; it does not bind an arbitrary locally supplied observation CSV. Instead of inventing a second calculation engine or changing the official compiler, this PR only adds `scripts/ieee-observation-receipt.mjs` to package a replay result and all original local inputs' provenance.

A deterministic JSON receipt binds:
- SHA-256 **of the local manifest file bytes and CSV file bytes**, plus SHA-256 of both modules implementing time parsing and observation integration;
- declared country, site, plot, treatment, measurement method, source URI and claimed license, UTC time window, selected adapter and data class;
- observed-only quantities, time coverage, QC-excluded duration, unrepresented gaps and complete-window quantities (which are **null for partial coverage**);
- exact underlying raw replay result hash, and a canonical sorted-key digest of the entire receipt.

The `verify` command recomputes everything from the supplied exact files and **current source implementation**, not merely the self-reported receipt digest. Thus editing a result, replacing the CSV, moving source metadata to another plot, changing the calculation module, or rehashing a forged receipt fails to verify against the true inputs and code.

`independent_second_engine_executed_for_this_input:false` is intentional. The repository's separate BigInt/Python Decimal oracle proves parity on **pinned synthetic benchmark cases**, not on an arbitrary user-supplied CSV. We do not overclaim this receipt as a dual-engine run.

## Offline reproduction

```bash
node scripts/ieee-observation-receipt.mjs generate \
 research/japan-observation-adapters-2026-10-19/daily.manifest.json \
 research/japan-observation-adapters-2026-10-19/daily.csv > /tmp/naft-daily-receipt.json

node scripts/ieee-observation-receipt.mjs verify \
 research/japan-observation-adapters-2026-10-19/daily.manifest.json \
 research/japan-observation-adapters-2026-10-19/daily.csv \
 /tmp/naft-daily-receipt.json

node tests/ieee-observation-receipt.test.mjs
bash tests/run.sh
```

Five synthetic fixture modes are covered: `interval`, `daily`, `eddy`, `umol` and `carbon`. The `daily` fixture has QC-excluded intervals, so its full-period integral stays `null` despite a nonzero observed-only subtotal.

**Trust boundaries:** SHA-256 proves only that supplied bytes match other supplied bytes. An attacker able to change both source CSV and manifest and regenerate a receipt can create another internally consistent but **untrusted** receipt. No trusted publisher root, reviewer signature, source DOI validation, cross-farm identity proof, field causal inference, Japanese official coefficient adoption, registry issuance or Sepolia anchoring is established. Verified success means only the exact local computation can be rerun. For future real data, the source-specific metadata dictionary, license and independently obtained publisher bytes must be checked separately.

No change to the IEEE live English demo, synthetic 100-claim invariant, frozen contract/testnet record, MRV package attestation or official factor gates.
