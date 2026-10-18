# IEEE CH4 independent computation / parity gate
2026-10-19; **synthetic numerical reproducibility only, not replication of field studies**.

## Independent architecture

- [Eight fabricated input cases](../research/asia-independent-observation-2026-10-19/cases.json): five distinct CH4 rate units, full observation, missing-QC, unrecorded gap, an observed zero and an entirely missing series.
- [JavaScript engine](../scripts/independent-observation-js.mjs) uses BigInt rational fractions and one final decimal rounding.
- [Python engine](../scripts/independent-observation-py.py) independently uses datetime and Decimal ROUND_HALF_UP, not the JS engine.
- [Dual-oracle parity runner](../scripts/observation-dual-oracle.mjs) executes both on the same input bytes and compares SHA-256, each integral, time coverage, missing-data status and every regulatory-null field, with no numeric tolerance at the pinned 9-decimal precision.
- [Tamper/known-result tests](../tests/independent-observation-dual.test.mjs) prevent silent changes in measurement units, duplicated cases, falsified attestation, QC-marked values, timestamps and the golden outputs.

## Units and exact formula

All computed quantities are integrals in mg-molecular-CH4 per square meter. Time is explicit UTC interval seconds, daily-mean rate requires 86400s, eddy interval <=3600s, generic mean <=604800s.

| Input adapter | Time integration to mg molecular CH4/m2 |
| --- | --- |
| INTERVAL_MG_CH4_M2_DAY_V1 | mg-rate * seconds/86400 |
| DAILY_G_CH4_M2_DAY_V1 | g-rate * 1000 * seconds/86400 |
| EDDY_NMOL_CH4_M2_S_V1 | nmol-rate * 16.04 * 1e-6 * seconds |
| EDDY_UMOL_CH4_M2_S_V1 | umol-rate * 16.04 * 1e-3 * seconds |
| DAILY_G_CH4_C_M2_DAY_V1 | g-carbon-rate * 16/12 * 1000 * seconds/86400 |

These coefficients are reference unit conversions, **not approved Japan AG-005 emission factors**. Methane carbon-mass (CH4-C) and methane molecule mass require explicit distinction; 16/12 and 16.04 are different numerical conventions. The rates are already INTERVAL MEANS; no independent chamber-concentration calibration or instrument regression is performed.

## Coverage guard

Observed seconds + excluded quality-control seconds + unrepresented gap seconds = declared window seconds. Missing or imputed data must have an empty rate and are never silently filled. Partial periods produce observed-only integrals while the full-period amount remains null. An accepted zero-valued observation remains zero (not null). All missing gives null. This prevents artificial seasonal extrapolation.

## Reproduce

Run these commands from repository root:

1. node scripts/independent-observation-js.mjs
2. python3 scripts/independent-observation-py.py
3. node scripts/observation-dual-oracle.mjs
4. node tests/independent-observation-dual.test.mjs
5. bash tests/run.sh

The independent report schema is naft-independent-methane-parity-proof-v1, status SYNTHETIC_ARITHMETIC_PARITY_ONLY. Its output always retains certified_tco2e null, regulatory_eligibility null, publisher_original_attested false, measurements_reproduced zero and scientific_replication_verified false.

## Scientific / IEEE source-Dock limitations

The upstream [Japan Asia-source Dock](ieee-asia-source-dock-2026-10-19.md) recorded six remote-original SHA256 hashes matched against the publisher MD5 in a Japanese GitHub workflow. This IEEE repo contains only their **source metadata**, never the original field values. Binary hash equality alone does not verify a crop cycle, planting-date alignment, timezone, methane measurement method, instrument calibration, data license or policy eligibility.

The source-specific Korean DAT date reconstruction, Chinese original hourly vs seasonal data, missingness/QC, publisher permission and independently measured uncertainty remain unreviewed. A later dedicated pipeline may introduce source-attested original bytes only after those checks. Numerical parity here is neither measured methane reduction nor J-Credit/GX-ETS certification, and it does not alter the synthetic 100-claim ClimateChain demonstration or Sepolia history.
