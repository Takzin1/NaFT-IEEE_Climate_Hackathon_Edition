# NaFT — independent IPCC/PH_AM004 reference arithmetic

Date: 2026-10-18. **Research-only. No J-Credit/JCM-certified result or GX-ETS report.**

## Primary documents checked

- [IPCC 2019 Refinement Vol 4 Chapter 5, Tables 5.14B/C, printed p.5.59](https://www.ipcc-tfi.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch05_Cropland.pdf): published rice-cultivation example, daily adjusted CH4 emission factor rounded to 2 dp, annual harvested area and growing days. HTML-extracted table and page image independently inspected. Original PDF bytes not separately hashed.
- [JCM Philippines PH_AM004 Ver1.0](https://www.jcm.go.jp/jc/methodologies/ph-am004-ver1-0/) and [approved methodology PDF](https://www.jcm.go.jp/jc/wp-content/uploads/sites/3/JCM_PH_AM004_ver01.0.pdf): Section E requires project drainage-pump CO2 while reference pump CO2 is optional; Section H establishes Ud 0.05/0.10/0.15 subject to specified CH4 measurement methods and intervals; Section I fixes AR5 GWP_CH4=28 and GWP_N2O=265. These do **not** determine Japan AG-005 factors.
- [J-Credit methodology index](https://japancredit.go.jp/about/methodology/): current AG-005 v3.5 original, applicability, geographic factors and rounding remain **unverified by this calculation lab**.

## Newly discovered rounding-stage discrepancy

Using the IPCC table's **displayed** daily CH4 EF (rounded 2 dp) before multiplication:
\`sum(harvested_area_ha_year × adjusted_EF_2dp_kg_CH4_ha_day × season_days / 1e6) = 410.472 Gg CH4/year\`, printed **410.47 Gg**.

Without rounding EFi after \`EFc × SFw × SFp × SFo\`, exact computation yields **409.7277036 Gg**. The difference is **0.7442964 Gg**. This is a *worked-example numeric stage choice*, not observed emissions and not an error in the IPCC example. **Never assume 2dp is the rounding rule for Japanese J-Credit.**

## Separate oracles, with deliberate scope boundaries

1. \`src/ipcc-stage-reference.mjs\`: BigInt rational JavaScript, pinned IPCC printed 5-row source values, intermediate 2dp rounding, reject modified published cells.
2. \`tests/asia-independent-oracle.test.py\`: an **independently coded Python Decimal** oracle, separately pinned printed source values, replays Node output and checks row totals, alternative no-round computation, PH 4 Ud cases, zero rows, altered inputs and negative cases.
3. \`src/ph-jcm-explicit-boundary.mjs\`: reference pump optionally omitted **only with explicit metadata** \`OMITTED_PER_PH_AM004_REFERENCE_OPTIONAL\`; project pump must be supplied even if 0. Requires supplied scope/evidence flags but does not independently authenticate them.
4. PH gas-mass synthetic calculation: \`kg_CH4 × 28 /1000\`, \`kg_N2O_N × 44/28 ×265/1000\`, then optional pump tCO2. The method's specific AR5 GWP values are not transferable to Japan AG-005.

Commands:

\`\`\`bash
node scripts/asia-independent-replay.mjs
node tests/ipcc-stage-reference.test.mjs
python3 tests/asia-independent-oracle.test.py
bash tests/run.sh
\`\`\`

These tests verify scientific calculation contracts only. Research inputs are synthetic or transcribed printed examples; **not** original field measurements. Source URL alone is not proof of authenticity. No official Japanese methodology applicability, issuance, soil stratum identity, soil/water sample representativeness or actual financial savings is asserted.

**Next gaps:** obtain/verify version-pinned official AG-005 source and NID factors; incorporate actual monitoring records, calibrated observation uncertainty and full jurisdiction-specific eligibility; enforce relevant method-defined rounding at each intermediate stage; obtain independent human reviewer verification.