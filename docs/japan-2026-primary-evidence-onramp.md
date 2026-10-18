# 2026-10-18 — Primary Japanese rice methane sources / official NID gate

> **RESEARCH-ONLY DATA ONRAMP.** A publication link, a public scientific coefficient or a reported experimental mean is not proof of farm-specific reductions or eligibility for official AG-005 credits. No fetched document bytes or publisher CSV are committed here.

## Original source mapping

| Source | Discovered primary URL | What it actually proves | What it does not |
| --- | --- | --- | --- |
| Japanese NID 2026 (NIES / GIO) | https://www.nies.go.jp/gio/archive/nir/qu9bd60000050ys2-att/NID-JPN-2026-v3.0_J_gioweb.pdf | Government-published 2026 inventory report identified | 18 Tohoku-2024 official published factor cells manually cross-checked and staged separately; original PDF byte hash absent; **not the J-Credit method itself** |
| Agricultural historical data by chapter | https://www.nies.go.jp/gio/archive/nirdata/2026.html | Government portal publishes Chapter 5 agriculture time series (May 29, 2026) | Unretrieved workbook cannot be treated as a verified row-by-row emission-factor table |
| Official methodology catalog | https://japancredit.go.jp/about/methodology/ | Canonical authority for AG-005 and method versions | No independently downloaded, hashed, adopted AG-005 v3.5 PDF/transition appendix or authoritative coefficient-year selection |
| Itoh et al. (2011), Agriculture, Ecosystems & Environment, DOI 10.1016/j.agee.2011.03.019 | https://doi.org/10.1016/j.agee.2011.03.019 | **Nine actual Japanese field trial sites, two years**; publisher abstracts report selected treatment / conventional ratios CH4 **69.5 ± 3.4 SE%**, net CH4+N2O GWP **72.0 ± 3.1 SE%**, and yield **96.2 ± 2.0 SE%** | Not original sensor/chamber time-series rows; not all trial treatments; not a nationwide emission factor; not a J-Credit project baseline |
| JapanFlux2024 Hiratsuka Paddy, JP-Hrt, Komiya | https://doi.org/10.17592/001.2024121020 | Public dataset DOI for a Japanese paddy including actual eddy-covariance methane measurements | Source archive not downloaded or hashed in this change; no control-project pair, gap-free season, or method eligibility |
| JapanFlux2024 methodology | https://doi.org/10.5194/essd-17-3807-2025 | Article documents 83 sites, 683 site-years and open CC BY 4.0 data, and explains **CH4 fluxes were not generally gap-filled**; JP-Hrt is one of six CH4 sites | Does not prove full seasonal CH4 inventory from partial flux rows or certify treatment effects |
| IPCC 2019 rice Tier-1 | https://www.ipcc-tfi.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch05_Cropland.pdf | Inventory guidance and an illustrative worked example | Not Japanese formally authorized AG-005 factors |
| 1961–2020 rice methane model archive | https://figshare.com/articles/dataset/Global_rice_paddy_methane_emissions_from_1961_to_2020/29287904 | Open-licensed CH4MOD/CH4-ML/CH4-EF **modeled** emissions files (CC BY 4.0) | **Not measured field flux**; cannot masquerade as observed data |

### Newly installed fail-closed preflight

`research/japan-primary-evidence-2026-10-18/source-register.json` keeps authority, release date, DOI, observational granularity, raw-bytes availability, and source type separate. `src/japan-primary-evidence-preflight.mjs` implements three isolated admission checks.

1. `reviewJapanPrimarySources` checks seven pinned source classes and URLs, confirms the Itoh *selected-subset* published means, and rejects false claims about raw measurements, method adoption, or official factor ingestion.
2. `preflightNidFactorCandidate` accepts **operator-transcribed** proposed NID factor cells *only as unverified source candidates*. It requires source document and table SHA-256 claims, 2026 inventory edition, factor year, region, water/drainage/organic strata, page/table locator, and the **kg CH4-C/ha/year** mass basis. The values never enter the active AG-005 registry and `jcredit_factor_usable` remains false.
3. `preflightJapanFluxObservations` stages **synthetic test rows or untrusted transcriptions** for JP-Hrt only, with strictly ordered UTC timestamps, measured versus missing data distinctions, no gap-filled rows, a supplied local file hash, and **unverified units**. No unit conversion, daily/seasonal integration, extrapolation, or methane reduction calculation occurs: seasonal and official outputs are null. Existing tests use fabricated rows **only** to test validation logic.


