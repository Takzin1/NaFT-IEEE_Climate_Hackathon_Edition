# NaFT — Version-Aware Climate MRV

**Problem — What needs re-verification when climate MRV rules change?** NaFT traces methodology and evidence dependencies so operators can identify which historical claims need review, and why.

**Try it in one step — [Open the live demo](https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain) → click “Run 100-claim methodology update.”** No installation, login or wallet required.

**Demo video — [Watch/download the 4:12 real-browser walkthrough (silent MP4)](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39035967949/artifacts/12102053650).** This is a GitHub Actions artifact ZIP; GitHub sign-in may be required. A publicly hosted, narrated version has **not** been confirmed.

> **Carbon markets need evidence that survives methodology change.** NaFT is a version-aware MRV evidence compiler and selective re-verification engine. Its Ethereum Sepolia evidence records package lineage, **not climate certification**.

**What the demo proves:** In a **synthetic 100-claim scenario**, 30 claims are flagged for re-verification, 70 are unaffected; of the 30, 15 are automatically re-evaluated and 15 require new evidence. This is **not** a measured carbon reduction or a 70% cost/time saving.

## IEEE ClimateChain 2026 — Independent repository

**Release status:** Public app, GitHub Pages browser smoke, core CI and [Sepolia source-bound read-only verification](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752142) have passed on `main` (October 17, 2026). The silent full-length demo is recorded; the narrated public video and Devpost submission are **not confirmed**.

| Resource | Link |
| --- | --- |
| Target repository | https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition |
| Source IEEE branch | https://github.com/Takzin1/NaFT/tree/hackathon/ieee-climatechain-2026 |
| Exact source snapshot | https://github.com/Takzin1/NaFT/commit/c87b534877293133ad92ac398b95936608bfd91b |
| Standalone public demo | https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain |
| Architecture SVG | [docs/assets/naft-climatechain-architecture.svg](docs/assets/naft-climatechain-architecture.svg) |
| Portable IEEE audit receipt | [Replay verifier + tamper challenge](docs/ieee-audit-receipt.md) |
| Devpost submission pack | [docs/ieee-submission-pack.md](docs/ieee-submission-pack.md) |
| Demo script | [docs/climatechain-video-script.md](docs/climatechain-video-script.md) |
| Automated real-browser video capture | [GitHub Actions capture runbook](docs/automated-video-recording.md) |
| Security/migration gate | [docs/DESTINATION_MIGRATION_STATUS.md](docs/DESTINATION_MIGRATION_STATUS.md) |

## Japanese observation normalization port (2026-10-19)

The [Japan-to-IEEE observation bridge](docs/ieee-japan-observation-migration-2026-10-19.md) ports the Japanese edition's strict offline methane interval-CSV loader and five typed observation/QC adapters (mg/g CH₄, eddy nmol/µmol and CH₄-C mass basis), plus positive/negative JavaScript tests, independent Python Decimal oracles and a **five-case cross-edition parity gate** against IEEE's already separate BigInt/Decimal research engines. Only synthetic test CSVs are versioned; no original publisher observations were fetched or authenticated, no partial-season methane total is inferred, and no J-Credit credit or Sepolia transaction is created. Run `node tests/japan-ieee-oracle-parity.test.mjs` or `bash tests/run.sh`.

## Original Japanese field-study aggregates (research replay)

[Two original Japanese paddy-field studies](docs/ieee-japan-original-studies-migration-2026-10-19.md) are now pinned as **published measured aggregates only**: Yagi (1996) within-year methane treatment contrasts, and Nishimura (2004) crop/fallow/annual CH₄ and N₂O-N reported totals with explicit rounding residuals. The transplanted replay is cross-checked by a separate Python Decimal implementation and excludes the Japanese Gikuten-only UI. This is **not raw flux reconstruction or Japanese J-Credit eligibility**. External environmental covariates, publisher source-file hashes and certified amounts remain unverified/null.

## IEEE independent Gold Standard training worksheet replay

