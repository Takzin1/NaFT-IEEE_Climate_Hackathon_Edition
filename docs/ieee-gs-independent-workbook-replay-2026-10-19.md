# IEEE ClimateChain — source-bound Gold Standard workbook arithmetic replay

This is an **educational, deterministic replay of three exact formulas from a user-provided Gold Standard training workbook**, not an official emission reduction estimate or carbon credit verification.

## New architecture

1. **Version gate**: first reuse `routeRiceMethodology()` from `scripts/rice-methodology-router.mjs`. It rejects Verra/AG-005 substitution, incompatible project scale, unverified JP-Hrt eddy-covariance FCH4 direct-measurement claims, and incomplete claimed evidence. Gold Standard VVB checklist question 23 remains unresolved because its Tier 1/Tier 3 labels conflict with its own later section headings.
2. **Source-bound executable specification**: The workbook SHA-256 is `92ddfcf926ec2eaead54e674c06a608f8a29b8e6ff0698a0468aa29152cd8040`. The registry pins its cell address and literal formula. No arbitrary formula evaluation or Excel automation occurs.
3. **BigInt rational primary engine**: numeric operands MUST be decimal strings (up to 12 fractional digits, max 12 integer digits); native JS floating point is never used for the calculation. It rounds only the final *arithmetic exercise value* to twelve decimal places using half-away-from-zero.
4. **Independent Python Decimal oracle**: a separate implementation does not import the primary engine; it computes the same three expressions via Decimal and ROUND_HALF_UP. The CI exercises 41 independent inputs, including negative differences, 100% uncertainty rate, and 3 workbook-cache-derived examples.
5. **Re-verifiable integrity receipt**: The result contains request and reference-register SHA-256, original workbook SHA-256, source cell/formula, optional exact rational numerator/denominator, deterministic 12-digit decimal value, and receipt SHA-256. `verify` recomputes the entire receipt, rejecting falsified values, altered inputs and fake certified totals. **A SHA-256 checksum is not an external publisher signature.**

## Exact formulas replayed

| GS worksheet training lane | Original Excel cell | Literal formula | Input cells |
| --- | --- | --- | --- |
| `TIER_1_SIMPLIFIED` | `Tier 1_Simplified!E5` | `=E9*E10*E14/1000*E15*(1-E30)` | E9, E10, E14, E15, E30 |
| `TIER_2_COUNTRY_SPECIFIC` | `Tier 2_Country specific!E4` | `=(E8-E22)*(1-E60)` | E8, E22, E60 |
| `TIER_3_DIRECT` | `Tier 3_Direct measurement!E4` | `=(E8-E17)*(1-E49)` | E8, E17, E49 |

**Crucial distinction:** all output numbers are `TRAINING_WORKSHEET_ARITHMETIC_ONLY`, even when all claimed `evidence` booleans are `true`. The Excel caches from the actual uploaded workbook were used only to cross-check illustrative output at 12 decimal places; the original binary workbook is not committed to GitHub nor independently re-executed during CI.

| Lane | Rounded source cache inputs | 12-place replay |
| --- | --- | --- |
| GS Tier 1 | E9=1.463525166857, E10=1, E14=102, E15=28, E30=0.15 | `3.552853695062` |
| GS Tier 2 | E8=18.5891328, E22=11.38820304, E60=0.1 | `6.480836784000` |
| GS Tier 3 | E8=14, E17=4.52418, E49=0.1 | `8.528238000000` |

The original cache operands are represented here as rounded strings. These are **workbook exercise arithmetic results**, not verified annual net reductions, real-world field emissions, or issued/certified tCO2e. The exact source worksheet input calculation itself may depend on more subexpressions and input-sheet assumptions not encoded into this replay.

## Usage

Put this exact JSON in `training-request.json` (no additional arbitrary keys):

```json
{ "schema": "naft-ieee-gs-worksheet-replay-request-v1",
  "route": { "schema": "naft-rice-method-route-request-v1",
    "program": "GS_AWD_TRAINING_2024", "requested_lane": "TIER_2_COUNTRY_SPECIFIC",
    "project_scale": "LARGE", "practices": [],
    "evidence": { "country_specific_factor_source": true,
      "water_regime": true, "cultivation_period": true,
      "nitrogen_baseline_and_project": true, "diesel_use": true,
      "uncertainty_policy": true } },
  "operands": { "E8": "18.5891328", "E22": "11.38820304", "E60": "0.1" } }
```

```bash
node scripts/ieee-gs-worksheet-replay.mjs generate training-request.json > receipt.json
node scripts/ieee-gs-worksheet-replay.mjs verify training-request.json receipt.json
node tests/ieee-gs-worksheet-replay.test.mjs
python3 scripts/ieee-gs-worksheet-independent-oracle.py training-request.json
```

Status is `TRAINING_WORKSHEET_ARITHMETIC_ONLY` only if the *reference router* returns `REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED`. If it rejects missing claimed evidence or inappropriate methods, the replay receipt carries the block reason with `exact_value: null`. It does not let a partial/badly labeled case display numerical results.

## Explicit blocked boundaries

- Neither Gold Standard training Tier numbering nor Excel formulas are interchangeable with **Verra VM0051 QA1/QA2/QA3** or the separate Japanese J-Credit AG-005 versioned packs.
- The Gold Standard 2024 VVB checklist's Tier 1/Tier 3 Q23 inconsistency remains unresolved; no autonomous approval of methodology selection.
- The training worksheet contains illustrative GWPs and coefficients; they are not treated as independent current institutional conversion factors.
- Merely providing claimed evidence booleans **does not validate their raw bytes or institutional applicability**.
- The output includes no source JP-Hrt accepted QC, annualized field emissions, uncertainty-qualified real-world GHG reduction, financial/saleable credits, certified tCO2e, blockchain signing or official VVB attestation.
- The exact arithmetic program could be extended for research sensitivity exercises, but its output can never be relabeled as a certified result. Future science work must source independent, complete Verra or Gold Standard calculation programs and handle CH4/N2O/CO2, leakage and uncertainty.

## Verification coverage

The test suite covers exact positive worksheet values, real-workbook-cache example rounding, 41 independent JS BigInt-vs-Python Decimal parity cases, error status with null result, Verra/AG-005 rejection, missing/wrong cell input, nondecimal/negative/overflow literal, discount outside [0,1], wrong registry formula, forged receipt/hash and modified source inputs, stable deterministic replay, CLI generate/verify. It creates no downloaded dataset or on-chain operation.
