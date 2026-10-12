# NaFT MRV Core — Repository instructions

This branch is Version-aware MRV Evidence Compiler + Re-verification Engine. Scope: methodology registry/rule packs, evidence adapters/manifests, field/activity identity, deterministic evaluation/calculation, exception handling, final human attestation, provenance, monitoring packages and program aggregation.

## Boundaries

- Work only on the explicitly requested branch. Do not change main or frozen references without separate user authorization. Never rewrite history.
- No automatic formal certification, registry operations, financial operations or external APIs. Do not remove `DISCLAIMER` or its display on the six routes.
- AG-005 3.1-reference is a public-comment reference; latest adoption is unconfirmed. AG-004 is UNKNOWN/UNSUPPORTED. Synthetic version transitions are not official revisions. Keep CONFIG REQUIRED and calculation.result=null. Prototype Rule Pack release approval cannot change official adoption status.
- Automate completeness, hash/version/date checks, calculation, overlap checks and draft construction. Human operations are exception decisions, Rule Pack release approval and final package attestation. Normal cases need no intermediate approval.
- Deterministic FAIL/MISSING and unsupported conditions are not human-overridable. Conflicting evidence may be accepted only with a recorded reason bound to the current evaluation.

## Compiler rules

- Preserve old Packs and immutable version identity. Unknown institutional configuration fails closed.
- Pure compilation must use no clock/randomness/network and must not mutate input.
- Diff all changed categories; impact must consider added rules absent from the old graph. Never hard-code fixture outcome counts.
- Keep Corpus provenance truthful. Synthetic metrics are not field efficacy.
- Compiler session operations use the existing actor/audit/store guards. New runs invalidate old current exports; historical records are retained.

## Code map

- `src/mrv-core.js`: canonical JSON, SHA-256, exact-version registry, model, role/scope guards, evidence, evaluation, audit, exception decisions, attestation and canonical export.
- `src/methodology-packs.js`, `src/mrv-compiler.js`: declarative registry, diff, normalization, graph, impact, pure Packages.
- `src/compiler-session.js`, `src/compiler-demo.js`: guarded persistence/decisions and three demos.
- `src/mrv-ui.js`: six hash routes, pure page functions, event dispatch and file download.
- `naft-app.html`: static app shell/style. `index.html`: entry redirect.
- `tests/smoke.test.js` + `tests/compiler.test.js`: dependency-free Node assertions; DOM stubs are not actual browser tests.

Use build-free vanilla JS and existing function conventions. Keep page rendering read-only. Escape untrusted HTML via `esc`; use data attributes and delegated handlers instead of interpolating untrusted executable code. All mutations must pass role/scope and audit guards. Bind metadata to hashes and audit events; revalidate actor and input after asynchronous hashing. Persist through the store adapter; do not introduce another storage backend.

Methodology identity, implemented rule version, calculation version and adapter version belong in evidence/evaluation/package provenance. No long-lived authorization/integrity cache. Attested documents are immutable through supported operations. Avoid dead code for removed domains.

## Verification

Run `bash tests/run.sh` before and after changes. Cover positive and negative boundaries; do not retain removed-feature tests to preserve counts. Update README, relevant docs and the actual test count. Check the exact pushed SHA's CI. Record browser validation limits honestly.

See [architecture](docs/architecture.md), [human boundaries](docs/human-in-the-loop.md), [limitations](docs/known-limitations.md) and [backlog](.github/ISSUES_BACKLOG.md).
