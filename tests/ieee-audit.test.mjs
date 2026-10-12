import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

let passed=0;
function check(value,label) { assert.ok(value,label);passed++; }
function canonical(value) {
  if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object') return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value===undefined?null:value);
}
const sha=v=>crypto.createHash('sha256').update(canonical(v),'utf8').digest('hex');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'naft-ieee-replay-'));
const cli=path.resolve('scripts/ieee-replay-audit.mjs');
function invoke(mode,file) { return spawnSync(process.execPath,[cli,mode,file],{encoding:'utf8'}); }
function invalid(receipt,label,expected) {
  const file=path.join(scratch,'negative.json');
  fs.writeFileSync(file,JSON.stringify(receipt));
  const result=invoke('verify',file);
  check(result.status!==0,label+' is refused');
  check(result.stderr.includes(expected),label+' gives expected rejection');
}

try {
  const output=path.join(scratch,'receipt.json');
  const generated=execFileSync(process.execPath,[cli,'generate',output],{encoding:'utf8'});
  check(generated.includes('GENERATED synthetic audit receipt'),'receipt produced by real CLI');
  const receipt=JSON.parse(fs.readFileSync(output,'utf8'));
  check(receipt.schema==='naft-ieee-audit-receipt-1','versioned receipt schema');
  check(receipt.claims.length===100,'all 100 synthetic claims covered');
  check(receipt.counts.require_reverification===30&&receipt.counts.UNAFFECTED===70,'fixture outcome encoded');
  check(receipt.counts.AUTO_REEVALUATED===15&&receipt.counts.EVIDENCE_REQUIRED===15,'fail-closed statuses encoded');
  check(receipt.anchor_arguments.chain_status==='NOT_SUBMITTED','receipt never asserts chain broadcast');
  const {receipt_sha256,...payload}=receipt;
  check(receipt_sha256===sha(payload),'independent Node SHA-256 matches browser receipt');
  check(invoke('verify',output).status===0,'independent process verifies replay');
  const generatedAgain=path.join(scratch,'receipt-again.json');
  execFileSync(process.execPath,[cli,'generate',generatedAgain]);
  check(fs.readFileSync(output,'utf8')===fs.readFileSync(generatedAgain,'utf8'),'byte-identical regenerated receipts');
  const changed=structuredClone(receipt);
  changed.claims[0].status='AUTO_REEVALUATED';
  invalid(changed,'unsigned status edit','RECEIPT_HASH_MISMATCH');
  const rehashed=structuredClone(changed);
  const {receipt_sha256:unused,...changedPayload}=rehashed;
  rehashed.receipt_sha256=sha(changedPayload);
  invalid(rehashed,'rehashed forged claim','SOURCE_BOUND_REPLAY_MISMATCH');
  const omitted=structuredClone(receipt);
  omitted.claims.pop();
  const {receipt_sha256:ignored,...omittedPayload}=omitted;
  omitted.receipt_sha256=sha(omittedPayload);
  invalid(omitted,'rehashed omitted claim','SOURCE_BOUND_REPLAY_MISMATCH');
  const expanded=structuredClone(receipt);
  expanded.counts.UNAFFECTED++;
  const {receipt_sha256:ignored2,...expandedPayload}=expanded;
  expanded.receipt_sha256=sha(expandedPayload);
  invalid(expanded,'rehashed forged count','SOURCE_BOUND_REPLAY_MISMATCH');
  const missing=invoke('verify',path.join(scratch,'absent.json'));
  check(missing.status!==0,'missing receipt rejected');

  for(const file of ['mrv-core','methodology-packs','mrv-compiler','compiler-demo','climatechain-demo']) {
    vm.runInThisContext(fs.readFileSync(path.join('src',file+'.js'),'utf8'),{filename:file});
  }
  const challenge=globalThis.runClimateChainTamperChallenge();
  check(challenge.original.status==='AUTO_REEVALUATED','original synthetic claim compiles');
  check(challenge.modified.status==='UNSUPPORTED','tampered content deterministically blocked');
  check(challenge.hash_mismatch_detected===true,'specific content hash mismatch identified');
  check(challenge.parse_preserved===true,'one-byte edit leaves JSON syntactically valid');
  check(challenge.fail_closed===true,'new package does not inherit a passing status');
  check(challenge.modified.package_hash!==challenge.original.package_hash,'tampering changes package hash');
  const before=globalThis.buildClimateChainAuditReceipt(globalThis.runClimateChainImpact());
  check(canonical(before)===canonical(receipt),'browser and CLI receipt match exactly');
  console.log('IEEE AUDIT RESULT: '+passed+' passed, 0 failed (synthetic replay, tamper, negative controls)');
} finally {
  fs.rmSync(scratch,{recursive:true,force:true});
}
