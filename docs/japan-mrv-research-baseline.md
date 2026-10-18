# NaFT Japan MRV Research Baseline — 2026-10-18

## Source, scope, and reproducibility

This baseline was normalized from the user-supplied **NaFT_Japan_MRV_Research_DataPack_2026-10-18(1).zip**, inspected and extracted into seven files on 2026-10-18. The archive's SHA-256 is:

`73d59baa3819342f56bb42c873571b6707c5c9853f23d8bd8d9ccf309cc2a076`

The canonical, searchable, source-attributed representation is [baseline.json](../data/japan-mrv-research-2026-10-18/baseline.json), which pins SHA-256 for the six supporting text/CSV/manifest files. The original uploaded ZIP is **not** committed here because source PDF/workbook redistribution permissions remain unverified. Anyone with an authorized copy can reproduce and validate the exact ZIP and each source-table transcription:

```bash
python3 scripts/verify-japan-research-pack.py '/path/to/NaFT_Japan_MRV_Research_DataPack_2026-10-18(1).zip'
node scripts/japan-mrv-baseline.mjs inspect
node scripts/japan-mrv-baseline.mjs site F3
```

The first command should return `RESEARCH_BASELINE_REPRODUCED`; it checks exact uploaded bytes, six file hashes, four CSV table row counts and every normalized data transcription. It does **not** check whether the original MAFF PDFs or academic paper itself matched the transcriber or can legally be redistributed. The two Node commands generate a bounded, machine-readable research-reference report; the case `F3` describes a *reported trial treatment design in Koriyama* (14 days conventional, 21/28 experimental), **not an actual monitored farm claim**.

## What the normalized pack includes

| Granularity | Contents | Source reference |
| --- | --- | --- |
| Experimental design only | 9 study sites (2008–2009) | [MAFF/NARO slide reference](https://www.maff.go.jp/chushi/seisan/hukyu/attach/pdf/smart-40.pdf) (S03) |
| Selected treatment study aggregate | 69.5 ± 3.4% seasonal CH₄, 72.0 ± 3.1% 100-year GWP and 96.2 ± 2.0% rice yield, relative to conventional; **standard errors, not uncertainty for a particular farm** | [Itoh et al. (2011), DOI](https://doi.org/10.1016/j.agee.2011.03.019) (S04) |
| Published operator/program total | 2024 MAFF announcement: 6,220 / 5,955 / 114 tCO₂ for three reported programs; separate 2025 operator self-report of 1,629 tCO₂ | [MAFF announcement](https://www.maff.go.jp/j/press/kanbo/b_kankyo/240126.html) (S05), [operator page](https://www.tanakaind.co.jp/j_credit/index.html) (S09) |
| Descriptive fields, NOT a complete runnable method pack | Ten AG-005 reference evidence fields: monitoring dates, historic years, soil/organic input stratum, region, area and approved factor | [MAFF guide](https://www.maff.go.jp/j/seisan/kankyo/ondanka/attach/pdf/index-175.pdf) (S02) |
| Citations | 16 inventoried references including some competition context sources | See `baseline.json.sources` |

The values in this table were supplied in the uploaded research compilation, not independently fetched and cross-checked against complete original documents during this import. Numbers must be treated as **attributed/transcribed** until originals are verified.

## Three distinctly different baselines

1. **Research conventional comparator**: specific experimental control/treatment designs, selected relative ratios and SE. These do not provide daily methane observations or country-wide emission factors.
2. **AG-005 legally applicable project counterfactual**: requires officially adopted full methodology/version, applicable stratified emission coefficients, farmer monitoring records, original source verification, human/official acceptance and any required monitoring rules. **CONFIG_REQUIRED / EVIDENCE_REQUIRED** is the only valid outcome with this pack alone.
3. **Published operator totals**: examples of externally reported certified-program tonnes, never a substitute for any individual paddy plot's area, evidence, methane flux, baseline or authorized credit transaction.

The CLI **does not calculate tonnes or infer J-Credit eligibility**. It deliberately exports `calculated_tco2: null`, `jcredit_eligibility: null`, `credits_issued: null`, `CONFIG_REQUIRED` and `EVIDENCE_REQUIRED`. It uses no RPC endpoint, and does not submit or change the existing Sepolia P1/P2 provenance. The 100-claim rule-change demo uses the separate NAFT-SYNTHETIC packs and is intentionally *not* connected as though these were farmer claims.

## Improvements introduced

- **Fail-closed source/version guard**: source table coverage, source IDs, expected types, units, research ratios and immutable submitted archive hash are checked. Claims of raw field data or implemented official rule packs are rejected rather than promoted.
- **Adversarial negative tests**: missing/duplicated sites, unexpected unit, altered study ratio, forged origin SHA, operator total misclassified as farm observations, unknown source, and missing mandatory AG-005 field produce explicit failures.
- **Browsable demo reference**: a real-world context card links the research baseline and audit protocol, visibly labeled separately from the synthetic live demo.

## Next research work before claiming real-data MRV validation

Secure permission to retrieve/use original MAFF and study files; record their actual downloaded byte hashes and license terms. Obtain raw field-level monitoring measurements with farmer consent or suitable public license and confirm real adopted AG-005 coefficient strata. Convert *only independently verified* methodological rules into a new reviewed pack with traced source sections. Introduce a farm-level measurement adapter and controlled field pilot; rerun current compiler regression + the 614 adversarial cases. Claims of verified carbon reductions should remain disabled until those preconditions are met.

**No authoritative current AG-005 method version, real farmer credit issuance, or original-source-byte authenticity is established by this dataset alone.**
