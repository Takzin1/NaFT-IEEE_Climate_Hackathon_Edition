#!/usr/bin/env bash
# Build an allowlisted static Pages artifact; never upload the repository root.
set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"
out=".pages-site"
rm -rf -- "$out"
mkdir -p "$out/src" "$out/docs/assets" "$out/assets"
cp -- .nojekyll index.html naft-app.html favicon.svg "$out/"
cp -- assets/naft-logo.webp "$out/assets/"
for f in \
  mrv-core.js methodology-packs.js mrv-compiler.js compiler-session.js \
  compiler-demo.js reviewer-demo.js climatechain-testnet-record.js \
  climatechain-demo.js mrv-ui.js climatechain-theme.css; do
  cp -- "src/$f" "$out/src/$f"
done
cp -- docs/assets/naft-climatechain-architecture.svg "$out/docs/assets/"
python3 tests/verify-pages-payload.py "$out"
echo "PUBLIC_PAGES_STAGE_PASS: allowlisted browser assets only; Git history, docs, test tools and deployment helpers excluded."
