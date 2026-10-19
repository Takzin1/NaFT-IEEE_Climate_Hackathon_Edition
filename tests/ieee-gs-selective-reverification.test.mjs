#!/usr/bin/env node
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadRegistry} from '../scripts/rice-methodology-router.mjs';
import {replayWorksheetExercise,digestObject}
 from '../scripts/ieee-gs-worksheet-replay.mjs';
import {selectiveReverify,verifySelectiveReport}
 from '../scripts/ieee-gs-selective-reverification.mjs';

const registry=loadRegistry(),P='GS_AWD_TRAINING_2024';let tests=0;
function eq(a,b){assert.deepEqual(a,b);tests++;}
function ok(a){assert.ok(a);tests++;}
function reject(f,reason){assert.throws(f,new RegExp(reason));tests++;}

function request(lane='TIER_2_COUNTRY_SPECIFIC',inputs={E8:'20',E22:'5',E60:'0.1'},extra={}){
 const evidence=Object.fromEntries(registry.programs[P].lanes[lane].evidence_required
  .map(k=>[k,true]));
 return {schema:'naft-ieee-gs-worksheet-replay-request-v1',
  route:{schema:'naft-rice-method-route-request-v1',program:P,requested_lane:lane,
   project_scale:'SMALL',practices:[],evidence,...extra},
  operands:inputs};
}
function item(id,before,after=before){
 return {case_id:id,baseline_request:before,
  baseline_receipt:replayWorksheetExercise(before),proposed_request:after};
}
const b0=request();
const b1=request('TIER_2_COUNTRY_SPECIFIC',{E8:'23',E22:'5',E60:'0.1'});
const b2=request('TIER_2_COUNTRY_SPECIFIC',{E8:'22',E22:'7',E60:'0.1'});
const b3=request('TIER_2_COUNTRY_SPECIFIC',{E8:'23',E22:'5',E60:'0.1'},
 {evidence:{}});
const b4=request('TIER_2_COUNTRY_SPECIFIC',{E8:'20',E22:'5',E60:'0.1'},
 {evidence:{...b0.route.evidence,cultivation_period:false}});
const b5=request('TIER_3_DIRECT',{E8:'30',E17:'10',E49:'0.1'},
 {measurement_kind:'EDDY_COVARIANCE_FCH4'});
const b6=request('TIER_3_DIRECT',{E8:'30',E17:'10',E49:'0.1'},
 {measurement_kind:'DIRECT_CHAMBER'});
const cases=[
 item('z_retained',b0),
 item('a_changed',b0,b1),
 item('b_numeric_same',b0,b2),
 item('c_evidence_block',b0,b3),
 item('d_evidence_field_only',b0,b4),
 item('e_newly_possible',b5,b6),
 item('f_cross_lane',b0,b6)
];
const input={schema:'naft-ieee-gs-selective-reverification-request-v1',cases};
const snapshot=JSON.stringify(input);
const result=selectiveReverify(input);
eq(JSON.stringify(input),snapshot);
eq(result.schema,'naft-ieee-gs-selective-reverification-report-v1');
eq(result.counts,{total:7,retained:1,replayed:6,replays_with_numeric_delta:2,
 replays_without_numeric_delta:1,newly_calculable:1,blocked_after:2});
eq(result.items.map(x=>x.case_id),[...cases.map(x=>x.case_id)].sort());
const find=id=>result.items.find(x=>x.case_id===id);
eq(find('z_retained').decision,'RETAINED_SOURCE_VERIFIED');
eq(find('z_retained').retained_original_receipt,true);
eq(find('z_retained').changed_paths,[]);
eq(find('z_retained').proposed_receipt_sha256,
 find('z_retained').baseline_receipt_sha256);
