# IEEE ClimateChain | Per-input independent CH₄ replay (2026-10-19)

This new lane runs two **distinct language implementations** of the same submitted normalized methane flux CSV: the Japanese-edition-derived JavaScript BigInt rational adapter and independently authored Python Decimal UTC arithmetic. **Both see the same explicit manifest and CSV bytes**. Neither verifies the source publisher or produces carbon credits.

## What this adds over PR #38

Before: the IEEE source-bound receipt (`scripts/ieee-observation-receipt.mjs`) pinned local source bytes, source code and an entirely **single-engine** computation, correctly indicating `independent_second_engine_executed_for_this_input:false`. An existing independent IEEE JS/Python test engine compared only fixed synthetic fixtures, not arbitrary incoming CSVs.

Now: `scripts/ieee-observation-independent-oracle.py` is a separate Python stdlib/Decimal CSV parser and numerical integrator. `scripts/ieee-observation-dual-replay.mjs` retains the entire validated v1 receipt **without upgrading its old trust flag**, and binds it to Python's independently recomputed output and to the SHA-256s of the Python implementation, dual-engine driver and JS v1 receipt implementation. Its new outer receipt truthfully says `independent_second_engine_executed_for_this_input:true` — *only on this particular input*.

The cross-engine comparison is exact across declared adapter, input gas mass basis and unit, data class, measured and excluded time intervals, gap duration, accepted/rejected row counts, 6-digit coverage, 9-digit observed-only and optional full-window methane masses, plus CSV SHA-256 and source caution flags. Any mismatch fails closed rather than accepting a numerical average. Both engines independently reject unsupported units, instantaneous-vs-interval confusion, invalid calendars, duplicates, overlaps, bad QC, imputed numeric values and forged source-eligibility metadata.

## Run

```bash
node scripts/ieee-observation-dual-replay.mjs generate \
  research/japan-observation-adapters-2026-10-19/daily.manifest.json \
  research/japan-observation-adapters-2026-10-19/daily.csv \
  > /tmp/naft-dual-receipt.json

node scripts/ieee-observation-dual-replay.mjs verify \
  research/japan-observation-adapters-2026-10-19/daily.manifest.json \
  research/japan-observation-adapters-2026-10-19/daily.csv \
  /tmp/naft-dual-receipt.json

node tests/ieee-observation-dual-replay.test.mjs
bash tests/run.sh
```

- Requires Node and `python3`; no pip dependencies, network or external credential.
- Normalized manifest `naft-observation-series-v2` plus CSV `start_utc,end_utc,value,qc_status`. Data class must be `SYNTHETIC` or `USER_SUPPLIED_UNVERIFIED`.
- The five unit adapters remain unchanged. The daily synthetic fixture is **partially observed**; both engines must report `full_window_total_mg_ch4_m2:null`. Explicit gaps must remain gaps, not annualized.
- Source hashes identify local files; rehashing an untrusted dataset and its manifest is a new **untrusted** input, not publisher authentication.
- The CLI `verify` reruns both engines on the exact inputs **and current pinned local code**; changing the code, manifest, CSV, source metadata, numerical output or outer receipt digest invalidates the old proof.
- GitHub Actions checks the five reference inputs and mutation/metadata/false-attestation cases. The tests do not establish independent sensor validation or a statistical uncertainty model.

## Remaining gates

**Not accomplished:** JapanFlux JP-Hrt original bytes, independently verified license and data dictionary, original chamber/eddy sensor methods, absolute field/soil/water/weather comparability, published article replay from actual time-series, verified baseline/counterfactual, AG-005 legally adopted release/rule applicability, carbon credits or any Sepolia anchor. No remote dataset was retrieved here; samples remain synthetic. The IEEE English browser and synthetic 100-claim migration demo are untouched.

Independent numerical agreement increases **arithmetic reproducibility**, not scientific certainty or formal regulatory eligibility.
