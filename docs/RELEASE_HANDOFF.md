# IEEE ClimateChain 2026 — Public release handoff

> **As of October 12, 2026:** The destination repository remains **Private**.
> The code, source ancestry and independent verification are prepared.
> **GitHub Pages and Devpost submission are NOT completed.**

## Repo and source provenance

- Independent destination: https://github.com/Takzin1/NaFT-IEEE_Climate_Hackathon_Edition
- Default branch: `main`
- Immutable original IEEE source SHA: `c87b534877293133ad92ac398b95936608bfd91b`
- Original source and PR #20 are unchanged.
- Source commit and history retained as ancestors of the destination `main` merge.
- Private release candidate: `release/ieee-2026-private-verified-freeze`

## Completed private checks

- Main CI: [#12 SUCCESS](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackathon_Edition/actions/runs/38189786229) with **1,234 original assertions and four additional Keccak vector checks**.
- Live Sepolia RPC: [#6 SUCCESS](https://github.com/Takzin1/NaFT-IEEE_Climate_Hackathon_Edition/actions/runs/38189786240), `VERIFIED_TESTNET_RPC`. Original contract and P1/P2, no redeployment.
- Historical source security: Gitleaks scanner step scanned 257 reachable source commits; no leaks in scanned patterns. Parent workflow did not fully succeed due to permissions; see [independent report](INDEPENDENT_VERIFICATION_REPORT.md).
- Later main CI and read-only RPC runs must be checked on the final publication commit, not assumed from these earlier runs.

## Final publication hardening (pending new CI verification)

- Before any Pages deployment, the integrated workflow runs a **full-ref Gitleaks history scan** and historical sensitive-path check. A missing scanner, truncated clone or detected secret fails closed.
- Pages uploads only the **15 allowlisted static runtime assets** staged by `scripts/stage-public-pages.sh`, not the complete repository tree. Both primary and manual fallback workflows use the same package verifier.
- Source code remains visible when the repository becomes Public; the Pages allowlist reduces accidental *website artifact* exposure, not GitHub repository visibility.
- The user's own author email remains embedded in preserved Git commits. Its visibility has been acknowledged; no Git history rewrite is attempted.
- Run locally before publishing: `bash scripts/audit-public-history.sh` with Gitleaks v8.30.1, or require green `publication-history-audit` in final `main` GitHub Actions.
- Treat this text as release instructions only until exact-head CI shows SUCCESS. Do not claim a scan or public Pages deployment completed merely because its workflow exists.

## Owner action: make the existing repository Public

The connected GitHub tool cannot change a repository's visibility. **Do not insert a key into the Repo or Pages.**

1. Open the destination repository on GitHub.
2. Choose **Settings → General → Danger Zone → Change repository visibility → Make public**.
3. Review the warning: **the entire retained original Git commit history becomes public**, not just today's snapshot. Confirm only after reviewing that exposure.
4. The workflow listens for GitHub's `public` event. It should run **full independent CI** and only then attempt Pages publication. If the event does not launch, open **Actions → IEEE ClimateChain Pages Manual Fallback → Run workflow** on `main`, or trigger a new `main` push after audit.
5. Require a **SUCCESS** `deploy-pages` job, then open the independent judge URL in a logged-out/private browser window:

   https://takzin1.github.io/NaFT-IEEE_Climate_Hackathon_Edition/#/climatechain

6. Test the four-click synthetic demo, public SVG, Etherscan P1/P2 links, mobile overflow, and console errors. Only then replace "expected URL" with "published URL" in Devpost.

## Remaining submission actions

- Record 3–5-minute English **real-screen** video using the [prepared script](climatechain-video-script.md), subject to organizer's current rules.
- Verify current competition deadline, eligibility, video/AI rules and fields from the organizer. **This repository has not independently checked the latest external rules.**
- Submit project via Devpost; keep the actual submission/project and video URLs.
- Confirm the final `main` SHA, green CI, published Pages, and submission metadata, then freeze the exact successful ref. Do not merge or delete source PR #20.

**No-Go for public submission** until the independent repository is accessible anonymously, Pages is live and the actual Devpost/video links exist.