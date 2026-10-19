#!/usr/bin/env node
/**
 * IEEE research-only exercise replay of 3 *exact* Gold Standard worksheet
 * formulas, with BigInt rational arithmetic and deterministic hash receipts.
 *
 * A numerical worksheet reproduction is NOT an eligible/carbon-credit result.
 * This module does not execute arbitrary expressions, read raw flux values,
 * silently change methodology, or borrow GS tiers for Verra / J-Credit.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {loadRegistry, routeRiceMethodology, validateRegistry} from './rice-methodology-router.mjs';

const PROGRAM='GS_AWD_TRAINING_2024';
const SOURCE='92ddfcf926ec2eaead54e674c06a608f8a29b8e6ff0698a0468aa29152cd8040';
const CELLS=Object.freeze({
 TIER_1_SIMPLIFIED:Object.freeze(['E9','E10','E14','E15','E30']),
 TIER_2_COUNTRY_SPECIFIC:Object.freeze(['E8','E22','E60']),
 TIER_3_DIRECT:Object.freeze(['E8','E17','E49'])
});
const RATE=Object.freeze({
 TIER_1_SIMPLIFIED:'E30',
 TIER_2_COUNTRY_SPECIFIC:'E60',
 TIER_3_DIRECT:'E49'
});
const DECIMAL=/^(?:0|[1-9]\d{0,11})(?:\.\d{1,12})?$/;
const SCALE=10n**12n;
function requireTrue(condition,code){
 if(!condition)throw new Error('IEEE_GS_REPLAY_BLOCKED:'+code);
}
function plain(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function sameKeys(o,keys) {
 return plain(o)&&Object.keys(o).sort().join(',')===keys.slice().sort().join(',');
}
function canonical(value) {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(plain(value))return '{'+Object.keys(value).sort().map(
   k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function sha256(x){return createHash('sha256').update(x).digest('hex');}
export function digestObject(o){return sha256(canonical(o));}
function abs(a){return a<0n?-a:a;}
function gcd(a,b){a=abs(a);b=abs(b);while(b!==0n){const r=a%b;a=b;b=r;}return a||1n;}
function rational(n,d=1n){
 requireTrue(d!==0n,'ZERO_DIVISOR');
 if(d<0n){n=-n;d=-d;}
 const g=gcd(n,d);
 return [n/g,d/g];
}
function plus(a,b){return rational(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);}
function minus(a,b){return rational(a[0]*b[1]-b[0]*a[1],a[1]*b[1]);}
function multiply(a,b){return rational(a[0]*b[0],a[1]*b[1]);}
function divide(a,b){requireTrue(b[0]!==0n,'ZERO_DIVISOR');return rational(a[0]*b[1],a[1]*b[0]);}
const ONE=[1n,1n],THOUSAND=[1000n,1n];
export function parseDecimal(text){
 requireTrue(typeof text==='string'&&DECIMAL.test(text),'DECIMAL_LITERAL_INVALID');
 const [whole,fraction='']=text.split('.');
 const numerator=BigInt(whole+fraction);
 return rational(numerator,10n**BigInt(fraction.length));
}
export function decimal12(q){
 const [n,d]=q;const sign=n<0n?'-':'';
 const rounded=(abs(n)*SCALE*2n+d)/(2n*d);
 const whole=rounded/SCALE,frac=(rounded%SCALE).toString().padStart(12,'0');
 return (rounded===0n?'':sign)+whole+'.'+frac;
}
function exactWorksheetFormula(lane,values){
 const at=key=>parseDecimal(values[key]);
 const discount=minus(ONE,at(RATE[lane]));
 switch(lane){
 case 'TIER_1_SIMPLIFIED':
  return multiply(divide(multiply(multiply(at('E9'),at('E10')),at('E14')),THOUSAND),
   multiply(at('E15'),discount));
 case 'TIER_2_COUNTRY_SPECIFIC':
  return multiply(minus(at('E8'),at('E22')),discount);
 case 'TIER_3_DIRECT':
  return multiply(minus(at('E8'),at('E17')),discount);
 default:throw new Error('IEEE_GS_REPLAY_BLOCKED:UNKNOWN_LANE');
 }
}
/** All input flags denote *claimed* presence, not independently authenticated proof. */
export function replayWorksheetExercise(request,registry=loadRegistry()){
 validateRegistry(registry);
 requireTrue(sameKeys(request,['schema','route','operands'])
  &&request.schema==='naft-ieee-gs-worksheet-replay-request-v1','REQUEST_SCHEMA_OR_KEYS');
 requireTrue(plain(request.route)&&request.route.program===PROGRAM,
  'GS_EXERCISE_ONLY_NOT_VERRA_OR_JCREDIT');
 const route=routeRiceMethodology(request.route,registry);
 const lane=route.requested_lane;
 requireTrue(Object.hasOwn(CELLS,lane),'UNKNOWN_LANE');
 requireTrue(sameKeys(request.operands,CELLS[lane]),'WORKSHEET_CELL_SET_MISMATCH');
 for(const key of CELLS[lane])parseDecimal(request.operands[key]);
 const rate=parseDecimal(request.operands[RATE[lane]]);
 requireTrue(rate[0]>=0n&&rate[0]<=rate[1],'UNCERTAINTY_RATE_OUT_OF_RANGE');
 const ref=route.reference;
 const expected=registry.programs[PROGRAM].lanes[lane];
 requireTrue(ref.formula===expected.formula&&ref.cell===expected.formula_cell
  &&ref.sheet===expected.sheet,'SOURCE_FORMULA_MISMATCH');
 requireTrue(registry.sources.find(s=>s.id==='GS_ER_CALCULATOR')?.sha256===SOURCE,
  'SOURCE_XLSX_DIGEST_MISMATCH');
 const permitted=route.status==='REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED';
 const rationalResult=permitted?exactWorksheetFormula(lane,request.operands):null;
 const unsealed={
  schema:'naft-ieee-gs-worksheet-replay-receipt-v1',
  status:permitted?'TRAINING_WORKSHEET_ARITHMETIC_ONLY':route.status,
  methodology_route_status:route.status,
  methodology_program:PROGRAM,
  lane,
  original_workbook_sha256:SOURCE,
  method_register_sha256:digestObject(registry),
  request_sha256:digestObject(request),
  source_formula:{sheet:ref.sheet,cell:ref.cell,formula:ref.formula},
  exact_value:rationalResult?{
   numerator:rationalResult[0].toString(),
   denominator:rationalResult[1].toString(),
   decimal_12_places:decimal12(rationalResult)
  }:null,
  route_block_reasons:route.blocks,
  missing_evidence:route.missing_evidence,
  gs_vvb_q23_conflict_unresolved:true,
  independence:'BIGINT_RATIONAL_PRIMARY_PYTHON_DECIMAL_SEPARATE_ORACLE',
  evaluation_scope:'EDUCATIONAL_WORKSHEET_ARITHMETIC_NOT_GHG_CERTIFICATION',
  source_pdf_or_workbook_reproduced_by_ci:false,
  independent_publisher_authenticity:false,
  institutionally_applicable:false,
  formal_validation_completed:false,
  original_jphrt_measurement_qc_accepted:false,
  field_measurement_integrated:false,
  verified_ghg_reduction_tco2e:null,
  certified_tco2e:null,
  blockchain_attestation_performed:false
 };
 return {...unsealed,receipt_sha256:digestObject(unsealed)};
}
export function verifyReceipt(request,receipt,registry=loadRegistry()){
 requireTrue(plain(receipt),'RECEIPT_OBJECT_REQUIRED');
 const derived=replayWorksheetExercise(request,registry);
 requireTrue(canonical(receipt)===canonical(derived),'RECEIPT_REPLAY_MISMATCH');
 return {status:'SOURCE_BOUND_REPLAY_MATCH',
  receipt_sha256:derived.receipt_sha256,
  source_workbook_sha256:SOURCE,
  formal_certification:false,certified_tco2e:null};
}
function main(args) {
 requireTrue(args.length>=1&&args.length<=3,
   'USAGE_generate_REQUEST_or_verify_REQUEST_RECEIPT');
 if(args[0]==='generate'&&args.length===2){
  const input=JSON.parse(readFileSync(args[1],'utf8'));
  console.log(JSON.stringify(replayWorksheetExercise(input),null,2));return;
 }
 if(args[0]==='verify'&&args.length===3){
  const input=JSON.parse(readFileSync(args[1],'utf8'));
  const receipt=JSON.parse(readFileSync(args[2],'utf8'));
  console.log(JSON.stringify(verifyReceipt(input,receipt),null,2));return;
 }
 throw new Error('IEEE_GS_REPLAY_BLOCKED:USAGE_generate_REQUEST_or_verify_REQUEST_RECEIPT');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main(process.argv.slice(2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
