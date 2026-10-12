# IEEE ClimateChain 2026 — Submission Checklist

Use this checklist for the standalone repository's **main** branch, after its own push CI is green. A private release candidate is not a published Pages demo.

## 1. Repository state

- [ ] Destination repository is `Takzin1/NaFT-IEEE_Climate_Hackthon_Edition` and default branch is `main`.
- [ ] Source IEEE commit `c87b534877293133ad92ac398b95936608bfd91b` is a real ancestor of destination `main`.
- [ ] Source PR #20 remains Draft and unchanged (source history is not rebased or squashed).
- [ ] Destination GitHub Actions **main push CI** is green on the exact intended SHA.
- [ ] `bash tests/run.sh` passes.
- [ ] Solidity 0.8.24 compilation passes.
- [ ] README test count matches the actual ClimateChain assertion count.
- [ ] `BUILD_LOG.md` still separates the pre-existing NaFT baseline from hackathon additions.

- [ ] Repository visibility is **Public** after the owner approves release and full-history safety review.
- [ ] Destination **deploy-pages** job completed **SUCCESS** on the same exact SHA (a Private-repo Skip does not qualify).

## 2. Demo integrity

- [ ] The independent public URL `https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain` opens anonymously and redirects to the correct English demo without horizontal overflow at mobile width.
- [ ] The real-world agricultural MRV context is clearly separated from the synthetic methodology experiment.
- [ ] Running the methodology update computes 100 / 30 / 70 / 15 / 15 from the existing analyzer.
- [ ] The 30 / 70 ratio is explicitly described as fixture-derived, not a performance result.
- [ ] A representative successor package shows an explicit `supersedes` lineage.
- [ ] The trust model says blockchain witnesses lineage and does not decide climate truth.
- [ ] Practical adoption roles are visible: aggregator, verification operator, registry/program.

## 3. Testnet gate

Before any public statement says “anchored on-chain”:

- [ ] `src/climatechain-testnet-record.js` is `VERIFIED_TESTNET` only because every evidence item below exists and passes the independent RPC verifier.
- [ ] Public testnet network name is recorded.
- [ ] Numeric chain ID is recorded.
- [ ] Contract address is recorded.
- [ ] Deployment transaction hash is recorded.
- [ ] Genesis anchor transaction hash is recorded.
- [ ] Successor anchor transaction hash is recorded.
- [ ] Explorer base URL is recorded.
- [ ] Exact source commit SHA is recorded.
- [ ] Verification timestamp is recorded.
- [ ] The record validates under `validateClimateChainTestnetRecord()` and `bash scripts/verify-live-sepolia.sh` reaches `VERIFIED_TESTNET_RPC` on a responding public RPC.
- [ ] Browser demo changes to `VERIFIED TESTNET` only after the complete record validates.

## 4. Devpost copy boundaries

Do not claim:

- official J-Credit eligibility;
- current AG-005 institutional implementation;
- formal verification/certification;
- measured field accuracy;
- measured reviewer time or cost savings;
- registry acceptance;
- carbon-credit issuance;
- universal soundness or minimality.

Safe claims:

- version-aware MRV research prototype;
- deterministic methodology/evidence change analysis;
- selective re-verification over the tested synthetic state space;
- 614-case independent full-recomputation oracle;
- zero false negatives observed within that tested state space;
- blockchain package-lineage witness after real testnet evidence is recorded.

## 5. Video / presentation

- [ ] Final video is 3–5 minutes.
- [ ] The problem is understandable within the first 30 seconds.
- [ ] The 100-claim methodology-change button is shown on-screen.
- [ ] The affected/unaffected split is explained without overstating performance.
- [ ] The lineage and trust boundary are shown.
- [ ] If testnet is verified, explorer evidence appears in the video.
- [ ] Engineering evidence appears briefly rather than dominating the story.
- [ ] Final closing sentence is consistent with the submission description.

## 6. Final freeze

- [ ] Record final submission SHA.
- [ ] Record final Devpost project URL.
- [ ] Record final demo video URL.
- [ ] Re-check the live Devpost deadline and required fields immediately before submission.

See [judge-ready submission pack](ieee-submission-pack.md) for the Etherscan/source proof, four-click demo, English video script and manual external completion steps.
