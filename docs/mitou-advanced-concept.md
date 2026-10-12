# NaFT — research stages

## Research question

Can heterogeneous environmental evidence and frequently revised methodologies be compiled into independently reproducible, reviewable Claims, while identifying only the Claims affected by a change?

## Already implemented

Versioned Pack schema/registry; source/hash boundaries; old reference retention; deterministic structured Diff; evidence normalization; rule evaluation; JSON dependency graph; methodology/evidence/parameter/field/activity impact analysis; selective re-evaluation; exception-level four-state Human Decisions; final attestation; reproducible Monitoring Package; append-only successors and stale export prevention. Three synthetic demo flows and a Synthetic conformance corpus of 36 labeled synthetic engineering cases with automatic KPIs. A separate deterministic 100-Claim synthetic revision experiment places all 100 Claims in the candidate set while limiting actual successor re-verification to 30 Claims; 70 remain unaffected. This is a count-based scope result, not measured time/cost reduction. Reference AG-005 functions remain regression tested. An additional deterministic Impact Proof Harness compares selective re-verification against an independently normalized full-recomputation semantic oracle across 614 adversarial cases.

The official reference and synthetic executable protocols are deliberately separate. Multi-version execution is demonstrated with NAFT-SYNTHETIC 1/2. No newer official AG-005 Pack is registered: the requested v3.5 primary-source bytes/hash were not independently verified in the 2026-09-21 repair environment, so no institutional delta is inferred. AG-004 requirements are not guessed.

## Evidence for the core technical claim

The current reproducible experiment applies `NAFT-SYNTHETIC@1 → @2` to 100 Claims: 70 standard Claims and 30 intensive Claims. All 100 reference the changed methodology version, but per-Claim active dependency projections select only the 30 intensive Claims for re-verification. Of those, 15 auto-reevaluate and 15 stop at `EVIDENCE_REQUIRED` because the new synthetic version requires sensor Evidence. The remaining 70 generate no successor package. Replay is deterministic and source Claims remain immutable. See `reports/mitou-impact-experiment.json`.

A second experiment broadens the evidence beyond that single transition: 614 deterministic adversarial cases cover methodology, parameter, field, activity and Evidence changes, including adapter/binding/period/category/hash/provenance/metadata replacement cases, including interacting changes. The independent full-recomputation semantic oracle reports 429 semantic changes and 185 unchanged cases; selective analysis produced TP 429 / TN 78 / FP 107 / FN 0. Thus no false negatives were found in the tested supported interpreter/change-API state space. The 107 false positives are conservative extra re-verification, not an efficacy metric. See `reports/impact-proof.json` and `docs/impact-soundness.md`.

These experiments establish only mechanisms and bounded engineering evidence. They do not establish completeness/minimality for arbitrary institutional methodologies, runtime savings, verifier acceptance or AG-005 applicability.

## Research during Mitou

Questions still unproven: completeness and soundness of institutional rule translation; semantic normalization across real evidence; safe/minimal re-verification beyond the currently supported interpreter and tested adversarial state space; reliable temporal applicability; version-dependent identity/field restructuring; external reproducibility under independent implementations; human interpretation and attestation cost. Synthetic tests are not evidence that these research questions are solved.

## Future social implementation

Operational evidence custody, authenticated organizations, independent witnesses/signatures, production concurrency, external verifier acceptance and field trials. MRV cost, human review time, income and verifier acceptance are unmeasured future field-PoC KPIs, not projected numerical results.
