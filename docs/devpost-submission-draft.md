# IEEE ClimateChain 2026 — Devpost Submission Draft

> Working submission copy. Re-check the live Devpost field names and limits immediately before pasting. The public-testnet paragraph is now evidence-backed by the repository's independently verified Sepolia record.

## Project name

**NaFT — Version-Aware Climate MRV**

## Tagline

**Carbon markets need evidence that survives methodology change.**

## Primary track

**Carbon Markets & Emissions Transparency**

## One-sentence pitch

NaFT is a version-aware MRV evidence compiler that traces how methodology, evidence and parameter changes affect existing climate claims, selectively re-verifies the affected claims, and preserves each successor package in an auditable provenance lineage.

## Inspiration / problem

Climate claims are not evaluated against static rules. Methodologies evolve, coefficients change, evidence requirements change, and previously valid human decisions can become stale.

For project aggregators and verification operators, the difficult question is not simply “can this claim be evaluated?” It is:

> **When the rules or evidence change, which historical claims must be reviewed again, and why?**

Rechecking everything wastes review capacity. Missing a materially affected claim is unsafe. A blockchain ledger by itself does not solve this because the underlying evidence and methodology semantics still need deterministic, version-aware handling.

NaFT focuses on that gap.

The hackathon demo uses Japanese rice-paddy methane MRV as a real-world reference context because it is evidence-heavy, while the actual impact-analysis experiment uses explicit synthetic methodology versions. This avoids pretending that the prototype implements or certifies the currently adopted institutional methodology.

## What it does

NaFT:

1. binds evidence and claims to an exact methodology version;
2. compiles a dependency and provenance graph;
3. detects changes across five classes: methodology, evidence, parameter, field and activity;
4. identifies which claims require re-verification;
5. fails closed when new evidence is required;
6. creates append-only successor MRV packages that explicitly supersede prior packages;
7. prevents stale human decisions from silently surviving changed inputs;
8. anchors a minimal blockchain provenance witness containing package hashes and lineage only.

The blockchain layer does **not** decide climate truth, issue a carbon credit, price a credit, or replace a verifier.

## Live demo

https://takzin1.github.io/NaFT/#/climatechain

The main demo applies a synthetic methodology transition to 100 claims and computes:

- 100 candidate claims;
- 30 requiring re-verification;
- 70 unaffected;
- 15 automatically re-evaluated;
- 15 requiring new evidence.

The 30 / 70 split is fixture-derived, not a performance claim. The point of the demo is the dependency-aware decision and explicit lineage, not the ratio itself.

## Practical workflow and measurable boundaries

The user scenario is deliberately narrow: a **fictional project aggregator coordinating 100 synthetic rice-paddy methane MRV claims**. When a modeled methodology revision changes evidence obligations for intensive claims, NaFT identifies 30 requiring re-verification (15 automatically re-evaluated; 15 needing additional evidence) while 70 have unchanged semantic dependencies. The operator can prioritize that queue and examine the exact evidence or rule dependency underlying each affected claim.

A review of all 100 is shown only as a **hypothetical comparison**, not a recorded industry baseline. The 30/70 split is produced by this fixture and **does not establish time savings, verified emission reductions, participating farms, or real-world acceptance**.

**What distinguishes the architecture:** deterministic evidence compilation and dependency-aware re-verification happen **off-chain**; only package hashes and version parentage are witnessed by Ethereum Sepolia. The [source architecture diagram](assets/naft-climatechain-architecture.svg) exposes that boundary. No live registry integration is claimed.

## How we built it

The research core is a build-free deterministic JavaScript implementation with:

- immutable versioned methodology packs;
- canonical JSON and SHA-256 evidence manifests;
- structured methodology diff;
- dependency/provenance graph construction;
- selective impact analysis;
- append-only successor packages;
- human-decision binding and staleness guards;
- deterministic hash-linked exports.

For ClimateChain, the branch adds:

- an English judge-first demo;
- a minimal Solidity `NaFTMRVAnchor` contract;
- exact two-step anchor-plan generation for an existing package and successor;
- a fail-closed, independently verified Ethereum Sepolia testnet evidence record;
- real-browser CI, Solidity ABI/bytecode compilation, local-EVM contract behavior tests and read-only source-to-chain verification.

## Blockchain design

NaFT uses blockchain as an **external provenance witness**, not as an oracle of environmental truth.

On-chain:

- claim hash;
- package hash;
- methodology hash;
- previous package hash;
- submitter;
- block timestamp.

Off-chain:

- raw evidence bytes;
- methodology interpretation;
- deterministic evaluation;
- human decisions;
- package construction.