## Directly inspected official NID numerical rows — Tohoku, inventory year 2024

Environment Ministry official NID 2026, Chapter 5 **Table 5-45**, **pp. 5-38–5-40**, explicitly states factors for rice paddies **without extended midseason drainage**. The values below were visually compared to the official PDF pages at [env.go.jp/content/000398403.pdf](https://www.env.go.jp/content/000398403.pdf). The unit **as printed** is `kg-CH4-C/ha`, not `kg-CH4/ha/day`. The 2026 inventory edition contains annual reference columns up to year **2024** (no invented 2025/2026 field coefficients). These are **officially published national inventory modeled coefficients**, not direct measurements and not an automatic J-Credit factor approval.

| Drainage | Irrigation | Straw | Compost | None | Printed page |
| --- | --- | ---: | ---: | ---: | --- |
| Poor drainage | Continuous flood | 692 | 665 | 175 | 5-38 |
| Poor drainage | Intermittent | 665 | 638 | 153 | 5-38 |
| Daily drainage | Continuous flood | 513 | 492 | 119 | 5-39 |
| Daily drainage | Intermittent | 365 | 349 | 71 | 5-39 |
| Four-hour drainage | Continuous flood | 472 | 452 | 97 | 5-39 |
| Four-hour drainage | Intermittent | 330 | 316 | 59 | 5-40 |

The 18 cells are explicitly pinned as **`PUBLISHED_NATIONAL_INVENTORY_REFERENCE_ONLY`** in `research/japan-primary-evidence-2026-10-18/nid2026-tohoku-2024-table545.json`. `src/nid-2026-published-subset.mjs` provides a strict read-only inspection and cell lookup with matched year, region, irrigation, drainage and organic matter identity. Failing or missing data cannot silently become credits.

**Limitations:** The official PDF was read via page rendering but publisher **original PDF bytes were not independently downloaded and SHA-256 hashed in the repository**; the lock is a visibly inspected cell/URL/version transcription, not full byte-level source authentication. This is only the Tohoku 2024 subset, *not* all 7 geographic regions or the whole 1990–2024 factor history. The six classes in Table 5-45 exclude extended midseason drainage, and neither J-Credit AG-005 effective-version applicability nor J-Credit-specific revised coefficients are verified. Institutional calculations therefore remain **`CONFIG_REQUIRED`** and `certified_tco2e:null`.

Verification: `node tests/nid-2026-published-subset.test.mjs`. No automatically assumed emission-reduction percentage, project acreage, CH4-C→CH4 conversion or CO2e estimate is produced by this reference viewer.

## Exact next data-acquisition protocol

1. Independently download the NID 2026 official PDF and agriculture workbook, calculate original **byte hashes**, and confirm the 18 manually transcribed Tohoku-2024 published cells (Table 5-45) against original source bytes before extending other regions, years and coefficient classes. Keep national inventory factors separate from legal J-Credit coefficient applicability.
2. Independently retrieve the currently adopted AG-005 document and supplements from the authoritative scheme site, hash original PDF bytes, verify official adoption/effective/transition dates, and compare with the existing v3.3 research formulas. No numerical AG-005 release until reviewed and version-locked.
3. Retrieve original **JP-Hrt** ALLVARS data from ADS for approved terms; verify its exact CSV filename, CH4 variable name, source unit, missing value code and QC flags from publisher metadata. Store external raw bytes only where license permits. Compute verified time-window coverage and uncertainty only after this dictionary is fixed.
4. Request Itoh et al. plot-level data/supplements or obtain a licensed table. Treat the three *published mean ratios* as source-linked experimental **aggregates**, never reconstruct per-field points from the mean ± SE.
5. Cross-check against an independent scientific oracle with signed reviewer outcome; then consider a **read-only** reviewer UI and staged 2026 official factors, not automatic credits.

## Run

```bash
node tests/japan-primary-evidence-preflight.test.mjs
bash tests/run.sh
```

This bridge does not contact external services, modify the IEEE synthetic 100-claim workload, rewrite Sepolia proofs, or issue credits. Author-provided hashes can be forged and do not themselves authenticate original publisher files; that requires an external independent byte-for-byte download.
