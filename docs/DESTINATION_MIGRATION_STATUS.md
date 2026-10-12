# IEEE destination provenance and release gate

**Status: history-integrated PRIVATE repository; publication pending.**

- Original repository: https://github.com/Takzin1/NaFT
- Exact source IEEE HEAD: `c87b534877293133ad92ac398b95936608bfd91b`
- Original branch: `hackathon/ieee-climatechain-2026`
- Destination repository: https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition
- Destination default branch: `main`
- Commit preservation: destination merge commit has original IEEE HEAD as **second parent**, and existing destination bootstrap lineage as first parent. Verify with `git merge-base --is-ancestor c87b534877293133ad92ac398b95936608bfd91b main`.
- File integrity: the initial **80 source blobs matched 80/80** before destination-only landing/CI/documentation edits.
- Historical security: Gitleaks scan of fetched repository history using `gitleaks git --log-opts="--all"` reported **no leaks found** in GitHub Actions audit run [#4](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38187476478). Earlier passes aborted before pushing because of tool CLI or permissions limitations; they are not climate-code defects.
- Tests: original source and destination staging CI verified **1,234 assertions, 0 failures**; audit run #4 also passed `bash tests/run.sh` before its GitHub workflow permission rejection. Final destination `main` CI must be checked separately.
- Blockchain: original Ethereum Sepolia contract `0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0`, historical original deployment source `fb9016c6c3041ec0e77098e631d62138fbae582e`, P1/P2 hashes/transactions preserved. No signing or redeployment.
- Google API: no Google API key has been configured or committed. Never place a secret in GitHub Pages JavaScript; use a backend or serverless secret store.
- Public Pages: **not yet published**; intended URL: https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain
- Video / Devpost entry: **not completed**.
- Original NaFT `main`, IEEE PR #20 and freeze branches: unchanged.

## Release remains blocked until

1. New destination `main` CI passes full regression, Solidity, local EVM, real Chrome, report reproduction and security scans.
2. Read-only Sepolia RPC verification runs from the integrated destination and results are documented; RPC failures must be reported, not bypassed.
3. Repository visibility becomes Public only after a final secrets and content review; publication requires authorized repository administration.
4. Independent Pages from destination `main` is deployed and tested from outside the account, including direct `/#/climatechain` URL.
5. Real demo video and Devpost form are uploaded/submitted; final URLs and SHA frozen.

No climate truth, real farm impact, carbon-credit issuance, certification, registry acceptance or cost savings are claimed.
