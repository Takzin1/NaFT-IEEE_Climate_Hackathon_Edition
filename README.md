# NaFT — Version-Aware Climate MRV

> **Carbon markets need evidence that survives methodology change.**

**Core value:** Selective re-verification of versioned MRV evidence.
**Blockchain role:** External witness of package lineage, **not climate certification**.

## IEEE ClimateChain 2026 — Independent repository

**Status: PUBLIC. Independent GitHub Pages and real-browser smoke validation passed on October 15, 2026. Automated video recorder preview passed on October 17, 2026; the full narrated demo and final Devpost submission are not yet confirmed.**

Destination `main` preserves the original IEEE source HEAD as a real parent/ancestor of a two-parent migration merge commit. The destination bootstrap history remains its first-parent lineage. Eighty IEEE files were transferred byte-identically before destination-only changes, which are recorded separately. The original `NaFT/main`, Source PR #20, frozen refs, Sepolia contract and P1/P2 history have not been modified.

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

Solidity local EVM and browser CI run in GitHub Actions. The [October 17 release CI run](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39012705183) passed core regression, full-history secret scanning, Pages deployment and live-browser checks on source revision `3564daa9105d324099ca72e828bb560b029db072` (before later documentation updates). **Sepolia read-only verification did not pass on that revision:** the [October 17 RPC run](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39012705244) could not retrieve the historical transaction receipts reliably from public providers (some also returned HTTP 522/400). An [earlier source-bound Sepolia verification](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/38189786240) did pass, but its result must not be presented as a successful fresh check. Re-run the read-only verification before making current-chain verification claims; do not infer new transactions or altered proofs from RPC unavailability.

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

### Interactive synthetic Impact Explorer

The English `#/climatechain` demo now lets reviewers filter and select every synthetic claim. A source-bound trace shows the exact active-rule projection differences, old provenance-graph dependent nodes, SHA-256 hashes, predecessor/successor package references and blocked evidence requirements. Select `CLIMATE-001` (unaffected), `CLIMATE-071` (evidence needed), or `CLIMATE-086` (auto re-evaluated), then **Download selected trace JSON**. These are local engineering explanations, **not** independent GHG eligibility conclusions or chain submissions.

### Standalone publication gate

GitHub Actions includes public-only `deploy-pages` and a **post-deploy real-Chrome HTTP/UI smoke test**. The independent Pages site was deployed on October 15, 2026, and the [October 17 source-revision CI run](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39012705183) passed both `deploy-pages` and `smoke-public-pages`, including public assets, the star logo, the 100/30/70/15/15 browser computation, P1/P2 links and the architecture SVG. The earlier lazy-loaded-image test issue was fixed; it is no longer an outstanding release gate. No keys or chain transactions are required.

### Independent verification evidence

[Full IEEE migration and destination verification report](docs/INDEPENDENT_VERIFICATION_REPORT.md) records the historical 257-commit scan and original source-bound verification. For current release evidence, use the [October 17 full-ref security audit](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/actions/runs/39012705183) (357 reachable commits; Gitleaks scanned 327) and the latest available chain-verification result, rather than treating the older report as a current status page.

### Important origin distinction

The original source deployment commit `fb9016c6c3041ec0e77098e631d62138fbae582e` and Sepolia transaction links deliberately refer to **Takzin1/NaFT**, where the witness was originally deployed. Do not rewrite historical source references merely to make them appear native to the new repository.

## License

See [LICENSE](LICENSE). This is a research prototype, not a certified carbon-credit registry, token minting service or operational claim of climate truth.
