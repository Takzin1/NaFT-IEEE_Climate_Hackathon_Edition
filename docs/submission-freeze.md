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

- **destination main** push CI success, on the intended submission SHA;
- the exact original IEEE source commit remains an ancestor of destination main;
- repository visibility confirmed **Public** (only after the owner's security approval);
- the independent **deploy-pages** job completed SUCCESS on the same SHA; Private-repo Skip is not a deployment;
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
Public demo URL (verify before claiming published): https://takzin1.github.io/NaFT-IEEE_Climate_Hackathon_Edition/#/climatechain
Repository URL: https://github.com/Takzin1/NaFT-IEEE_Climate_Hackathon_Edition
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

- keep the *source* NaFT PR #20 open/draft unless explicitly instructed to change it;
- freeze the **destination** main HEAD, without changing or deleting the source IEEE branch;
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
