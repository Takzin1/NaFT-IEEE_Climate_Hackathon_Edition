# NaFT — IEEE ClimateChain 2026 Submission Pack

> **Repository + public testnet proof are ready.** Video upload and Devpost submission are **not** yet confirmed. Check current organizer requirements before submitting.

## Judge path

**Demo:** https://takzin1.github.io/NaFT/#/climatechain

**Source (IEEE branch):** https://github.com/Takzin1/NaFT/tree/hackathon/ieee-climatechain-2026

**Devpost-ready draft:** [Submission text](devpost-submission-draft.md)

**Narrated demo/shot list:** [4-minute recording script](climatechain-video-script.md)

## One-sentence pitch

**Carbon markets need evidence that survives methodology change.** NaFT is a version-aware MRV evidence compiler and selective re-verification engine. It traces which claims must be reviewed again, preserves append-only package history and externally witnesses lineage on Ethereum Sepolia—without claiming blockchain certifies climate truth.

**Track candidate:** Carbon Markets & Emissions Transparency. Confirm exact live track wording before submitting.

## Real operational problem, illustrated safely

**Illustrative persona:** a fictional Japanese rice-paddy methane MRV project aggregator responsible for organizing **100 synthetic claims**, not 100 participating farms.

**Trigger:** a deliberately synthetic methodology change (`NAFT-SYNTHETIC@1 → @2`) adds requirements to intensive claims. NaFT traces dependency bindings and computes **30 requiring re-verification** (15 eligible for automatic re-evaluation, 15 blocked for missing evidence) and **70 unaffected**. A hypothetical all-claims review queue would cover 100 claims, but this is only a comparison scenario, **not observed operational practice or a measured 70% time/cost saving**.

**Decision workflow:** project aggregator identifies changed claims → verification operator checks impacted cases/evidence gaps → a successor package supersedes its predecessor → the package hashes and lineage are independently witnessed on Sepolia. A program or registry could inspect hashes, but **no live registry integration or acceptance is claimed**.

**Reusable architecture figure:** [NaFT off-chain/on-chain architecture (SVG)](assets/naft-climatechain-architecture.svg). The image is vector-based for readable slides and video, and is displayed directly in the live judge demo.

## Four-click demonstration

1. Show **VERIFIED TESTNET** and open the source/transaction links.
2. Click **Run 100-claim methodology update**. Show 100 candidates / 30 re-verify / 70 unaffected / 15 automatically re-evaluated / 15 new evidence required.
3. Show the **fictional aggregator scenario** and the **30/70 computed visual**; expand **Why this claim changed** for deterministic example `CLIMATE-086`.
4. Click **Prepare blockchain anchor plan**. Compare the P1/P2 hashes on-screen with the public Etherscan transactions.

**Important:** `NOT_SUBMITTED` in the **browser planner** means the button only constructs data locally and doesn't broadcast. The **separate public-testnet record** is `VERIFIED_TESTNET` because transactions were already sent and independently verified.

## Public Sepolia proof

| Evidence | Link |
| --- | --- |
| Network | Ethereum Sepolia, chain ID 11155111 |
| Contract | [NaFTMRVAnchor](https://sepolia.etherscan.io/address/0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0) |
| Deploy tx | [0x7695a040…](https://sepolia.etherscan.io/tx/0x7695a040d1639ebf5b2fcc96ec6c879e5ccc28c46d95d9371f906769b8a12188) |
| Genesis P1 tx | [0x85c25a7e…](https://sepolia.etherscan.io/tx/0x85c25a7ee239d7178c7266bf50e22c41bd30debfc7e37e579d437f1730d8fc34) |
| Successor P2 tx | [0xb5aef981…](https://sepolia.etherscan.io/tx/0xb5aef9810d6eb9c7516c0c9c6aadcf05fe952fb9170338fb915a5aa204579ac5) |
| Deployment source commit | [fb9016c6…](https://github.com/Takzin1/NaFT/commit/fb9016c6c3041ec0e77098e631d62138fbae582e) |
| Evidence record | [Verified source record](../src/climatechain-testnet-record.js) |

Example claim: **CLIMATE-086**

P1 package hash: `0xe69e7df04f5f3640d94de510308e71a3229fe7c71fe8cb437bfc084623b25477`

P2 package hash: `0xe5ee259abdc624bd6fd8cdf72fa72eef11397ba54556c01f2ce294824d70f71e`

## Read-only reproduction

From a clone of the **IEEE hackathon branch**, run:

```bash
bash scripts/verify-live-sepolia.sh
```

This uses an available public Sepolia RPC and should finish with `VERIFIED_TESTNET_RPC`. It requires **no key, no fee and no signing**, and reconstructs creation/runtime bytecode and deterministic anchor plan from the recorded deployment commit, then validates calldata, events, writer and final head. RPC outages are an external limitation; the deterministic local mock verifier also runs in CI.

## Technical and research claims

- Five change classes: methodology, evidence, parameter, field, activity.
- Synthetic 100-claim transition: 30 re-verify, 70 unaffected, 15 automatic, 15 blocked.
- **30/70 is fixture-driven**, not measured efficiency/cost improvement or real-world re-verification rate.
- 614 deterministic adversarial cases assessed with independent full recomputation: TP 429 / TN 78 / FP 107 / FN 0 within the **tested synthetic state space**.
- AG-005 `3.1-reference` is a historical reference, **not** an implemented current Japanese J-Credit certified rule.
- Blockchain proves referenced hash lineage, **not** data truth, certification, eligibility, verifier acceptance or carbon-credit issuance.

## External actions before actual submission

- [ ] Check the official *current* deadline, rules, eligibility, judging track, video length and required fields (not live-verified here).
- [ ] Record English demo and upload a viewable video; confirm it plays without login.
- [ ] Open Pages demo in a fresh browser and click all four proof links.
- [ ] Paste/adapt [Devpost draft](devpost-submission-draft.md) and attach the video/repository.
- [ ] Submit Devpost, save the confirmation and project URL.
- [ ] Record video URL, final head SHA and submission time in [freeze checklist](submission-freeze.md).

**Do not state that Devpost entry or video is complete until there is an actual URL/confirmation.**