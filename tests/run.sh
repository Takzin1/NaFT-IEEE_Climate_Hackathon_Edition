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
node --check scripts/ieee-replay-audit.mjs
node --check tests/ieee-audit.test.mjs
node --check scripts/ieee-benchmark.mjs
node --check tests/ieee-benchmark.test.mjs
node --check tests/ieee-trace.test.mjs
node --check scripts/keccak256.mjs
node --check tests/keccak.test.mjs
node --check tests/cost-estimator.test.mjs
node tests/smoke.test.js
node tests/compiler.test.js
node tests/mitou-impact.test.js
node tests/impact-proof.test.js
node tests/climatechain.test.js
node tests/ieee-audit.test.mjs
node tests/ieee-triad-proof.test.mjs
node tests/ieee-source-snapshot.test.mjs
node tests/japan-mrv-baseline.test.mjs
node tests/japan-primary-evidence-preflight.test.mjs
node tests/ag005-engine.test.mjs
node tests/ag005-v33-gxets.test.mjs
node tests/asia-mrv-compat.test.js
node tests/ipcc-stage-reference.test.mjs
python3 tests/asia-independent-oracle.test.py
python3 scripts/verify-asia-research-pack.py local
python3 tests/asia-archive-verifier.test.py
python3 -c "import ast; ast.parse(open('scripts/verify-asia-research-pack.py', encoding='utf8').read())"
node tests/ag005-formula-parity-regression.test.mjs
python3 -c "import ast; ast.parse(open('scripts/verify-japan-research-pack.py', encoding='utf-8').read())"
node tests/ieee-benchmark.test.mjs
node tests/ieee-trace.test.mjs
node tests/keccak.test.mjs
node tests/cost-estimator.test.mjs
node tests/climatechain-rpc-verifier.test.mjs
node tests/video-recording-contract.test.mjs
bash -n scripts/audit-public-history.sh
bash -n scripts/stage-public-pages.sh
bash scripts/stage-public-pages.sh
python3 tests/check-static.py
bash tests/security.sh
