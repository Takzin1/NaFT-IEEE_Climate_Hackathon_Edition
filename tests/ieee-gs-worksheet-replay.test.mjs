#!/usr/bin/env node
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadRegistry} from '../scripts/rice-methodology-router.mjs';
import {parseDecimal,decimal12,replayWorksheetExercise,verifyReceipt,digestObject}
 from '../scripts/ieee-gs-worksheet-replay.mjs';

const registry=loadRegistry();
let checks=0;
const check=v=>{assert.ok(v);checks++;};
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const denied=(f,code)=>{assert.throws(f,new RegExp(code));checks++;};
const program='GS_AWD_TRAINING_2024';
const samples=[
 ['TIER_1_SIMPLIFIED',{E9:'1.463525166857',E10:'1',E14:'102',E15:'28',E30:'0.15'},
  '3.552853695062'],
 ['TIER_2_COUNTRY_SPECIFIC',{E8:'18.5891328',E22:'11.38820304',E60:'0.1'},
  '6.480836784000'],
 ['TIER_3_DIRECT',{E8:'14',E17:'4.52418',E49:'0.1'},
  '8.528238000000']
];
function make(lane,operands,extra={}){
 const evidence=Object.fromEntries(registry.programs[program].lanes[lane].evidence_required
  .map(x=>[x,true]));
 return {
  schema:'naft-ieee-gs-worksheet-replay-request-v1',
  route:{schema:'naft-rice-method-route-request-v1',program,requested_lane:lane,
   project_scale:lane==='TIER_1_SIMPLIFIED'?'SMALL':'LARGE',
   measurement_kind:lane==='TIER_3_DIRECT'?'DIRECT_CHAMBER':undefined,
   practices:[],evidence,...extra},
  operands:{...operands}
 };
}
const requests=[];
for(const [lane,operands,expected] of samples){
 const input=make(lane,operands);
 const actual=replayWorksheetExercise(input);
 requests.push(input);
 eq(actual.status,'TRAINING_WORKSHEET_ARITHMETIC_ONLY');
 eq(actual.exact_value.decimal_12_places,expected);
 eq(actual.methodology_route_status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
 eq(actual.source_formula.formula,registry.programs[program].lanes[lane].formula);
 eq(actual.original_workbook_sha256,registry.sources.find(s=>s.id==='GS_ER_CALCULATOR').sha256);
 eq(actual.request_sha256,digestObject(input));
 eq(actual.certified_tco2e,null);
 eq(actual.verified_ghg_reduction_tco2e,null);
 eq(actual.gs_vvb_q23_conflict_unresolved,true);
 eq(actual.independent_publisher_authenticity,false);
 eq(actual.institutionally_applicable,false);
 eq(actual.source_pdf_or_workbook_reproduced_by_ci,false);
 eq(actual.formal_validation_completed,false);
 eq(actual, replayWorksheetExercise(input));
 eq(verifyReceipt(input,actual).status,'SOURCE_BOUND_REPLAY_MATCH');
 const changed=structuredClone(actual);changed.certified_tco2e='9999';
 denied(()=>verifyReceipt(input,changed),'RECEIPT_REPLAY_MISMATCH');
 const changed2=structuredClone(actual);changed2.exact_value.decimal_12_places='99999.000000000000';
 denied(()=>verifyReceipt(input,changed2),'RECEIPT_REPLAY_MISMATCH');
 const modified=structuredClone(input);modified.operands[Object.keys(operands)[0]]='2';
 denied(()=>verifyReceipt(modified,actual),'RECEIPT_REPLAY_MISMATCH');
}
const noEvidence=make(samples[1][0],samples[1][1],{evidence:{}});
const notReady=replayWorksheetExercise(noEvidence);
eq(notReady.status,'BLOCKED_INCOMPLETE_EVIDENCE');
eq(notReady.exact_value,null);
eq(notReady.certified_tco2e,null);
eq(verifyReceipt(noEvidence,notReady).status,'SOURCE_BOUND_REPLAY_MATCH');
const tooLarge=make(samples[0][0],samples[0][1],{project_scale:'LARGE'});
eq(replayWorksheetExercise(tooLarge).status,'BLOCKED_APPROACH_MISMATCH');
eq(replayWorksheetExercise(tooLarge).exact_value,null);
const incompatible=make(samples[2][0],samples[2][1],{measurement_kind:'EDDY_COVARIANCE_FCH4'});
eq(replayWorksheetExercise(incompatible).status,'BLOCKED_APPROACH_MISMATCH');
eq(replayWorksheetExercise(incompatible).exact_value,null);
denied(()=>replayWorksheetExercise({...requests[0],route:{...requests[0].route,program:'VERRA_VM0051_V1_1_2026'}}),
 'GS_EXERCISE_ONLY_NOT_VERRA_OR_JCREDIT');
denied(()=>replayWorksheetExercise({...requests[0],route:{...requests[0].route,program:'AG-005'}}),
 'GS_EXERCISE_ONLY_NOT_VERRA_OR_JCREDIT');
denied(()=>replayWorksheetExercise({...requests[0],operands:{...requests[0].operands,E99:'2'}}),
 'WORKSHEET_CELL_SET_MISMATCH');
denied(()=>replayWorksheetExercise({...requests[0],operands:{...requests[0].operands,E9:1}}),
 'DECIMAL_LITERAL_INVALID');
denied(()=>replayWorksheetExercise({...requests[0],operands:{...requests[0].operands,E9:'1e30'}}),
 'DECIMAL_LITERAL_INVALID');
denied(()=>replayWorksheetExercise({...requests[0],operands:{...requests[0].operands,E9:'Infinity'}}),
 'DECIMAL_LITERAL_INVALID');
denied(()=>replayWorksheetExercise({...requests[0],operands:{...requests[0].operands,E9:'-5'}}),
 'DECIMAL_LITERAL_INVALID');
denied(()=>replayWorksheetExercise({...requests[0],operands:{...requests[0].operands,E9:'00002'}}),
 'DECIMAL_LITERAL_INVALID');
denied(()=>replayWorksheetExercise({...requests[0],operands:{...requests[0].operands,E9:'1.0000000000000'}}),
 'DECIMAL_LITERAL_INVALID');
denied(()=>replayWorksheetExercise({...requests[0],operands:{...requests[0].operands,E30:'1.01'}}),
 'UNCERTAINTY_RATE_OUT_OF_RANGE');
denied(()=>replayWorksheetExercise({...requests[0],schema:'tampered'}),
 'REQUEST_SCHEMA_OR_KEYS');
denied(()=>replayWorksheetExercise({...requests[0],cheat:'CERTIFIED'}),
 'REQUEST_SCHEMA_OR_KEYS');
denied(()=>verifyReceipt(requests[0],{...replayWorksheetExercise(requests[0]),receipt_sha256:'0'.repeat(64)}),
 'RECEIPT_REPLAY_MISMATCH');
const regAlter=structuredClone(registry);
regAlter.programs[program].lanes.TIER_1_SIMPLIFIED.formula='=E9*E10*E14';
denied(()=>replayWorksheetExercise(requests[0],regAlter),'GS_WORKBOOK_FORMULA_OR_REQUIREMENTS_CHANGED');
eq(decimal12(parseDecimal('0.000000000001')),'0.000000000001');

const negative=make('TIER_2_COUNTRY_SPECIFIC',
 {E8:'1',E22:'2',E60:'0'});
eq(replayWorksheetExercise(negative).exact_value.decimal_12_places,
 '-1.000000000000');
const fullDiscount=make('TIER_3_DIRECT',{E8:'100',E17:'4',E49:'1'});
eq(replayWorksheetExercise(fullDiscount).exact_value.decimal_12_places,
 '0.000000000000');
eq(digestObject({b:1,a:2}),digestObject({a:2,b:1}));

const dir=mkdtempSync(join(tmpdir(),'naft-ieee-gs-dual-'));
try{
 const input=join(dir,'requests.json'),single=join(dir,'request.json'),receipt=join(dir,'receipt.json');
 // 3 real-workbook-cache-derived rounded teaching fixtures + deterministic variations;
 // no training fixture values are treated as a certified greenhouse-gas reduction.
 const cases=[...requests,negative,fullDiscount];
 for(let i=1;i<=12;i++){
  cases.push(make('TIER_1_SIMPLIFIED',{
   E9:String(i)+'.25',E10:'2',E14:String(100+i),E15:'28',E30:'0.1'}));
  cases.push(make('TIER_2_COUNTRY_SPECIFIC',{
   E8:String(i+5),E22:String(i)+'.1234',E60:'0.333333333333'}));
  cases.push(make('TIER_3_DIRECT',{
   E8:String(i),E17:String(i+5)+'.5',E49:'0.125'}));
 }
 writeFileSync(input,JSON.stringify(cases));
 const py=spawnSync('python3',['scripts/ieee-gs-worksheet-independent-oracle.py',input],{
  encoding:'utf8',timeout:20000,maxBuffer:200000});
 eq(py.status,0);
 const oracle=JSON.parse(py.stdout);
 eq(oracle.length,cases.length);
 for(let j=0;j<cases.length;j++){
  const js=replayWorksheetExercise(cases[j]),ind=oracle[j];
  eq(js.exact_value.decimal_12_places,ind.decimal_12_places);
  eq(js.source_formula.formula,ind.formula);
  eq(js.source_formula.cell,ind.cell);
  eq(ind.certified_tco2e,null);
 }
 writeFileSync(single,JSON.stringify(requests[0]));
 const gen=spawnSync(process.execPath,['scripts/ieee-gs-worksheet-replay.mjs','generate',single],{
  encoding:'utf8',timeout:15000});
 eq(gen.status,0);
 const rec=JSON.parse(gen.stdout);writeFileSync(receipt,JSON.stringify(rec));
 const ver=spawnSync(process.execPath,['scripts/ieee-gs-worksheet-replay.mjs','verify',single,receipt],{
  encoding:'utf8',timeout:15000});
 eq(ver.status,0);
 eq(JSON.parse(ver.stdout).status,'SOURCE_BOUND_REPLAY_MATCH');
 const changed=JSON.parse(readFileSync(receipt,'utf8'));
 changed.exact_value.decimal_12_places='0.000000000000';
 writeFileSync(receipt,JSON.stringify(changed));
 const forgery=spawnSync(process.execPath,['scripts/ieee-gs-worksheet-replay.mjs','verify',single,receipt],{
  encoding:'utf8',timeout:15000});
 check(forgery.status!==0);
 check(forgery.stderr.includes('RECEIPT_REPLAY_MISMATCH'));
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('IEEE_GS_INDEPENDENT_WORKSHEET_REPLAY_PASS',checks,
 'checks; 41 Python Decimal comparisons, no real carbon credit calculated');
