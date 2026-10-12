# Debugging MRV Core

Run `bash tests/run.sh`. Locate functions by name in `src/mrv-core.js` and `src/mrv-ui.js`.

| Refusal | Meaning |
|---|---|
| ROLE_BLOCKED | Active demo role or Program scope mismatch |
| STALE_EVIDENCE_OPERATION | Actor or input changed while hashing |
| STALE_EVALUATION / STALE_PACKAGE | Input or saved evaluation no longer matches its snapshot |
| AUDIT_CHAIN_BROKEN | Event payload/order/head failed verification |
| UNRESOLVED_EXCEPTIONS | A blocking check, rejection or undecided judgement remains |
| PACK_RELEASE_APPROVAL_REQUIRED | Exact reference Pack lacks valid maintainer release |
| ATTESTATION_INTEGRITY_BLOCKED | Stored attestation/document/actor does not validate |

Inspect current input, pinned rule versions and retained hashes before changing anything. Do not clear a guard or recompute hashes just to suppress an error. Whole-dataset replacement is outside the trust model. Normal browser data resets on reload; this is not durable storage.
