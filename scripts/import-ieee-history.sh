#!/usr/bin/env bash
# Run from the private destination's Codespace, on main:
# bash scripts/import-ieee-history.sh --apply
set -Eeuo pipefail
stop(){ echo "IEEE_MIGRATION_STOP: $*" >&2; exit 1; }
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then stop "Pass --apply explicitly"; fi
SOURCE_URL="https://github.com/Takzin1/NaFT.git"
SOURCE_BRANCH="hackathon/ieee-climatechain-2026"
EXPECTED="c87b534877293133ad92ac398b95936608bfd91b"
TARGET_NAME="NaFT-IEEE_Climate_Hackthon_Edition"
[ "$(git branch --show-current)" = "main" ] || stop "Use destination main branch"
[ -z "$(git status --porcelain)" ] || stop "Commit/stash local changes before migration"
case "$(git remote get-url origin)" in
  *"Takzin1/$TARGET_NAME"*) ;;
  *) stop "Origin is not the expected destination repository";;
esac
command -v gitleaks >/dev/null || stop "Install gitleaks first: go install github.com/gitleaks/gitleaks/v8@latest"
command -v node >/dev/null || stop "Node.js required"
command -v python3 >/dev/null || stop "Python 3 required"

if git remote get-url naft-ieee-source >/dev/null 2>&1; then
  [ "$(git remote get-url naft-ieee-source)" = "$SOURCE_URL" ] || stop "Unexpected source remote"
else
  git remote add naft-ieee-source "$SOURCE_URL"
fi
git fetch --no-tags naft-ieee-source \
  "+refs/heads/$SOURCE_BRANCH:refs/remotes/naft-ieee-source/$SOURCE_BRANCH"
SOURCE_REF="refs/remotes/naft-ieee-source/$SOURCE_BRANCH"
ACTUAL="$(git rev-parse "$SOURCE_REF")"
[ "$ACTUAL" = "$EXPECTED" ] || stop "Source SHA moved to $ACTUAL. Stop and re-audit before changing EXPECTED."

umask 077
AUDIT="$(mktemp -d /tmp/naft-ieee-secret-scan.XXXXXXXX)"
echo "Auditing complete reachable Git history for secrets..."
if ! gitleaks git --log-opts="--all" --redact --no-banner \
  --report-format json --report-path "$AUDIT/gitleaks-redacted.json" .; then
  stop "Gitleaks flagged a secret or could not scan. DO NOT PUBLISH. Inspect $AUDIT/gitleaks-redacted.json"
fi
git rev-list --objects "$SOURCE_REF" | grep -Ei \
  '(^|/)(\.env($|[./])|id_rsa$|id_ed25519$|[^ ]*\.(pem|p12|pfx|keystore)$|wallet[-_.]?secret)' \
  | grep -Eiv '\.env\.(example|sample|template)$' > "$AUDIT/suspicious-paths.txt" || true
[ ! -s "$AUDIT/suspicious-paths.txt" ] || stop "Sensitive historical path names: $AUDIT/suspicious-paths.txt"
echo "Secret scan passed. No public visibility change is performed by this script."

# Preserve source IEEE commit ancestry AND destination bootstrap history.
git merge --allow-unrelated-histories --no-ff --no-commit "$SOURCE_REF" || true
[ -f .git/MERGE_HEAD ] || stop "Git did not enter expected merge state"
CONFLICTS="$(git diff --name-only --diff-filter=U)"
if [ -n "$CONFLICTS" ]; then
  [ "$CONFLICTS" = "README.md" ] || stop "Unexpected merge conflict(s): $CONFLICTS"
  git checkout --theirs -- README.md
  git add README.md
fi
[ -f "contracts/NaFTMRVAnchor.sol" ] || stop "Source contract missing"
[ -f "docs/assets/naft-climatechain-architecture.svg" ] || stop "Source SVG missing"
[ -f "src/climatechain-testnet-record.js" ] || stop "Source Sepolia evidence missing"
[ -f "tests/climatechain.test.js" ] || stop "Source tests missing"

# Independent main-only Pages, no intentional test skip. No source changes.
python3 - <<'PY'
from pathlib import Path
p=Path(".github/workflows/ci.yml")
v=p.read_text()
v=v.replace('branches: [main, "feat/**", "hackathon/**"]','branches: [main]')
v=v.replace("    if: github.event_name != 'pull_request' || github.head_ref != 'hackathon/ieee-climatechain-2026'\n","")
v=v.replace("github.ref == 'refs/heads/main' || github.ref == 'refs/heads/hackathon/ieee-climatechain-2026'","github.ref == 'refs/heads/main'")
v=v.replace("name: $"+"{{ github.ref == 'refs/heads/main' && 'github-pages' || 'github-pages-climatechain' }}","name: github-pages")
p.write_text(v)
p=Path(".github/workflows/pages.yml")
v=p.read_text().replace("name: $"+"{{ github.ref == 'refs/heads/main' && 'github-pages' || 'github-pages-climatechain' }}","name: github-pages")
p.write_text(v)
PY
git add -A
[ -z "$(git diff --name-only --diff-filter=U)" ] || stop "Unresolved conflicts"
git diff --cached --check || stop "Whitespace errors in imported files"
# The read-only source-bound verifier performs git show HEAD:path,
# so form the merge commit LOCALLY first; it is never pushed if any test fails.
git commit -m "import(ieee): preserve NaFT IEEE history and isolate standalone CI"
git merge-base --is-ancestor "$EXPECTED" HEAD || stop "Original source commit is not an ancestor"
echo "Running all existing core/security regression tests on the local merge commit..."
bash tests/run.sh || stop "Regression failed; local runner commit is NOT pushed"
echo "Pushing destination main only (source is never modified)..."
git push origin main
echo "IEEE_HISTORY_IMPORT: PASS"
echo "Imported source: $EXPECTED"
echo "Destination HEAD: $(git rev-parse HEAD)"
echo "Private repository remains private. Recheck GitHub Actions and links before changing visibility."
