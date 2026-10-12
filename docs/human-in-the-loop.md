# Human-on-the-exception + Human-at-the-attestation

A normal synthetic Claim compiles from Evidence to evaluation and Package draft without intermediate approval. Human review is scoped to explicit `HUMAN_REVIEW_REQUIRED` exceptions; institutional unknowns remain fail-closed.

## Individual exception decisions

Each exception is decided separately with exactly one of:

- `ACCEPT` — resolves only that exact `HUMAN_REVIEW_REQUIRED` exception.
- `REJECT` — package attestation is blocked.
- `NEED_MORE_EVIDENCE` — package attestation is blocked until evidence changes and the Claim is re-evaluated.
- `ABSTAIN` — package attestation is blocked pending expert judgement.

A decision binds `claim_id`, `run_id`, exact `exception_code`, current input fingerprint, current methodology Pack hash, reviewer, reason and decision. `decision_hash` is SHA-256 over that binding payload. A new run, changed Evidence/input, changed Pack or methodology version makes the old decision unusable.

`UNSUPPORTED`, `EVIDENCE_REQUIRED`, tamper/hash failure, methodology mismatch and deterministic rule/calculation failure are not human-overridable. Attempting to record an `ACCEPT` against those codes is blocked.

## Final attestation gate

Final research-package attestation requires all of the following: valid audit chain; current run; exact current input and Pack; Pack release approval; no blocking `UNSUPPORTED`; no unresolved `EVIDENCE_REQUIRED`; every `HUMAN_REVIEW_REQUIRED` exception individually decided `ACCEPT`; no remaining `REJECT / NEED_MORE_EVIDENCE / ABSTAIN`; explicit reviewer acknowledgement and reason.

The resulting attestation is `ATTESTED_RESEARCH_PACKAGE`, not formal certification, verifier acceptance or J-Credit registration. The actor selector is a local demonstration identity, not production authentication.