eq(find('a_changed').decision,'REPLAYED_ARITHMETIC_CHANGED');
eq(find('a_changed').changed_paths,['operands.E8']);
eq(find('a_changed').exact_training_difference.decimal_12_places,'2.700000000000');
eq(find('a_changed').proposed_worksheet_training_value,'16.200000000000');
eq(find('b_numeric_same').decision,'REPLAYED_ARITHMETIC_UNCHANGED');
eq(find('b_numeric_same').exact_training_difference.decimal_12_places,'0.000000000000');
eq(find('b_numeric_same').changed_paths,['operands.E22','operands.E8']);
eq(find('c_evidence_block').decision,'REPLAYED_BLOCKED_BY_METHOD_OR_EVIDENCE');
eq(find('c_evidence_block').proposed_worksheet_training_value,null);
eq(find('c_evidence_block').exact_training_difference,null);
ok(find('c_evidence_block').missing_evidence.length>2);
eq(find('d_evidence_field_only').changed_paths,['route.evidence.cultivation_period']);
eq(find('d_evidence_field_only').decision,'REPLAYED_BLOCKED_BY_METHOD_OR_EVIDENCE');
eq(find('e_newly_possible').decision,'REPLAYED_NEW_TRAINING_VALUE_HUMAN_REVIEW');
eq(find('e_newly_possible').exact_training_difference,null);
eq(find('e_newly_possible').proposed_worksheet_training_value,'18.000000000000');
eq(find('f_cross_lane').decision,'REPLAYED_ARITHMETIC_CHANGED');
ok(find('f_cross_lane').changed_paths.includes('route.requested_lane'));
ok(find('f_cross_lane').changed_paths.includes('operands.E17'));
eq(result.certified_tco2e,null);
eq(result.verified_real_field_emissions,null);
eq(result.independent_python_oracle_executed_on_this_batch,false);
eq(result.wallet_or_chain_operation_performed,false);
eq(result.external_publisher_signature_verified,false);
eq(result.source_registry_sha256,digestObject(registry));
eq(result.items.every(x=>x.certified_tco2e===null
 &&x.formal_validation_completed===false
 &&x.independently_accepted_ch4_qc===false),true);
eq(selectiveReverify(input),result);
eq(verifySelectiveReport(input,result).status,'SELECTIVE_REPORT_SOURCE_BOUND_REPLAY_MATCH');
eq(verifySelectiveReport(input,result).verified_cases,7);
eq(result.report_sha256,verifySelectiveReport(input,result).report_sha256);

// Baseline receipts MUST pass full source-bound replay. Simple re-hashing of a
// falsified value, or substituting a valid receipt for a different request, fails.
const clone=o=>structuredClone(o);
let altered=clone(input);
altered.cases[0].baseline_receipt.certified_tco2e='50000';
reject(()=>selectiveReverify(altered),'RECEIPT_REPLAY_MISMATCH');
altered=clone(input);altered.cases[0].baseline_receipt.exact_value.decimal_12_places='9999.000000000000';
altered.cases[0].baseline_receipt.receipt_sha256=digestObject(
 Object.fromEntries(Object.entries(altered.cases[0].baseline_receipt)
 .filter(([k])=>k!=='receipt_sha256')));
reject(()=>selectiveReverify(altered),'RECEIPT_REPLAY_MISMATCH');
altered=clone(input);altered.cases[0].baseline_request.operands.E8='21';
reject(()=>selectiveReverify(altered),'RECEIPT_REPLAY_MISMATCH');
altered=clone(input);altered.cases[1].case_id=altered.cases[0].case_id;
reject(()=>selectiveReverify(altered),'DUPLICATE_CASE_ID');
altered=clone(input);altered.cases[1].case_id='unsafe/id';
reject(()=>selectiveReverify(altered),'CASE_ID_INVALID');
altered=clone(input);altered.schema='AG005_OFFICIAL';
reject(()=>selectiveReverify(altered),'BATCH_SCHEMA_OR_KEYS');
altered=clone(input);altered.hacked_certified_tco2e=99999;
reject(()=>selectiveReverify(altered),'BATCH_SCHEMA_OR_KEYS');
altered=clone(input);altered.cases[0].bogus_certificate=true;
reject(()=>selectiveReverify(altered),'CASE_SCHEMA_OR_KEYS');
altered=clone(input);altered.cases=[];
reject(()=>selectiveReverify(altered),'CASE_COUNT_INVALID');
altered={schema:input.schema,cases:Array.from({length:251},(_,i)=>({...cases[0],case_id:'x'+i}))};
reject(()=>selectiveReverify(altered),'CASE_COUNT_INVALID');
altered=clone(input);altered.cases[0].proposed_request.operands.E8='1e30';
reject(()=>selectiveReverify(altered),'DECIMAL_LITERAL_INVALID');
altered=clone(input);altered.cases[0].proposed_request.route.program='VERRA_VM0051_V1_1_2026';
reject(()=>selectiveReverify(altered),'GS_EXERCISE_ONLY_NOT_VERRA_OR_JCREDIT');
altered=clone(input);altered.cases[0].baseline_receipt.receipt_sha256='a'.repeat(64);
reject(()=>selectiveReverify(altered),'RECEIPT_REPLAY_MISMATCH');
altered=clone(result);altered.items[0].certified_tco2e='100000';
reject(()=>verifySelectiveReport(input,altered),'SELECTIVE_REPORT_REPLAY_MISMATCH');
altered=clone(result);altered.counts.replayed=0;
reject(()=>verifySelectiveReport(input,altered),'SELECTIVE_REPORT_REPLAY_MISMATCH');
altered=clone(result);altered.report_sha256='0'.repeat(64);
reject(()=>verifySelectiveReport(input,altered),'SELECTIVE_REPORT_REPLAY_MISMATCH');
altered=clone(result);altered.items[0].exact_training_difference={numerator:'0',denominator:'1',decimal_12_places:'0'};
reject(()=>verifySelectiveReport(input,altered),'SELECTIVE_REPORT_REPLAY_MISMATCH');
altered=clone(input);altered.cases[0].proposed_request.route.evidence.cultivation_period=undefined;
reject(()=>selectiveReverify(altered),'UNSUPPORTED_NON_JSON_VALUE');
altered=clone(input);altered.cases[0].proposed_request.route.evidence.cultivation_period=NaN;
reject(()=>selectiveReverify(altered),'UNSAFE_NUMERIC_JSON');
altered=clone(input);altered.cases[0].proposed_request.route.evidence.cultivation_period=Infinity;
reject(()=>selectiveReverify(altered),'UNSAFE_NUMERIC_JSON');
altered=clone(input);altered.cases[0].proposed_request.route.evidence.cultivation_period=1.2;
reject(()=>selectiveReverify(altered),'UNSAFE_NUMERIC_JSON');
const malicious=JSON.parse('{"schema":"naft-ieee-gs-selective-reverification-request-v1","cases":[],"__proto__":{"admin":true}}');
reject(()=>selectiveReverify(malicious),'UNSAFE_JSON_PROPERTY');
const modifiedRegistry=clone(registry);
modifiedRegistry.programs[P].lanes.TIER_1_SIMPLIFIED.formula='=E9+2';
reject(()=>selectiveReverify(input,modifiedRegistry),
 'GS_WORKBOOK_FORMULA_OR_REQUIREMENTS_CHANGED');

