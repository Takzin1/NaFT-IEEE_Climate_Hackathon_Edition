#!/usr/bin/env bash
# Fail-closed publication audit of all Git refs, not merely current source files.
# Run in a full clone from a trusted checkout, with Gitleaks v8.30.1 installed.
set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"
command -v gitleaks >/dev/null 2>&1 || { echo "HISTORY_AUDIT_NO_GITLEAKS: install pinned Gitleaks before publishing" >&2; exit 1; }
git rev-parse --is-shallow-repository | grep -qx false || { echo "HISTORY_AUDIT_SHALLOW_CLONE: full Git history required" >&2; exit 1; }
git merge-base --is-ancestor c87b534877293133ad92ac398b95936608bfd91b HEAD || { echo "HISTORY_AUDIT_SOURCE_ANCESTRY_MISSING" >&2; exit 1; }
count="$(git rev-list --all --count)"
[[ "$count" =~ ^[0-9]+$ && "$count" -ge 250 ]] || { echo "HISTORY_AUDIT_UNEXPECTED_HISTORY_COUNT: $count" >&2; exit 1; }
echo "PUBLIC_HISTORY_AUDIT: checking all reachable refs ($count commits); no raw secrets will be printed."
# Keep candidate secrets out of CI logs while still reporting actionable rule IDs.
# The Gitleaks JSON stays in a temporary local file and is deleted on exit.
audit_report="$(mktemp)"
trap 'rm -f "$audit_report"' EXIT
if ! gitleaks git --log-opts="--all" --no-banner --redact \
  --report-format=json --report-path="$audit_report" .; then
  python3 - "$audit_report" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as source:
    findings=json.load(source)
print("PUBLIC_HISTORY_AUDIT_BLOCKED: potential secret pattern(s) found.")
print("Rule count:", len(findings))
for finding in findings[:10]:
    # Never emit Secret, Match, File, or commit/body diff content to logs.
    print("Finding rule:", finding.get("RuleID", "<unknown>"),
          "commit:", str(finding.get("Commit", ""))[:12],
          "line:", finding.get("StartLine", "?"))
    print("Finding fingerprint (no credential content):",
          finding.get("Fingerprint", "<unavailable>"))
PY
  exit 1
fi
# Git history remains public after visibility change. Review historically sensitive
# *path names* even when content-based secret signatures do not match.
suspicious="$(git rev-list --objects --all | sed -nE 's/^[a-f0-9]{40} //p' |
  grep -Ei '(^|/)(\.env($|\.)|id_rsa$|id_ed25519$|[^/]*\.(pem|p12|pfx|key|keystore)$|wallet[-_.]?secret[^/]*|service[-_.]?account[^/]*\.json$)' |
  grep -Eiv '(^|/)\.env\.(example|sample|template)$' || true)"
if [[ -n "$suspicious" ]]; then
  echo "HISTORY_AUDIT_SENSITIVE_HISTORICAL_PATHS: manual review required (paths omitted from logs)." >&2
  echo "Number of matches: $(printf '%s\n' "$suspicious" | wc -l | tr -d ' ')" >&2
  exit 1
fi
echo "PUBLIC_HISTORY_AUDIT_PASS: scanned all reachable Git refs; no matching secret signatures or sensitive historical paths."
echo "BOUNDARY: pattern scans do not prove absolute absence of undisclosed secrets; commit author emails are intentionally not erased."
