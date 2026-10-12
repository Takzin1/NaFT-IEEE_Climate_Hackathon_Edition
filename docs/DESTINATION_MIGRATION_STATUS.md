# IEEE destination migration / security gate

**Status: CODE-ONLY STAGING; not history-preserved or public.**

- Source: https://github.com/Takzin1/NaFT
- Source IEEE HEAD: `c87b534877293133ad92ac398b95936608bfd91b`
- Destination: https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition
- Staging branch: `staging/ieee-code-snapshot`
- Code snapshot: all **80 files** copied, source and destination SHA match **80/80** before destination-only changes.
- Git history: **not migrated**. A full history-preserving merge remains necessary; do not squash or claim original ancestry on this branch.
- Security: common credential patterns scanned in the 80 current files without matches. **Historical gitleaks scan not performed**; do not set repository to Public until passed.
- Google API: integration is only a future idea; no API key was imported or configured. If added, use GitHub Secrets and server-side execution; do not embed secrets in GitHub Pages.
- Chain: pre-existing Ethereum Sepolia contract `0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0`, original source commit `fb9016c6c3041ec0e77098e631d62138fbae582e`. **No redeployment.**
- Independent Pages: target https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain — **not published yet**.
- Devpost/video: **not submitted/uploaded**.

## To complete

1. Use a trusted runner/working copy to fetch the source Git objects and scan the **complete** reachable Git history.
2. Merge unrelated source and bootstrap histories while keeping the exact source IEEE commit as an ancestor, preferably into a clean destination main checkout (not by falsely claiming ancestry from this snapshot).
3. Apply IEEE destination-specific README, Pages, CI and link changes without changing the source.
4. Verify all regression/security checks, real Chrome, local EVM, reproducible reports and read-only Sepolia RPC.
5. Only after security inspection, make the repository Public and deploy Pages from main; verify external access.
6. Record final destination SHA and freeze. Complete video upload and Devpost separately.