The contract rejects:

- duplicate package hashes;
- missing parents;
- cross-claim parents;
- lineage forks that do not extend the current claim head;
- lineage writes from any account other than the deployment wallet (`anchorWriter`).

### Current public-testnet status

**VERIFIED_TESTNET — Ethereum Sepolia (chain ID 11155111)**

Contract: [`0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0`](https://sepolia.etherscan.io/address/0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0)

[Deploy tx](https://sepolia.etherscan.io/tx/0x7695a040d1639ebf5b2fcc96ec6c879e5ccc28c46d95d9371f906769b8a12188) · [P1](https://sepolia.etherscan.io/tx/0x85c25a7ee239d7178c7266bf50e22c41bd30debfc7e37e579d437f1730d8fc34) · [P2](https://sepolia.etherscan.io/tx/0xb5aef9810d6eb9c7516c0c9c6aadcf05fe952fb9170338fb915a5aa204579ac5)

The deployment and P1 → P2 lineage were independently checked against source commit `fb9016c6c3041ec0e77098e631d62138fbae582e`. The verifier matched creation/runtime bytecode, deployer/writer identity, exact calldata, event data, successor parentage and final claim head. The chain witnesses package lineage only; it does not certify climate impact or issue a carbon credit.

## Engineering evidence

The underlying NaFT research prototype includes:

- 36 labeled synthetic conformance cases;
- deterministic calculation and re-evaluation checks;
- a 100-claim methodology-transition workload;
- an independent full-recomputation semantic oracle over **614 deterministic adversarial changes**;
- TP 429 / TN 78 / FP 107 / FN 0 in the tested synthetic state space;
- real headless-Chrome workflow checks;
- Solidity 0.8.24 compilation.

The zero false-negative observation applies only to the tested synthetic state space. It is not a universal proof, field-accuracy result or institutional certification claim.

## Practical users

**Project aggregator** — organizes evidence across many farms or fields and sees which claims need attention after a rule change.

**MRV / verification operator** — reviews affected claims, missing evidence and version lineage without silently reusing stale decisions.

**Registry / carbon program** — can inspect package hashes and lineage without receiving raw private evidence on-chain.

## Challenges

The hardest design problem was separating three concepts that are often conflated:

1. evidence integrity;
2. methodology semantics;
3. blockchain immutability.

A ledger can witness a hash, but it cannot establish whether a methodology was interpreted correctly or whether an observation is true. NaFT therefore keeps MRV semantics deterministic and off-chain while using the chain only for package-lineage witnessing.

A second challenge was designing selective re-verification conservatively. The analyzer is intentionally allowed to over-reverify; missing a semantically changed claim is treated as the more serious failure mode.

## Accomplishments

- turned methodology change into an explicit dependency-analysis problem;
- preserved immutable predecessor/successor package lineage;
- created an independent full-recomputation oracle rather than testing the analyzer against itself;
- added a minimal smart contract without introducing token, marketplace or payment distractions;
- completed and independently verified a real Ethereum Sepolia P1 → P2 provenance lineage while preserving fail-closed certification and field-accuracy boundaries.

## What we learned

The key lesson is that carbon-market transparency is not only a ledger problem. It is also a **versioning and re-verification problem**.

For trustworthy MRV, systems need to answer not only “what is the current result?” but also:

- which methodology version produced it;
- which evidence supported it;
- which later change made it stale;
- which claims were actually affected;
- what successor package replaced the old state.

## What's next

- validate the workflow with real MRV / verification practitioners;
- expand executable methodology coverage without pretending unsupported institutional rules are known;
- add production-grade authentication, tenant isolation and secure original-file custody;
- study reviewer workload and practical adoption using field data rather than synthetic-only evaluation.

## Technology

JavaScript · Solidity 0.8.24 · SHA-256 · GitHub Actions · GitHub Pages · deterministic JSON/provenance graph tooling

## Independent reproduction

From the IEEE hackathon branch, run `bash scripts/verify-live-sepolia.sh`. It performs source-bound RPC verification without a private key or gas. A public RPC must be available. See the [judge-ready submission pack](ieee-submission-pack.md).

## Repository

https://github.com/Takzin1/NaFT/tree/hackathon/ieee-climatechain-2026

Hackathon work is isolated on `hackathon/ieee-climatechain-2026` and documented in `BUILD_LOG.md`.

## External submission status

This is a copy-ready draft, **not** proof of video upload or completed Devpost submission. Verify current organizer fields/deadline, upload the compliant video and save Devpost confirmation separately.