[Source-bound exact arithmetic, Python Decimal independent oracle and verifiable receipt](docs/ieee-gs-independent-workbook-replay-2026-10-19.md) are now available for the original, user-provided **GS exercise workbook's three fixed formula cells**. A no-dependency BigInt rational engine recomputes only the Tier1/2/3 *educational worksheet expression* from explicitly supplied numeric cell operands; 41 test cases are cross-checked against a separate Python Decimal evaluator, with source/regulation route and receipt hashes bound to the source workbook. Wrong methodology/measurement, incomplete claimed evidence or forged numerical receipts **fail closed**. **Results are strictly training worksheet arithmetic, not real field methane estimates, official GHG reductions, verified credits or certified tCO₂e**. It does not silently upgrade VCS/Verra/J-Credit rules or JP-Hrt QC, and uses no blockchain writes.

## Source-bound Gold Standard / Verra rice formula routing

[Four uploaded rice-methodology originals](docs/rice-methodology-formula-routing-2026-10-19.md) were reviewed and SHA-256-pinned in an external-source register. A no-dependency, reference-only `scripts/rice-methodology-router.mjs` dispatches **Gold Standard training workbook Tier1 simplified/IPCC, Tier2 country factor and Tier3 direct measurement** to exact example formula cells, separately from **Verra VM0051 v1.1 QA1 model, QA2 direct flux **chamber**, and QA3 default factors**. The uploaded GS VVB checklist **Q23 contradicts its later tier headings and the exercise workbook**, so all GS lanes retain an unresolved source conflict requiring human program review. Verra QA2 never treats the unreviewed JP-Hrt eddy covariance series as accepted chamber measurements. All routes are `REFERENCE_ONLY` with **certified tCO₂e null**; no Gold Standard/Verra formula is silently made into Japanese AG-005 or an official credit. Targeted positive/negative CI validates the source registry, formulas, approach boundaries, special-practice QA2 restrictions and tampering.

## External eddy-covariance processing references (pinned, not installed)

