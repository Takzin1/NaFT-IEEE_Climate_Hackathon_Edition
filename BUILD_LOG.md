# IEEE ClimateChain 2026 — Build Log

## Baseline

Hackathon work starts from the pre-existing NaFT research prototype at:

- Repository: `Takzin1/NaFT`
- Baseline commit: `11126e8c236cfec8479157a2c5cf79c2fd5d8c20`
- Baseline date: 2026-09-29
- Hackathon branch: `hackathon/ieee-climatechain-2026`

The baseline already contained the Version-aware MRV Evidence Compiler, methodology diff and impact analysis, selective re-verification, provenance graph, append-only successor packages, human-decision staleness guards, synthetic evaluation corpus, independent full-recomputation oracle, and browser reviewer demo.

## ClimateChain additions

Work added specifically on this branch:

1. **English ClimateChain demo route** — `#/climatechain`
   - runs the existing deterministic 100-claim methodology-change experiment;
   - explains the 30 re-verify / 70 unaffected result as fixture-derived, not a performance claim;
   - exposes representative package lineage and the `supersedes` relationship.

2. **Minimal blockchain provenance contract** — `contracts/NaFTMRVAnchor.sol`
   - anchors claim, package, methodology and previous-package hashes;
   - restricts lineage writes to the deployment wallet (`anchorWriter`), while keeping certification semantics off-chain;
   - rejects duplicate package hashes;
   - rejects missing parents;
   - rejects lineage forks against the current claim head;
   - does **not** mint, transfer, price, retire or certify carbon credits.

3. **Deterministic anchor-plan export**
   - prepares exact `bytes32` arguments for a genesis package followed by its successor;
   - browser status is explicitly `NOT_SUBMITTED` until a real transaction is independently sent;
   - no wallet, RPC endpoint or external API is called by the static demo.

4. **Judge-first ClimateChain presentation layer**
   - adds a real-world Japanese rice-paddy MRV reference context without claiming current institutional implementation;
   - adds project-aggregator / verification-operator / registry adoption roles;
   - makes the on-chain / off-chain trust boundary explicit;
   - surfaces the 614-case independent-oracle result with its synthetic-state-space limitation.

5. **Lineage hardening**
   - rejects a successor whose parent package belongs to a different claim;
   - retains duplicate, missing-parent and current-head / fork guards.

6. **Regression coverage**
   - Node tests cover impact counts, package lineage, real-world/context boundaries, adoption roles, anchor argument shape and contract guards;
   - real headless Chrome checks the English judge-first narrative, mobile overflow, calculated metrics and anchor-plan boundary;
   - branch-specific ClimateChain checks total 69 assertions on top of the 1165 baseline assertions.

7. **Testnet completion runbook**
   - documents the human-signed deployment and two-transaction lineage flow;
   - forbids claiming on-chain anchoring until chain ID, contract address and transaction hashes are actually recorded.

8. **Fail-closed testnet evidence record**
   - adds `src/climatechain-testnet-record.js` with explicit `NOT_SUBMITTED` / `VERIFIED_TESTNET` states;
   - rejects partial chain metadata while unverified;
   - requires complete network, contract, transaction, explorer, source-commit and timestamp evidence before verified status.

9. **Submission operations**
   - adds a final submission checklist;
   - adds a 4-minute judge-oriented demo script;
   - surfaces testnet evidence state and engineering proof in the first ClimateChain viewport.

10. **Final judging / submission package**
   - adds a Devpost-ready submission draft with safe claim boundaries;
   - adds a 15-question judge Q&A;
   - adds an exact-SHA submission freeze procedure;
   - switches the ClimateChain document language/title to English and compiles Solidity ABI + bytecode in CI.

11. **Web3 execution / verification layer**
   - adds a deterministic CLI that regenerates the same P1 → P2 anchor arguments as the browser demo;
   - adds a read-only public-RPC verifier for chain ID, contract bytecode, deployment and lineage transactions;
   - compares on-chain calldata with the exact four-`bytes32` NaFT anchor plan and verifies indexed event topics;
   - reconstructs both contract source and anchor plan from the recorded deployment commit, then verifies creation/runtime bytecode, function selector, full event signature/data, writer identity and final `headByClaim`;
   - adds a local mock JSON-RPC test where valid lineage passes and corrupted successor calldata fails closed;
   - derives contract / deploy / P1 / P2 explorer links only from a fully validated `VERIFIED_TESTNET` record.

## Submission boundary

NaFT is a research prototype. Synthetic methodology transitions and synthetic claims are used for the hackathon demo. An on-chain hash is an external provenance witness only: it does not establish observation truth, methodology eligibility, verified emissions reductions, registry acceptance or formal certification.

A real public-testnet deployment and P1 → P2 lineage are now recorded on Ethereum Sepolia. The repository claims only that the package lineage is publicly witnessed; it does not claim climate truth, methodology eligibility, registry acceptance, or carbon-credit issuance.

12. **Executable contract security behavior**
   - executes `NaFTMRVAnchor` on a local Ganache EVM in CI;
   - verifies deployer-only writes, unauthorized successor rejection, duplicate rejection, fork rejection, cross-claim-parent rejection and final claim head;
   - terminates the Ganache process group explicitly so EVM checks cannot leave CI runners hanging.


13. **Verified Ethereum Sepolia provenance witness**
   - deployed `NaFTMRVAnchor` at `0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0`;
   - anchored deterministic P1 `0xe69e7df04f5f3640d94de510308e71a3229fe7c71fe8cb437bfc084623b25477` and successor P2 `0xe5ee259abdc624bd6fd8cdf72fa72eef11397ba54556c01f2ce294824d70f71e`;
   - independently reconstructed the contract and anchor plan from deployment source commit `fb9016c6c3041ec0e77098e631d62138fbae582e`;
   - matched creation/runtime bytecode, writer identity, exact calldata, anchor events, P1→P2 parentage and final `headByClaim`;
   - keeps blockchain semantics limited to provenance witnessing, not climate certification.


15. **Final IEEE evidence and submission hardening**
   - verified CLIMATE-086's demo P1/P2 hashes against the previously anchored Sepolia packages;
   - linked demo to P1, P2, deployment source and independent read-only verification;
   - kept the browser planner's local NOT_SUBMITTED status separate from the VERIFIED_TESTNET public evidence record;
   - expanded unit/Chrome regression checks; added one-command read-only verifier and complete judge-ready submission pack;
   - prepared verified-chain four-minute English video narration, without claiming external video upload or Devpost submission.


16. **ClimateChain practical value / judge clarity pass (October 10, 2026)**
   - displayed a fictional agricultural MRV aggregator scenario (100 **synthetic** claims, no actual farm records) with a clearly hypothetical all-claims review baseline;
   - bound 30 impact cases, 70 unaffected cases and the 15/15 automatic/evidence split to the live analyzer output rather than to hardcoded marketing claims;
   - added a standalone reusable `docs/assets/naft-climatechain-architecture.svg` separating off-chain semantic evaluation/human review from the on-chain Sepolia package lineage witness;
   - aligned Devpost draft, IEEE judge submission pack and 4-minute English demo script with the scenario and architecture;
   - added 8 deterministic checks and browser checks for SVG asset loading, honest pre-run state and live results;
   - green CI #350 on `f386b6a6` prior to final documentation update: **1234 assertions passed / 0 failures**, Chrome smoke + Pages successful;
   - retained the original verified P1/P2 chain evidence; no new signing/deployment, real farmer or institutional acceptance claim.
