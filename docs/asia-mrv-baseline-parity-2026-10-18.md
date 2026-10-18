# NaFT Asia–Japan MRV baseline parity & gap audit (2026-10-18)

**RESEARCH_ONLY / NOT_CERTIFIED.** This document accompanies identical JS calculation guards in the IEEE and Japanese repositories. The user-supplied ZIP `NaFT_Asia_MRV_Research_And_TestPack_2026-10-18(1).zip` was extracted and all included checksums matched, then its original Python benchmark (21 cases) and seven-case published-reference verifier passed locally before integration.

**Source ZIP SHA-256:** `f8d4460d8a6e3fa4129469a7e4df5995998d82484a90b7a75fdd8b610e933406`.
The GitHub directory `research/asia-mrv-2026-10-18/` contains **normalized, selected excerpts** (fixtures and source index) from that ZIP rather than the entire original unmodified archive. The original archive and its full Python code remain a separate downloadable research package. The SHA identifies the upload, **not the downloaded publisher originals**. Source material was transcribed by the research package; publisher bytes, licenses for redistributed copies, and real field flux files remain unverified.

## Three independent comparison domains

| Domain | Data baseline | Calculation / requirement | What the gate proves |
| --- | --- | --- | --- |
| Japan J-Credit AG-005 v3.3 historical reference | kg-CH₄-C/ha/year, regional and stratified EF | `area×(EF_BL−EF_PJ)×16/12×GWP×0.001` | Safe CH₄-C↔CH₄ arithmetic comparison for same crop year/field; **not v3.5 adoption** |
| IPCC 2019 national inventory | kg-CH₄/ha/day × crop days × harvested area | `Σ A×EF_daily×days / 1e6` | Replays 410.472, published **410.47 Gg CH₄/year** from rounded IPCC Table 5.14 inputs |
| Philippines JCM PH_AM004@1.0 | CH₄, N₂O, drainage pump CO₂ as tCO₂e | `(RE−PE)×(1−Ud)`; synthetic 50 × 0.95 = 47.5 | Requires all three gas components, recorded method boundaries and PH-only 5/10/15% research deductions |

**Source links:** [IPCC 2019 Refinement chapter 5](https://www.ipcc-tfi.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch05_Cropland.pdf), [JCM PH_AM004](https://www.jcm.go.jp/jc/wp-content/uploads/sites/3/JCM_PH_AM004_ver01.0.pdf), [Japan J-Credit methodology index](https://japancredit.go.jp/about/methodology/), [METI GX-ETS](https://www.meti.go.jp/policy/energy_environment/global_warming/ets.html).

## Discovered gaps and corrective safeguards

1. **Identity not bound:** Original ZIP Python `strict_cross_edition_comparison` checks jurisdiction, methodology and season, but not field ID, soil or water regime; otherwise physically different fields can produce misleading comparison. The new JS contract requires assertion ID, field ID, country, soil/stratum, water regime, period/season identity, area basis, gas and provenance. This is still **operator-provided metadata, not attested field identity**.
2. **Mass-basis mismatch:** IEEE prototype uses kg-CH₄/ha/season; Japan v3.3 reference uses kg-CH₄-C/ha/year. No implicit year-to-season conversion; mass conversion allowed `CH4_C×16/12=CH4` **only for otherwise identical physical context**.
3. **Methodology transfer:** The `naftAsiaRegulatoryFactorGate` fails for cross-country, cross-method/version and cross-period factors. Even when identifiers match, it returns `CONFIG_REQUIRED` and `regulatory_factor_usable:false`; real Japan institutional admission is not implemented.
4. **Missing gases:** Philippines PH_AM004 must not silently omit N₂O or pump CO₂. Its uncertainty deductions cannot be used in Japan AG-005.
5. **Seasonal percentage error:** Taiwan observations from 2023 second crop and 2024 first crop must **never** be averaged to fabricate one year's rate. Annual estimates require matching calendar year, field and source units, and weighted *absolute amounts*.
6. **Negative reductions:** PH formula can yield negative research net reductions; no automatic zeroing or issuance is inferred.
7. **No real costs proved:** NaFT's 30/70 claim split, labor-hour assumptions and $ conversions remain scenario exercises, not measured efficiency or carbon impact.

## Reproducing current in-repo tests

```bash
node tests/asia-mrv-compat.test.js
bash tests/run.sh
```

The original ZIP's separate 21 Python tests and seven-fixture checker were executed before import; for complete re-execution, extract the original ZIP and follow its README. They are not yet part of GitHub Actions because their upstream Python files were not mirrored into this repository.

## Highest-priority engineering follow-ups

- **P0** Independently retrieve and hash the actually applicable AG-005 v3.5 original method/version and year-specific emission factor tables before implementing certified calculations.
- **P0** Develop a typed scientific quantity model (gas, mass basis, area, crop/season/day, geography, provenance and uncertainty) with *no silent duration conversion*.
- **P1** Unit-check sample source tables and official farm simulator outputs using independent observers and exact arithmetic/defined rounding; compare all method-specific gases as required.
- **P1** Obtain consented field records or open-licensed originals, verify sensor calibration and source identity.
- **P1** Expand adversarial tests for malformed IDs, temporal discontinuity, field lineage, multi-harvest accounting, measured uncertainties, and document-to-rule dependencies.
- **P2** Replace assumed equal labor time per flagged claim with measured per-status effort; keep cost arithmetic separate from tCO₂e.
