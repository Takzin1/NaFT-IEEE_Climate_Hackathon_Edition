import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createObservationReceipt,verifyObservationReceipt} from '../scripts/ieee-observation-receipt.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':
 x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const recalc=x=>{const {receipt_sha256,...payload}=x;return {...payload,receipt_sha256:sha(Buffer.from(canonical(payload)))};};
const fixture=name=>{
 const path='research/japan-observation-adapters-2026-10-19/'+name;
 return [readFileSync(path+'.manifest.json'),readFileSync(path+'.csv')];
};
let n=0;
const eq=(x,y)=>{assert.deepEqual(x,y);n++;};
const ok=x=>{assert.ok(x);n++;};
const bad=(f,code)=>{assert.throws(f,new RegExp(code));n++;};
const expected=[
 ['interval','COMPLETE_OBSERVED','2.250000000'],
 ['daily','PARTIAL_OBSERVED','1.250000000'],
 ['eddy','COMPLETE_OBSERVED','0.144360000'],
 ['umol','COMPLETE_OBSERVED','14.436000000'],
 ['carbon','COMPLETE_OBSERVED','16.000000000']
];
for(const [name,status,observed] of expected){
 const [m,c]=fixture(name);
 const r=createObservationReceipt(m,c);
 eq(r.schema,'naft-ieee-observation-receipt-v1');
 eq(r.replay.coverage_status,status);
 eq(r.replay.observed_only_integral_mg_ch4_m2,observed);
 eq(r.replay.full_window_total_mg_ch4_m2,status==='PARTIAL_OBSERVED'?null:observed);
 eq(r.trust.publisher_original_bytes_authenticated,false);
 eq(r.trust.independent_second_engine_executed_for_this_input,false);
 eq(r.trust.certified_tco2e,null);
 eq(r.trust.official_methodology_factor_applicable,null);
 eq(r.input.csv_sha256,sha(c));
 eq(r.input.manifest_bytes_sha256,sha(m));
 ok(Object.keys(r.input.engine_source_sha256).length===2);
 eq(verifyObservationReceipt(m,c,r).status,'LOCAL_INPUT_REPLAY_REPRODUCED');
 eq(createObservationReceipt(m,c),r);
}
const [m,c]=fixture('daily');
const original=createObservationReceipt(m,c);
const modifiedBuffer=Buffer.from(c.toString().replace('0.001500','0.002500'));
bad(()=>verifyObservationReceipt(m,modifiedBuffer,original),'OBS_SHA256');
const mt=JSON.parse(m.toString());
bad(()=>createObservationReceipt(Buffer.from(JSON.stringify({...mt,official_eligibility_verified:true})),c),'OBS_ATTESTATION');
bad(()=>createObservationReceipt(Buffer.from(JSON.stringify({...mt,data_class:'PUBLISHER_VERIFIED'})),c),'OBS_DATA_CLASS');
bad(()=>createObservationReceipt(Buffer.from(JSON.stringify({...mt,adapter_id:'EDDY_NMOL_CH4_M2_S_V1'})),c),'OBS_UNIT_OR_ADAPTER');
bad(()=>verifyObservationReceipt(Buffer.from(JSON.stringify({...mt,source_uri:'https://publisher.example/data'})),c,original),'SOURCE_BOUND_REPLAY_MISMATCH');
for(const [field,value] of [
 ['full_window_total_mg_ch4_m2','1.250000000'],
 ['coverage_status','COMPLETE_OBSERVED'],
 ['measured_coverage_percent','100.000000'],
 ['replay_result_sha256','a'.repeat(64)]
]){
 const changed=structuredClone(original);
 changed.replay[field]=value;
 bad(()=>verifyObservationReceipt(m,c,recalc(changed)),'SOURCE_BOUND_REPLAY_MISMATCH');
}
for(const [field,value] of [
 ['certified_tco2e',123],
 ['publisher_original_bytes_authenticated',true],
 ['independent_second_engine_executed_for_this_input',true],
 ['testnet_anchor_performed',true]
]){
 const changed=structuredClone(original);
 changed.trust[field]=value;
 bad(()=>verifyObservationReceipt(m,c,recalc(changed)),'SOURCE_BOUND_REPLAY_MISMATCH');
}
const context=structuredClone(original);context.input.site_id_claimed='DIFFERENT';
bad(()=>verifyObservationReceipt(m,c,recalc(context)),'SOURCE_BOUND_REPLAY_MISMATCH');
const code=structuredClone(original);code.input.engine_source_sha256['lib/japan-observation-adapters.mjs']='0'.repeat(64);
bad(()=>verifyObservationReceipt(m,c,recalc(code)),'SOURCE_BOUND_REPLAY_MISMATCH');
const stale=structuredClone(original);stale.replay.coverage_status='COMPLETE_OBSERVED';
bad(()=>verifyObservationReceipt(m,c,stale),'RECEIPT_DIGEST_MISMATCH');
bad(()=>verifyObservationReceipt(m,c,{...original,extra:true}),'RECEIPT_DIGEST_MISMATCH');
bad(()=>createObservationReceipt(Buffer.alloc(100001),c),'MANIFEST_SIZE_INVALID');
const tmp=mkdtempSync(join(tmpdir(),'naft-ieee-receipt-'));
try {
 const mf=join(tmp,'manifest.json'),cf=join(tmp,'observations.csv'),rf=join(tmp,'receipt.json');
 writeFileSync(mf,m);writeFileSync(cf,c);
 const gen=spawnSync('node',['scripts/ieee-observation-receipt.mjs','generate',mf,cf],{encoding:'utf8',timeout:15000});
 eq(gen.status,0);
 const out=JSON.parse(gen.stdout);
 eq(out.receipt_sha256,original.receipt_sha256);
 writeFileSync(rf,gen.stdout);
 const verified=spawnSync('node',['scripts/ieee-observation-receipt.mjs','verify',mf,cf,rf],{encoding:'utf8',timeout:15000});
 eq(verified.status,0);
 eq(JSON.parse(verified.stdout).receipt_sha256,original.receipt_sha256);
 writeFileSync(rf,JSON.stringify({...out,receipt_sha256:'0'.repeat(64)}));
 const denied=spawnSync('node',['scripts/ieee-observation-receipt.mjs','verify',mf,cf,rf],{encoding:'utf8',timeout:15000});
 ok(denied.status!==0&&denied.stderr.includes('RECEIPT_DIGEST_MISMATCH'));
} finally{rmSync(tmp,{recursive:true,force:true});}
console.log('IEEE_OBSERVATION_SOURCE_BOUND_RECEIPT_PASS: '+n+' checks; no publisher verification or credits');
