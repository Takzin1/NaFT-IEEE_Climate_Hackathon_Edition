import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
 generateDualObservationReceipt,verifyDualObservationReceipt,assertObservationParity
} from '../scripts/ieee-observation-dual-replay.mjs';

const base='research/japan-observation-adapters-2026-10-19/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=x=>Array.isArray(x)?'['+x.map(canon).join(',')+']':
 x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')+'}':JSON.stringify(x);
const rehash=x=>{const {receipt_sha256,...payload}=x;
 return {...payload,receipt_sha256:sha(Buffer.from(canon(payload)))};};
let count=0;
const eq=(a,b)=>{assert.deepEqual(a,b);count++;};
const ok=x=>{assert.ok(x);count++;};
const bad=(fn,msg)=>{assert.throws(fn,new RegExp(msg));count++;};
const tmp=mkdtempSync(join(tmpdir(),'naft-observation-dual-'));
const run=(...args)=>spawnSync('node',['scripts/ieee-observation-dual-replay.mjs',...args],
 {encoding:'utf8',timeout:20000,maxBuffer:500000});
try{
 for(const [key,coverage,mg] of [
  ['interval','COMPLETE_OBSERVED','2.250000000'],
  ['daily','PARTIAL_OBSERVED','1.250000000'],
  ['eddy','COMPLETE_OBSERVED','0.144360000'],
  ['umol','COMPLETE_OBSERVED','14.436000000'],
  ['carbon','COMPLETE_OBSERVED','16.000000000']]){
  const mf=base+key+'.manifest.json',cf=base+key+'.csv';
  const proof=generateDualObservationReceipt(mf,cf);
  eq(proof.schema,'naft-ieee-observation-dual-receipt-v1');
  eq(proof.status,'JS_BIGINT_PYTHON_DECIMAL_PARITY');
  eq(proof.source_bound_local_receipt.trust.independent_second_engine_executed_for_this_input,false);
  eq(proof.trust.independent_second_engine_executed_for_this_input,true);
  eq(proof.trust.independently_authenticated_publisher_bytes,false);
  eq(proof.trust.official_jcredit_factor_approved,null);
  eq(proof.trust.certified_tco2e,null);
  eq(proof.independent_python.result.coverage_status,coverage);
  eq(proof.independent_python.result.observed_only_integral_mg_ch4_m2,mg);
  eq(proof.independent_python.result.full_window_total_mg_ch4_m2,coverage==='PARTIAL_OBSERVED'?null:mg);
  eq(proof.original_input.csv_sha256,sha(readFileSync(cf)));
  eq(verifyDualObservationReceipt(mf,cf,proof).status,'TWO_ENGINE_LOCAL_INPUT_REPLAY_REPRODUCED');
  eq(generateDualObservationReceipt(mf,cf),proof);
 }
 const original=generateDualObservationReceipt(base+'daily.manifest.json',base+'daily.csv');
 const sample=JSON.parse(readFileSync(base+'daily.manifest.json'));
 const csv=readFileSync(base+'daily.csv','utf8');
 const mf=join(tmp,'meta.json'),cf=join(tmp,'data.csv'),pf=join(tmp,'proof.json');
 writeFileSync(mf,JSON.stringify(sample));writeFileSync(cf,csv);
 const self=generateDualObservationReceipt(mf,cf);
 // Independently running Python may read the manifest after JavaScript.
 // Mutating ONLY the context JSON after Python returns keeps every numeric
 // answer the same, yet MUST reject the combined proof as non-atomic.
 const probe=spawnSync('python3',['-c','import sys; print(sys.executable)'],
  {encoding:'utf8',timeout:15000});
 eq(probe.status,0);
 const originalPython=probe.stdout.trim();
 const launcher=join(tmp,'python3');
 writeFileSync(launcher,[
  '#!/bin/sh',
  JSON.stringify(originalPython)+' "$@"',
  'status=$?',
  'if [ "$status" -eq 0 ] && [ -n "$NAFT_DUAL_MUTATE_FILE" ]; then',
  '  printf " " >> "$NAFT_DUAL_MUTATE_FILE"',
  'fi',
  'exit "$status"'
 ].join('\n')+'\n');
 chmodSync(launcher,0o755);
 const normalPath=process.env.PATH;
 const normalMutation=process.env.NAFT_DUAL_MUTATE_FILE;
 try{
  process.env.PATH=tmp+':'+normalPath;
  for(const file of [mf,cf]){
   process.env.NAFT_DUAL_MUTATE_FILE=file;
   bad(()=>generateDualObservationReceipt(mf,cf),
    'DUAL_INPUT_CHANGED_DURING_REPLAY');
   writeFileSync(mf,JSON.stringify(sample));
   writeFileSync(cf,csv);
  }
 }finally{
  process.env.PATH=normalPath;
  if(normalMutation===undefined)delete process.env.NAFT_DUAL_MUTATE_FILE;
  else process.env.NAFT_DUAL_MUTATE_FILE=normalMutation;
 }
 // A stable, source-identical rerun still returns the original receipt.
 eq(generateDualObservationReceipt(mf,cf),self);
 const cli=run('generate',mf,cf);
 eq(cli.status,0);
 const parsed=JSON.parse(cli.stdout);
 eq(parsed.receipt_sha256,self.receipt_sha256);
 writeFileSync(pf,cli.stdout);
 eq(JSON.parse(run('verify',mf,cf,pf).stdout).receipt_sha256,self.receipt_sha256);
 // A second, internally consistent CSV/manifest must never verify against the previous proof.
 const changed=csv.replace('0.001500','0.002500');
 writeFileSync(cf,changed);
 const updated={...sample,csv_sha256:sha(Buffer.from(changed)),data_class:'USER_SUPPLIED_UNVERIFIED'};
 writeFileSync(mf,JSON.stringify(updated));
 const changedProof=generateDualObservationReceipt(mf,cf);
 eq(changedProof.independent_python.result.observed_only_integral_mg_ch4_m2,'2.250000000');
 eq(changedProof.source_bound_local_receipt.replay.observed_only_integral_mg_ch4_m2,'2.250000000');
 bad(()=>verifyDualObservationReceipt(mf,cf,self),'DUAL_RECEIPT_SOURCE_BOUND_MISMATCH');
 eq(verifyDualObservationReceipt(mf,cf,changedProof).status,'TWO_ENGINE_LOCAL_INPUT_REPLAY_REPRODUCED');
 // Semantic site/context change is caught even when the data bytes themselves are unchanged.
 writeFileSync(mf,JSON.stringify({...updated,site_id:'DIFFERENT_SITE'}));
 bad(()=>verifyDualObservationReceipt(mf,cf,changedProof),'DUAL_RECEIPT_SOURCE_BOUND_MISMATCH');
 writeFileSync(mf,JSON.stringify(updated));
 // Test unknown/suspicious trust claims and self-hashed forged results.
 for(const [section,key,value] of [
  ['trust','certified_tco2e',1000],
  ['trust','independently_authenticated_publisher_bytes',true],
  ['trust','official_jcredit_factor_approved','v3.5'],
  ['independent_python','result_sha256','0'.repeat(64)],
  ['independent_python','script_sha256','0'.repeat(64)],
  ['independent_python','driver_sha256','0'.repeat(64)]
 ]){
  const altered=structuredClone(changedProof);
  altered[section][key]=value;
  bad(()=>verifyDualObservationReceipt(mf,cf,rehash(altered)),'DUAL_RECEIPT_SOURCE_BOUND_MISMATCH');
 }
 const alters=structuredClone(changedProof);
 alters.independent_python.result.measured_coverage_percent='100.000000';
 bad(()=>verifyDualObservationReceipt(mf,cf,rehash(alters)),'DUAL_RECEIPT_SOURCE_BOUND_MISMATCH');
 const forged=structuredClone(changedProof);
 forged.source_bound_local_receipt.replay.full_window_total_mg_ch4_m2='2.250000000';
 bad(()=>verifyDualObservationReceipt(mf,cf,rehash(forged)),'DUAL_RECEIPT_SOURCE_BOUND_MISMATCH');
 const corrupt=structuredClone(changedProof);corrupt.receipt_sha256='a'.repeat(64);
 bad(()=>verifyDualObservationReceipt(mf,cf,corrupt),'DUAL_RECEIPT_DIGEST_MISMATCH');
 const py=structuredClone(changedProof.independent_python.result);
 py.observed_only_integral_mg_ch4_m2='2.300000000';
 bad(()=>assertObservationParity(changedProof.source_bound_local_receipt,py),'INDEPENDENT_COMPARISON_DIVERGENCE');
 const partial=structuredClone(changedProof.independent_python.result);
 partial.full_window_total_mg_ch4_m2='2.250000000';
 bad(()=>assertObservationParity(changedProof.source_bound_local_receipt,partial),'INDEPENDENT_COMPARISON_DIVERGENCE|INDEPENDENT_PARTIAL_AS_FULL');
 const signed=structuredClone(changedProof.independent_python.result);
 signed.publisher_bytes_independently_attested=true;
 bad(()=>assertObservationParity(changedProof.source_bound_local_receipt,signed),'INDEPENDENT_COMPARISON_PROVENANCE');
 // Invalid QC and invented license attestation never become accepted observations.
 writeFileSync(mf,JSON.stringify({...updated,original_publisher_bytes_verified:true}));
 bad(()=>generateDualObservationReceipt(mf,cf),'OBS_ATTESTATION');
 writeFileSync(mf,JSON.stringify({...updated,adapter_id:'NOT_REAL'}));
 bad(()=>generateDualObservationReceipt(mf,cf),'OBS_UNIT_OR_ADAPTER');
 writeFileSync(mf,JSON.stringify(updated));
 const malformed=changed.replace('OBSERVED_GOOD','MISSING');
 writeFileSync(cf,malformed);
 writeFileSync(mf,JSON.stringify({...updated,csv_sha256:sha(Buffer.from(malformed))}));
 bad(()=>generateDualObservationReceipt(mf,cf),'OBS_EXCLUDED_ROW');
 // Strict subprocess errors; no fallback to one engine on Python rejection.
 writeFileSync(mf,JSON.stringify(updated));writeFileSync(cf,changed);
 writeFileSync(pf,JSON.stringify({...changedProof,receipt_sha256:'0'.repeat(64)}));
 const denied=run('verify',mf,cf,pf);
 ok(denied.status!==0&&denied.stderr.includes('DUAL_RECEIPT_DIGEST_MISMATCH'));
} finally {
 rmSync(tmp,{recursive:true,force:true});
}
console.log('IEEE_PER_INPUT_INDEPENDENT_OBSERVATION_PASS: '+count+' assertions, publisher source unverified');