// Exercise a realistic burst of distinct cases; never reproduce the canonical
// synthetic 100/30 IEEE demo claim distribution in this separate training lane.
const bigger=[];
for(let i=0;i<54;i++){
 const before=request('TIER_2_COUNTRY_SPECIFIC',
  {E8:String(30+i),E22:String(i)+'.25',E60:'0.075'});
 const after=(i%3===0)?{...before,operands:{...before.operands,E8:String(31+i)}}:before;
 bigger.push(item('ex_'+String(i).padStart(2,'0'),before,after));
}
const batch54={schema:input.schema,cases:bigger};
const r54=selectiveReverify(batch54);
eq(r54.counts.total,54);eq(r54.counts.replayed,18);eq(r54.counts.retained,36);
eq(r54.counts.replays_with_numeric_delta,18);
eq(r54.items.every(x=>x.certified_tco2e===null),true);
eq(verifySelectiveReport(batch54,r54).verified_cases,54);

const dir=mkdtempSync(join(tmpdir(),'ieee-gs-selective-'));
try{
 const path=join(dir,'batch.json'),resultPath=join(dir,'report.json');
 writeFileSync(path,JSON.stringify(input));
 const cmd=(...args)=>spawnSync(process.execPath,
  ['scripts/ieee-gs-selective-reverification.mjs',...args],
  {encoding:'utf8',timeout:20000,maxBuffer:500000});
 const generated=cmd('generate',path);eq(generated.status,0);
 eq(JSON.parse(generated.stdout),result);
 writeFileSync(resultPath,generated.stdout);
 const verified=cmd('verify',path,resultPath);eq(verified.status,0);
 eq(JSON.parse(verified.stdout).status,'SELECTIVE_REPORT_SOURCE_BOUND_REPLAY_MATCH');
 const tampered=clone(result);tampered.items[0].decision='CERTIFIED';
 writeFileSync(resultPath,JSON.stringify(tampered));
 const failure=cmd('verify',path,resultPath);
 ok(failure.status!==0);ok(failure.stderr.includes('SELECTIVE_REPORT_REPLAY_MISMATCH'));

 // Separately invoke the Python Decimal oracle for the 4 changed entries
 // that remain numerically evaluable. The batch runner itself does not assert
 // this independent oracle was executed in production.
 const next=[b1,b2,b6,b6];
 const oraclePath=join(dir,'oracle-input.json');
 writeFileSync(oraclePath,JSON.stringify(next));
 const py=spawnSync('python3',
  ['scripts/ieee-gs-worksheet-independent-oracle.py',oraclePath],
  {encoding:'utf8',timeout:15000,maxBuffer:300000});
 eq(py.status,0);
 const expected=JSON.parse(py.stdout);
 eq(expected.length,4);
 for(let i=0;i<next.length;i++){
  const js=replayWorksheetExercise(next[i]);
  eq(js.exact_value.decimal_12_places,expected[i].decimal_12_places);
 }
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('IEEE_GS_SELECTIVE_SOURCE_VERIFIED_PASS',tests,
 'checks; baseline verified, only changed teaching inputs replayed, no credits');
