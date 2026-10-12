#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for script in src/*.js; do node --check "$script"; done
for script in scripts/*.mjs; do node --check "$script"; done
node --check src/mrv-ui.js
node --check tests/smoke.test.js
node --check tests/compiler.test.js
node --check tests/mitou-impact.test.js
node --check tests/impact-proof.test.js
node --check tests/climatechain.test.js
node --check tests/climatechain-rpc-verifier.test.mjs
node tests/smoke.test.js
node tests/compiler.test.js
node tests/mitou-impact.test.js
node tests/impact-proof.test.js
node tests/climatechain.test.js
node tests/climatechain-rpc-verifier.test.mjs
python3 tests/check-static.py
bash tests/security.sh
