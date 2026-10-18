# AG-005 / GX-ETS current-vs-reference formula audit (2026-10-18)

**Scope:** current `src/ag005-research-engine.mjs` (illustrative CH₄ kg/ha/season), newly added `src/ag005-v33-reference-math.mjs` (kg CH₄-C/ha/year with user-supplied Ver.3.3 clauses), and separate `src/gxets-fuel-research.mjs` (t CO₂). This is a **code-and-test audit**, not a live independent reading of AG-005 Ver.3.5 or METI source PDFs. Source lock remains `CONFIG_REQUIRED`.

## Root-cause matrix

| Case | Before | Fix | Audit gate |
| --- | --- | --- | --- |
| GX-ETS fuel use changed | `compareGxEtsBoundary` looked only at `boundary` and could return `UNCHANGED` for doubled fuel use | Compare `source_type`, `fuel`, `factors`, `boundary`; rerun fuel reference calculation on every safe change | `GX_VOLUME_CHANGE` |
| GX-ETS heat/carbon factor changed | unchanged boundary hid new CO₂ figure | Same dependency-aware replay; reject invalid quantity/factor units | `GX_FACTOR_CHANGE` |
| AG-005 evidence hash reported good by caller | `evidence_hash_valid:true` bypassed changes to raw bytes | Independently recompute SHA-256 over UTF-8 `raw_evidence_bytes`; require matching `expected_evidence_sha256` and never honor a boolean self-assertion | `AG_EVIDENCE_REHASH` |
| AG-005 nested field reorder | Plain `JSON.stringify` might report meaningless difference due solely to key insertion order | Canonical lexicographic object key serialization for diffs | `AG_CANONICAL_ORDER` |
| AG-005 heading before water-management start | Reference evaluator returned an apparent normal day decision with zero project days | Reject impossible heading/start chronology | `AG_BAD_HEADING` |
| AG-005 baseline cycle overlapping current project | Future or overlapping baseline was accepted as historic | Reject baseline that ends on or after the project start date | `AG_BAD_HISTORY` |
| Decimal memory exhaustion | BigInt decimal accepts arbitrarily long user-controlled strings | Cap decimal input length at 120 digits for reference calculator | `AG_DECIMAL_BOUND` |

## Comparison of existing and new arithmetic

**Critical: the pre-existing 2.52 and the new 2.268 results do NOT represent a defect in multiplication.** The old synthetic training example assumes `180 → 120 kg CH₄/ha` (ratio `0.6667`). The newly transcribed Ver.3.3 illustrative reduction factor is exactly `0.7`, so comparable research operands are `180 → 126 kg CH₄/ha`. Even equal arithmetic cannot be expected to produce the same total on different assumptions.

Normalization test: convert baseline `180 kg CH₄` to `135 kg CH₄-C` using `12/16`. With area `1.5 ha` and synthetic GWP `28`:

```text
Existing CH4 mass model:   1.5 × (180 − 126) × 28 / 1000 = 2.268 indicative tCO2e
New CH4-C reference math: 1.5 × (135 − 94.5) × (16/12) × 28 / 1000 = 2.268 indicative tCO2e
Earlier legacy demo:      1.5 × (180 − 120) × 28 / 1000 = 2.52 indicative tCO2e
```

This tests *mass-unit conversion and algebra only* with purpose-built synthetic values. The old denominator is per synthetic **season**, the new one per **year**, so true scientific parity requires verified temporal/seasonal compatibility; do **not** assume it for real-world data. Official coefficients, adoption/version dates, aggregation/rounding and third-party certification remain unverified.

Independently check multi-segment reference arithmetic with two synthetic strata: `[2 ha × 100 kg CH₄-C, 1 ha × 50 kg CH₄-C]`, illustrative GWP `30` and project ratio `0.7`: baseline `10`, project `7`, difference `3 indicative tCO2e`.

## Tests and CI

```bash
node tests/ag005-engine.test.mjs
node tests/ag005-v33-gxets.test.mjs
node tests/ag005-formula-parity-regression.test.mjs
bash tests/run.sh
```

The new regression tests explicitly change fuel use, heat/carbon factors, purchased-electricity boundary, raw evidence bytes, the expected hash, heading date, historic cycles and formula units. They also test tamper even when an input reports `evidence_hash_valid:true`, and prevent past false `UNCHANGED` states.

**Trust boundary:** a matching digest checks local bytes, not source authenticity; rehashing an amended file still triggers `REVERIFY_REQUIRED` and stales old human reviews. `RESEARCH_ONLY`, `official_amount:null`, `credits_issued:null`, and `official_reportable_tco2:null` remain unchanged. Neither contract nor recorded Sepolia transaction is modified.

**Remaining gap:** AG-005 Ver.3.5 official PDF SHA-256, amendment diff, NID source coefficient table and approved rounding; METI fuel-specific current factors and organizational emissions boundary. No production certification logic is unlocked by these fixes.
