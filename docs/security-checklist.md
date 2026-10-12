# MRV security checklist

Implemented prototype controls: active role and Program scope, copied file bytes, post-await actor/snapshot checks, metadata/content/version hashes, audit-event binding, chain validation at action/export boundaries, duplicate/overlap refusal, stale evaluation refusal, explicit exception/final attestation gates and escaped HTML.

`bash tests/security.sh` scans runtime HTML/JS for prohibited network SDKs/calls and secret-like patterns, checks tracked environment files and whitespace. No external script/CDN/runtime dependency is included. A pattern scan is not a complete vulnerability audit.

Production trust remains unimplemented: real authentication/authorization, original-file access control, transaction isolation, independent witnessing, retention policy, malware scanning and tenant isolation. Client data and code can be replaced. Internal hash checks detect ordinary change against retained anchors, not an adversary replacing all state.
