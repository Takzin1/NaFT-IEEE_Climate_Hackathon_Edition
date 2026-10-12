# MRV view scope and performance

The six routes separate methodology, evidence, evaluation, exceptions, attestation and export. Evidence tables and recheck selectors use ten-row pages. Full page manifests are only materialized on explicit inspection. Input nodes are retained on evidence-only paging/inspection; changing route or activity is not a draft-preservation promise.

No speedup or latency figure from the former mixed-domain UI applies to this version. Its benchmark was removed with that UI. Correctness tests use deterministic boundaries without machine-dependent timing thresholds.

The entire dataset remains in memory. Selected-field evaluation includes complete manifests and audit-bound checks. Every authoritative operation/export validates the full audit sequence; some event-binding lookups may be repeated. Large datasets, browser layout/heap and concurrent users have not been benchmarked.

Compiler panels expose only three demos; the full graph and Pack JSON are behind details elements. Impact analysis currently recompiles each candidate baseline to construct dependency information, so selective semantic re-evaluation does not imply sublinear total runtime. No latency or production throughput claim is made.
