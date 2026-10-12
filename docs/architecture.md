# Architecture — Evidence Compiler + Re-verification Engine

A build-free vanilla JavaScript runtime, with no network calls, new framework or database backend. Six routes and three demo roles remain. main and frozen release references are outside this branch's mutation scope.

| Layer | Source / API |
|---|---|
| Shared primitives + existing AG-005 reference flow | `src/mrv-core.js`: canonical JSON, SHA-256, audit chain, identity, Manifest, deterministic AG-005 reference calculation, review, attestation, Program aggregation |
| Versioned data | `src/methodology-packs.js`: `VERSIONED_PACKS`; immutable registry via `createMethodologyRegistry` |
| Pure compiler | `src/mrv-compiler.js`: `compileEvidence`, `compareMethodologyVersions`, `buildProvenanceGraph`, `traceDependents`, `analyzeImpact`, `packageCurrent` |
| Mutation adapter | `src/compiler-session.js`: `compileAndSave`, `reviewCompilerRun`, `attestCompilerRun`, `applyCompilerChange`, `exportCompilerRun` |
| UI | `src/compiler-demo.js` + `src/mrv-ui.js`; escaped output and delegated handlers |

## Compiler contract

Raw text/bytes → SHA-256 + normalized JSON → pinned Pack → deterministic rules/calculation → provenance graph → draft package. Input and Pack are copied; output uses no clock, randomness or DOM. Evidence and peer arrays are canonical sorted. Expected content hashes are supplied trust anchors: a matching hash establishes consistency, not authenticity. JSON adapters parse structure, not environmental meaning.

Packs are declarative maps keyed by rule/requirement/parameter/exception ID. Supported rule operations are `gt`, `gte`, `eq`, with optional typed conditions. The only generic calculation is a synthetic multiply expression; unknown operations and unknown institutional configuration fail closed. Existing reference AG-005 arithmetic stays in the existing tested flow, always with null certified result. The Compiler does not call AG-005 logic for other methodologies.

## Version diff and impact

`compareMethodologyVersions(oldPack,newPack)` reports added/removed/modified fields, rules, parameters, requirements, calculation specification, exceptions and unsupported conditions. Arrays of changes are sorted; both old/new values and hashes are exported. Different methodology IDs cannot be compared as a version transition.

`analyzeImpact(claims,change,registry)` supports methodology, evidence, parameter, field and activity changes. It returns sorted Claim IDs, potential candidates, required re-verification, exact Calculation/Package IDs, dependency paths, statuses and successor drafts. For methodology changes it compares applicable semantic projections; inactive conditional rules and unused parameters do not trigger recalculation. Unknown condition inputs are included conservatively and evaluation blocks. New rules are considered even if absent from the old graph. Activity patches can revise non-identity observation fields such as days, stratum and dates; Claim/methodology/field/farmer/program identity rewrites are rejected and must use their dedicated change paths. Field/activity patch objects also reject prototype-pollution keys.

A changed source/version may require a new package provenance hash even when the rule result is UNAFFECTED. `previous_package_stale` distinguishes this from recalculation. A parameter override is a claim input change and requires human judgement when used; it never mutates an immutable registry Pack. Analysis creates successors without overwriting originals. Explicit application appends runs and audit events, saves one store document, and invalidates the old current export. This is a single-process prototype, not a concurrent transaction service.

## Graph

Node types: evidence, field, activity, methodology, rule, parameter, calculation, review, package. All edges point **dependency → dependent**, including `derived_from`; this direction is explicit in the schema. Types: derived_from, evaluated_by, uses_parameter, belongs_to, reviewed_by, included_in, supersedes. Review nodes exist only when a decision exists; supersedes exists only for successors.

Graph nodes use content hashes; graph reference is its canonical SHA-256. The package node hashes input and Pack identity, avoiding a self-referential package hash. The final envelope hashes the entire document including graph. Evidence dependencies are conservative at Activity scope; minimal rule-level pruning is not claimed.

## Integrity / persistence

Pure APIs are computation APIs, not authorization endpoints. Session APIs reuse role, scope, audit and store guards. Each Human Decision binds claim/run ID, exact exception code, input fingerprint, Pack hash, reviewer, reason and decision hash. Only `ACCEPT` resolves that exception; `REJECT / NEED_MORE_EVIDENCE / ABSTAIN` keep attestation blocked. Hard errors cannot be waived. Pack release approval is required before final attestation. New runs invalidate old current exports; old records remain historical. Export validates the current run, all decision bindings, release, attestation and full audit chain. No automatic official certification occurs.

Twelve existing arrays plus compiler_runs, compiler_decisions, compiler_attestations; optional Compiler arrays initialize for older local snapshots. No production database migration. The AG-005 reference flow stays usable with its unchanged 182 regression assertions. Its legacy registry is a compatibility path; multi-Pack compilation uses COMPILER_REGISTRY.

[Data model](data-model.md) · [Limits](known-limitations.md)
