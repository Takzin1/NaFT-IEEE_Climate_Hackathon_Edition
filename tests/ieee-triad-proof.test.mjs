import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
const cli=path.resolve('scripts/ieee-triad-proof.mjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'naft-ieee-triad-'));
const generated=path.join(dir,'proof.json');
function run(mode,target){return spawnSync(process.execPath,[cli,mode,target],{encoding:'utf8'});}
function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')
    return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined)
      .map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value===undefined?null:value);
}
function sha(value){return crypto.createHash('sha256').update(canonical(value)).digest('hex');}
try{
  const first=run('generate',generated);
  assert.equal(first.status,0,first.stderr||first.stdout);
  const p=JSON.parse(fs.readFileSync(generated,'utf8'));
  assert.equal(p.pillars.error_detection.fail_closed,true);
  assert.deepEqual([p.pillars.selective_reverification.counts.total,
    p.pillars.selective_reverification.counts.require_reverification,
    p.pillars.selective_reverification.counts.UNAFFECTED,
    p.pillars.selective_reverification.counts.AUTO_REEVALUATED,
    p.pillars.selective_reverification.counts.EVIDENCE_REQUIRED],[100,30,70,15,15]);
  assert.equal(p.pillars.sepolia_lineage.live_rpc_checked_by_browser,false);
  assert.equal(run('verify',generated).status,0,'generated proof must replay');
  const again=path.join(dir,'repeat.json');
  assert.equal(run('generate',again).status,0,'second generation succeeds');
  assert.deepEqual(JSON.parse(fs.readFileSync(again,'utf8')),p,
    'source-bound proof deterministic on repeat');
  const tampered=structuredClone(p);
  tampered.pillars.selective_reverification.counts.UNAFFECTED=71;
  fs.writeFileSync(generated,JSON.stringify(tampered));
  assert.match(run('verify',generated).stderr,/TRIAD_PROOF_DIGEST_MISMATCH/,
    'detected changed count without hash change');
  const rehashed=structuredClone(tampered);
  const {proof_sha256,...body}=rehashed;
  rehashed.proof_sha256=sha(body);
  fs.writeFileSync(generated,JSON.stringify(rehashed));
  assert.match(run('verify',generated).stderr,/TRIAD_SOURCE_BOUND_REPLAY_MISMATCH/,
    'independent rerun rejects receipt with forged valid digest');
  console.log('IEEE_TRIAD_PROOF_PASS: deterministic triad replay; forged count and rehash rejected');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
