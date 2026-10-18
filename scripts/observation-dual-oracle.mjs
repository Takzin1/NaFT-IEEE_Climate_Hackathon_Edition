#!/usr/bin/env node
/** Fail-closed two-language arithmetic parity gate. NO publisher source observations. */
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadAndEvaluate} from './independent-observation-js.mjs';
const STOP=s=>{throw Error(s)};
const fixedKeys=['case_id','adapter_id','source_status','coverage_status',
 'observed_seconds','qc_excluded_seconds','unrepresented_seconds','window_seconds',
 'measured_coverage_pct','observed_mg_ch4_m2','observed_kg_ch4_ha',
 'full_window_mg_ch4_m2','certified_tco2e','environment_causal_share'];
export function assertParity(js,py){
 if(js.schema!=='naft-independent-observation-results-v1'||py.schema!==js.schema||
 js.source_fixture_sha256!==py.source_fixture_sha256||
 js.source_data_class!=='SYNTHETIC_TEST_ONLY'||py.source_data_class!==js.source_data_class||
 js.scientific_replication_verified!==false||py.scientific_replication_verified!==false||
 js.official_factor_approved!==false||py.official_factor_approved!==false||
 js.publisher_original_attested!==false||py.publisher_original_attested!==false||
 !Array.isArray(js.cases)||!Array.isArray(py.cases)||js.cases.length!==py.cases.length)
  STOP('DUAL_ORACLE_METADATA_MISMATCH');
 for(let i=0;i<js.cases.length;i++){
  const a=js.cases[i],b=py.cases[i];
  for(const key of fixedKeys){
   if(a[key]!==b[key])STOP('DUAL_ORACLE_DIVERGENCE:'+a.case_id+':'+key);
  }
  if(a.certified_tco2e!==null||a.environment_causal_share!==null)
   STOP('DUAL_ORACLE_UNSAFE_CLAIM');
  if(a.coverage_status!=='COMPLETE_OBSERVED'&&a.full_window_mg_ch4_m2!==null)
   STOP('DUAL_ORACLE_PARTIAL_AS_FULL');
 }
 return true;
}
const normal='research/asia-independent-observation-2026-10-19/cases.json';
export function compare(filename=normal){
 const js=loadAndEvaluate(filename);
 const processResult=spawnSync('python3',['scripts/independent-observation-py.py',filename],{
  encoding:'utf8',timeout:20000,maxBuffer:3000000
 });
 if(processResult.error||processResult.status!==0)STOP('DUAL_ORACLE_PYTHON_FAILED:'+
   (processResult.stderr||processResult.error?.message||'unknown').slice(0,300));
 const py=JSON.parse(processResult.stdout);
 assertParity(js,py);
 const proof={schema:'naft-independent-methane-parity-proof-v1',
  status:'SYNTHETIC_ARITHMETIC_PARITY_ONLY',
  same_source_sha256:js.source_fixture_sha256,
  cases_compared:js.cases.length,
  comparisons_exact:js.cases.length*fixedKeys.length,
  javascript_engine:'BIGINT_RATIONAL',python_engine:'PYTHON_DECIMAL',
  scientific_replication_verified:false,publisher_original_attested:false,
  site_environment_matched:false,measurements_reproduced:0,
  published_raw_flux_integrated:false,regulatory_eligibility:null,certified_tco2e:null,
  results:js.cases.map(x=>({case_id:x.case_id,adapter_id:x.adapter_id,
   coverage:x.coverage_status,observed_mg_ch4_m2:x.observed_mg_ch4_m2,
   observed_kg_ch4_ha:x.observed_kg_ch4_ha,
   full_window_mg_ch4_m2:x.full_window_mg_ch4_m2,
   measured_coverage_pct:x.measured_coverage_pct}))
 };
 proof.proof_sha256=createHash('sha256').update(JSON.stringify(proof)).digest('hex');
 return proof;
}
if(process.argv[1]&&process.argv[1].endsWith('/observation-dual-oracle.mjs')){
 try{
  if(process.argv.length>3)STOP('USAGE: node scripts/observation-dual-oracle.mjs [input.json]');
  console.log(JSON.stringify(compare(process.argv[2]||normal),null,2));
 }catch(e){console.error('DUAL_ORACLE_BLOCKED:'+e.message);process.exitCode=1;}
}
