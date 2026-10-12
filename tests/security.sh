#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if grep -nEi 'axios|supabase|firebase|openai|anthropic|alchemy|infura|walletconnect|bearer|api[_-]?key|private[_ -]?key|client_secret|access_token|fetch\(|XMLHttpRequest|https?://[^ ]+\.js' src/*.js naft-app.html index.html; then
  echo 'Prohibited network dependency or secret-like text found.'
  exit 1
fi
if git ls-files | grep -E '(^|/)\.env($|\.)' | grep -vE '\.(example|sample)$'; then
  echo 'Environment file must not be committed.'
  exit 1
fi
git diff --check
printf 'syntax, security and whitespace: OK\n'
