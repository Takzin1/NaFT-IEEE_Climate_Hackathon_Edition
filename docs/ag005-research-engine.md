# AG-005 research calculation engine (Japan rice-paddy drainage)

**Status: research-only arithmetic sandbox — NOT J-Credit eligibility or a legally valid AG-005 credit calculator.** This is a first executable input/checking layer using source-referenced research and an explicit invented sample. It cannot replace the officially adopted, effective AG-005 methodology and its evidence, coefficients, stratification and approval procedures.

## Why separate from the existing official-looking pack?

The repository's `AG-005@3.1-reference` is a pinned *public-comment reference* whose adoption, time period and full official formula have **not been independently confirmed**. Its institutional calculation remains `UNSUPPORTED` and factors remain `CONFIG_REQUIRED`; this PR deliberately does not rewrite those guards. The research dataset [dated 2026-10-18](../data/japan-mrv-research-2026-10-18/baseline.json) contains nine research-site *design summaries*, three mean-and-SE study ratios, four program-aggregate totals and ten evidence field labels — not actual farm methane readings or a complete official AG-005 coefficient table.

## What actually runs

- `src/ag005-research-engine.mjs`: pure, deterministic, no-network research input evaluator. It requires field identity and positive area, a project water-management start/end and **at least two historical observation periods as an engineering policy (not confirmed statutory rule)**. Computes inclusive drainage days and days relative to historical maximum/mean.
- Four bound, byte-hash-checked evidence categories: `baseline_history`, `objective_start_end`, `field_area`, `production_record`. Evidence text matching a stored SHA-256 proves only that the bytes match; it **does not prove that an observation is true**. Evidence ID duplication, claim/field mismatch and changes without digest updates fail closed.
- An **optional illustrative factor comparison** for fully supplied example evidence: `area_ha × (synthetic_baseline_CH4_kg/ha/season − synthetic_project_CH4_kg/ha/season) × synthetic_CH4_GWP100 ÷ 1000` in **indicative tCO₂e**, not J-Credit tonnes. This formula is a scientific unit-conversion illustration, **not a verified AG-005 formula**. It excludes N₂O, leakage, additionality and other institutional adjustments. A negative result represents an increase in modeled emissions and is not clipped into an invented credit.
- When research factors are missing, the status is `CONFIG_REQUIRED` and `arithmetic_preview` is `null`. When evidence categories are missing, status becomes `EVIDENCE_REQUIRED`; when unsupported special cases are declared, status becomes `HUMAN_REVIEW_REQUIRED`; both suppress any preview.
- No matter what values are entered, `official_outputs.methodology_compliance`, `approved_emission_reduction_tco2e` and `credits_issued` remain **null**; `certification` stays false.
- Re-evaluates input dependencies in `compare` and emits source-bound SHA-256 reports that a third party can replay with the exact input, rejecting a modified report **even if its top-level SHA-256 was recomputed by an attacker**. It does not write blockchain transactions or replace the existing Sepolia P1/P2 provenance.

## Run the example

Requires Node.js 24+, no npm packages or internet access:

```bash
node scripts/ag005-engine.mjs example > /tmp/ag005-training-input.json
node scripts/ag005-engine.mjs evaluate /tmp/ag005-training-input.json > /tmp/ag005-training-result.json
node scripts/ag005-engine.mjs verify /tmp/ag005-training-input.json /tmp/ag005-training-result.json
```

The example is **wholly invented**: baseline 14 days in 2023 and 2024; project 21 days in 2025; 1.5 hectares; hypothetical seasonal factors 180/120 kg CH₄/ha and hypothetical CH₄ GWP100 of 28. Its resulting arithmetic preview is **2.52 indicative tCO₂e**. Neither the periods nor any of those factors are observed in the uploaded research data; the overlap with a 14-to-21 day trial-site *design* is not validation.

To compare source-bound effects after changing the input:

```bash
node scripts/ag005-engine.mjs compare /tmp/ag005-training-input.json /path/to/modified-input.json
```

File inputs are capped at 500 kB. No uploads or external transmissions occur. The tool records evidence content hashes but the example contains fake text files only — **never put unconsented farmer personal data into a public repo**.

## Validation and boundaries

Run `node tests/ag005-engine.test.mjs` (also part of `bash tests/run.sh`). Negative cases cover fake official adoption, forged factor provenance, invalid dates, duplicate history, evidence tamper, wrong field/claim binding, missing receipts, special cases, invalid units/types, negative modeled effects, and forged reports.

**Source pointers (not rechecked live in this task):**
- [Japan J-Credit methodology collection](https://japancredit.go.jp/about/methodology/).
- [MAFF agriculture mitigation and supporting PDFs](https://www.maff.go.jp/j/seisan/kankyo/ondanka/index.html).
- [Research baseline reproduction and caveats](japan-mrv-research-baseline.md).

## What is NOT completed

The current adopted AG-005 method version and adoption date, binding reference coefficients, all stratification and applicable agricultural practices, accepted historical-year minimum, equation and GWP period, monitored field observations, data-provider consent and independent source authentication, and formal J-Credit auditing/certification remain **unverified**. Therefore this is **not** a production J-Credit engine. Those inputs require official source verification, a versioned approved rules translation with test vectors, and review by a qualified domain practitioner before official claims can be enabled.

For the IEEE demo, present it as **Japan-specific validation infrastructure + honest missing-evidence flags**, not emission credits calculated for real farmers.
