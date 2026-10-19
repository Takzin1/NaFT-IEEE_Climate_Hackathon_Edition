# IEEE Selective Re-verification — Gold Standard training formula batches

**Research-only engineering lane.** This extension demonstrates why a source-bound re-verification engine should *retain an unchanged, already-verified calculation*, while recomputing only a subset of changed **educational Gold Standard worksheet requests**. It **does not** update NaFT's production MRV claim graph or change the official AG-005 reference configuration, JapanFlux CH₄ QC, Verra VM0051 rules, Ethereum Sepolia records, financial credits or the original 100-claim/30-flagged synthetic ClimateChain demonstration.

## How the selective algorithm operates

Each case supplies `case_id`, `baseline_request`, `baseline_receipt`, and `proposed_request`. The baseline receipt must be the original full source-bound receipt from `scripts/ieee-gs-worksheet-replay.mjs`. The engine:

1. **Validates every baseline** by recomputing its original Gold Standard teaching calculation with the *current, pinned four-source registry* and comparing the entire receipt, not merely its SHA-256. If the source register, formula cell, operands or alleged result disagree, it fails the **whole** batch closed. This intentionally does **not** automatically transplant historical baselines across unverified methodology revisions.
2. **Compares the full input tree** (requested tier, project scale, claimed-evidence booleans, practices, measurement type, spreadsheet operands). A change of evidence or methodology without a numeric change is **still an impact**. Each changed field is reported as a stable JSON path such as `route.evidence.cultivation_period` or `operands.E8`.
3. **Retains** a wholly identical, freshly verified baseline receipt, without invoking the proposed numerical calculator a second time.
4. **Replays only changed requests** through the previously tested JS BigInt rational arithmetic and worksheet router. Changed-but-still-blocked requests report `proposed_worksheet_training_value: null`. Previously blocked cases with newly supplied claimed evidence can yield **training-only** numerical values, but cannot be certified.
5. Reports the **exact rational numerical difference** of two exercise results, displayed with half-up rounding at 12 fractional digits, whenever both old and new requests are numerically calculable. It never calls that difference environmental emission reductions, carbon credit value, official issuance or annual field CH₄.
6. Sorts case IDs for stable output and binds the entire request, pinned source registry, original worksheet calculator and router source **byte hashes** to a new deterministic report SHA-256. The receipt is a reproducibility checksum, **not** a digital signature or proof of the publisher's original ZIP/files.

The explicit outcomes are `RETAINED_SOURCE_VERIFIED`, `REPLAYED_ARITHMETIC_CHANGED`, `REPLAYED_ARITHMETIC_UNCHANGED`, `REPLAYED_BLOCKED_BY_METHOD_OR_EVIDENCE`, and `REPLAYED_NEW_TRAINING_VALUE_HUMAN_REVIEW`.

## Strict scientific and operational boundaries

- **The earlier Gold Standard Q23 tier-label contradiction remains open.** A returned training value is not approval of Tier selection.
- Gold Standard training Tier1/2/3 do **not** mean Verra VM0051 QA1/QA2/QA3, nor Japanese J-Credit AG-005. All other program namespaces are rejected by the imported formula router.
- Claimed evidence booleans **do not** establish provenance, environmental benefit, controlled comparison, validated experimental QC, currently applicable Verra/Gold Standard rules, VVB audit, or certified tCO₂e.
- The batch uses the JavaScript BigInt primary calculator and verifies existing receipts; **it does not invoke the Python Decimal independent oracle itself**. Regression tests independently execute Python Decimal for changed sample inputs. The output explicitly says `independent_python_oracle_executed_on_this_batch: false`.
- The engine never uses unreviewed JapanFlux JP-Hrt raw FCH4 as a valid chamber measurement. No real CH₄ annual extrapolation, financial operation, blockchain transaction, or claim signing is performed.
- Up to 250 cases per batch, unique restricted ASCII IDs, JSON-portable input only, no NaN/infinity/undefined/noninteger JSON numbers, bounded input bytes for CLI, constrained nesting, disallow reserved prototype keys. Malformed or forged receipts fail the entire batch.
- A later registry or source-code version change requires an explicit, independently reviewed **migration** workflow before existing receipts can be replayed with the new version. This training tool alone does not claim that historical pack migration is correct.

## CLI walkthrough

First create an ordinary baseline source receipt:

```bash
node scripts/ieee-gs-worksheet-replay.mjs generate request-before.json > receipt-before.json
```

Then create `training-batch.json` using the same valid schema as an ordinary worksheet replay request:

```json
{
  "schema": "naft-ieee-gs-selective-reverification-request-v1",
  "cases": [
    {
      "case_id": "teaching_case_001",
      "baseline_request": {
        "schema": "naft-ieee-gs-worksheet-replay-request-v1",
        "route": {
          "schema": "naft-rice-method-route-request-v1",
          "program": "GS_AWD_TRAINING_2024",
          "requested_lane": "TIER_2_COUNTRY_SPECIFIC",
          "project_scale": "SMALL",
          "practices": [],
          "evidence": {
            "country_specific_factor_source": true,
            "water_regime": true,
            "cultivation_period": true,
            "nitrogen_baseline_and_project": true,
            "diesel_use": true,
            "uncertainty_policy": true
          }
        },
        "operands": { "E8": "20", "E22": "5", "E60": "0.1" }
      },
      "baseline_receipt": "REPLACE_WITH_FULL_GENERATED_RECEIPT_OBJECT",
      "proposed_request": {
        "schema": "naft-ieee-gs-worksheet-replay-request-v1",
        "route": {
          "schema": "naft-rice-method-route-request-v1",
          "program": "GS_AWD_TRAINING_2024",
          "requested_lane": "TIER_2_COUNTRY_SPECIFIC",
          "project_scale": "SMALL",
          "practices": [],
          "evidence": {
            "country_specific_factor_source": true,
            "water_regime": true,
            "cultivation_period": true,
            "nitrogen_baseline_and_project": true,
            "diesel_use": true,
            "uncertainty_policy": true
          }
        },
        "operands": { "E8": "23", "E22": "5", "E60": "0.1" }
      }
    }
  ]
}
```

The string `REPLACE_WITH_FULL_GENERATED_RECEIPT_OBJECT` is a **placeholder**; paste the actual *JSON object* from `receipt-before.json` before running the command.

```bash
node scripts/ieee-gs-selective-reverification.mjs generate training-batch.json > batch-report.json
node scripts/ieee-gs-selective-reverification.mjs verify training-batch.json batch-report.json
node tests/ieee-gs-selective-reverification.test.mjs
bash tests/run.sh
```

The example before and after Tier2 worksheet expressions are `(20-5)*0.9 = 13.5` and `(23-5)*0.9 = 16.2`, so the training arithmetic difference is **+2.7 in the worksheet's example output unit**. The system explicitly does not call +2.7 a certified environmental credit.

## Reproducibility regression

Tests include a 7-case classification matrix (unchanged, operand changed, changed operands yielding unchanged arithmetic, evidence removed, evidence-field-only impact, previously blocked measurement becoming *training-calculable*, and Tier change), a separate 54-case training burst with exactly 18 modified requests, 4 independent Python Decimal spot comparisons, canonical output replay, altered input and forged receipt rejection, tampered report and SHA rejection, duplicate IDs, overflow/invalid literal rejection, unsafe JSON shapes and unsupported program rejection. These numbers are **test fixtures only** and are distinct from the original ClimateChain synthetic 100-claim proof.
