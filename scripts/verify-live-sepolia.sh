#!/usr/bin/env bash
# Verify already-recorded Ethereum Sepolia lineage without a private key.
set -euo pipefail
cd "$(dirname "$0")/.."
export RPC_URL="${CLIMATECHAIN_VERIFY_RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}"
printf 'Read-only Sepolia verification via %s\n' "$RPC_URL"
node scripts/verify-climatechain-testnet.mjs
