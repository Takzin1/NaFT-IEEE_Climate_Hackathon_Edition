# NaFT — Version-Aware Climate MRV

**Problem — What needs re-verification when climate MRV rules change?** NaFT traces methodology and evidence dependencies so operators can identify which historical claims need review, and why.

**Try it in one step — [Open the live demo](https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain) → click “Run 100-claim methodology update.”** No installation, login or wallet required.

**Demo video — [Watch/download the 4:12 real-browser walkthrough (silent MP4)](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39035967949/artifacts/12102053650).** This is a GitHub Actions artifact ZIP; GitHub sign-in may be required. A publicly hosted, narrated version has **not** been confirmed.

> **Carbon markets need evidence that survives methodology change.** NaFT is a version-aware MRV evidence compiler and selective re-verification engine. Its Ethereum Sepolia evidence records package lineage, **not climate certification**.

**What the demo proves:** In a **synthetic 100-claim scenario**, 30 claims are flagged for re-verification, 70 are unaffected; of the 30, 15 are automatically re-evaluated and 15 require new evidence. This is **not** a measured carbon reduction or a 70% cost/time saving.

## IEEE ClimateChain 2026 — Independent repository

**Release status:** Public app, GitHub Pages browser smoke, core CI and [Sepolia source-bound read-only verification](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752142) have passed on `main` (October 17, 2026). The silent full-length demo is recorded; the narrated public video and Devpost submission are **not confirmed**.

| Resource | Link |
| --- | --- |
| Target repository | https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition |
| Source IEEE branch | https://github.com/Takzin1/NaFT/tree/hackathon/ieee-climatechain-2026 |
| Exact source snapshot | https://github.com/Takzin1/NaFT/commit/c87b534877293133ad92ac398b95936608bfd91b |
| Standalone public demo | https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain |
| Architecture SVG | [docs/assets/naft-climatechain-architecture.svg](docs/assets/naft-climatechain-architecture.svg) |
| Portable IEEE audit receipt | [Replay verifier + tamper challenge](docs/ieee-audit-receipt.md) |
| Devpost submission pack | [docs/ieee-submission-pack.md](docs/ieee-submission-pack.md) |
| Demo script | [docs/climatechain-video-script.md](docs/climatechain-video-script.md) |
| Automated real-browser video capture | [GitHub Actions capture runbook](docs/automated-video-recording.md) |
| Security/migration gate | [docs/DESTINATION_MIGRATION_STATUS.md](docs/DESTINATION_MIGRATION_STATUS.md) |

## Three-pillar judge check

**Detect a corrupted evidence manifest → independently recompile changed and unchanged synthetic claims → inspect pre-existing P1/P2 lineage on Ethereum Sepolia.** In the [live app](https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain), click **Run 100-claim methodology update**, then **Verify all 3 pillars** and optionally **Download 3-pillar proof JSON**. The checker fails closed on manipulated classifications, counts or successor package hashes.

Reproduce the synthetic proof without an RPC or wallet: `node scripts/ieee-triad-proof.mjs generate /tmp/naft-three-pillars.json` then `node scripts/ieee-triad-proof.mjs verify /tmp/naft-three-pillars.json`. The separately run [read-only Sepolia check](scripts/verify-live-sepolia.sh) confirms recorded on-chain facts; the browser itself does **not** query live chain state. [Detailed reviewer protocol](docs/ieee-three-pillars.md).

## Four-step proof

1. Inspect the methodology/evidence change in the English ClimateChain UI.
2. Run the deterministic 100-claim **synthetic** experiment: 30 re-verify, 70 unaffected; of the 30, 15 auto and 15 needing evidence.
3. Examine dependency reasoning and package predecessor/successor records for example `CLIMATE-086`.
4. Inspect pre-existing real Ethereum Sepolia P1/P2 transactions and independent read-only verification.

**Boundaries:** the 30/70 ratios belong to a synthetic fixture. No measured farm carbon reduction, 70% cost savings, J-Credit certification, registry acceptance or credit issuance is claimed. Ethereum witnesses package hashes and lineage only.

## Technical scope

Pre-existing NaFT core: version-aware methodology packs, deterministic MRV evidence compiler, dependency/provenance graphs, change impact analysis, selective re-verification, human decision staleness, append-only successor packages.

IEEE-specific work: public-testnet lineage contract and source-bound verifier, ClimateChain judge-first UI and practical synthetic scenario, adversarial tests, responsive design, Devpost assets and video script.

### Run independent verification

```bash
bash tests/run.sh
node tests/climatechain-contract-behavior.test.mjs
bash scripts/verify-live-sepolia.sh
```

Solidity local EVM, browser smoke and history-security scanning are checked by [the latest successful `main` CI](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752123). The [independent Sepolia read-only verification](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752142) also passed on the **same release SHA** (`ea43dcbdb97b3c1cfa233784ae90577cbec56f69`), reconstructing recorded Solidity bytecode, P1/P2 calldata and events, and package lineage. Earlier October 17 RPC runs failed because public endpoints returned missing transaction/receipt data or HTTP 522/400; adding alternative public RPC fallbacks restored full read-only validation. This is evidence of testnet **lineage**, not independently certified emissions outcomes.

