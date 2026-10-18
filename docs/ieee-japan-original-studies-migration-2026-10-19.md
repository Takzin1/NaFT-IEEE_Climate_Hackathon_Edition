# Original Japanese paddy field study aggregates — IEEE migration (2026-10-19)

**Status: published observational aggregates and independent numerical replay only.** This complements the IEEE source-origin and five-format CH₄ CSV/QC pipeline. Neither the original daily/chamber flux series nor site weather, calibration and soil covariates have been imported or authenticated.

## Provenance

Source snapshot: [Takzin1/NaFT at 380b6c5](https://github.com/Takzin1/NaFT/commit/380b6c5e9e8bef43056d15cc3a31cd83b5d098de), `data/japan-original-field-observation-aggregates.json`. The two source titles and published aggregates remain attributed to their DOI links. Metadata records that *full-text bytes were not independently hashed*; the output is **not** an AG-005 certified reduction or reconstructed raw observations.

- [Yagi et al. (1996), DOI:10.1029/96GB00517](https://doi.org/10.1029/96GB00517): same reported Japanese experimental site/year, continuous flood vs intermittent drainage (reported cropping season CH₄ mass). **1991**: 14.8 versus 8.63 g-CH₄/m² (difference 6.17 g/m² = 61.7 kg/ha); **1993**: 9.49 versus 5.18 (difference 4.31 g/m² = 43.1 kg/ha). Different calendar years must not be treated as a matched experiment.
- [Nishimura et al. (2004), DOI:10.1029/2003GB002207](https://doi.org/10.1029/2003GB002207): 2002 CH₄ 3180 + (-51) versus 3128 mg/m² annual (the **1 mg/m² rounding residual remains visible**). N₂O **reported as N**: 2.6 + 57.7 versus 60.2 mg-N/m² annual (0.1 mg-N/m² residual); N₂O molecular mass conversion **44/28** only when explicitly requested by the replay.

## Port and verification

- Exact Japanese `src/japan-field-study-replay.js` parser, independent `tests/japan-field-independent-oracle.test.py` with Python Decimal, read-only CLI `scripts/japan-field-observation-replay.mjs`, and original pinned aggregate JSON.
- Adapted `tests/japan-field-study-replay.test.js` to remove the **Japanese-only `gikuten.html` and browser fixture dependencies**. All scientific arithmetic, source-tamper and metadata/counterfactual guard checks remain; IEEE's public English browser is unchanged.
- The synthetic area/rate breakdown (**110 kg total = 95 area + 15 rate**) is a mathematical identity, **not a causal climate attribution**. Model-observation residuals are `UNATTRIBUTED` unless field/time/soil/weather/measurement context can be independently verified.

Run:

```bash
node scripts/japan-field-observation-replay.mjs
node tests/japan-field-study-replay.test.js
python3 tests/japan-field-independent-oracle.test.py
bash tests/run.sh
```

The IEEE app does not show these as live measured project reductions, cannot issue carbon credits and performs no blockchain wallet transaction. Original publisher PDF/CSV files remain unverified. This PR does not replace the earlier Itoh (2011) source preflight or the 2026 official NID reference table.
