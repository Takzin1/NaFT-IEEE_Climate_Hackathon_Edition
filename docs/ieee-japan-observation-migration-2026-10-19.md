# Japan → IEEE: Native CH₄ Observation Ingestion Parity (2026-10-19)

> **RESEARCH ONLY; ALL EXAMPLES ARE SYNTHETIC.** This bridge imports the Japanese NaFT offline CSV/QC adapters and adversarial tests into IEEE ClimateChain, but not original JapanFlux sensor files, Yagi/Nishimura raw measurements, verified field baselines, active AG-005 coefficients, registry permissions, credits, or a new issuance flow.

## Provenance and minimal-change decision

Source repository: [Takzin1/NaFT](https://github.com/Takzin1/NaFT/tree/main), source commit `380b6c5e9e8bef43056d15cc3a31cd83b5d098de`. The imported `scripts/lib/japan-raw-flux.mjs` and `scripts/lib/japan-observation-adapters.mjs` are exact **source snapshot** ports, together with their JavaScript and independent Python tests and synthetic CSV fixtures. The IEEE target already has **different** BigInt and Python Decimal reference engines (`scripts/independent-observation-js.mjs` and `scripts/independent-observation-py.py`). They remain authoritative for the IEEE independent-oracle demo; no duplicate browser entrypoint or conflicting registry is installed.

The imported adapters provide a *concrete input and QC gate* for later reviewed source-specific JapanFlux mappings. The newly imported `tests/japan-ieee-oracle-parity.test.mjs` checks five comparable synthetic inputs against the existing IEEE dual-oracle outputs, including QC counts and missing-period nullability. The actual oracle implementations remain separate; parity is not field-data authentication.

## Supported typed input

| Adapter | Declared rate unit | Temporal meaning |
| --- | --- | --- |
| INTERVAL_MG_CH4_M2_DAY_V1 | mg_CH₄/m²/day | Interval-average rate, max 7 days |
| DAILY_G_CH4_M2_DAY_V1 | g-CH₄/m²/day | Exactly one UTC day interval |
| EDDY_NMOL_CH4_M2_S_V1 | nmol-CH₄/m²/s | Eddy interval mean, <= 3600 seconds |
| EDDY_UMOL_CH4_M2_S_V1 | µmol-CH₄/m²/s | Eddy interval mean, <= 3600 seconds |
| DAILY_G_CH4_C_M2_DAY_V1 | g-CH₄-C/m²/day | Exactly one UTC day interval, explicit C→CH₄ mass conversion |

IEEE cross-edition parity covers 5 synthetic cases. Any other unit, method, gas, country, temporal semantics, claimed official approval, or forged publisher authentication must be rejected or remain unsupported.

Missing/invalid/imputed QC intervals are **excluded from observed totals**. Coverage is explicit: `observed_seconds + excluded_qc_seconds + unrepresented_gap_seconds = window_seconds`. An input with incomplete measured coverage has **`full_window_total_mg_ch4_m2:null`**; it must never be inflated to an annual amount or presented as verified reductions.

## Test commands

```bash
node tests/japan-raw-flux.test.mjs
python3 tests/japan-raw-flux-independent.test.py
node tests/japan-observation-adapters.test.mjs
python3 tests/japan-observation-adapters-independent.test.py
node tests/japan-ieee-oracle-parity.test.mjs
bash tests/run.sh
```

`scripts/replay-japan-observation-adapters.mjs` has named synthetic fixtures `interval | daily | eddy | umol | carbon`. `scripts/replay-japan-raw-flux.mjs` takes explicit local manifest and CSV paths; its SHA-256 equality proves only local bytes vs the **operator-supplied** checksum.

**Intentionally excluded:** the Japan-only `gikuten.html`, Japanese page styles and browser buttons, duplicate independent oracle engines, private or license-unclear datasets, J-Credit factor selection, live network fetching, user wallet keys, real emission certifications and Sepolia signing. IEEE's English reviewer/demo presentation and synthetic 100-claim / 30-flagged demo are unchanged.

## Next gate for real observations

Retrieve the **actual publisher CSV, full metadata dictionary and license**. Verify filename, sha256, format, variable unit, QC codes, time basis, sampling interval and sensor protocol. Map them in a reviewed source-specific adapter rather than passing raw publisher columns as normalized interval means. Do **not** claim a CH₄ season total for observed fragments without coverage, scientifically warranted missing-data policy and uncertainty. Record registered project validation separately from observed physical mass.
