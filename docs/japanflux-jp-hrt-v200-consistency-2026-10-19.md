# JapanFlux2024 JP-Hrt v2.00 | Cross-resolution / BADM scientific gate

This audit upgrades the previous **real** JP-Hrt original-archive intake to detect field-measurement metadata conflicts and unreported aggregate CH₄ values without treating them as a confirmed scientific emission total.

## Concrete primary evidence (user-supplied ADS v2.00 ZIP)

The entire original ZIP SHA-256 is pinned as `bffad17bd7acf962eb1af9fa4f2092c038a813291b9fc4c79e548674101d40eb` in `source-archive-pin.json`. The 2013 native 30-min `ALLVARS_HH` file contains 17,520 sequential intervals; `FCH4` is numeric in only 1,915 rows (10.930365% **presence**, NOT QC validity) and missing in 15,605.

The source's separate time-aggregated exports have these characteristics:

| ADS original file | Rows | Numeric `FCH4` rows | SHA-256 of original |
| --- | ---: | ---: | --- |
| `ALLVARS_DD_2013-2014_1-4.csv` | 365 | **0** | `447f5f97fa45c9f3ff9339c1a574210d51077e115c096b159a5b4e55a61ed9dc` |
| `ALLVARS_MM_2013-2014_1-4.csv` | 12 | **0** | `f3980a7810a4d097192bbbf53fe98c886437e5de135d1291cf608fdcd18c54f0` |
| `ALLVARS_YY_2013-2014_1-4.csv` | 1 | **0** | `896f06684125bbfaa3a91b152715802a829f43bb185c8d51f6709a0d90e57305` |

The original **site BADM** workbook (pinned `ed2c231a290eab9aa297b491104e8c0977a986152f4a1658cfe913bad4e7f847`, sheet `Site_General_Info`, rows 14–19, CH₄ dataValue) declares:
- `FLUX_MEASUREMENTS_METHOD`: `Eddy Covariance`
- `FLUX_MEASUREMENTS_VARIABLE`: `CH4`
- `FLUX_MEASUREMENTS_DATE_START`: `20130831`
- `FLUX_MEASUREMENTS_COMMENT`: `Closed-path eddy covariance`

In contrast, the bundled ADS metadata PDF (`A20241210-020_v200.pdf`) describes CH₄ as measured using *HREA (hyperbolic relaxed eddy accumulation) and chamber* methods, whereas CO₂/turbulent heat were measured with eddy covariance. These potentially describe distinct instrument streams or periods; this is a **review-needed metadata difference**, not evidence that either document is fraudulent.

From the original numeric 30-minute `FCH4`:
- First available numeric interval: **2013-06-01 07:00 local time**.
- Last available numeric interval ends **2013-09-20 11:00 local time**.
- **1,689 of 1,915 numeric source samples precede** the BADM CH₄ flux measurement start `2013-08-31`; 226 samples are on/after.
- Monthly source-value presence: June **218**, July **822**, August **663**, September **212**, all other months **0**.
- Site BADM `UTC_OFFSET=9` applies; native labels are not ISO UTC and cannot be passed unmodified into existing IEEE independent BigInt/Decimal integration.

**These mismatches require an explicit methods review and the original variable dictionary/QC semantics.** The audit must NOT silently treat numeric FCH4 as QC-accepted, convert to mass units, interpolate months, or assert reductions/credits.

## CLI (local original archive only)

```bash
python3 scripts/japanflux-jp-hrt-v200-consistency.py \
  /path/to/A20241210-020_2.00_selected.zip \
  research/japanflux-jp-hrt-v200/source-archive-pin.json \
  research/japanflux-jp-hrt-v200/cross-resolution-pin.json \
  > /tmp/jphrt-consistency.json
```

The new script **reuses** `scripts/japanflux-jp-hrt-v200.py` to validate source/member bytes, original native-source coverage, safe ZIP paths and manifest version. It then verifies all three aggregate CSV member hashes, row counts, `FCH4` alias equality, and absence of numeric annual/daily/monthly `FCH4`. Its signed-by-hash-only report carries a deterministic SHA-256 of canonical JSON (not a cryptographic signature) and a **blocked** scientific status.

If any source data, method pin or aggregates drift, it **fails closed**, requiring reinspection before any updated calculation. Separate user-supplied metadata claims, even when bound to original ZIP hashes, are not independent institutional publisher authentication.

The GitHub CI `python3 tests/japanflux-jp-hrt-v200-consistency.test.py` exercises a **fully synthetic 17,520-row year** with 1,689 before-start samples and 226 later ones, original source parser, missing DD/MM/YY products, forged unit/QC claims, modified SHA-256s and method-date changes. It does **not** contain the original 153 MB ZIP, so only locally running the CLI against the user-supplied original can validate the live source bytes.

## Review gates still blocked

- Confirm `FCH4` unit, positive flux sign, time-window meaning and measured-vs-gap-filled-vs-excluded QC logic using the authoritative variable dictionary.
- Resolve HREA/chamber-versus-closed-path eddy covariance streams with site method documentation and the actual `20130831` BADM start meaning.
- Explain why separate DD/MM/YY `FCH4` time series are absent despite intermittent HH numeric values.
- Verify publisher original signature/checksum by an independent trusted channel if available.
- Do **not** infer whole-season/annual CH₄ mass, human-verified AG-005 method version, project counterfactual, or certified tCO₂e.

Source DOI: https://doi.org/10.17592/001.2024121020 ; data-series paper: https://doi.org/10.5194/essd-17-3807-2025 .
