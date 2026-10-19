# NaFT IEEE – original research datasets (2026-10-19)

This folder separates **original public research observations** from NaFT's
frozen synthetic ClimateChain demonstration and from all formal MRV/credits.

## Successfully acquired on the research branch: Gimje, Korea

Original depositor: **Hyoung Seok Lee**, Rural Development Administration.
Dataset: *Daily methane (CH₄) emission measurements from paddy fields in
Gimje, Korea (2022–2024)*.
Permanent DOI: https://doi.org/10.5281/zenodo.17111992
Record: https://zenodo.org/records/17111992

Zenodo's record API explicitly declared **Creative Commons Attribution 4.0
International (CC BY 4.0)** when the importer ran. Under that license, the
original `ch4.zip` and `input_fields_meta.xlsx` files were committed *without
modification*, with explicit attribution and per-file MD5 and SHA-256 checks.
The rights belong to their original creators, **not** to NaFT: this repository's
software LICENSE does not replace the dataset's CC BY obligations.
License URL: https://creativecommons.org/licenses/by/4.0/

Exact original checksums are pinned in `intake-catalog.json` and the captured
`originals/KR_GIMJE_DAILY_2022_2024/acquisition-receipt.json`.
To recheck original Git bytes **offline**:

```sh
python3 scripts/ieee-research-original-acquire.py verify-local \
  KR_GIMJE_DAILY_2022_2024 \
  --destination research/ieee-observation-datasets-2026-10-19/originals/KR_GIMJE_DAILY_2022_2024
```

The previous original-file verification run had already observed approximately
60 CSV members inside `ch4.zip`, with reported source headers:
`DAT,tavg,course_type,ch4_flux,rain_mm`. **There is no approved DAT→date
mapping, field-join mapping, QC classification, interval coverage or calibrated
methane validation yet.** No observed emissions were automatically ingested
into the J-Credit or production compiler, and `certified_tco2e` stays null.
Downloaded file hash matching proves reproducibility of the *bytes only*;
it does not prove sensors, methodology or publisher digital signatures.

## Not yet redistributed

- **China Eastern China eddy covariance**: DOI
  https://doi.org/10.5281/zenodo.8067998; `Supporting information data2.csv`
  has a prior SHA-256/MD5 lock, but the live Zenodo API did **not** return an
  unambiguous redistribution license. The importer refused to commit it.
  Keep the source metadata entry and request license confirmation before retry.
  The 13.3 MB hourly original is intentionally out of scope until that review.
- **Japan JP-Mse, FLUXNET-CH₄**: DOI
  https://doi.org/10.18140/FLX/1669647. The site describes CC BY 4.0, but
  obtain its actual files using the official FLUXNET Shuttle/download process:
  https://fluxnet.org/download-data/. Do not skip registration/intended-use
  requirements or treat FLUXNET's gap-filled `_F` series as unmodified raw
  observations. This catalog holds metadata only, no invented file hash.

## Import command (explicit, research only)

```sh
python3 scripts/ieee-research-original-acquire.py acquire \
  KR_GIMJE_DAILY_2022_2024 \
  --destination /tmp/research-gimje-originals
```

The importer uses only the official Zenodo record's metadata and file endpoints,
a strict allowlist of redistributable licenses **plus catalog-pinned license ID**, the publisher's MD5 values and
NaFT's previously captured original SHA-256. It rejects ambiguous/missing
licenses, edited bytes, wrong record DOI, oversized files and path traversal.
It never parses the original data as valid science, makes an API call during
normal compilation, runs a remote shell script, or accesses wallet/chain keys.
The source-acquisition workflow is restricted to its explicit research feature
branch. Real observation processing needs separate reviewed adapters and QC.

**Citation**: Lee, Hyoung Seok. (2025). *Daily methane (CH₄) emission
measurements from paddy fields in Gimje, Korea (2022–2024)*. Zenodo.
https://doi.org/10.5281/zenodo.17111992

### Audit hardening

The offline verifier now explicitly rejects altered trust declarations in the
acquisition receipt (including false certification, accepted QC or fabricated
publisher signatures), duplicate or path-traversing filenames, unpinned source
licenses, local symlinks and oversized files. A checksum match proves exact
bytes match a prior record but **never authenticates the publisher**. The
pinned CC BY claim is a metadata record of what was observed, not an ongoing
legal assessment. A source with missing license (China) cannot be auto-imported
until the catalog license is explicitly reviewed and pinned.

The exact Zenodo record-API JSON digest observed during first import is pinned
in the intake catalog, in addition to the per-file digests. Later acquisition
attempts fail closed if the publisher record metadata changes; offline receipt
verification also rejects fabricated 64-character record hashes. **A record
hash match is not a cryptographic publisher signature or an independent legal
license review.**