### Deterministic reviewer audit receipt (synthetic)

Run the 100-claim update on `#/climatechain` and select **Download reproducible audit receipt**. This captures each claim's re-verification status, dependency reasons, old/new package references and pinned synthetic Pack/workload SHA-256 values. Reviewers can replay the receipt against this exact checked-out source commit, using only Node 24:

```bash
node scripts/ieee-replay-audit.mjs generate /tmp/naft-ieee-audit-receipt.json
node scripts/ieee-replay-audit.mjs verify /tmp/naft-ieee-audit-receipt.json
```

**Run evidence tamper challenge** deliberately alters a synthetic source record without updating its expected hash and confirms the compiler rejects it. CI includes positive replay plus rehashed forgery, omission and status/count mutation negative controls. This is a source-bound *replay*, not an independent climate measurement, formal verifier signature or proof of evidence authenticity. The existing independent semantic oracle remains in `tests/impact-proof.test.js`. See [the audit lab protocol](docs/ieee-audit-receipt.md).


### Synthetic strategy benchmark (measured, not a savings claim)

In addition to receipt replay, run a reproducible **full-recompilation versus selective-impact** comparison. It uses the actual compiler in both strategies, checks predecessor/successor hash parity, and records timing samples and output work units separately:

```bash
node scripts/ieee-benchmark.mjs --sizes 100,200,500 --iterations 3 --output /tmp/naft-ieee-benchmark.json
```

**70 unaffected out of 100 is not 70% runtime, cost, or labor savings.** NaFT's impact analysis includes baseline compilation and graph work; the full comparison includes predecessor and all successor compilations. Empirical timing on your hardware is an observation, not a speedup guarantee. See [benchmark protocol and limitations](docs/ieee-strategy-benchmark.md).

### Cost impact (illustrative)

`node scripts/ieee-cost-estimate.mjs` (add `--json` for machine output) turns the analyzer's real plot counts on the synthetic 100-claim workload into a side-by-side **full versus selective** re-verification estimate. Rates live in [`config/cost-estimator.defaults.json`](config/cost-estimator.defaults.json) and are **unsourced assumptions — replace with real values** (`--hours-per-plot`, `--rate-jpy`, `--overhead-jpy`, `--jpy-per-usd`, `--total`, `--flagged`).

```text
Strategy                  | Plots | Hours | Cost (JPY) | Cost (USD)
Full re-verification      |   100 |   200 |     600000 |       4000
NaFT selective            |    30 |    60 |     180000 |       1200
Difference (illustrative) |    70 |   140 |     420000 |       2800
```

Illustrative estimate — not a measured saving, not a guarantee of CO2 reductions or credit issuance. The 30 selected plots are 15 auto re-evaluated + 15 evidence-required, all conservatively costed as reviewer work.

### Interactive synthetic Impact Explorer

The English `#/climatechain` demo now lets reviewers filter and select every synthetic claim. A source-bound trace shows the exact active-rule projection differences, old provenance-graph dependent nodes, SHA-256 hashes, predecessor/successor package references and blocked evidence requirements. Select `CLIMATE-001` (unaffected), `CLIMATE-071` (evidence needed), or `CLIMATE-086` (auto re-evaluated), then **Download selected trace JSON**. These are local engineering explanations, **not** independent GHG eligibility conclusions or chain submissions.

### Standalone publication gate

GitHub Actions includes public-only `deploy-pages` and a **post-deploy real-Chrome HTTP/UI smoke test**. The [October 17 `main` release CI](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752123) passed both checks, including public assets, the star logo, the 100/30/70/15/15 browser computation, P1/P2 links and the architecture SVG. No keys or chain transactions are required.

### Independent verification evidence

[Full IEEE migration and destination verification report](docs/INDEPENDENT_VERIFICATION_REPORT.md) records the historical 257-commit scan and original source-bound verification. For up-to-date, source-SHA-specific release evidence, use the [latest passing `main` CI](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752123) and [read-only Sepolia verification](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39039752142), rather than treating the older report as a live status page.

### Important origin distinction

Destination `main` preserves the original IEEE source HEAD as a real parent/ancestor of a two-parent migration merge commit. The destination bootstrap history remains its first-parent lineage. Eighty IEEE files were transferred byte-identically before destination-only changes, which are recorded separately. The original `NaFT/main`, Source PR #20, frozen refs, Sepolia contract and P1/P2 history have not been modified.

The original source deployment commit `fb9016c6c3041ec0e77098e631d62138fbae582e` and Sepolia transaction links deliberately refer to **Takzin1/NaFT**, where the witness was originally deployed. Do not rewrite historical source references merely to make them appear native to the new repository.

## License

See [LICENSE](LICENSE). This is a research prototype, not a certified carbon-credit registry, token minting service or operational claim of climate truth.
