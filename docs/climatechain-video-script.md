# IEEE ClimateChain 2026 — 4-minute English demo script

**Target:** 3:55–4:15. Real screen recording with English narration and readable captions. This is a script; it does **not** mean a video has been recorded or uploaded.

**Entry:** https://takzin1.github.io/NaFT/#/climatechain

## 0:00–0:25 — Problem (show hero)

> Carbon markets depend on evidence. But the rules governing that evidence change. Methodologies, parameters and required documents evolve. When that happens, operators must identify exactly which historical claims need another review. Rechecking everything is wasteful, but keeping a materially stale claim is unsafe.

## 0:25–0:50 — Practical user and problem (show fictional aggregator scenario)

> Imagine a project aggregator coordinating a hundred climate claims. A methodology update arrives. Should the team recheck every claim, or can we identify exactly which ones changed? NaFT binds records to versioned rules, compiles dependencies, and selects claims needing another review. This example is synthetic—not actual farm or program performance.

## 0:50–1:35 — Run the experiment (click **Run 100-claim methodology update**)

> We begin with one hundred synthetic claims under methodology version one. Version two changes requirements for intensive claims only. NaFT finds thirty that require re-verification and seventy unaffected. Of the thirty, fifteen can be automatically re-evaluated. Fifteen stop and require new evidence.

> This thirty/seventy split is based on the fixture we constructed. It is not a measured efficiency gain or a field result.

Hold the five metrics visibly for several seconds.

## 1:35–2:05 — Inspect CLIMATE-086 (open **Why this claim changed**)

> For the example claim CLIMATE-086, NaFT shows the changed dependency and a successor package that explicitly supersedes its predecessor. The original package remains immutable. Missing evidence causes a fail-closed state, and old human decisions cannot silently carry over when their binding changes.

## 2:05–2:55 — Show on-chain evidence (click **Prepare blockchain anchor plan**)

> This is not merely a planned blockchain feature. The same deterministic package lineage is recorded on Ethereum Sepolia: genesis package P1, then successor P2, with P2 pointing back to P1.

Show **VERIFIED TESTNET**; open **P1 Tx**, **P2 Tx** and **Deployment source** links. Show the public contract or P2 transaction on Etherscan.

> The browser button only recomputes the transaction arguments; it does not broadcast another transaction. Our independent read-only verifier reconstructed the exact contract bytecode and package plan from the recorded source commit, then checked calldata, events, writer identity and the final chain head.

## 2:55–3:25 — Architecture and trust boundary (show architecture diagram, then adoption)

> This diagram shows NaFT's main distinction. Evidence compilation, dependency analysis and re-verification happen off-chain; Sepolia witnesses only hashes and parentage. Blockchain cannot certify climate truth. Aggregators can organize changed claims, verification operators review affected cases, and programs can inspect the history without raw evidence on-chain.

## 3:25–3:55 — Technical proof (show Engineering evidence)

> The impact analyzer was compared against an independent full-recomputation oracle across six hundred fourteen deterministic adversarial changes and five change classes. We observed zero false negatives within that tested synthetic state space, while allowing conservative extra review. This is engineering evidence, not proof of field savings or formal certification.

## 3:55–4:10 — Closing (return to NaFT heading)

> Carbon markets need evidence that survives methodology change. NaFT makes the evolution of climate MRV evidence selectively re-verifiable, explainable and independently traceable.

## Recording/finishing checklist

- Use a real browser capture, not mock transactions or simulated Etherscan screens.
- Confirm **VERIFIED TESTNET**, the on-page architecture SVG, the fictional scenario's 30/70 results and all contract/deploy/P1/P2 links in a clean browser first.
- Make the transaction hashes readable, use 1080p or higher, clear narration and English captions.
- Never show MetaMask recovery phrases/private keys, Infura keys, RPC credentials or GitHub secrets.
- Confirm the **current official contest requirements** (including accepted video duration) before recording.
- Upload a publicly accessible or organizer-accepted unlisted video and check playback without login.
- Insert actual video URL and final Devpost URL in [submission pack](ieee-submission-pack.md) only after they exist.
