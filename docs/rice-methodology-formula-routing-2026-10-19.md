# Rice methane: source-bound methodology and formula routing (2026-10-19)

**Reference-only. Not an implementation of institutional credit rules, not certification, and not a numerical carbon reduction calculator.** The four user-provided originals stay outside public GitHub; file hashes and selected formula references are committed in [source register](../research/rice-methodology-routing/source-formula-register.json).

## Four exact uploaded originals

| Source | SHA-256 | Notes |
| --- | --- | --- |
| Gold Standard scenario training PDF (2pp) | 77519262ddf83e00a3dd04f89be7cef46a79f534c50496f1c770325e5f1ef461 | Three classroom-style examples, not certified project results |
| Gold Standard Excel emission calculator (7 worksheets) | 92ddfcf926ec2eaead54e674c06a608f8a29b8e6ff0698a0468aa29152cd8040 | Formula cell evidence, no independent current approval |
| Verra VM0051 v1.1, dated 2026-07-14 (90pp) | 9b9738840824f5919e3a76f8807c68743ae3d64b5d931cda27598f3ab32c64e2 | Full rice cultivation methodology, formal adoption status not independently checked |
| Gold Standard AWD validation checklist v1.0, 2024-04-05 (DOCX) | 532ec2c31daf95d911367b2516a5e0c67d17ba47031457c89d9d55844217478a | VVB annex: CAR, CL, FAR and exact evidence references; NOT a replacement for the methodology |

## Gold Standard workbook: reference-only Tier routing

| Explicit lane | Exact original workbook cell and formula |
| --- | --- |
| TIER_1_SIMPLIFIED | Tier 1_Simplified!E5 = E9*E10*E14/1000*E15*(1-E30) |
| TIER_2_COUNTRY_SPECIFIC | Tier 2_Country specific!E4 = (E8-E22)*(1-E60) |
| TIER_3_DIRECT | Tier 3_Direct measurement!E4 = (E8-E17)*(1-E49) |

Workbook Input_ER!C3:C4 gives CH4 GWP 28 and N2O GWP 265 (its example AR5 factors, not universal official rules); Input_ER!D8:D10 gives water factor examples 1, 0.71, 0.55. The historical progress page ER!J9 uses F9*E9/12, a **training monthly approximation** that cannot automatically replace vintage-accurate accounting.

Scenarios in the Gold Standard supplied 2-page exercise: (1) small Southeast Asian project continuous flooding to AWD, two crops, straw 5t/ha, compost 1t/ha, 1000ha year one then 4000ha from year two: Tier 1 training lane. (2) South Asian project 12000ha, baseline country CH4 factor 1.05kg/ha/day, 112 days/crop, two crops, nitrogen rises 100 to 110kg/ha, diesel 0.5L/ha, exercise 10% uncertainty: Tier 2. (3) African project 10000ha, seasonally integrated measured CH4 baseline 420 and project 95kg/ha/year, diesel 0.5L/ha, project nitrogen 110kg/ha not exceeding baseline, exercise 10% uncertainty: Tier 3. **Exercises ask for annual averages; they do not provide approved answers.**

The spreadsheet has DIFFERENT editable illustrative Tier3 source factors at E11 = 500 and E22 = 120. Never confuse these with Scenario 3's 420 and 95, never automatically import them into a real project or treat an educational rate as a verified reduction.

### Critical Gold Standard checklist inconsistency

The same provided checklist, Selection of emission reduction calculation method table question 23, **labels Tier1 direct measurement and Tier3 IPCC defaults**, while later checklist section headings **label Tier1 IPCC values and Tier3 direct measurement**. The example Excel worksheet headings and scenario exercises support the latter mapping. This is an **unresolved internal-document inconsistency**. Do not silently correct the source or assert legal precedence. GS routes carry GS_Q23_TIER_LABEL_CONFLICT and require an authorized institutional/VVB methodology review before any production use.

Checklist pages around its opening require exact section/page/tab/cell references and VVB-registered CAR, CL, FAR findings; the router does not issue, close, or replace such findings.

## Verra VM0051 v1.1: not the same numbered system

Based on uploaded PDF pp.18-21 (Section 8.1), **QA1_MODEL** is biogeochemical modeling requiring calibration/validation; **QA2_DIRECT_CHAMBER** is direct methane flux-chamber measurement with baseline controls; **QA3_DEFAULT_EF** is default equation/emission-factor quantification. VM0051 section 4 (pp.9-10) gives applicability criteria and pp.8/12 require baseline cultivation records covering at least three years. Section 8.1 p.18 requires matching baseline and project quantification approach for the same GHG source within a monitoring period.

VM0051 p.20 states QA2 is required for certain interventions including methanotrophs, biochar, low-emission rice varieties, and some expert-recommended AWD drainage conditions. Appendix 2 pp.79-82 covers baseline/project flux chambers, >=3 points per stratum, >=3 air samples per chamber exposure, weekly CH4 sampling and handling/laboratory criteria. Section 8.5-8.6 pp.38-45 covers net reductions and uncertainty. Appendix 4 pp.85-87 gives DMRV guidance on independent ground-truth, satellite checks and independently testable ML/AI outputs.

**Important non-equivalence:** Verra QA2 chamber baseline-control experiments are not automatically fulfilled by JapanFlux JP-Hrt 30-min eddy-covariance FCH4, even if site source bytes are pinned. Likewise Gold Standard Tier2 country EF is NOT Verra QA2 measurement. Gold Standard/Verra are never Japanese AG-005: keep separate namespaces and output certified_reduction_tco2e: null.

## CLI and gate behavior

Run: node scripts/rice-methodology-router.mjs check-registry

Run: node scripts/rice-methodology-router.mjs route ROUTE_REQUEST.json

Run: node scripts/rice-methodology-router.mjs verify-sources SCENARIO.pdf CALCULATOR.xlsx VM0051.pdf GS_CHECKLIST.docx

Valid routing returns a formula **reference** and REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED, never numerical tons; absent inputs return BLOCKED_INCOMPLETE_EVIDENCE; incompatible size/instrument or mandatory QA2 practice returns BLOCKED_APPROACH_MISMATCH; selecting AG-005 via this external registry is refused. The optional local hash command verifies exact upload bytes, **not publisher authenticity**. No license-unreviewed full documents or executable spreadsheet formulas are copied into the repository.

Example JSON: 

    {"schema":"naft-rice-method-route-request-v1","program":"VERRA_VM0051_V1_1_2026","requested_lane":"QA2_DIRECT_CHAMBER","measurement_kind":"FLUX_CHAMBER","practices":[],"evidence":{"flux_chamber_baseline_and_project":true,"at_least_3_sample_points_per_stratum":true,"weekly_during_cultivation":true,"historical_lookback_3years":true,"controlled_irrigation":true}}

Even fully populated booleans are only **claims of evidence presence**, not reviewer certification. Missing actual GHG boundary calculations (N2O, fossil CO2, leakage), consent, field records, current program rules, QA/QC and uncertainty means NaFT must never calculate or advertise a verified credit.