## Gimje structural preflight (new; no calendar/QC inference)

The pinned original archives are now inspected **without extracting any ZIP
member**. Run:

```sh
python3 tests/ieee-gimje-structure-preflight.test.py
python3 scripts/ieee-gimje-structure-preflight.py \
  --output /tmp/gimje-structure-preflight.json
```

The deterministic JSON report lists each source CSV member name, original
member SHA-256, row count, expected header, missing/non-numeric token counts
and repeated **literal** DAT values. It also enumerates the Excel workbook's
sheets and *literal* first-row cell contents (not guessed field join keys).
Both whole-file SHA-256 digests are rechecked against the acquisition catalog
and receipt before/after inspection. The ZIP and XLSX are bounded, treated as
untrusted archives and never extracted to a destination path. Dangerous ZIP
members, symlinks, excessive expansion, malformed CSV and XML external
references are rejected.

The report's explicit blockers are **not automatically satisfied**: DAT
values may be relative to rice transplanting rather than ISO calendar dates;
source workbook meanings and field identity still require a reviewed
data dictionary. Units of `ch4_flux`, chamber observation support, quality
flags and site matching are still unverified. Numeric-token diagnostics
do not make measurements scientifically valid. The report never computes
methane reductions, certified tCO2e, regulatory eligibility, or offsets.

The GitHub CI retains the full inspection JSON as a downloadable
`ieee-gimje-structural-preflight` artifact for independent inspection.

## Source-bound field-ID crosswalk candidates (NOT a verified data join)

`scripts/ieee-gimje-field-crosswalk.py` reads the pinned workbook's actual
`input_fields_meta` sheet and compares the **literal** `field_id` cell value
to the source CSV member's exact basename. No fuzzy matching, prefix matching,
filename year decoding or automatic date conversion occurs. The report
preserves candidate workbook row numbers, cell literals, row fingerprints,
source CSV member SHA-256, missing-flux counts and unmatched source IDs.
The report includes **explicit false review flags**, regardless of the number
of exact string matches.

```sh
python3 tests/ieee-gimje-field-crosswalk.test.py
python3 scripts/ieee-gimje-field-crosswalk.py \
  --output /tmp/gimje-field-crosswalk-candidates.json
```

Source sheet header cells: `reference,field_id,year,director,LAT,LON,
rice_variety,planting_date,harvesting_date,soil_texture,grain_yield,
water_management,seasonal_ch4`. The analyzer keeps dates and water
management codes as their **original cell literals** and never treats a
source filename string match as reviewed field identity. Spreadsheet formulas,
duplicate identifiers, unsafe worksheet structures, changed original hashes,
and unknown source layouts fail closed.

**Mandatory scientific questions before approval**: What does the ZIP
filename encode? Does it represent the sheet's `field_id` rather than a
measurement or campaign ID? Are dates Excel serials or source strings?
How is DAT defined and which planting event is the reference? What is the
sampling support, mass basis, chamber QC and meaning of blank
`ch4_flux` values? Not a single answer is inferred by this feature.
The output is published only as a downloadable GitHub Actions research
artifact and does not change MRV calculations, certified reductions or
Sepolia historical records.

## Upstream author-method requirements: scientific review gates

