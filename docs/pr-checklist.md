# MRV change checklist

- Target branch and protected source references verified; no forced history update.
- Only MRV responsibilities and necessary primitives remain.
- Methodology/version/adapter provenance, deterministic checks, stale/duplicate/integrity guards retained.
- Normal cases have no redundant approvals; exception and final-attestation boundaries enforced.
- Original files remain local; prototype limitations and CONFIG REQUIRED visible.
- `bash tests/run.sh` passes with no skipped checks. Changed count is explained by domain scope, not by hidden failures.
- README, architecture, data model, human boundaries, limitations and test report match the implementation.
- Verify CI for the pushed SHA; distinguish DOM stubs from real browser evidence.
