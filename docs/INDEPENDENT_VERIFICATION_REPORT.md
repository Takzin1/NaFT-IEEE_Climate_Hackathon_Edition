# IEEE ClimateChain 2026 — Independent Repository Verification Report

**Report date:** 2026-10-12 (JST)
**Stage:** Independently reproducible **private candidate**, **not a completed public Devpost submission**.

## 1. Provenance: original Git history retained

| Field | Verified value |
| --- | --- |
| Original repository | [Takzin1/NaFT](https://github.com/Takzin1/NaFT) |
| Exact IEEE source branch | `hackathon/ieee-climatechain-2026` |
| Exact IEEE source HEAD | `c87b534877293133ad92ac398b95936608bfd91b` |
| Destination | [Takzin1/NaFT-IEEE_Climate_Hackthon_Edition](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition) |
| Destination integration commit | `2d4e86020a4bfaa1f9655ce8bb6a940bc0844c64` |
| First independently verified destination SHA | `847b626e931c4305116dcd32559bcc69a4a637e1` |
| Verified private candidate | `release/ieee-independent-verified-private-candidate` |

The migration is a true two-parent Git merge. Its **second parent is the exact original IEEE source commit**, preserving source commit objects and authoring history. The first parent preserves the destination bootstrap history. This is not a squash. Original `NaFT/main`, source PR #20, source frozen references, smart contract and existing P1/P2 were not modified.

The original 80 current-source Git blobs were cross-checked **80/80** before destination-only edits.

## 2. Public safety and secrets

A GitHub Actions migration audit fetched the source history and ran Gitleaks:

- **257 reachable source commits scanned**
- Approximately **1.82 MB** scanned
- Result: **`no leaks found`** in the audited patterns
- Audit log: [migration Actions #4](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38187476478)
- Note: that workflow's **overall status was failure due to its GitHub App lacking permission to update a workflow file**; the scanner step itself passed, and the preserved-history merge was completed separately.

This scan does **not** prove that no secret could ever exist: before changing visibility, retain normal human review. No Google API key, wallet secret, access token, or new RPC secret is embedded in the destination's configuration. Never put secrets into public GitHub Pages JS.

## 3. Destination regression: full core CI

**[GitHub Actions core CI #10 — SUCCESS](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38189397298)**

At verified SHA `847b626e931c4305116dcd32559bcc69a4a637e1`:

- NaFT core: **182 passed**
- Compiler corpus: **354 passed**
- Mitou impact: **10 passed**
- Independent impact proof: **619 passed**
- ClimateChain: **69 passed**
- Total existing suite: **1,234 passed, 0 failed**
- Additional Ethereum Keccak known vectors: **4 passed, 0 failed**
- Solidity 0.8.24 compilation: pass
- Local EVM contract behavior: pass
- Headless Chrome reviewer, synthetic impact, package anchor plan, SVG/design and six-route operator flow: pass
- Document / JS / CSS checks, report reproducibility, security and whitespace: pass

The 100-claim result (30 require re-verification, 70 unaffected, 15 automatic, 15 evidence required) is **fixture-derived**. The independent full recomputation oracle evaluated 614 deterministic adversarial cases, with TP 429 / TN 78 / FP 107 / FN 0 **only inside the tested synthetic state space**. No real-world verification savings or emission reduction is claimed.

## 4. Independent Ethereum Sepolia read-only verification

**[Destination Sepolia workflow #4 — SUCCESS](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38189397313)**
**Result: `VERIFIED_TESTNET_RPC`**
**Successful provider:** `https://sepolia.drpc.org`

| Item | Public reference |
| --- | --- |
| Network | Ethereum Sepolia, chain ID 11155111 |
| Contract | [0x1B7a3d...](https://sepolia.etherscan.io/address/0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0) |
| Original source commit | [fb9016c6...](https://github.com/Takzin1/NaFT/commit/fb9016c6c3041ec0e77098e631d62138fbae582e) |
| Deployment | [0x7695a040...](https://sepolia.etherscan.io/tx/0x7695a040d1639ebf5b2fcc96ec6c879e5ccc28c46d95d9371f906769b8a12188) |
| Genesis P1 | [0x85c25a7e...](https://sepolia.etherscan.io/tx/0x85c25a7ee239d7178c7266bf50e22c41bd30debfc7e37e579d437f1730d8fc34) |
| Successor P2 | [0xb5aef981...](https://sepolia.etherscan.io/tx/0xb5aef9810d6eb9c7516c0c9c6aadcf05fe952fb9170338fb915a5aa204579ac5) |

The verifier reconstructed compiler source and exact deterministic P1/P2 plans from the original deployment commit, checked creation/runtime bytecode, writer, chain ID, receipts, exact calldata, event signatures/data, predecessor linkage and final `headByClaim`.

Keccak-256 signature hashing is performed locally using tested Ethereum vectors. The verifier sends **read-only RPC requests only**; no private keys, signing or chain mutation.

**Trust boundary:** chain data witnesses package hashes and lineage only, **not climate truth, environmental performance, method eligibility, formal verifier approval, registry acceptance or credit issuance**.

### Latest confirmation on private release candidate

- [Core CI #12 — SUCCESS](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38189786229)
- [Independent real-Sepolia verification #6 — SUCCESS](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38189786240)
- Exact verified destination SHA: `051514e84bff01b7a8f71dc83dd5593b00e0a1d0`.
- Publication is still blocked: `deploy-pages` is skipped while the repository is Private.

## 5. Still incomplete — publication gate

- [ ] Repository visibility changed from **Private** to **Public** after final visibility approval/review
- [ ] Main GitHub Pages deployed and confirmed anonymously at `https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain`
- [ ] Browser direct-link and console errors checked against the **actual new public URL**
- [ ] Exact final release SHA frozen after public deployment success
- [ ] English real-screen demo video recorded, uploaded, playback tested without login
- [ ] Official current Devpost rules checked and **submission confirmation URL** recorded

The `deploy-pages` GitHub Actions job is **deliberately skipped while Private**; this is an access-control gate and must not be represented as a successful deployment.

## 6. Release decision

**GO for code and independent proof validation. NO-GO for final public submission until visibility, Pages and external video/Devpost actions are complete.**