The author code is linked by immutable Git commit, not blindly vendored or
forked as a runtime dependency. Source program:
[Lee's Gimje RF/XGB R code](https://github.com/lhs0218/gimje_ch4/tree/45525f01642c3069d03177e8801070da1dcb3450).
Upstream code license: MIT, per its versioned LICENSE. Dataset license:
CC BY 4.0 as returned by its Zenodo source. These are **different** licenses.

`gimje-author-method-contract.json` pins the upstream Git revision,
upstream R file blob hashes, and the specific requirements independently
adapted into NaFT: CSV basename lookup of `field_id`; the candidate
`planting_date + DAT` relation; four DAT growth-stage boundaries
(rooting <= 10, tillering <= 45, reproductive <= 90, ripening otherwise);
and the author's `drop_na(ch4_flux, DAT, tavg, EVI)` training exclusion
gate. None of these is a permission to scientifically validate or certify
field emissions.

The new `scripts/ieee-gimje-reference-method-gates.py` produces an
**offline, reproducible, source-bound diagnostics report**. It audits the
original 60 CSVs and workbook again, proposes calendar dates only if
the workbook uses the 1900 Excel date system, and records literal
water-treatment tokens and CH4 observation token states. The code
distinguishes explicit numerical `0` from blank and invalid flux values;
neither is yet QC-certified. It does **not** integrate CH4, infer missing
days as zero, make a field-treatment comparison or train a model.

```sh
python3 tests/ieee-gimje-reference-method-gates.test.py
python3 scripts/ieee-gimje-reference-method-gates.py \
  --output /tmp/naft-ieee-gimje-reference-method-gates.json
```

A complete seasonal-methane replay still requires the authors' documented
interval/aggregation rule, measurement gap semantics, observed data unit
verification, uncertainty treatment, and baseline eligibility analysis.
The real-workbook candidate dates and author-R reference stage labels
must not be promoted to confirmed field events solely through an automated
data conversion. GitHub Actions makes the report a downloadable research
artifact; MRV and Sepolia behavior are unchanged.

## CH4 observation-presence and DAT-spacing map (no interval integration)

`scripts/ieee-gimje-observation-support-map.py` independently
rechecks the pinned originals and the author-reference-method report,
then parses each field's CSV again to enumerate **finite CH4 numeric
tokens** separately from blank, malformed, and literal zero/negative
tokens. It records each field's number of distinct numeric DAT indices,
the shortest/longest index and the histogram of **elapsed DAT distances
between consecutive finite readings**.

Important: a distance of 7 DAT units does **not** prove a 7-day
observation gap, a continuous 7-day chamber measurement or a legitimate
7-day integration window. It is only an index difference. Even numeric
CH4 zero is not quality-reviewed. The outputs do not calculate seasonal
emissions, methane reductions, measurement-interval weights, carbon
credits or any authorized gap-filling.

```sh
python3 tests/ieee-gimje-observation-support-map.test.py
python3 scripts/ieee-gimje-observation-support-map.py \
  --output /tmp/naft-ieee-gimje-observation-support-map.json
```

Offline CI retains the JSON in an artifact called
`ieee-gimje-observation-support-map` with 21-day retention. To progress
beyond this gate, obtain the author's actual chamber collection schedule,
daily-flux derivation protocol, measurement/QA exclusions and seasonal
aggregation interval definitions, ideally as a citable and versioned
supplement. The pre-existing 6,969 empty CH4 tokens cannot be
unilaterally interpreted as absence of CH4 or as a zero-valued observation.

## Replay-readiness matrix (research-only, evidence requests)

The offline tool `scripts/ieee-gimje-replay-readiness.py` uses the previous
source-bound observation-presence map and the immutable original-data
fingerprints. It publishes deterministic comparisons of finite CH4 **CSV
numeric-token availability**, grouped by year, literal water-management code,
and both dimensions together. The availability fraction is an integer
count of numeric literals per 1,000 source CSV rows, **not** a measurement
duration ratio, physical observation validity, treatment efficacy, or seasonal
emissions estimate. Zero and negative numeric tokens remain explicit, with
the 6,969 source blanks kept separate.

The report includes 9 primary-evidence requests:
chamber collection protocol, dated sampling event log, blank/QC semantics,
valid time-support and seasonal boundary assignments, unit/calibration proof,
field identity, water-management events, transplant/harvest/DAT conventions,
and published seasonal replay/uncertainty method.

Every evidence item is emitted as **NOT_VERIFIED**, with no invented source
file, URL or human approval. Because the scientific sources do not yet
establish per-observation support windows, the output always refuses
time-weighted seasonal integration and any regulatory/carbon certification.

```sh
python3 tests/ieee-gimje-replay-readiness.test.py
python3 scripts/ieee-gimje-replay-readiness.py \
  --output /tmp/naft-ieee-gimje-replay-readiness.json
```

The JSON is stored as a GitHub Actions artifact named
`ieee-gimje-replay-readiness`, retained for 21 days. Input mutation,
impossible counts, duplicated field IDs, unapproved treatment codes, fake
approved QC and false totals trigger fail-closed errors. This is a
report of **evidence gaps and record completeness only**.

## Independent third-party evidence sources — *discovered, not validated*

The source-linked registry
[`third-party-validation-sources.json`](third-party-validation-sources.json)
provides **nine** original DOI / source-landing pages and pinned GitHub
code candidate records, each with independent study scope, intended
role, source licensing, required data prerequisites and explicit reasons
why it cannot yet certify Gimje CH4 fluxes.

- **Independent QC research:** Jentzsch et al. 2025, ESSD
  https://doi.org/10.5194/essd-17-2331-2025 and associated PANGAEA
  expert-QC/chamber-measurement archive
  https://doi.org/10.1594/PANGAEA.971695. Method disagreement is a
  *risk framework*, not direct verification of 2022–24 Gimje.
- **Independent chamber-calculation code:** CRAN `gasfluxes` (GPL ≥2,
  external source pinned Git commit) and Harvard Forest chamber-flux
  R workflow (MIT; pinned Git commit). They require original chamber
  concentration time series, closure times/geometry and instrument
  metadata **not supplied in Gimje's derived daily-flux CSV files**.
  Neither project was vendored, executed or used to certify data.
- **Independent rice-paddy field contexts:** FLUXNET-CH4 sites JP-Mse
  (DOI 10.18140/FLX/1669647), KR-CRK (10.18140/FLX/1669649) and
  PH-RiF (10.18140/FLX/1669653), supported by
  https://doi.org/10.5194/essd-13-3607-2021. These are **eddy
  covariance** measurements with a different time and spatial footprint
  from the Gimje **static chamber** fluxes. FLUXNET uses -9999 missing
  sentinels, QC qualifier variables and potentially gap-filled records.
  Site-by-site file access, policy tier, flags and support must be
  reconciled before any statistical comparison.
- **External acquisition provenance:** official
  https://fluxnet.org/download-data/ and the BSD-3-Clause
  `fluxnet/shuttle` source are recorded as *manual acquisition leads*,
  not an executed ingest nor a verified citation of specific data bytes.

```sh
python3 tests/ieee-third-party-evidence-map.test.py
python3 scripts/ieee-third-party-evidence-map.py \
  --output /tmp/naft-ieee-third-party-evidence-map.json
```

The automated offline mapper reuses the already source-hash-verified
`ieee-gimje-replay-readiness.py`. It rejects fake external-file
downloads, revoked scientific gates, absent upstream method commit pins,
duplicate source IDs, malformed source DOI/URLs and attempts to pass
FLUXNET-CH4 towers off as chamber measurements. Its output has
**zero downloaded third-party bytes, zero third-party algorithms executed
and zero independent human reviewer attestations**. The new GitHub
Actions artifact is metadata only. Remote websites are NOT called by
CI and must be rechecked manually before actual external data intake.

An independent paper, a repository URL, or the presence of an unrelated
site is not an attestation of NaFT's measurements or credits. Genuine
cross-dataset validation requires comparable field-level data, method
and QC protocols, units, sampling support, per-site rights and
independent reviewer decisions. No seasonal integration, validated
field effect or certified credit is enabled by this link.

## Imported *independent* third-party data: gasfluxes five-series benchmark

A new separately attributed folder
[`independent-benchmarks/gasfluxes-v0.7-2/`](independent-benchmarks/gasfluxes-v0.7-2/)
contains the **unaltered first 20 observations plus header** from CRAN
`gasfluxes` v0.7-2, `vignettes/fluxmeas.csv`, upstream commit
`0a50f94bc7c1d6560bb5f32a596c7092d35c079c`.
The source's entire original Git blob hash and the imported 20-record
fixture's SHA-256 `b5ec601059dab6949a2ae5db8ebb741349ddd3e37a687fe4c4415df40b886f31`
are pinned in `oracle.json`. The separately licensed excerpt is
GPL-2.0-or-later; attribution is included in `ATTRIBUTION.md`.
**This is not the full source file.** The other eight third-party candidates
(including FLUXNET and PANGAEA) remain metadata-only and unacquired.

For each of the first five distinct source series `ID1`–`ID5`, upstream
`tests/testthat/test_gasfluxes.R` publishes golden `linear.f0`
and intercept (`linear.C0`) values. We **actually execute** two
source-independent algorithms on the imported raw numerical fixture:
a Python `Decimal` centered-covariance least-squares calculation,
and a Node `Number` OLS normal-equations calculation. Both compare
against independently published upstream R golden numeric results,
and a separate strict comparator cross-checks the two outputs.

```sh
python3 tests/ieee-independent-gasfluxes.test.py
node tests/ieee-independent-gasfluxes.test.cjs
python3 scripts/ieee-independent-gasfluxes-decimal.py --output /tmp/naft-ieee-gasfluxes-decimal.json
node scripts/ieee-independent-gasfluxes-node.cjs --output /tmp/naft-ieee-gasfluxes-node.json
python3 scripts/ieee-independent-gasfluxes-compare.py \
  --decimal /tmp/naft-ieee-gasfluxes-decimal.json \
  --node /tmp/naft-ieee-gasfluxes-node.json \
  --output /tmp/naft-ieee-gasfluxes-three-way.json
```

All five reference series must independently match the upstream expected
`f0` and `C0` within `1e-10` in original fixture units. Source byte
tampering, geometry mismatches, duplicate observation time, forged approvals,
missing series, and disagreement across independently implemented
algorithms are **fatal CI errors**. Artifacts are saved under
`ieee-independent-gasfluxes-three-way-replay` for 21 days.

This **verifies numerical reproduction of a separate published benchmark**,
not that original R source was run here, nor that the raw fixture's
concentration/time units and chamber calibration are verified. It does
**not** validate Gimje's original static chamber sensor values, assign
Gimje missing observation time, integrate seasonal methane, establish
mitigation effects, or issue carbon credits.
