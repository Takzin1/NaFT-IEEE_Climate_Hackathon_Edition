#!/usr/bin/env node
/** Per-input JS BigInt vs independent Python Decimal CH4 arithmetic verification.
 * Reuses the v1 local receipt. No real-source attestation, official method or credits.
 */
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createObservationReceipt} from './ieee-observation-receipt.mjs';

const reject=code=>{throw Error(code)};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':
 obj(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':
 JSON.stringify(x);
const keys=[
 'adapter_id','input_unit','input_mass_basis','coverage_status','data_class',
 'observed_seconds','excluded_qc_seconds','unrepresented_gap_seconds',
 'window_seconds','measured_coverage_percent',
 'observed_only_integral_mg_ch4_m2','observed_only_integral_kg_ch4_ha',
 'full_window_total_mg_ch4_m2','full_window_total_kg_ch4_ha',
 'accepted_rows','excluded_rows','research_imputed_rows_excluded'
];
export function assertObservationParity(jsReceipt,pythonResult){
 if(!obj(jsReceipt)||!obj(jsReceipt.input)||!obj(jsReceipt.replay)||
    !obj(jsReceipt.trust)||!obj(pythonResult))
  reject('INDEPENDENT_COMPARISON_SCHEMA');
 const x=jsReceipt.replay,y=pythonResult;
 if(jsReceipt.scope!=='LOCAL_INPUT_REPLAY_REPRODUCIBILITY_ONLY'||
    jsReceipt.trust.publisher_original_bytes_authenticated!==false||
    jsReceipt.trust.independent_second_engine_executed_for_this_input!==false||
    jsReceipt.trust.certified_tco2e!==null||
    y.publisher_bytes_independently_attested!==false||
    y.certified_tco2e!==null||y.uncertainty_interval!==null||
    y.causal_attribution!==null||y.csv_digest_sha256!==jsReceipt.input.csv_sha256||
    y.record_count!==x.accepted_rows+x.excluded_rows)
  reject('INDEPENDENT_COMPARISON_PROVENANCE_OR_COVERAGE');
 if(y.data_class!==jsReceipt.input.declared_data_class)
  reject('INDEPENDENT_COMPARISON_DATA_CLASS');
 for(const key of keys){
  const a=key==='data_class'?jsReceipt.input.declared_data_class:x[key];
  if(a!==y[key])reject('INDEPENDENT_COMPARISON_DIVERGENCE:'+key);
 }
 if(x.coverage_status!=='COMPLETE_OBSERVED'&&
    (y.full_window_total_mg_ch4_m2!==null||y.full_window_total_kg_ch4_ha!==null))
  reject('INDEPENDENT_PARTIAL_AS_FULL');
 return keys.length+2;
}
function localFile(p,max){
 const s=statSync(p);
 if(!s.isFile()||s.size<2||s.size>max)reject('DUAL_FILE_SIZE');
 const bytes=readFileSync(p);
 if(bytes.length<2||bytes.length>max)reject('DUAL_FILE_CHANGED_DURING_READ');
 return bytes;
}
const pythonFile=fileURLToPath(new URL('./ieee-observation-independent-oracle.py',import.meta.url));
const javascriptFile=fileURLToPath(new URL('./ieee-observation-receipt.mjs',import.meta.url));
function independentlyCalculate(manifestPath,csvPath){
 const call=spawnSync('python3',[pythonFile,resolve(manifestPath),resolve(csvPath)],{
  encoding:'utf8',timeout:15000,maxBuffer:150000,windowsHide:true
 });
 if(call.error||call.status!==0)reject('INDEPENDENT_PYTHON_FAILED:'+
  (call.stderr||call.error?.message||'unknown').slice(0,240));
 let result;
 try{result=JSON.parse(call.stdout);}
 catch{reject('INDEPENDENT_PYTHON_MALFORMED_RESULT');}
 return result;
}
export function generateDualObservationReceipt(manifestPath,csvPath){
 const m=localFile(manifestPath,100000),c=localFile(csvPath,2000000);
 // Source hashes in the receipt must describe the exact versions present
 // before Python executed, not whichever versions exist after it returns.
 const oracleSource=localFile(pythonFile,300000);
 const jsSource=localFile(javascriptFile,300000);
 const driverSource=localFile(fileURLToPath(import.meta.url),300000);
 const base=createObservationReceipt(m,c);
 const independent=independentlyCalculate(manifestPath,csvPath);
 // Python reads local input paths independently. Arithmetic parity alone
 // cannot detect a changed site/measurement metadata field in the manifest.
 // Reject a moving file rather than bind two different observation contexts.
 if(sha(localFile(manifestPath,100000))!==sha(m)||
    sha(localFile(csvPath,2000000))!==sha(c)||
    sha(localFile(pythonFile,300000))!==sha(oracleSource)||
    sha(localFile(javascriptFile,300000))!==sha(jsSource)||
    sha(localFile(fileURLToPath(import.meta.url),300000))!==sha(driverSource))
  reject('DUAL_INPUT_CHANGED_DURING_REPLAY');
 const comparisons=assertObservationParity(base,independent);
 const payload={
  schema:'naft-ieee-observation-dual-receipt-v1',
  scope:'LOCAL_TWO_ENGINE_ARITHMETIC_PARITY_ONLY',
  status:'JS_BIGINT_PYTHON_DECIMAL_PARITY',
  original_input:{
   manifest_bytes_sha256:sha(m),csv_sha256:sha(c),
   normalization_adapter_id:base.input.normalized_adapter_id
  },
  source_bound_local_receipt:base,
  independent_python:{
   script_sha256:sha(oracleSource),
   driver_sha256:sha(driverSource),
   js_receipt_source_sha256:sha(jsSource),
   result_sha256:sha(Buffer.from(canonical(independent))),
   compared_fields:comparisons,
   result:independent
  },
  trust:{
   independent_second_engine_executed_for_this_input:true,
   only_local_arithmetic_parity_verified:true,
   independently_authenticated_publisher_bytes:false,
   source_license_independently_verified:false,
   actual_field_environment_matched:false,
   certified_tco2e:null,
   official_jcredit_factor_approved:null,
   emissions_avoided:null,
   testnet_anchor_performed:false
  }
 };
 return {...payload,receipt_sha256:sha(Buffer.from(canonical(payload)))};
}
export function verifyDualObservationReceipt(manifestPath,csvPath,receipt){
 if(!obj(receipt)||receipt.schema!=='naft-ieee-observation-dual-receipt-v1'||
  typeof receipt.receipt_sha256!=='string'||
  !/^[a-f0-9]{64}$/.test(receipt.receipt_sha256))
  reject('DUAL_RECEIPT_SCHEMA');
 const {receipt_sha256,...payload}=receipt;
 if(sha(Buffer.from(canonical(payload)))!==receipt_sha256)
  reject('DUAL_RECEIPT_DIGEST_MISMATCH');
 const expected=generateDualObservationReceipt(manifestPath,csvPath);
 if(canonical(expected)!==canonical(receipt))
  reject('DUAL_RECEIPT_SOURCE_BOUND_MISMATCH');
 return {
  schema:'naft-ieee-observation-dual-verification-v1',
  status:'TWO_ENGINE_LOCAL_INPUT_REPLAY_REPRODUCED',
  receipt_sha256,comparisons:expected.independent_python.compared_fields,
  coverage_status:expected.independent_python.result.coverage_status,
  publisher_original_attested:false,certified_tco2e:null
 };
}
function main(argv){
 const [mode,...paths]=argv;
 if(!['generate','verify'].includes(mode)||
  paths.length!==(mode==='generate'?2:3))
  reject('USAGE: node scripts/ieee-observation-dual-replay.mjs generate MANIFEST.json OBS.csv | verify MANIFEST.json OBS.csv PROOF.json');
 if(mode==='generate')return generateDualObservationReceipt(paths[0],paths[1]);
 let proof;
 try{proof=JSON.parse(localFile(paths[2],300000).toString('utf8'));}
 catch{reject('DUAL_RECEIPT_INPUT_JSON_INVALID');}
 return verifyDualObservationReceipt(paths[0],paths[1],proof);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(main(process.argv.slice(2)),null,2));}
 catch(error){console.error('OBSERVATION_DUAL_REPLAY_BLOCKED:'+error.message);process.exitCode=1;}
}
