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
- Tests: **destination main core-and-security CI #10 succeeded on `847b626e931c4305116dcd32559bcc69a4a637e1`**, including the original **1,234 assertions**, four additional Ethereum Keccak-256 vectors, Solidity compilation, local EVM, real Chrome and reproducible reports. [CI #10](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38189397298).
- Blockchain: **independent source-bound live RPC verification `VERIFIED_TESTNET_RPC` succeeded on destination `847b626e931c4305116dcd32559bcc69a4a637e1`** using `https://sepolia.drpc.org`: chain ID, deployed creation/runtime bytecode, original deployment source `fb9016c6c3041ec0e77098e631d62138fbae582e`, writer, P1/P2 calldata/events and final head verified. [Sepolia verification #4](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38189397313). No signing or redeployment.
- Google API: no Google API key has been configured or committed. Never place a secret in GitHub Pages JavaScript; use a backend or serverless secret store.
- Public Pages: **not yet published**; intended URL: https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain
- Video / Devpost entry: **not completed**.
- Original NaFT `main`, IEEE PR #20 and freeze branches: unchanged.

## Release remains blocked until

1. **PASSED** — Destination `main` core CI #10: full regression, Solidity, local EVM, real Chrome, deterministic reports, independent Keccak vectors.
2. **PASSED** — Read-only Sepolia RPC #4: full `VERIFIED_TESTNET_RPC` proof with existing deploy/P1/P2.
3. **PENDING** — Repository visibility Public after authorized final review (the linked GitHub connector cannot change visibility).
4. **PENDING** — Independent Pages from destination `main` must deploy and be accessible without login, including `/#/climatechain`.
5. **PENDING** — Record final public release SHA, demo video and Devpost confirmation; freeze only after those exist.

No climate truth, real farm impact, carbon-credit issuance, certification, registry acceptance or cost savings are claimed.

## Independent Sepolia re-check — 2026-10-12

The source-bound **live public-RPC** verification has **not** succeeded on the
destination. The GitHub Actions verifier found three external issues:

- `ethereum-sepolia-rpc.publicnode.com` returned missing historical transaction receipt(s).
- `rpc.sepolia.org` returned HTTP 404 for `web3_sha3`.
- `sepolia.drpc.org` returned HTTP 400 for `web3_sha3`.

The verifier now calculates Ethereum Keccak-256 locally, tested against known
Keccak vectors. This removes unsupported `web3_sha3` RPC calls but **does not
make missing receipts acceptable**. Real contract/transaction receipt checks
and final `headByClaim` remain mandatory. The existing historic
`VERIFIED_TESTNET` record is preserved without modification; destination
`VERIFIED_TESTNET_RPC` still requires a complete successful live verification.

See [independent verification report](INDEPENDENT_VERIFICATION_REPORT.md) for immutable run links and exact trust boundaries.
