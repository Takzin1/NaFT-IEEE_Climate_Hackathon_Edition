# NaFT for IEEE ClimateChain Global Hackathon 2026

## Project thesis

**Carbon markets need evidence that survives methodology change.**

**Public demo:** https://takzin1.github.io/NaFT/#/climatechain

**Submission pack:** [Judge-ready final evidence and video path](ieee-submission-pack.md)

NaFT is a version-aware MRV evidence compiler. It binds evidence to an exact methodology version, constructs a dependency/provenance graph, and determines which claims require re-verification when methodology, evidence, parameters, field data or activity data change.

The ClimateChain branch adds a minimal blockchain provenance witness for the resulting versioned MRV packages. The chain is not used to decide climate truth.

## Primary track framing

**Carbon Markets & Emissions Transparency**

The submission is intentionally narrow:

- fragmented environmental evidence makes verification difficult to replay;
- verification state can become stale when methodologies or evidence change;
- re-checking every historical claim is wasteful, while missing a materially affected claim is unsafe;
- package lineage needs an external witness without pretending that a ledger validates climate impact.

## Concrete operating scenario (fictional, synthetic)

The public demo now includes the working perspective of a **fictional rice-paddy MRV project aggregator**. It receives a simulated methodology update while coordinating **100 synthetic claims**. Based on the actual analyzer output, 30 claims need re-verification (15 automatically re-evaluated; 15 blocked pending evidence), and 70 are unaffected. The alternative of reviewing every claim is a **hypothetical** comparison, not a measured baseline or evidence of actual labor savings.

See the [standalone NaFT architecture SVG](assets/naft-climatechain-architecture.svg), which explicitly separates off-chain evidence/rule semantics, selective re-verification, and human decisions from the real Sepolia P1→P2 provenance witness. No participating farms, emission reductions, currently adopted AG-005 compatibility, or registry acceptance are asserted.

## Real-world reference context

The judge-first demo uses **Japanese rice-paddy methane MRV** as a real-world reference context because the retained AG-005 reference flow is evidence-heavy. Example evidence categories include pre-project baseline records, project records, drainage start/end evidence, heading-date records, field-area records and sustainability records.

This is a context layer, not an eligibility claim. The repository's AG-005 `3.1-reference` is historical/reference-only. The currently adopted edition and coefficient applicability are not asserted here.

The hackathon experiment itself remains `NAFT-SYNTHETIC@1 → @2`, so the demo does not invent or misrepresent an official methodology revision.

## Judge-first story

The demo is designed to make the value legible in under four minutes:

1. **Problem** — climate claims depend on versioned, heterogeneous evidence.
2. **Change** — a methodology update changes only some verification semantics.
3. **Impact** — NaFT traces dependencies and separates affected from unaffected claims.
4. **Safety** — missing evidence fails closed and stale human decisions are not silently reused.
5. **Lineage** — a successor MRV package explicitly supersedes the old package.
6. **Blockchain** — only package provenance hashes are anchored; climate truth remains off-chain.
7. **Adoption** — project aggregators, MRV/verification operators and registries/programs each get a concrete role.

## 3–5 minute demo path

1. Open `naft-app.html#/climatechain`.
2. Show the real-world reference context and the explicit institutional boundary.
3. Click **Run 100-claim methodology update**.
4. Show the computed result:
   - 100 candidate claims;
   - 30 require re-verification;
   - 70 unaffected;
   - 15 automatically re-evaluated;
   - 15 require new evidence.
5. Open the representative lineage and show why the claim changed.
6. Click **Prepare blockchain anchor plan**.
7. Show the genesis package hash followed by the successor package hash and exact previous-package linkage.
8. Explain the on-chain/off-chain trust split.
9. Close with the adoption flow and engineering evidence.

The 30 / 70 ratio is fixture-derived, not a performance claim.

## Architecture

```text
Raw / structured evidence
          |
          v
Versioned Evidence Compiler
          |
          v
Dependency + provenance graph
          |
          v
Methodology / evidence / parameter change
          |
          v
Selective impact analysis
      /             \
re-verify         unaffected
    |
    v
Successor MRV package
    |
    v
NaFTMRVAnchor
(package hash + methodology hash + previous package hash)
```

