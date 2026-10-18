# IEEE ClimateChain — Asia Rice CH₄ Source-Index Dock (2026-10-19)

**Research reference metadata only.** This is the initial cross-repository Dock of source catalogs verified and documented by the Japanese NaFT edition. The purpose is transparent citations, source-unit boundaries and testable provenance constraints — NOT to claim an IEEE field experiment, actual CO₂e reductions or Japanese J-Credit/JCM authorization.

## Original Japanese source and retention contract

Source repository: [Takzin1/NaFT](https://github.com/Takzin1/NaFT), main merge commit
\`7b3a8a08fd4c4ca4c378169f852e5dd7d3b50547\`, PR [#32](https://github.com/Takzin1/NaFT/pull/32).

The IEEE repository contains literal byte-matching Git blobs for:
- \`research/asia-source-dock-2026-10-19/source-index.json\` (8 catalog sources, 7 advertised publisher MD5 file checksums).
- \`research/asia-source-dock-2026-10-19/verified-ephemeral-acquisition.json\` (6 verified transient upstream source SHA-256 file hashes, original GitHub Actions [run 39142424578](https://github.com/Takzin1/NaFT/actions/runs/39142424578)).
- \`scripts/lib/asia-source-dock.mjs\`, \`scripts/asia-source-dock-export.mjs\`, and tests; \`scripts/lib/asia-native-field-header.mjs\` distinguishes source-native units.

**No third-party source ZIP, original CSV or Excel file is redistributed by this PR**, and byte SHA-256 evidence in the provenance report does not mean a file is present here. The original download was verified ephemerally using Zenodo-listed publisher MD5, but **data license, sensor calibration/QC, site/time reconstruction and measurement validity are not independently reviewed**. This is different from an environmental or regulatory audit.

## Source types and limits

| Source | Original field observation? | Recorded status |
| --- | --- | --- |
| Korea Gimje 2022–2024, [Zenodo 17111992](https://doi.org/10.5281/zenodo.17111992) | Yes: chamber daily-rate source files | \`DAT\` anchored to transplant not calendar, source QC not yet mapped |
| Eastern China 2023, [Zenodo 8067998](https://doi.org/10.5281/zenodo.8067998) | Yes: eddy covariance time series | hourly \`CH4-umol/m2/s\` vs daily \`CH4-gC/m2/day\` are *different mass-basis/units* |
| Japan JP-Hrt, [JapanFlux2024](https://doi.org/10.17592/001.2024121020) | Candidate rice-site tower | original site variables/CH₄ coverage not verified |
| Korea KR-CRK, [FLUXNET-CH4](https://fluxnet.org/data/fluxnet-ch4-community-product/) | Candidate tower site | site-specific tier and local-standard-time offset to review |
| Ouyang Monsoon Asia, [Zenodo 7145497](https://doi.org/10.5281/zenodo.7145497) | **No: modeled regional grid** | do not pass as flux chamber original |
| SEA-9 Inventory, [Zenodo 20453139](https://doi.org/10.5281/zenodo.20453139) | **No: Tier-2 model / MC / attribution** | model comparison only; companion study under review |
| Yagi 1996 & Nishimura 2004 | Published sums, not raw timeseries | independent printed-arithmetic checks in Japan, not a physical recreation |

## IEEE policy gates

\`naft-ieee-observation-source-dock-v1\` exports a source-index **metadata-only**, never granting \`accepted_into_ieee_core\`. Even if the external SHA-256 matches, it cannot establish the identity of the measuring field, source license, unbiased measurements, coefficient validity or climate reductions. Any source request asserting \`J_CREDIT_CERTIFICATION\`, official emissions reporting, an Asian model as a field observation, or cross-jurisdiction factor transfer **must be rejected**. AG-005 Japanese rules remain entirely separate.

Reproduction:

\`\`\`sh
node scripts/asia-source-dock-export.mjs
node tests/asia-source-dock.test.mjs
node tests/asia-native-field-header.test.mjs
python3 tests/asia-ephemeral-provenance.test.py
\`\`\`

**Next research-only stage**: authorized raw original retrieval and license review → site-specific QC and calendar mapping → independent physical-unit conversion and integration → external model comparison with measured residuals → separately review possible jurisdiction methods. IEEE climate evidence hashing and Sepolia historical witnesses remain untouched.
