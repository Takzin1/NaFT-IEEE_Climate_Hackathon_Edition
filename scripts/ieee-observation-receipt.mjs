#!/usr/bin/env node
/**
 * IEEE ClimateChain: offline observation source-bound replay receipt.
 * Local hashes bind exact input bytes and engine source to a repeatable computation.
 * Neither publisher authenticity nor scientific/AG-005 validation is established.
 */
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {replayObservationSeries} from './lib/japan-observation-adapters.mjs';

const stop=code=>{throw Error(code)};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>{
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(obj(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
 return JSON.stringify(x);
};
const sourcePaths=['./lib/japan-raw-flux.mjs','./lib/japan-observation-adapters.mjs'];
function sourceDigests(){
 return Object.fromEntries(sourcePaths.map(relative=>{
  const key=relative.slice(2);
  return [key,sha(readFileSync(new URL(relative,import.meta.url)))];
 }));
}
function suppliedManifest(raw){
 if(!Buffer.isBuffer(raw)||raw.length<2||raw.length>100000)
  stop('MANIFEST_SIZE_INVALID');
 let m;
 try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}
 catch{stop('MANIFEST_PARSE_INVALID');}
 if(!obj(m))stop('MANIFEST_OBJECT_REQUIRED');
 return m;
}
export function createObservationReceipt(manifestBytes,csvBytes){
 const m=suppliedManifest(manifestBytes);
 const replay=replayObservationSeries(csvBytes,m);
 if(replay.schema!=='naft-observation-replay-v2'||replay.status!=='RESEARCH_UNATTESTED'||
  replay.publisher_bytes_independently_attested!==false||
  replay.environment_conditions_independently_verified!==false||
  replay.official_japan_factor_applicable!==null||replay.certified_tco2e!==null||
  replay.gap_fill_applied!==false||replay.uncertainty_interval!==null||
  replay.causal_attribution!==null)
  stop('UNSAFE_REPLAY_STATUS');
 if(replay.coverage_status!=='COMPLETE_OBSERVED'&&
  (replay.full_window_total_mg_ch4_m2!==null||
   replay.full_window_total_kg_ch4_ha!==null))
  stop('PARTIAL_REPLAY_AS_FULL_PERIOD');
 const payload={
  schema:'naft-ieee-observation-receipt-v1',
  scope:'LOCAL_INPUT_REPLAY_REPRODUCIBILITY_ONLY',
  input:{
   csv_sha256:sha(csvBytes),
   manifest_bytes_sha256:sha(manifestBytes),
   engine_source_sha256:sourceDigests(),
   normalized_adapter_id:m.adapter_id,
   declared_data_class:m.data_class,
   source_uri_claimed:m.source_uri,
   source_license_status_claimed:m.source_license_status,
   country_claimed:m.country,
   site_id_claimed:m.site_id,
   plot_id_claimed:m.plot_id,
   treatment_claimed:m.treatment,
   measurement_method_claimed:m.measurement_method,
   time_basis:m.time_basis,
   observation_start_utc:m.observation_start_utc,
   observation_end_utc:m.observation_end_utc
  },
  replay:{
   schema:replay.schema,status:replay.status,
   adapter_id:replay.adapter_id,
   input_unit:replay.input_unit,input_mass_basis:replay.input_mass_basis,
   coverage_status:replay.coverage_status,
   observed_seconds:replay.observed_seconds,
   excluded_qc_seconds:replay.excluded_qc_seconds,
   unrepresented_gap_seconds:replay.unrepresented_gap_seconds,
   window_seconds:replay.window_seconds,
   measured_coverage_percent:replay.measured_coverage_percent,
   observed_only_integral_mg_ch4_m2:replay.observed_only_integral_mg_ch4_m2,
   observed_only_integral_kg_ch4_ha:replay.observed_only_integral_kg_ch4_ha,
   full_window_total_mg_ch4_m2:replay.full_window_total_mg_ch4_m2,
   full_window_total_kg_ch4_ha:replay.full_window_total_kg_ch4_ha,
   accepted_rows:replay.accepted_rows,excluded_rows:replay.excluded_rows,
   research_imputed_rows_excluded:replay.research_imputed_rows_excluded,
   replay_result_sha256:sha(Buffer.from(canonical(replay)))
  },
  trust:{
   publisher_original_bytes_authenticated:false,
   source_license_independently_verified:false,
   declared_site_environment_independently_matched:false,
   independent_second_engine_executed_for_this_input:false,
   official_methodology_factor_applicable:null,
   emission_reduction_attributed:null,
   certified_tco2e:null,
   testnet_anchor_performed:false
  }
 };
 return {...payload,receipt_sha256:sha(Buffer.from(canonical(payload)))};
}
export function verifyObservationReceipt(manifestBytes,csvBytes,receipt){
 if(!obj(receipt)||receipt.schema!=='naft-ieee-observation-receipt-v1'||
  typeof receipt.receipt_sha256!=='string'||
  !/^[0-9a-f]{64}$/.test(receipt.receipt_sha256))stop('RECEIPT_SCHEMA_INVALID');
 const {receipt_sha256,...payload}=receipt;
 if(sha(Buffer.from(canonical(payload)))!==receipt_sha256)
  stop('RECEIPT_DIGEST_MISMATCH');
 const fresh=createObservationReceipt(manifestBytes,csvBytes);
 if(canonical(fresh)!==canonical(receipt))
  stop('SOURCE_BOUND_REPLAY_MISMATCH');
 return {
  status:'LOCAL_INPUT_REPLAY_REPRODUCED',
  receipt_sha256,
  coverage_status:fresh.replay.coverage_status,
  publisher_original_bytes_authenticated:false,
  independently_verified_environmental_effect:false,
  certified_tco2e:null
 };
}
function readBounded(path,max){
 const stat=statSync(path);
 if(!stat.isFile()||stat.size<2||stat.size>max)stop('FILE_NOT_REGULAR_OR_SIZE_EXCEEDED');
 return readFileSync(path);
}
function cli(args){
 const [mode,...files]=args;
 if(!['generate','verify'].includes(mode)||
   files.length!==(mode==='generate'?2:3))
  stop('USAGE: node scripts/ieee-observation-receipt.mjs generate MANIFEST.json OBS.csv | verify MANIFEST.json OBS.csv RECEIPT.json');
 const [m,c]=[readBounded(files[0],100000),readBounded(files[1],2000000)];
 if(mode==='generate')return createObservationReceipt(m,c);
 let candidate;
 try{candidate=JSON.parse(readBounded(files[2],500000).toString('utf8'));}
 catch{stop('RECEIPT_JSON_INVALID');}
 return verifyObservationReceipt(m,c,candidate);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(cli(process.argv.slice(2)),null,2));}
 catch(e){console.error('OBSERVATION_RECEIPT_BLOCKED:'+e.message);process.exitCode=1;}
}
