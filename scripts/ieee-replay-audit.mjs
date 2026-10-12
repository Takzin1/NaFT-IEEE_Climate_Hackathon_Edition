#!/usr/bin/env node
/**
 * IEEE ClimateChain deterministic replay verifier.
 * No dependencies, network, keys, wallet actions or institutional assertions.
 *
 * This tool verifies digest integrity AND source-bound deterministic replay.
 * It does not independently validate environmental facts, external evidence
 * authenticity, reviewer signatures, or on-chain state.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MAX_RECEIPT_BYTES=2_000_000;
const sourceFiles=[
  'mrv-core.js','methodology-packs.js','mrv-compiler.js',
  'compiler-demo.js','climatechain-demo.js'
];

function canonical(value) {
  if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object') {
    return '{'+Object.keys(value).sort()
      .filter(key=>value[key]!==undefined)
      .map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  }
  return JSON.stringify(value===undefined?null:value);
}
function sha256(value) {
  return crypto.createHash('sha256').update(canonical(value),'utf8').digest('hex');
}
function regenerate() {
  for(const file of sourceFiles) {
    const fullPath=path.join(root,'src',file);
    vm.runInThisContext(fs.readFileSync(fullPath,'utf8'),{filename:fullPath});
  }
  const result=globalThis.buildClimateChainAuditReceipt(globalThis.runClimateChainImpact());
  const {receipt_sha256,...payload}=result;
  if(receipt_sha256!==sha256(payload)) {
    throw new Error('SOURCE_HASH_IMPLEMENTATION_MISMATCH');
  }
  return result;
}
function verify(receipt) {
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)) {
    throw new Error('INVALID_RECEIPT');
  }
  const {receipt_sha256,...payload}=receipt;
  if(receipt.schema!=='naft-ieee-audit-receipt-1'||
     typeof receipt_sha256!=='string'||!/^[a-f0-9]{64}$/.test(receipt_sha256)) {
    throw new Error('INVALID_RECEIPT_SCHEMA');
  }
  if(sha256(payload)!==receipt_sha256) throw new Error('RECEIPT_HASH_MISMATCH');
  const expected=regenerate();
  if(canonical(receipt)!==canonical(expected)) throw new Error('SOURCE_BOUND_REPLAY_MISMATCH');
  return receipt;
}

try {
  const [mode,filename,...extra]=process.argv.slice(2);
  if(!['generate','verify'].includes(mode)||!filename||extra.length) {
    throw new Error('USAGE: node scripts/ieee-replay-audit.mjs generate|verify PATH.json');
  }
  if(mode==='generate') {
    const receipt=regenerate();
    fs.writeFileSync(filename,JSON.stringify(receipt,null,2)+'\n',{flag:'w'});
    process.stdout.write('GENERATED synthetic audit receipt: '+receipt.receipt_sha256+' ('+receipt.claims.length+' claims)\n');
  } else {
    const stat=fs.statSync(filename);
    if(!stat.isFile()||stat.size>MAX_RECEIPT_BYTES) throw new Error('INVALID_RECEIPT_SIZE');
    const receipt=JSON.parse(fs.readFileSync(filename,'utf8'));
    verify(receipt);
    process.stdout.write('VERIFIED deterministic synthetic replay: '+receipt.receipt_sha256+' ('+receipt.claims.length+' claims)\n');
  }
} catch(error) {
  console.error('IEEE AUDIT FAILED: '+error.message);
  process.exitCode=1;
}
