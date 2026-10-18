# MRV change checklist

- Target branch and protected source references verified; no forced history update.
- Only MRV responsibilities and necessary primitives remain.
- Ponytail-inspired minimal-change check: reuse existing implementation, built-ins or platform facilities first; justify any new dependency or abstraction. Never trade away evidence integrity, negative tests, version-aware re-verification or the Sepolia hash-lineage boundary.
- Methodology/version/adapter provenance, deterministic checks, stale/duplicate/integrity guards retained.
- Normal cases have no redundant approvals; exception and final-attestation boundaries enforced.
- Original files remain local; prototype limitations and CONFIG REQUIRED visible.
- `bash tests/run.sh` passes with no skipped checks. Changed count is explained by domain scope, not by hidden failures.
- README, architecture, data model, human boundaries, limitations and test report match the implementation.
- Verify CI for the pushed SHA; distinguish DOM stubs from real browser evidence.