## Why blockchain is minimal

The contract stores only the information needed to witness package lineage:

- `claimIdHash`
- `packageHash`
- `methodologyHash`
- `previousPackageHash`
- submitter
- block timestamp

The contract rejects:

- duplicate package hashes;
- missing parent packages;
- parent packages belonging to a different claim;
- forks that do not extend the current claim head;
- lineage writes from accounts other than the deployment wallet (`anchorWriter`).

The contract intentionally has no token, marketplace, payment or carbon-credit issuance path. Writer authorization protects the provenance namespace only; it is not a certification role.

## Trust model

### On-chain

Claim hash, package hash, methodology hash, previous-package hash, submitter and block timestamp.

### Off-chain

Raw evidence bytes, methodology interpretation, deterministic evaluation, human decisions and package construction.

### Explicitly not claimed

Formal certification, observation truth, credit issuance, credit price or registry acceptance.

**Design rule:** blockchain witnesses version lineage; it does not decide climate truth.

## Practical adoption

| Actor | Role |
|---|---|
| Project aggregator | Collect evidence across many farms/fields and see which claims need attention after a rule change |
| MRV / verification operator | Inspect affected claims, missing evidence and version lineage without silently reusing stale decisions |
| Registry / carbon program | Verify package hashes and lineage without receiving raw private evidence on-chain |

## Engineering evidence

The underlying research prototype retains:

- 36 labeled synthetic conformance cases;
- deterministic calculation and re-evaluation checks;
- a 100-claim synthetic methodology-transition workload;
- an independent full-recomputation semantic oracle over 614 deterministic adversarial changes;
- current tested matrix: TP 429 / TN 78 / FP 107 / FN 0;
- five supported change classes: methodology / evidence / parameter / field / activity;
- local-EVM contract behavior checks for writer authorization, duplicate/fork/cross-claim rejection and final head;
- source-commit-bound public-RPC verification of deployed bytecode, calldata, event data and final chain state.

These are engineering results within the explicitly tested synthetic state space. They are not field accuracy, measured runtime savings, verifier acceptance or proof for all institutional methodologies.

## Verified public-testnet evidence

The provenance witness is now independently verified on **Ethereum Sepolia (chain ID 11155111)**.

- Contract: `0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0`
- Deployment: `0x7695a040d1639ebf5b2fcc96ec6c879e5ccc28c46d95d9371f906769b8a12188`
- P1: `0x85c25a7ee239d7178c7266bf50e22c41bd30debfc7e37e579d437f1730d8fc34`
- P2: `0xb5aef9810d6eb9c7516c0c9c6aadcf05fe952fb9170338fb915a5aa204579ac5`
- Deployment source commit: `fb9016c6c3041ec0e77098e631d62138fbae582e`

The read-only verifier reconstructed the contract and deterministic P1 → P2 plan from that recorded source commit and matched creation bytecode, runtime bytecode, writer identity, exact calldata, event data, parent linkage and final `headByClaim`.

This is a provenance witness only. It does not certify climate truth, methodology eligibility, registry acceptance or carbon-credit issuance.

### Independent read-only verification

From the exact hackathon branch:

```bash
bash scripts/verify-live-sepolia.sh
```

No signing key, transaction or fee is required. The check depends on a responding Sepolia RPC and reuses the recorded deployment source commit.

## Submission assets

- [4-minute demo script](climatechain-video-script.md)
- [final submission checklist](submission-checklist.md)
- [testnet anchor runbook](testnet-anchor-runbook.md)
- [Devpost submission draft](devpost-submission-draft.md)
- [judge Q&A](judge-qa.md)
- [submission freeze procedure](submission-freeze.md)

The browser reads the dedicated fail-closed testnet record and now displays `VERIFIED TESTNET` with explorer links because the complete public-testnet record has passed the independent RPC verifier.

## Before final submission

Re-check the live Devpost page for final field wording, deadline/window, track wording and video requirements. Freeze the exact submission commit only after CI is green and any testnet evidence has been independently verified.
