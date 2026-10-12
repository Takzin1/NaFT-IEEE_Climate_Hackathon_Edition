# IEEE ClimateChain 2026 — Submission Freeze Procedure

Do this only when the Devpost copy, video and testnet decision are final.

## 1. Stop feature work

From the intended submission head onward, allow only:

- factual documentation corrections;
- submission-link updates;
- verified testnet evidence;
- critical bug fixes.

Do not add new product scope after the freeze starts.

## 2. Require one exact green head

For the intended submission SHA, require:

- push CI success;
- the **hackathon-branch push CI** succeeds (the redundant pull-request CI for this exact branch is intentionally skipped; Skip is expected);
- GitHub Pages deploy success;
- Solidity ABI + bytecode compilation success;
- browser ClimateChain flow success;
- committed report reproducibility success.

Do not mix evidence from different SHAs.

## 3. Confirm current VERIFIED_TESTNET state

Ethereum Sepolia public evidence is already recorded. Run `bash scripts/verify-live-sepolia.sh` to re-check it **without re-deploying or signing**. The alternative historical states remain below as integrity guidance.

## 3A. Historical testnet states

Exactly one state is allowed.

### A. NOT_SUBMITTED

Keep `src/climatechain-testnet-record.js` completely empty except for the explicit status and boundary fields. Submission copy must not claim public-testnet anchoring.

### B. VERIFIED_TESTNET

Populate every required field and pass the repository validator. Record the same chain/address/transaction evidence in the submission notes.

Never ship a partial hybrid state.

## 4. Record external submission artifacts

Copy these values into a private submission note before pressing Devpost submit:

```text
Final repository SHA:
Public demo URL: https://takzin1.github.io/NaFT/#/climatechain
Repository URL: https://github.com/Takzin1/NaFT
Devpost project URL:
Video URL:
Track:
Testnet state:
Network / chain ID:
Contract address:
Deploy tx:
Genesis anchor tx:
Successor anchor tx:
Submission timestamp:
```

## 5. Freeze the Git state

After the final green SHA is known:

- keep PR #20 open/draft unless explicitly instructed to mark ready or merge;
- create a dedicated release/tag or frozen release branch from the exact submission SHA;
- do not move that frozen ref after submission.

Suggested release ref:

`release/ieee-climatechain-2026-submission`

## 6. Final integrity read

Immediately before submission, open the public demo in a clean browser and verify:

- page title and language are correct;
- the methodology-update button runs;
- 100 / 30 / 70 / 15 / 15 renders;
- representative lineage renders;
- blockchain status matches the repository testnet record;
- no unsupported formal-certification claim appears;
- no horizontal overflow or runtime error appears.

## 7. Final Devpost check

Re-check the live Devpost page for:

- deadline/timezone;
- required fields;
- video duration;
- repository/public-access requirement;
- track wording;
- any last-minute organizer clarification.

The repository cannot guarantee that external competition requirements have not changed.

Do not interpret green CI or published Pages as proof of an uploaded video or submitted Devpost entry. These external actions need their own URLs/confirmation.
