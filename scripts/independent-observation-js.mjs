#!/usr/bin/env node
/** JavaScript BigInt exact rational, one implementation of the research-only oracle.
 * Independent Python Decimal does not import this engine or its outputs.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const STOP=s=>{throw Error(s)};
const S=1000000n,DAY=86400n;
const adapters=Object.freeze({
 INTERVAL_MG_CH4_M2_DAY_V1:{unit:'mg_CH4_m2_day',basis:'CH4_MOLECULAR',max:604800n},
 DAILY_G_CH4_M2_DAY_V1:{unit:'g_CH4_m2_day',basis:'CH4_MOLECULAR',max:DAY,exact:DAY},
 EDDY_NMOL_CH4_M2_S_V1:{unit:'nmol_CH4_m2_s',basis:'CH4_MOLECULAR',max:3600n},
 EDDY_UMOL_CH4_M2_S_V1:{unit:'umol_CH4_m2_s',basis:'CH4_MOLECULAR',max:3600n},
 DAILY_G_CH4_C_M2_DAY_V1:{unit:'g_CH4_C_m2_day',basis:'CH4_C',max:DAY,exact:DAY}
});
function utc(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value))STOP('INVALID_UTC');
 const n=Date.parse(value);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==value.replace('Z','.000Z'))STOP('INVALID_CALENDAR');
 return BigInt(n/1000);
}
function decimal(value){
 if(typeof value!=='string'||!/^[-]?(?:0|[1-9]\d{0,5})(?:\.\d{1,6})?$/.test(value))STOP('INVALID_DECIMAL');
 const neg=value.startsWith('-'),[w,f='']=(neg?value.slice(1):value).split('.');
 const v=BigInt(w)*S+BigInt(f.padEnd(6,'0')||'0');
 return neg?-v:v;
}
function gcd(a,b){a=a<0n?-a:a;while(b){const t=a%b;a=b;b=t}return a||1n}
function plus(a,b){
 const n=a[0]*b[1]+b[0]*a[1],d=a[1]*b[1],g=gcd(n,d);
 return [n/g,d/g];
}
function fixed(n,d,places){
 if(d<=0n)STOP('INVALID_RATIONAL_DENOMINATOR');
 const negative=n<0n,pos=negative?-n:n,scale=10n**BigInt(places);
 const v=(2n*pos*scale+d)/(2n*d);
 const s=v.toString().padStart(places+1,'0');
 return (negative&&v!==0n?'-':'')+s.slice(0,-places)+'.'+s.slice(-places);
}
function term(rate,seconds,id){
 const v=decimal(rate);
 if(id==='INTERVAL_MG_CH4_M2_DAY_V1')return [v*seconds,S*DAY];
 if(id==='DAILY_G_CH4_M2_DAY_V1')return [v*seconds*1000n,S*DAY];
 if(id==='EDDY_NMOL_CH4_M2_S_V1')return [v*seconds*1604n,S*100000000n];
 if(id==='EDDY_UMOL_CH4_M2_S_V1')return [v*seconds*1604n,S*100000n];
 if(id==='DAILY_G_CH4_C_M2_DAY_V1')return [v*seconds*4000n,S*3n*DAY];
 STOP('ADAPTER_NOT_REGISTERED');
}
export function evaluate(input,sourceSha256=null){
 if(!input||input.schema!=='naft-independent-observation-fixtures-v1'||
 input.data_class!=='SYNTHETIC_TEST_ONLY'||input.documented_original_observations!==false||
 input.measured_emissions_claimed!==false||input.source_catalog_only!==true||
 input.precision_decimals!==9||!Array.isArray(input.cases)||
 input.cases.length<1||input.cases.length>100)STOP('UNATTESTED_ONLY_SCHEMA');
 const seen=new Set(),result=[];
 for(const item of input.cases){
  if(!item||typeof item.case_id!=='string'||!/^[A-Z0-9_]{5,100}$/.test(item.case_id)||
  seen.has(item.case_id))STOP('DUPLICATE_OR_INVALID_CASE');
  seen.add(item.case_id);
  if(item.source_status!=='SYNTHETIC'||!item.source_ref?.startsWith('urn:naft:synthetic:')||
   item.publisher_original_attested!==false||item.field_conditions_verified!==false||
   item.certification_eligible!==false||!['JP','KR','CN'].includes(item.jurisdiction))
   STOP('CASE_PROVENANCE_PROMOTION');
  const a=adapters[item.adapter_id];
  if(!a||item.rate_unit!==a.unit||item.mass_basis!==a.basis)
   STOP('UNIT_OR_BASIS_MISMATCH');
  const start=utc(item.observation_start_utc),end=utc(item.observation_end_utc);
  if(end<=start||end-start>366n*DAY)STOP('INVALID_WINDOW');
  if(!Array.isArray(item.rows)||!item.rows.length||item.rows.length>10000)STOP('INVALID_OBSERVATION_ROWS');
  let last=start,measured=0n,qcExcluded=0n,unrepresented=0n,total=[0n,1n];
  for(const row of item.rows){
   if(!row||typeof row!=='object')STOP('MALFORMED_ROW');
   const lo=utc(row.start_utc),hi=utc(row.end_utc),delta=hi-lo;
   if(lo<last)STOP('OVERLAPPING_OR_REORDERED_ROWS');
   if(lo>=end||hi>end||delta<=0n||delta>a.max||(a.exact&&delta!==a.exact))
    STOP('INVALID_OBSERVATION_INTERVAL');
   unrepresented+=lo-last;
   if(row.qc_status==='OBSERVED_GOOD'||row.qc_status==='OBSERVED_ACCEPTABLE'){
    total=plus(total,term(row.value,delta,item.adapter_id));
    measured+=delta;
   } else if(row.qc_status==='MISSING'||row.qc_status==='IMPUTED_RESEARCH'){
    if(row.value!=='')STOP('EXCLUDED_RATE_MUST_BE_BLANK');
    qcExcluded+=delta;
   }else STOP('QC_STATUS_NOT_SUPPORTED');
   last=hi;
  }
  unrepresented+=end-last;
  const span=end-start;
  if(measured+qcExcluded+unrepresented!==span)STOP('COVERAGE_IDENTITY_INVALID');
  const coverage=measured===0n?'NO_OBSERVATION':measured===span?'COMPLETE_OBSERVED':'PARTIAL_OBSERVED';
  const amount=measured===0n?null:fixed(total[0],total[1],9);
  result.push({
   case_id:item.case_id,adapter_id:item.adapter_id,source_status:'SYNTHETIC',
   coverage_status:coverage,observed_seconds:String(measured),qc_excluded_seconds:String(qcExcluded),
   unrepresented_seconds:String(unrepresented),window_seconds:String(span),
   measured_coverage_pct:fixed(measured*100n,span,6),
   observed_mg_ch4_m2:amount,
   observed_kg_ch4_ha:measured===0n?null:fixed(total[0],total[1]*100n,9),
   full_window_mg_ch4_m2:coverage==='COMPLETE_OBSERVED'?amount:null,
   certified_tco2e:null,environment_causal_share:null
  });
 }
 return {schema:'naft-independent-observation-results-v1',precision_decimals:9,
 source_fixture_sha256:sourceSha256,source_data_class:'SYNTHETIC_TEST_ONLY',
 publisher_original_attested:false,official_factor_approved:false,
 scientific_replication_verified:false,cases:result};
}
export function loadAndEvaluate(filename){
 const raw=readFileSync(filename);
 if(raw.length>2000000)STOP('SOURCE_FILE_SIZE_LIMIT');
 return evaluate(JSON.parse(raw.toString('utf8')),createHash('sha256').update(raw).digest('hex'));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{
 const file=process.argv[2]||'research/asia-independent-observation-2026-10-19/cases.json';
 if(process.argv.length>3)STOP('USAGE: independent-observation-js.mjs [input.json]');
 console.log(JSON.stringify(loadAndEvaluate(file),null,2));
 }catch(e){console.error('JS_ORACLE_BLOCKED:'+e.message);process.exitCode=1;}
}
