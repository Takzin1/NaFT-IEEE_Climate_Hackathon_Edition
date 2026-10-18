# JP-Hrt JapanFlux2024 v2.00: real source extraction and scientific intake

The archive `A20241210-020_2.00_selected.zip` was **supplied by the operator and inspected locally**, not re-downloaded independently from ADS. The archive itself is **not** in Git due to its 160 MB unpacked size; the repository retains the exact SHA-256 of the 153 MB archive, three scientific input members, code to repeat extraction, and the source-derived profile. These bytes are **real observational data**, unlike the pre-existing synthetic IEEE methane fixtures; their publisher origin is **not independently attested** merely by local checksums.

## Scientific references and license

- Source: Komiya, S. (2025), *JapanFlux2024 JP-Hrt Hiratsuka Rice Paddy*, **Version 2.00**, Arctic Data archive System (ADS), https://doi.org/10.17592/001.2024121020 ; https://ads.nipr.ac.jp/dataset/A20241210-020 .
- Research context: Ueyama et al. (2025), *The JapanFlux2024 dataset for eddy covariance observations covering Japan and East Asia from 1990 to 2023*, https://doi.org/10.5194/essd-17-3807-2025 .
- Bundled metadata PDF `A20241210-020_v200.pdf` explicitly says **CC BY 4.0** and gives dataset creator/version and dates. PDF source SHA-256 is pinned.
- BADM site-general-info workbook contains `UTC_OFFSET = 9` hours; the source HH timestamps are **site-local**, not to be treated as UTC without applying the documented timezone offset. No implicit automatic conversion has been performed in the native export.
- **Conflict for manual resolution:** the bundled PDF describes CH₄ measurements using **HREA and chamber** techniques while BADM generic measurements indicate an eddy-covariance channel. The per-row `FCH4` numeric flux **unit and quality methodology are not established in the archive-derived sources reviewed here**. Never silently reinterpret this as normalized nmol CH₄/m²/s or scientifically accepted observations.

## Concrete archive evidence

| Source file | SHA-256 |
| --- | --- |
| Entire original `A20241210-020_2.00_selected.zip` | `bffad17bd7acf962eb1af9fa4f2092c038a813291b9fc4c79e548674101d40eb` |
| `DATA/ALLVARS/*ALLVARS_HH_2013-2014_1-4.csv` | `3692a7b3d4da4b8fb19eade724f785289c74e94a63de4742e62d9e08c01d2e95` |
| `PDF/A20241210-020_v200.pdf` | `855100367b84c856801119571fe0b3bd98a9a6782d7de8acfbb9818352f408ed` |
| `DATA/BADM/JP-Hrt_BADM-Site_General_Info.xlsx` | `ed2c231a290eab9aa297b491104e8c0977a986152f4a1658cfe913bad4e7f847` |
| Derived **native-only** CSV (not in Git) | `a6629e61fea92526bb0e2ec1f3454820fba428590875f996cec35669a1b6dcfb` |

The half-hour ALLVARS CSV physically contains **17,520 rows, 2013-01-01 through 2014-01-01** (site-local timestamps; not 2014 field observations despite filename `2013-2014`). `FCH4` and `FCH4_1_1_1` agree on every row. Exactly 1,915 intervals have a native flux value; 15,605 contain `-9999` missing sentinel. Of 365 days, only 103 have any source-native `FCH4` value. This is **10.930365% source-value presence**, **not** accepted-QC coverage or scientific completeness. Separate `CH4_1_1_1` concentration is present in 4,619 rows; it must not be integrated as a CH₄ flux.

## Repeat the local extraction

```bash
python3 scripts/japanflux-jp-hrt-v200.py inspect \
  /path/to/A20241210-020_2.00_selected.zip \
  research/japanflux-jp-hrt-v200/source-archive-pin.json

python3 scripts/japanflux-jp-hrt-v200.py export \
  /path/to/A20241210-020_2.00_selected.zip \
  research/japanflux-jp-hrt-v200/source-archive-pin.json \
  /tmp/jp-hrt-native-2013.csv

python3 tests/japanflux-jp-hrt-v200.test.py
```

The extractor uses only Python standard library, never extracts untrusted ZIP paths to disk, validates the archive and named member hashes, checks for ZIP path traversal, symlinks, duplicates, oversized files, timestamp continuity, exact 30-minute samples, missing tokens, decimal-like source values and agreement between the two source CH₄ flux aliases. The output CSV is **source-native evidence**, not IEEE's `start_utc,end_utc,value,qc_status` normalized schema: native flags are `SOURCE_PRESENT_QC_UNASSESSED` and `MISSING_SOURCE_VALUE`. It therefore **cannot** be passed accidentally into the prior trusted-unit numeric replayer as observed/good QC.

The `native-observation-profile.json` is an independently reproducible **local archive-derived** profile. Tests in normal GitHub CI check the pinned profile and adversarial synthetic ZIP parser behavior. Because the original ZIP is not in the repository, GitHub CI **does not** claim to rerun against those original source bytes; that requires supplying the exact archived file locally as shown above.

## Remaining scientific/regulatory blockers

- Resolve the site-specific `FCH4` unit from an authoritative variable dictionary; determine flux sign convention, production method and source QC flags, site time semantics and uncertainties.
- Assess HREA/chamber/eddy covariant variable differences and whether any source entries are unfiltered or imputed.
- Only after a site-specific reviewed transform should values be converted into `start_utc,end_utc,value,qc_status` for existing independent BigInt/Python Decimal numerical replay. **Do not set QC to observed-good merely because a nonmissing number exists.**
- Independently authenticate ADS publisher bytes and metadata when feasible. Archive/source fingerprints now allow precise later comparison, but the user's upload does not alone prove a trusted download path.
- Dataset site values alone do **not** show an AG-005 treatment-vs-control outcome, methodology-version eligibility, independently established climate benefit, or legally certified tCO₂e. All of these remain **null/false**.

The prior `research/japan-primary-evidence-2026-10-18/japanflux-jp-hrt-intake-pending.json` represents the historical **pre-download** state. This new v2.00 record supersedes it **for local file possession only**, not for authenticated original bytes or accepted research/regulatory effects.
