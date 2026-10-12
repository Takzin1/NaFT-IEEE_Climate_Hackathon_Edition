# Impact Analysis Soundness — tested boundary

## Research question

Within NaFT's explicitly supported rule interpreter and evidence model, can selective re-verification avoid false negatives when compared with an independent full re-computation oracle across deterministic adversarial changes?

This document records bounded engineering evidence for that question. It is not a proof for arbitrary institutional MRV methodologies.

## Independent oracle

`tests/impact-proof.test.js` does not use `analyzeImpact()` or `activeProjection()` as the oracle.

For every case it:

1. compiles the before state directly;
2. constructs the changed input / changed Pack;
3. compiles the after state directly;
4. independently normalizes both results into a verification-semantic view;
5. compares that semantic view with NaFT's selective `requires_reverification` decision.

The semantic view includes:

- active rule results;
- active evidence obligations;
- missing-evidence obligations;
- issue code/status;
- values of parameters actually used by active rules or calculation;
- calculation operation, inputs, parameters and unit;
- calculation values and arithmetic preview;
- final evaluation status.

The comparison deliberately excludes methodology/version identifiers, Rule Pack version identifiers, source URL/hash/check timestamp and scope text. Those fields may legitimately change package provenance without changing the current Claim's verification semantics.

## Deterministic adversarial matrix

The current matrix contains **614 cases**:

- **408 methodology-transition cases**: 34 mutation classes × 12 Claim variants;
- **24 parameter-change cases**;
- **24 field-change cases**;
- **48 activity-change cases** covering calculation inputs, conditional applicability, temporal evidence validity and semantically unused metadata;
- **110 evidence-change cases** spanning content, adapter, activity/field/methodology binding, period, category, expected hash, provenance and source metadata-only changes.

Claim variants include standard, intensive, intensive with all new evidence, sensitive, expert-review, ambiguous identity, unsupported condition, deterministic rule failure, zero-area failure, missing evidence, tampered evidence and unknown conditional applicability.

Mutation classes include rule add/remove/modify, threshold/op/input/condition changes, used/unused parameter changes, calculation changes, evidence-requirement changes, exception/unsupported-condition changes, effective-period/status changes, metadata-only changes and interacting changes such as rule+parameter, rule+requirement, calculation+parameter, condition+parameter and multi-category revisions.

## Result

| Metric | Count |
|---|---:|
| Total deterministic cases | 614 |
| Oracle semantic changed | 429 |
| Oracle semantic unchanged | 185 |
| Analyzer re-verification | 536 |
| Analyzer unaffected | 78 |
| True positive | 429 |
| True negative | 78 |
| False positive | 107 |
| **False negative** | **0** |

No false negatives were found in 614 deterministic adversarial cases within the currently supported interpreter and change APIs.

The 107 false positives are conservative extra re-verifications. Among the 185 oracle-unchanged cases, this corresponds to a count share of about 57.84%. That number is **not** a runtime, cost, accuracy or field-performance metric.

The machine-readable result is committed as [`reports/impact-proof.json`](../reports/impact-proof.json) and regenerated in CI.

## What this supports

Within the exact interpreter and deterministic state space exercised here, the current selective impact analyzer did not omit any Claim for which the independent full-recomputation oracle observed a verification-semantic change.

This strengthens the evidence behind NaFT's change-control mechanism beyond the single 100-Claim `NAFT-SYNTHETIC@1 → @2` demonstration.

## What this does not support

This result does not establish:

- universal soundness or minimality;
- correctness of arbitrary institutional-methodology translation;
- completeness for future rule operations not represented by the current interpreter;
- semantic correctness of real photos, IoT, GIS or farm records;
- verifier or registry acceptance;
- field accuracy;
- measured MRV-cost or review-time reduction;
- any real-world 57.84% or 0% rate.

Those remain research and field-validation questions.

## Fail-closed rule

If a future adversarial case produces:

`oracle semantic changed && requires_reverification === false`

CI must fail. The case should then be minimized into a named regression before the analyzer is considered hardened again.

Safety takes precedence over minimizing the number of Claims selected for re-verification.