[Seven source-verified external GitHub repo references and licensing review](docs/ieee-external-eddy-flux-repository-register-2026-10-19.md) preserve immutable commit/license blob IDs for FreqCor, OzFlux-footprint, ICOS FFP-utils, ONEFlux, REddyProc, PyFluxPro and NEON eddy4R. The reference paper Ueyama et al. (2012), Tellus B [DOI 10.3402/tellusb.v64i0.19048](https://doi.org/10.3402/tellusb.v64i0.19048), covers **CO₂/H₂O/heat**, not direct 2013 JP-Hrt CH₄ verification. All third-party code remains outside MIT-licensed NaFT and no forks, submodules or remote installs were created. GPL/AGPL and UC/LBNL attribution terms require explicit review before embedding. Local CI checks fail-closed source/commit/license/scope assertions.

## JP-Hrt doctoral-method-backed, fail-closed CH₄ QC preflight

[2015 doctoral dissertation source-bound QC preflight](docs/japanflux-jp-hrt-thesis-qc-2026-10-19.md) adds **actual primary methodological evidence** by investigator Shujiro Komiya (PhD thesis, PDF pinned by SHA-256; no PDF republished). For the 2013 **Japan/Hiratsuka** experiment the historical CH₄ instrument method was **closed-path eddy covariance** (CSAT3A / Picarro G2301-f), whereas the **Thailand** experiment used HREA. Thesis chapter 2.3.5 documents wind/u-star/rainfall/EC150 signal/stationarity/footprint exclusions and a separate **research-budget gap-filling regression**; the fitted budget must not be substituted for original observed-only JapanFlux2024 CSV values. A provisional check against 1,915 actual FCH4 numeric 30-min entries flags wind exclusions (8), low u-star (38), positive rainfall (20), union (63); **none are upgraded to externally verified QC** without missing signal/stationarity/footprint and source-specific data processing evidence. The thesis original formula uses mg CH₄/m²/s and by itself does not prove the later standardized CSV unit. No annual emission mass or credits are calculated.

## JP-Hrt v2.00 | multiresolution evidence conflict detector

[The new cross-resolution source audit](docs/japanflux-jp-hrt-v200-consistency-2026-10-19.md) compares the **actual 2013 native half-hour CH₄ source** with archived daily, monthly and yearly `FCH4` products and pinned site-method declarations. The original archive has 1,915 native `FCH4` numerical samples at 30-minute resolution, but **no numeric FCH4 aggregates** in DD/MM/YY. **1,689** native numeric samples precede the site BADM declared CH₄ measurement start `20130831`; the ADS metadata PDF describes HREA/chamber methods whereas the BADM CH₄ field describes closed-path eddy covariance. These are **unresolved provenance/measurement-method disagreements** and must **never** be silently interpreted as verified QC, annual CH₄ emissions or credits. The new `python3 scripts/japanflux-jp-hrt-v200-consistency.py ARCHIVE.zip SOURCE-PIN.json CROSS-PIN.json` is offline, source-hash-bound, fail-closed, includes CRLF support and emits only a `BLOCKED_SCIENTIFIC_INTERPRETATION` diagnostic report. Unit conversion remains disabled pending primary method/variable dictionary review.

## JapanFlux JP-Hrt v2.00 — real archive inspected

A **user-supplied real 153 MB v2.00 ADS dataset archive** (`A20241210-020_2.00_selected.zip`) was locally unpacked and inspected. [Site-specific JP-Hrt native-data intake](docs/japanflux-jp-hrt-v200-native-source-2026-10-19.md) provides a version-pinned parser and a real-data-derived audit profile (not synthetic): 17,520 half-hour rows from 2013, 1,915 nonmissing `FCH4` values, 15,605 missing values, 10.930365% presence coverage. Source archive/member SHA-256 fingerprints and CC BY 4.0 attribution are documented in `research/japanflux-jp-hrt-v200/`. Use `python3 scripts/japanflux-jp-hrt-v200.py export ARCHIVE.zip research/japanflux-jp-hrt-v200/source-archive-pin.json OUT.csv` to produce the **native, unconverted, QC-unknown** local measurements. The original ZIP is deliberately not committed. FCH4 flux units and measurement-method inconsistencies **remain under review**, so the rows are **not** promoted to the existing normalized/BigInt/Decimal integrators, and annual CH₄ mass, official AG-005 eligibility and certified credits stay `null`.

## Original-source intake: DOI/metadata/bytes preflight

[Source Provenance Gateway](docs/ieee-source-provenance-gateway-2026-10-19.md) adds an **offline, fail-closed** DOI and DataCite metadata snapshot consistency checker, raw-file SHA-256 verification, and source-identity/QC-documentation intake record. It is separate from scientific two-language replay and Japan's AG-005 formal-credit assessment. The `JP-Hrt` dataset is registered as **ORIGINAL_NOT_RETRIEVED** and cannot be promoted to verified measured flux. `node scripts/ieee-source-provenance-gateway.mjs inspect SOURCE.json [RAW.csv] [DATACITE.json]` produces an independently re-checkable local consistency report. No real external dataset, production DOI API call, AWS S3 Object Lock bucket, license approval or emissions certification is claimed; SHA equality and user-supplied DOI JSON alone **do not authenticate a scientific publisher**.

## Independent two-language validation for any submitted normalized CH₄ CSV

[Per-input independent replay](docs/ieee-per-input-observation-parity-2026-10-19.md) adds a **Python Decimal engine** and a cross-engine audit receipt over the existing JavaScript BigInt CH₄ observation adapter. Unlike the earlier fixed synthetic-oracle fixture, `node scripts/ieee-observation-dual-replay.mjs generate MANIFEST.json DATA.csv` now compares both engines on the **exact submitted local normalized data**. The `verify` command replays both implementations and binds input hashes, source versions, coverage, quality flags and outputs; disagreements and tampering fail closed. Independent numerical agreement **does not authenticate publisher measurements, scientific effects, project credits or official AG-005 factors**, and missing observations are never extrapolated to full periods.

## Local CH₄ observation audit receipt (source-bound)

The [observation receipt CLI](docs/ieee-observation-source-bound-receipt-2026-10-19.md) connects the imported Japan five-format CSV/QC intake to a deterministic, verifiable provenance artifact. It locks the **exact local CSV bytes, manifest bytes, two calculation-source files and replay output** and rejects changed, rehashed or context-swapped receipts. This extends the separate synthetic 100-claim audit without changing it. `node scripts/ieee-observation-receipt.mjs generate MANIFEST.json INPUT.csv` produces a JSON receipt; `verify MANIFEST.json INPUT.csv RECEIPT.json` recomputes it. Missing coverage never becomes a complete-period result; source publisher authentication, dual-engine execution on arbitrary uploads and carbon-credit certification remain explicitly **unverified**.

## External-source change preflight (experimental)

**New optional bridge:** `node scripts/ieee-source-snapshot.mjs compare old.json new.json` audits two operator-supplied, publisher-attributed JSON releases. It fails closed on locally declared catalog omissions/duplicate IDs and identifies added, removed or modified records; a source-bound `verify` command rejects tampered or rehashed reports. [Source format, commands and official Berkeley dataset candidate](docs/ieee-real-source-onramp.md).

**Honest scope:** No Berkeley workbook or other external field dataset has yet been ingested in the IEEE demo. This preflight identifies **data-drift review candidates**, not proven methodology-affected claims, real-world carbon impacts, verified source completeness or on-chain anchored outcomes.

## Asia research comparison: annual completeness & source-byte provenance

An [Asia–Japan research compatibility layer](docs/asia-mrv-baseline-parity-2026-10-18.md) supports CH4 / CH4-C and N2O / N2O-N unit interpretation, foreign JCM isolation and cross-region physical comparisons. The guarded `naftAsiaDeclaredAnnualCoverage()` adds **explicit declared season coverage** and rejects country, year, method, source, field, planted-area and missing-season drift. The previous seasonal aggregate is now labeled **recorded seasons only** (not automatically a complete year). All official credit outputs remain null.

Original uploaded Asia ZIP provenance can be reproduced separately with `python3 scripts/verify-asia-research-pack.py verify ORIGINAL_ZIP`; `python3 scripts/verify-asia-research-pack.py local` checks only the repository's normalized research excerpts and **does not** authenticate external publisher originals. Neither calculation nor source checks alter the IEEE 100-claim synthetic demo or create Sepolia transactions.

## Japan NID 2026 published coefficients + original observation onramp

A new [Japanese primary-evidence research onramp](docs/japan-2026-primary-evidence-onramp.md) keeps the original Itoh et al. (2011) nine-site experiment, JapanFlux2024 JP-Hrt measurement-data DOI, and NIES / Environment Ministry 2026 national inventory in distinct evidence classes. **18 actual published national-inventory coefficients** for *Tohoku, 2024* (Table 5-45; kg-CH4-C/ha, no extended midseason drainage) are transcribed directly from the official Chapter 5 PDF and pinned in [the research source table](research/japan-primary-evidence-2026-10-18/nid2026-tohoku-2024-table545.json). Read-only selector: `src/nid-2026-published-subset.mjs`. Original publisher PDF bytes are **not** yet independently SHA-256 authenticated.

The `src/japan-primary-evidence-preflight.mjs` stages source-attributed *unverified* NID factor candidates or future raw JapanFlux CH4 rows while blocking false official authorization, unverified units, missing flux gap-filling, mismatched chronology and counterfeit source claims. No J-Credit AG-005 factor is approved by this import, no annual or field emissions have been inferred from raw missing measurements, and **all certified/official project results stay null**. Run `node tests/nid-2026-published-subset.test.mjs` and `node tests/japan-primary-evidence-preflight.test.mjs`.

## J-Credit AG-005 v3.5 Rule Lock / GX-ETS isolated research logic

The new [Japanese AG-005 & GX-ETS gap specification](docs/ag005-gxets-rule-gap-2026-10-18.md) and [versioned research-source baseline](data/ag005-rule-gap-2026-10-18.json) are checked into the independent IEEE repository. **AG-005@3.5 remains `CONFIG_REQUIRED / UNSUPPORTED`** because authoritative PDF bytes, SHA-256, effective date, approved NID coefficient tables and transition rules have not been independently acquired. No certification or official credit outputs are emitted.

The reference-only [v3.3 research math module](src/ag005-v33-reference-math.mjs) tests exact organic-amendment interpolation/caps, drainage thresholds, drainage dates/heading cutoff, parcel area allocation, `16/12` CH₄-C unit conversion, and 3.3's **provisionally transcribed** `0.7` project EF. [GX-ETS fuel calculation](src/gxets-fuel-research.mjs) is deliberately a **separate domain**, rejecting purchased electricity and unsupported emission sources. Both use synthetic, unapproved coefficients and are **not institutionally validated**.

`node tests/ag005-v33-gxets.test.mjs` runs their exact-boundary tests. The existing synthetic IEEE 100-claim demonstration and Sepolia proofs remain unchanged.

## Japan AG-005 research calculation engine (fail closed)

The new [AG-005 research engine](docs/ag005-research-engine.md) accepts per-field area, years of drainage-date history, current drainage interval, field-bound SHA-256 evidence and explicitly **illustrative** seasonal methane factors. It calculates days relative to history and an **optional research-only CH₄ arithmetic preview**. It is **not** the legally applicable AG-005 rule pack, and cannot produce official J-Credit eligibility, certified tCO₂e or issued credits.

```bash
node scripts/ag005-engine.mjs example > /tmp/ag005-training.json
node scripts/ag005-engine.mjs evaluate /tmp/ag005-training.json > /tmp/ag005-result.json
node scripts/ag005-engine.mjs verify /tmp/ag005-training.json /tmp/ag005-result.json
```

The example is invented training data; the source research pack contains **no actual farm monitoring measurements** and does not supply binding coefficients. Incomplete cases become `CONFIG_REQUIRED` / `EVIDENCE_REQUIRED` rather than silently using academic means as official rates.

## Japan MRV research baseline (attributed; **not** certified field data)

The [2026-10-18 research baseline](data/japan-mrv-research-2026-10-18/baseline.json) normalizes **9 experimental treatment designs**, **3 selected study ratios with standard errors**, **4 program-level publicly reported totals**, and **10 AG-005 descriptive evidence fields** from the uploaded research compilation, with **16 source links and pinned original ZIP/file SHA-256s**. The [live demo](https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain) now links this baseline beside the separate synthetic rule-change scenario.

`node scripts/japan-mrv-baseline.mjs inspect` or `node scripts/japan-mrv-baseline.mjs site F3` gives a research-reference report that **fails closed** (`CONFIG_REQUIRED`, `EVIDENCE_REQUIRED`; calculated tCO₂ and eligibility `null`). The ZIP verifier validates the *supplied compilation's* bytes, not original publisher authenticity. **No official AG-005 coefficient, farmer monitoring data, source-document reuse license or J-Credit eligibility is implied.** [Provenance, source URLs, ZIP reproduction and full limitations](docs/japan-mrv-research-baseline.md).

## Three-pillar judge check

**Detect a corrupted evidence manifest → independently recompile changed and unchanged synthetic claims → inspect pre-existing P1/P2 lineage on Ethereum Sepolia.** In the [live app](https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain), click **Run 100-claim methodology update**, then **Verify all 3 pillars** and optionally **Download 3-pillar proof JSON**. The checker fails closed on manipulated classifications, counts or successor package hashes.

Reproduce the synthetic proof without an RPC or wallet: `node scripts/ieee-triad-proof.mjs generate /tmp/naft-three-pillars.json` then `node scripts/ieee-triad-proof.mjs verify /tmp/naft-three-pillars.json`. The separately run [read-only Sepolia check](scripts/verify-live-sepolia.sh) confirms recorded on-chain facts; the browser itself does **not** query live chain state. [Detailed reviewer protocol](docs/ieee-three-pillars.md).

## Four-step proof

1. Inspect the methodology/evidence change in the English ClimateChain UI.
2. Run the deterministic 100-claim **synthetic** experiment: 30 re-verify, 70 unaffected; of the 30, 15 auto and 15 needing evidence.
3. Examine dependency reasoning and package predecessor/successor records for example `CLIMATE-086`.
4. Inspect pre-existing real Ethereum Sepolia P1/P2 transactions and independent read-only verification.

**Boundaries:** the 30/70 ratios belong to a synthetic fixture. No measured farm carbon reduction, 70% cost savings, J-Credit certification, registry acceptance or credit issuance is claimed. Ethereum witnesses package hashes and lineage only.

## Technical scope

Pre-existing NaFT core: version-aware methodology packs, deterministic MRV evidence compiler, dependency/provenance graphs, change impact analysis, selective re-verification, human decision staleness, append-only successor packages.

IEEE-specific work: public-testnet lineage contract and source-bound verifier, ClimateChain judge-first UI and practical synthetic scenario, adversarial tests, responsive design, Devpost assets and video script.

### Run independent verification

```bash
bash tests/run.sh
node tests/climatechain-contract-behavior.test.mjs
bash scripts/verify-live-sepolia.sh
```

Solidity local EVM, browser smoke and history-security scanning are checked by [the latest successful `main` CI](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752123). The [independent Sepolia read-only verification](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752142) also passed on the **same release SHA** (`ea43dcbdb97b3c1cfa233784ae90577cbec56f69`), reconstructing recorded Solidity bytecode, P1/P2 calldata and events, and package lineage. Earlier October 17 RPC runs failed because public endpoints returned missing transaction/receipt data or HTTP 522/400; adding alternative public RPC fallbacks restored full read-only validation. This is evidence of testnet **lineage**, not independently certified emissions outcomes.

### Deterministic reviewer audit receipt (synthetic)

Run the 100-claim update on `#/climatechain` and select **Download reproducible audit receipt**. This captures each claim's re-verification status, dependency reasons, old/new package references and pinned synthetic Pack/workload SHA-256 values. Reviewers can replay the receipt against this exact checked-out source commit, using only Node 24:

```bash
node scripts/ieee-replay-audit.mjs generate /tmp/naft-ieee-audit-receipt.json
node scripts/ieee-replay-audit.mjs verify /tmp/naft-ieee-audit-receipt.json
```

**Run evidence tamper challenge** deliberately alters a synthetic source record without updating its expected hash and confirms the compiler rejects it. CI includes positive replay plus rehashed forgery, omission and status/count mutation negative controls. This is a source-bound *replay*, not an independent climate measurement, formal verifier signature or proof of evidence authenticity. The existing independent semantic oracle remains in `tests/impact-proof.test.js`. See [the audit lab protocol](docs/ieee-audit-receipt.md).


### Synthetic strategy benchmark (measured, not a savings claim)

In addition to receipt replay, run a reproducible **full-recompilation versus selective-impact** comparison. It uses the actual compiler in both strategies, checks predecessor/successor hash parity, and records timing samples and output work units separately:

```bash
node scripts/ieee-benchmark.mjs --sizes 100,200,500 --iterations 3 --output /tmp/naft-ieee-benchmark.json
```

**70 unaffected out of 100 is not 70% runtime, cost, or labor savings.** NaFT's impact analysis includes baseline compilation and graph work; the full comparison includes predecessor and all successor compilations. Empirical timing on your hardware is an observation, not a speedup guarantee. See [benchmark protocol and limitations](docs/ieee-strategy-benchmark.md).

### Cost impact (illustrative)

`node scripts/ieee-cost-estimate.mjs` (add `--json` for machine output) turns the analyzer's real plot counts on the synthetic 100-claim workload into a side-by-side **full versus selective** re-verification estimate. Rates live in [`config/cost-estimator.defaults.json`](config/cost-estimator.defaults.json) and are **unsourced assumptions — replace with real values** (`--hours-per-plot`, `--rate-jpy`, `--overhead-jpy`, `--jpy-per-usd`, `--total`, `--flagged`).

```text
Strategy                  | Plots | Hours | Cost (JPY) | Cost (USD)
Full re-verification      |   100 |   200 |     600000 |       4000
NaFT selective            |    30 |    60 |     180000 |       1200
Difference (illustrative) |    70 |   140 |     420000 |       2800
```

Illustrative estimate — not a measured saving, not a guarantee of CO2 reductions or credit issuance. The 30 selected plots are 15 auto re-evaluated + 15 evidence-required, all conservatively costed as reviewer work.

### Interactive synthetic Impact Explorer

The English `#/climatechain` demo now lets reviewers filter and select every synthetic claim. A source-bound trace shows the exact active-rule projection differences, old provenance-graph dependent nodes, SHA-256 hashes, predecessor/successor package references and blocked evidence requirements. Select `CLIMATE-001` (unaffected), `CLIMATE-071` (evidence needed), or `CLIMATE-086` (auto re-evaluated), then **Download selected trace JSON**. These are local engineering explanations, **not** independent GHG eligibility conclusions or chain submissions.

### Standalone publication gate

GitHub Actions includes public-only `deploy-pages` and a **post-deploy real-Chrome HTTP/UI smoke test**. The [October 17 `main` release CI](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752123) passed both checks, including public assets, the star logo, the 100/30/70/15/15 browser computation, P1/P2 links and the architecture SVG. No keys or chain transactions are required.

### Independent verification evidence

[Full IEEE migration and destination verification report](docs/INDEPENDENT_VERIFICATION_REPORT.md) records the historical 257-commit scan and original source-bound verification. For up-to-date, source-SHA-specific release evidence, use the [latest passing `main` CI](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752123) and [read-only Sepolia verification](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752142), rather than treating the older report as a live status page.

### Important origin distinction

Destination `main` preserves the original IEEE source HEAD as a real parent/ancestor of a two-parent migration merge commit. The destination bootstrap history remains its first-parent lineage. Eighty IEEE files were transferred byte-identically before destination-only changes, which are recorded separately. The original `NaFT/main`, Source PR #20, frozen refs, Sepolia contract and P1/P2 history have not been modified.

The original source deployment commit `fb9016c6c3041ec0e77098e631d62138fbae582e` and Sepolia transaction links deliberately refer to **Takzin1/NaFT**, where the witness was originally deployed. Do not rewrite historical source references merely to make them appear native to the new repository.

## License

See [LICENSE](LICENSE). This is a research prototype, not a certified carbon-credit registry, token minting service or operational claim of climate truth.

## Monsoon Asia published-reference parity checks (research only)

[Asia–Japan 2026-10-18 gap audit](docs/asia-mrv-baseline-parity-2026-10-18.md) and [provenance-locked comparison fixtures](research/asia-mrv-2026-10-18/fixtures.json) replay the published IPCC rounded worked example (410.47 Gg CH₄/year), check kg-CH₄-C ↔ kg-CH₄, distinguish annual and crop-season quantities, and prevent Philippines/Japan method transfer and Taiwan cross-year averaging. Run `node tests/asia-mrv-compat.test.js`. The full user-supplied Python ZIP remains separately archived; only normalized, selected fixture excerpts are committed. **Neither actual field measurements nor official approved Japan AG-005 rules have been added.**

## Cross-language IPCC/JCM independent oracle (research only)

[Independent stage/PH scope audit](docs/asia-ipcc-jcm-independent-oracle-2026-10-18.md): exact-rational JavaScript vs independently coded Python Decimal reproduction of IPCC 2019 worked-example EF rounding (410.472 vs 409.7277036 Gg CH4); Philippines PH_AM004 synthetic GWP, Ud schedule and optional reference / mandatory project pump conditions. Run `node scripts/asia-independent-replay.mjs`, `node tests/ipcc-stage-reference.test.mjs`, `python3 tests/asia-independent-oracle.test.py`. Never identifies real farm credit eligibility or certified reductions.

## Asia rice methane original-source metadata dock (2026-10-19)

[IEEE source-index Dock contract](docs/ieee-asia-source-dock-2026-10-19.md): 8 original dataset/study DOI references, 6 publisher-MD5-matched transient original file SHA-256 digests and site-specific CH4-C vs umol source-header guards imported unchanged from [Japanese NaFT PR #32](https://github.com/Takzin1/NaFT/pull/32). **Metadata and provenance only**, not raw scientific observations; no official climate credits, emission reductions or measurement simulation is inferred.

**Asia Dock second-stage guard:** The separate [IEEE Asia source acceptance gate](docs/ieee-asia-source-dock-2026-10-19.md) now audits the six upstream source-file fingerprint assertions against the eight-source catalog and refuses claims that the data were reproduced, licensed or certified. Run `node scripts/ieee-asia-dock-export.mjs`; this is metadata-only and does not alter the synthetic demo.

## Two-engine independent CH4 oracle (research-only, 2026-10-19)

[The standalone IEEE dual oracle](docs/ieee-independent-observation-oracle-2026-10-19.md) calculates eight synthetic period-methane cases across five unit types independently with BigInt and Python Decimal. A strict machine-readable parity gate checks UTC coverage, missingness, mass basis, nine-decimal totals and null regulatory claims. **No actual publisher field observations are reproduced**; the separate Asian source Dock remains metadata-only.
