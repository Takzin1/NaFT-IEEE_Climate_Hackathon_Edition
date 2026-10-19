#!/usr/bin/env node
/**
 * Selective worksheet re-verification: compare trusted baseline receipts with
 * proposed inputs; replay changed training expressions only, carry unchanged
 * receipts and always keep official environmental claims null.
 *
 * Scope: three Gold Standard *educational* spreadsheet formulas only.
 * This is NOT the existing production MRV claim-evaluation graph.
 */
import {readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {digestObject, decimal12, replayWorksheetExercise, verifyReceipt, sha256}
 from './ieee-gs-worksheet-replay.mjs';
import {loadRegistry} from './rice-methodology-router.mjs';

const ROOT=resolve(fileURLToPath(import.meta.url),'..');
const MAX_CASES=250, MAX_JSON_BYTES=2_000_000;
const CASE_ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const HASH=/^[0-9a-f]{64}$/;
function ensure(ok,code){if(!ok)throw new Error('IEEE_GS_SELECTIVE_BLOCKED:'+code);}
function plain(a){return a!==null&&typeof a==='object'&&!Array.isArray(a);}
function keys(o,expected){return plain(o)&&Object.keys(o).sort().join(',')===expected.slice().sort().join(',');}
/** Reject non-JSON values before passing to legacy canonical source-digest code. */
function requirePortableJson(value,depth=0,parts={count:0}){
 ensure(depth<=16,'JSON_NESTING_TOO_DEEP');
 parts.count++;ensure(parts.count<=100000,'JSON_SIZE_OR_COMPLEXITY_LIMIT');
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){
  ensure(Number.isSafeInteger(value),'UNSAFE_NUMERIC_JSON');return;
 }
 if(Array.isArray(value)){
  ensure(value.length<=MAX_CASES+20,'JSON_ARRAY_TOO_LARGE');
  for(const item of value)requirePortableJson(item,depth+1,parts);
  return;
 }
 ensure(plain(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value)),
  'UNSUPPORTED_NON_JSON_VALUE');
 for(const [k,v] of Object.entries(value)){
  ensure(!['__proto__','prototype','constructor'].includes(k),'UNSAFE_JSON_PROPERTY');
  requirePortableJson(v,depth+1,parts);
 }
}
function canonical(x){
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(plain(x))return '{'+Object.keys(x).sort().map(
  k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
 return JSON.stringify(x);
}
/** Report every changed input field, not just numeric operand changes. */
function diffPaths(before,after,prefix=''){
 if(canonical(before)===canonical(after))return [];
 if(plain(before)&&plain(after)){
  return [...new Set([...Object.keys(before),...Object.keys(after)])].sort()
   .flatMap(k=>{
    const path=prefix?prefix+'.'+k:k;
    if(!Object.hasOwn(before,k)||!Object.hasOwn(after,k))return [path];
    return diffPaths(before[k],after[k],path);
   });
 }
 if(Array.isArray(before)&&Array.isArray(after)){
  // List order changes matter for metadata/routing; no interpolation.
  return [prefix];
 }
 return [prefix];
}
function exactDifference(before,after){
 if(before===null||after===null)return null;
 const a=BigInt(before.numerator),b=BigInt(before.denominator);
 const c=BigInt(after.numerator),d=BigInt(after.denominator);
 ensure(b>0n&&d>0n,'REPLAY_RECEIPT_RATIONAL_INVALID');
 const n=c*b-a*d,den=b*d;
 // The exact difference is in the *source worksheet's teaching output unit*,
 // NOT kg CH4 or issued credits; no manual 12-place subtraction.
 return {numerator:n.toString(),denominator:den.toString(),
  decimal_12_places:decimal12([n,den])};
}
function shaFile(relative){
 return sha256(readFileSync(new URL(relative,import.meta.url)));
}
export function selectiveReverify(batch,registry=loadRegistry()){
 requirePortableJson(batch);
 ensure(keys(batch,['schema','cases'])
  &&batch.schema==='naft-ieee-gs-selective-reverification-request-v1',
  'BATCH_SCHEMA_OR_KEYS');
 ensure(Array.isArray(batch.cases)&&batch.cases.length>0
  &&batch.cases.length<=MAX_CASES,'CASE_COUNT_INVALID');
 const seen=new Set(),items=[];
 const tally={total:batch.cases.length,retained:0,replayed:0,
   replays_with_numeric_delta:0,replays_without_numeric_delta:0,
   newly_calculable:0,blocked_after:0};
 for(const item of batch.cases){
  ensure(keys(item,['case_id','baseline_request','baseline_receipt','proposed_request']),
   'CASE_SCHEMA_OR_KEYS');
  ensure(typeof item.case_id==='string'&&CASE_ID.test(item.case_id),'CASE_ID_INVALID');
  ensure(!seen.has(item.case_id),'DUPLICATE_CASE_ID');
  seen.add(item.case_id);
  // Old records are NEVER simply trusted because they contain a matching SHA.
  // A verified baseline must exactly replay under the current pinned register.
  const old=verifyReceipt(item.baseline_request,item.baseline_receipt,registry);
  ensure(old.status==='SOURCE_BOUND_REPLAY_MATCH','BASELINE_NOT_VERIFIED');
  ensure(HASH.test(item.baseline_receipt.receipt_sha256),'BASELINE_HASH_INVALID');
  const changed=diffPaths(item.baseline_request,item.proposed_request);
  ensure(changed.length<=100,'DIFF_TOO_LARGE');
  const isChanged=changed.length>0;
  const next=isChanged?replayWorksheetExercise(item.proposed_request,registry)
   :item.baseline_receipt;
  const blocked=next.exact_value===null;
  const delta=isChanged?exactDifference(item.baseline_receipt.exact_value,
      next.exact_value):null;
  let decision;
  if(!isChanged){decision='RETAINED_SOURCE_VERIFIED';tally.retained++;}
  else if(blocked){decision='REPLAYED_BLOCKED_BY_METHOD_OR_EVIDENCE';tally.replayed++;}
  else if(item.baseline_receipt.exact_value===null){
   decision='REPLAYED_NEW_TRAINING_VALUE_HUMAN_REVIEW';tally.replayed++;
   tally.newly_calculable++;
  }else if(delta.numerator==='0'){
   decision='REPLAYED_ARITHMETIC_UNCHANGED';tally.replayed++;
   tally.replays_without_numeric_delta++;
  }else{decision='REPLAYED_ARITHMETIC_CHANGED';tally.replayed++;
   tally.replays_with_numeric_delta++;}
  if(blocked)tally.blocked_after++;
  items.push({
   case_id:item.case_id,decision,changed_paths:changed,
   baseline_receipt_sha256:item.baseline_receipt.receipt_sha256,
   proposed_receipt_sha256:next.receipt_sha256,
   proposed_request_sha256:next.request_sha256,
   baseline_status:item.baseline_receipt.status,
   proposed_status:next.status,
   proposed_lane:next.lane,
   formula_reference:next.source_formula,
   source_workbook_sha256:next.original_workbook_sha256,
   proposed_worksheet_training_value:next.exact_value?.decimal_12_places??null,
   exact_training_difference:delta,
   missing_evidence:next.missing_evidence,
   route_block_reasons:next.route_block_reasons,
   retained_original_receipt:!isChanged,
   independently_accepted_ch4_qc:false,
   formal_validation_completed:false,
   certified_tco2e:null
  });
 }
 items.sort((a,b)=>a.case_id<b.case_id?-1:a.case_id>b.case_id?1:0);
 const unsigned={
  schema:'naft-ieee-gs-selective-reverification-report-v1',
  mode:'ONLY_GS_TRAINING_WORKSHEET_FORMULAS_NOT_PRODUCTION_MRV_CLAIMS',
  source_registry_sha256:digestObject(registry),
  replay_engine_source_sha256:shaFile('ieee-gs-worksheet-replay.mjs'),
  router_source_sha256:shaFile('rice-methodology-router.mjs'),
  batch_request_sha256:digestObject(batch),
  counts:tally,items,
  replay_method:'VERIFY_BASELINE_THEN_RECALCULATE_ONLY_CHANGED_INPUTS',
  independent_python_oracle_executed_on_this_batch:false,
  external_publisher_signature_verified:false,
  historical_method_change_approved:false,
  official_project_eligibility_verified:false,
  verified_real_field_emissions:null,
  certified_tco2e:null,
  wallet_or_chain_operation_performed:false
 };
 return {...unsigned,report_sha256:digestObject(unsigned)};
}
export function verifySelectiveReport(batch,report,registry=loadRegistry()){
 requirePortableJson(report);
 ensure(plain(report),'REPORT_REQUIRED');
 const actual=selectiveReverify(batch,registry);
 ensure(canonical(report)===canonical(actual),'SELECTIVE_REPORT_REPLAY_MISMATCH');
 return {status:'SELECTIVE_REPORT_SOURCE_BOUND_REPLAY_MATCH',
  report_sha256:actual.report_sha256,verified_cases:actual.counts.total,
  certified_tco2e:null};
}
function inputFile(path){
 ensure(statSync(path).size<=MAX_JSON_BYTES,'JSON_FILE_TOO_LARGE');
 return JSON.parse(readFileSync(path,'utf8'));
}
function main(argv){
 if(argv.length===2&&argv[0]==='generate'){
  console.log(JSON.stringify(selectiveReverify(inputFile(argv[1])),null,2));return;
 }
 if(argv.length===3&&argv[0]==='verify'){
  console.log(JSON.stringify(verifySelectiveReport(inputFile(argv[1]),
   inputFile(argv[2])),null,2));return;
 }
 throw new Error('IEEE_GS_SELECTIVE_BLOCKED:USAGE_generate_BATCH_or_verify_BATCH_REPORT');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main(process.argv.slice(2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
