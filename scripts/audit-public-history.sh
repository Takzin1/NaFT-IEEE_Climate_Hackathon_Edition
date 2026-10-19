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
scan_exit=0
gitleaks git --log-opts="--all" --no-banner --redact \
  --report-format=json --report-path="$audit_report" . || scan_exit=$?
if [[ "$scan_exit" -gt 1 ]]; then
  echo "PUBLIC_HISTORY_AUDIT_SCANNER_ERROR: scanner failed, audit not bypassed." >&2
  exit "$scan_exit"
fi
if [[ "$scan_exit" -eq 1 ]]; then
  # The two historical examples are purely descriptive diagnostic labels.
  # Both exact rule fingerprints are reviewed. No rule, path or commit
  # is globally excluded. Every unseen pattern MUST fail closed.
  python3 - "$audit_report" <<'PY'
import json, sys
known = {
 "ea493dbb32f60168802157e69c48d94e5d627269:scripts/ieee-gimje-reference-method-gates.py:generic-api-key:223",
 "f209fdbe698273c1a6785b983a9b5e4296f2f785:scripts/audit-public-history.sh:generic-api-key:25",
}
try:
    with open(sys.argv[1], encoding="utf-8") as source:
        findings=json.load(source)
    if not isinstance(findings, list) or not findings:
        raise ValueError("Missing or malformed Gitleaks report")
    for finding in findings:
        fingerprint=finding.get("Fingerprint") if isinstance(finding,dict) else None
        if fingerprint not in known:
            print("PUBLIC_HISTORY_AUDIT_BLOCKED: previously unreviewed pattern.")
            if isinstance(finding,dict):
                print("Rule:",finding.get("RuleID","unknown"),
                      "commit:",str(finding.get("Commit",""))[:12],
                      "line:",finding.get("StartLine","?"))
            raise SystemExit(1)
    print("PUBLIC_HISTORY_AUDIT_EXACT_FALSE_POSITIVE: exact reviewed, "
          "unchanged diagnostic field-name fingerprint; default scanner rules intact.")
except (ValueError, OSError, json.JSONDecodeError) as error:
    print("PUBLIC_HISTORY_AUDIT_FAILED_CLOSED: could not review scanner findings.")
    raise SystemExit(1) from error
PY
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
echo "PUBLIC_HISTORY_AUDIT_PASS: scanned all reachable Git refs; no unreviewed secret signatures or sensitive historical paths."
echo "BOUNDARY: pattern scans do not prove absolute absence of undisclosed secrets; commit author emails are intentionally not erased."
