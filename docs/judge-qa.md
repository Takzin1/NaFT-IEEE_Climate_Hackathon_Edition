# IEEE ClimateChain 2026 — Judge Q&A

Use these answers as speaking guidance. Keep them concise in live judging.

## 1. Why does this need blockchain?

**Short answer:** It does not need blockchain for MRV calculation. It uses blockchain only as an external witness for package lineage.

NaFT keeps evidence handling, methodology interpretation and deterministic evaluation off-chain. The smart contract stores hashes and parentage so a later observer can verify that package P2 explicitly followed package P1. This avoids pretending that a ledger can validate climate truth.

## 2. Why not put all evidence on-chain?

Raw evidence may contain private, sensitive or large files. Putting it on-chain would increase privacy, cost and data-governance problems.

NaFT stores only hashes and lineage on-chain. Raw evidence remains off-chain and is bound into deterministic package hashes.

## 3. What is technically novel here?

The core contribution is **version-aware selective re-verification**.

NaFT models methodology/evidence dependencies so that a later change can be traced to the claims whose verification semantics actually changed. It then creates append-only successor packages instead of silently mutating historical state.

## 4. Why not simply re-run every claim?

That is the safe but wasteful baseline.

NaFT attempts to preserve unaffected claims while conservatively re-verifying claims whose dependencies may have changed. In the 614-case synthetic adversarial matrix, the analyzer observed zero false negatives within that tested state space, while retaining conservative over-verification.

Do not describe this as measured cost or time savings; those have not yet been field-tested.

## 5. Is the 30 / 70 result an efficiency metric?

No.

The demo fixture intentionally contains 70 standard and 30 intensive claims. The methodology change affects the intensive path, so 30 require re-verification and 70 are unaffected. Changing the fixture changes the ratio.

The result demonstrates explainable selective impact analysis, not a 70% performance improvement.

## 6. Are you implementing the official current J-Credit AG-005 methodology?

No.

Japanese rice-paddy methane MRV is used as a real-world reference context. The retained AG-005 `3.1-reference` is historical/reference-only. The hackathon impact experiment uses `NAFT-SYNTHETIC@1 → @2` precisely to avoid misrepresenting an official methodology revision.

## 7. Does NaFT issue or verify carbon credits?

No.

NaFT produces research MRV packages and lineage. It does not formally certify emission reductions, issue credits, set prices, determine registry acceptance or replace an accredited verifier.

## 8. What happens when evidence is missing?

NaFT fails closed.

A claim that requires new evidence becomes `EVIDENCE_REQUIRED`; uncertainty is not converted into a pass. Human decisions are also bound to the input/methodology state so stale decisions cannot silently survive later changes.

## 9. How do you know the impact analyzer is not testing itself?

The repository includes an independent full-recomputation semantic oracle.

For each adversarial change, the before/after claim state is recomputed independently and compared semantically. That oracle is not implemented by calling `analyzeImpact()` or `activeProjection()`.

## 10. What do the 614 adversarial cases prove?

They provide engineering evidence for the tested synthetic state space.

Observed result: TP 429 / TN 78 / FP 107 / FN 0. The false positives are conservative extra re-verification. This is **not** a universal soundness theorem, field-accuracy result or proof for all institutional methodologies.

## 11. Why is there a human-review layer if the system is deterministic?

Deterministic checks are good for reproducible rules and evidence obligations. They are not a substitute for every institutional or evidentiary judgment.

NaFT routes explicit exceptions to humans and binds the decision to the exact claim/run, exception, input fingerprint and methodology-pack hash. If those inputs change, the old decision becomes stale.

## 12. What prevents a fake package from being anchored?

The smart contract cannot prove that an off-chain observation is true. That limitation is explicit.

What it does enforce is package-lineage integrity: only the deployment wallet can append lineage, there is no duplicate package hash, no missing parent, no cross-claim parent, and no successor that forks away from the current claim head.

The public-RPC verifier also reconstructs the contract and deterministic anchor plan from the recorded deployment commit, checks deployed bytecode, transaction selector/calldata, complete anchor event data, writer identity and final claim head. Trust in evidence authenticity still requires appropriate custody, identity and verifier processes outside this prototype.

## 13. Who would use this first?

The most direct users are project aggregators and MRV / verification operators managing many claims and evidence records.

A registry or program is a downstream consumer of package lineage, not necessarily the first buyer or operator.

## 14. What is missing before production?

Production authentication, tenant isolation, secure original-file custody, independent witness infrastructure, concurrent transaction handling, current executable institutional methodology packs, field validation and verifier-acceptance studies.

The current system is intentionally labeled a research prototype.

## 15. Why is this stronger than a normal carbon-credit dApp?

Because NaFT does not begin with tokenization.

It begins with the harder question: **can the evidence and verification state survive methodology change in a reproducible, traceable way?**

The blockchain layer comes last, as a witness for the versioned MRV package—not as a substitute for MRV.
