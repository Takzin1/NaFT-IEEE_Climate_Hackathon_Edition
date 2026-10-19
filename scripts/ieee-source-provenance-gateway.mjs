#!/usr/bin/env node
/**
 * NaFT IEEE offline source-intake preflight, NOT publisher authentication.
 * Original source bytes and DataCite metadata must be supplied as local files.
 * Never fetch an arbitrary URL, trust a self-asserted original-data flag,
 * or turn a checksum match into approved emissions/credits.
 */
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const reject=x=>{throw Error(x)};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':
 obj(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':
 JSON.stringify(x);
const digest=x=>sha(Buffer.from(canonical(x)));
const HEX=/^[a-f0-9]{64}$/;
const DOI=/^10\.[0-9]{4,9}\/[-._;()/:a-z0-9]+$/i;
const ID=/^[A-Z][A-Z0-9_]{2,90}$/;
const textField=(x,k,max=512)=>{
 if(typeof x!=='string'||!x.trim()||x.length>max||/[\r\n\0]/.test(x))
  reject('SOURCE_REQUIRED_FIELD:'+k);
 return x;
};
const decode=(bytes,label,max)=>{
 if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>max)
  reject('SOURCE_INPUT_SIZE:'+label);
 try{
  const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!obj(p))reject('SOURCE_JSON_NOT_OBJECT:'+label);
  return p;
 }catch(e){
  if(e.message.startsWith('SOURCE_'))throw e;
  reject('SOURCE_JSON_INVALID:'+label);
 }
};
const verifiedFlags=[
 'publisher_original_bytes_authenticated','publisher_checksum_independently_verified',
 'source_license_independently_verified','site_environment_independently_matched',
 'official_ag005_method_adopted_verified','certified_emission_reductions_verified',
 's3_object_lock_version_verified'
];
function validateSpec(s){
 if(s.schema!=='naft-ieee-source-intake-v1'||!ID.test(s.source_id||''))
  reject('SOURCE_SPEC_SCHEMA_OR_ID');
 if(!['SYNTHETIC','PRIMARY_DATASET_CANDIDATE','USER_SUPPLIED_UNVERIFIED'].includes(s.data_class))
  reject('SOURCE_DATA_CLASS_UNSUPPORTED');
 for(const k of verifiedFlags){
  if(s[k]!==false)reject('SOURCE_UNTRUSTED_ATTESTATION:'+k);
 }
 if(s.certified_tco2e!==null||s.verified_reduction_kg_ch4!==null)
  reject('SOURCE_UNSAFE_CREDIT_CLAIM');
 textField(s.publisher_claim,'publisher_claim');
 textField(s.source_url,'source_url',1024);
 textField(s.license_claim,'license_claim');
 textField(s.site_id,'site_id');
 textField(s.measurement_kind,'measurement_kind');
 if(s.data_class==='SYNTHETIC'){
  if(s.doi!==null||!s.source_url.startsWith('urn:naft:synthetic:'))
   reject('SOURCE_SYNTHETIC_IMPERSONATES_PUBLISHER');
  if(s.retrieval_state!=='SYNTHETIC_FIXTURE'||!HEX.test(s.expected_raw_sha256||''))
   reject('SOURCE_SYNTHETIC_FILE_DECLARATION');
 }else{
  if(typeof s.doi!=='string'||!DOI.test(s.doi)||
   s.source_url.toLowerCase()!=='https://doi.org/'+s.doi.toLowerCase())
   reject('SOURCE_DOI_IDENTITY');
  if(s.data_class==='PRIMARY_DATASET_CANDIDATE'){
   if(s.retrieval_state!=='ORIGINAL_NOT_RETRIEVED'||s.expected_raw_sha256!==null)
    reject('SOURCE_ORIGINAL_BYTES_NOT_YET_AVAILABLE');
  }else if(s.retrieval_state!=='LOCAL_USER_SUPPLIED_UNVERIFIED'||
    !HEX.test(s.expected_raw_sha256||''))
   reject('SOURCE_UNVERIFIED_FILE_DECLARATION');
 }
 if(s.expected_raw_sha256!==null&&!HEX.test(s.expected_raw_sha256||''))
  reject('SOURCE_EXPECTED_SHA_FORMAT');
 if(s.original_file_name!==null){
  textField(s.original_file_name,'original_file_name',200);
  if(/[\\/]/.test(s.original_file_name)||s.original_file_name==='.'||
    s.original_file_name==='..')reject('SOURCE_FILENAME_PATH_TRAVERSAL');
 }
 if(s.data_class!=='PRIMARY_DATASET_CANDIDATE'&&s.original_file_name===null)
  reject('SOURCE_FILE_NAME_REQUIRED');
 if(s.data_class==='PRIMARY_DATASET_CANDIDATE'&&s.original_file_name!==null&&
  s.expected_raw_sha256!==null)reject('SOURCE_UNEXPECTED_ORIGINAL_HASH');
 return s;
}
function metadataView(bytes,spec){
 if(bytes===null)return {state:'NOT_SUPPLIED',snapshot_sha256:null,doi:null,
    publisher:null,rights_metadata_claim:null,metadata_from_official_api_verified:false};
 const p=decode(bytes,'datacite_snapshot',500000);
 if(p.data?.type!=='dois'||!obj(p.data.attributes)||
   typeof p.data.attributes.doi!=='string'||!DOI.test(p.data.attributes.doi)||
   typeof p.data.id!=='string'||!DOI.test(p.data.id))
  reject('SOURCE_DATACITE_SCHEMA');
 if(p.data.id.toLowerCase()!==p.data.attributes.doi.toLowerCase()||
  !spec.doi||p.data.id.toLowerCase()!==spec.doi.toLowerCase())
  reject('SOURCE_DATACITE_DOI_MISMATCH');
 const publisher=textField(p.data.attributes.publisher,'datacite_publisher');
 if(publisher!==spec.publisher_claim)reject('SOURCE_DATACITE_PUBLISHER_MISMATCH');
 const rights=p.data.attributes.rightsList;
 if(rights!==undefined&&!Array.isArray(rights))
  reject('SOURCE_DATACITE_RIGHTS_SCHEMA');
 return {
  state:'LOCAL_DATACITE_JSON_DOI_AND_PUBLISHER_MATCHED',
  snapshot_sha256:sha(bytes),doi:p.data.id,publisher,
  rights_metadata_claim:Array.isArray(rights)?
   rights.filter(x=>obj(x)&&typeof x.rights==='string').map(x=>x.rights).slice(0,10):[],
  metadata_from_official_api_verified:false
 };
}
export function inspectSourceIntake(specBytes,rawBytes=null,dataciteBytes=null){
 const spec=validateSpec(decode(specBytes,'source_spec',100000));
 if(rawBytes!==null&&(!Buffer.isBuffer(rawBytes)||rawBytes.length<1||
   rawBytes.length>2000000))reject('SOURCE_RAW_SIZE');
 if(rawBytes!==null&&spec.data_class==='PRIMARY_DATASET_CANDIDATE')
  reject('SOURCE_PRIMARY_DATASET_NOT_ACQUIRED');
 if(rawBytes===null&&spec.data_class!=='PRIMARY_DATASET_CANDIDATE')
  reject('SOURCE_RAW_FILE_MISSING');
 if(dataciteBytes!==null&&spec.data_class==='SYNTHETIC')
  reject('SOURCE_SYNTHETIC_HAS_DATACITE_SNAPSHOT');
 if(dataciteBytes!==null&&!spec.doi)
  reject('SOURCE_DATACITE_REQUIRES_DOI');
 const metadata=metadataView(dataciteBytes,spec);
 if(rawBytes!==null&&sha(rawBytes)!==spec.expected_raw_sha256)
  reject('SOURCE_RAW_SHA256_MISMATCH');
 const local=rawBytes!==null;
 const payload={
  schema:'naft-ieee-source-intake-report-v1',
  evaluation_scope:'OFFLINE_LOCAL_BYTE_AND_METADATA_CONSISTENCY_ONLY',
  input:{
   source_spec_bytes_sha256:sha(specBytes),source_id:spec.source_id,
   data_class:spec.data_class,declared_doi:spec.doi,
   source_url_claimed:spec.source_url,publisher_claimed:spec.publisher_claim,
   license_claimed:spec.license_claim,site_id_claimed:spec.site_id,
   measurement_kind_claimed:spec.measurement_kind,
   original_file_name_claimed:spec.original_file_name,
   raw_bytes_sha256:local?sha(rawBytes):null,
   expected_raw_sha256:spec.expected_raw_sha256
  },
  metadata,
  decisions:{
   local_raw_checksum_consistent:local,
   local_file_present:local,
   original_dataset_bytes_independently_acquired:false,
   doi_publisher_metadata_snapshot_consistent:metadata.state==='LOCAL_DATACITE_JSON_DOI_AND_PUBLISHER_MATCHED',
   publisher_api_response_authenticated:false,
   source_license_legally_reviewed:false,
   field_measurement_protocol_confirmed:false,
   original_file_schema_normalized:false,
   s3_object_lock_protected_version_confirmed:false,
   ag005_formal_rulepack_eligibility:null,
   actual_climate_reduction_verified:null,
   certified_tco2e:null,
   gateway_status:!local?'BLOCKED_ORIGINAL_FILE_NOT_ACQUIRED':
    'LOCAL_INPUT_CONSISTENT_SOURCE_AUTHENTICITY_UNVERIFIED'
  }
 };
 return {...payload,report_sha256:digest(payload)};
}
export function verifySourceIntake(specBytes,rawBytes,dataciteBytes,report){
 if(!obj(report)||report.schema!=='naft-ieee-source-intake-report-v1'||
   typeof report.report_sha256!=='string'||!HEX.test(report.report_sha256))
  reject('SOURCE_REPORT_SCHEMA');
 const {report_sha256,...payload}=report;
 if(digest(payload)!==report_sha256)reject('SOURCE_REPORT_DIGEST_MISMATCH');
 const expected=inspectSourceIntake(specBytes,rawBytes,dataciteBytes);
 if(canonical(report)!==canonical(expected))
  reject('SOURCE_REPORT_INPUT_OR_ENGINE_MISMATCH');
 return {
  status:'LOCAL_SOURCE_PREFLIGHT_REPRODUCED',
  report_sha256,
  gateway_status:expected.decisions.gateway_status,
  publisher_original_authenticated:false,certified_tco2e:null
 };
}
// Only normalized CSV matching the raw input can be linked to existing two-engine receipts;
// a primary publisher's raw file needs an independently reviewed source-specific adapter.
export function linkSourceToDualReplay(intake,dual){
 if(!obj(intake)||!obj(intake.decisions)||!obj(intake.input)||
  !obj(dual)||!obj(dual.original_input)||!obj(dual.source_bound_local_receipt)||
  !obj(dual.source_bound_local_receipt.input))
  reject('SOURCE_DUAL_LINK_SCHEMA');
 const observation=dual.source_bound_local_receipt.input;
 const claimed=[intake.input.site_id_claimed,intake.input.source_url_claimed,
  intake.input.license_claimed,intake.input.data_class,
  observation.site_id_claimed,observation.source_uri_claimed,
  observation.source_license_status_claimed,observation.declared_data_class];
 if(claimed.some(v=>typeof v!=='string'||!v.trim())||
    !['SYNTHETIC','USER_SUPPLIED_UNVERIFIED'].includes(intake.input.data_class)||
    !/^[a-f0-9]{64}$/.test(intake.input.raw_bytes_sha256||'')||
    !/^[a-f0-9]{64}$/.test(dual.original_input.csv_sha256||''))
  reject('SOURCE_DUAL_LINK_SCHEMA');
 if(intake.decisions.local_raw_checksum_consistent!==true||
  intake.input.raw_bytes_sha256!==dual.original_input.csv_sha256||
  intake.input.site_id_claimed!==dual.source_bound_local_receipt.input.site_id_claimed||
  intake.input.source_url_claimed!==dual.source_bound_local_receipt.input.source_uri_claimed||
  intake.input.license_claimed!==dual.source_bound_local_receipt.input.source_license_status_claimed||
  intake.input.data_class!==dual.source_bound_local_receipt.input.declared_data_class)
  reject('SOURCE_DUAL_LINK_CONTEXT_OR_HASH_MISMATCH');
 if(intake.decisions.certified_tco2e!==null||dual.trust?.certified_tco2e!==null)
  reject('SOURCE_DUAL_LINK_CREDIT_CLAIM');
 return {
  scope:'LOCAL_INPUT_AND_TWO_ENGINE_REPLAY_LINK_ONLY',
  source_report_sha256:intake.report_sha256,
  dual_replay_receipt_sha256:dual.receipt_sha256,
  source_publisher_authenticated:false,certified_tco2e:null
 };
}
function localFile(path,max){
 const stat=statSync(path);
 if(!stat.isFile()||stat.size<1||stat.size>max)reject('SOURCE_LOCAL_FILE_SIZE');
 return readFileSync(path);
}
// Explicit --datacite removes ambiguity when original raw bytes do not exist.
// Positional raw+metadata forms remain supported for existing callers.
function cli(args){
 const mode=args[0],tokens=args.slice(1);
 const optionIndices=tokens.flatMap((x,i)=>x==='--datacite'?[i]:[]);
 if(optionIndices.length>1)reject('SOURCE_DATACITE_OPTION_DUPLICATED');
 let files=tokens,metadataPath=null;
 if(optionIndices.length===1){
  const at=optionIndices[0];
  if(at===tokens.length-1||tokens[at+1]==='--datacite'||
    tokens[at+1].startsWith('--'))
   reject('SOURCE_DATACITE_OPTION_PATH_REQUIRED');
  metadataPath=tokens[at+1];
  files=[...tokens.slice(0,at),...tokens.slice(at+2)];
 }
 if(mode==='inspect'){
  if(![1,2,3].includes(files.length)||
    (metadataPath!==null&&files.length>2))
   reject('USAGE: inspect SPEC.json [RAW.csv] [DATACITE.json] | inspect SPEC.json [RAW.csv] --datacite DATACITE.json');
  return inspectSourceIntake(localFile(files[0],100000),
   files[1]?localFile(files[1],2000000):null,
   metadataPath!==null?localFile(metadataPath,500000):
    files[2]?localFile(files[2],500000):null);
 }
 if(mode==='verify'){
  if(![2,3,4].includes(files.length)||
    (metadataPath!==null&&files.length>3))
   reject('USAGE: verify SPEC.json [RAW.csv] [DATACITE.json] REPORT.json | verify SPEC.json [RAW.csv] REPORT.json --datacite DATACITE.json');
  const source=localFile(files[0],100000);
  const raw=files.length>2?localFile(files[1],2000000):null;
  const meta=metadataPath!==null?localFile(metadataPath,500000):
   files.length>3?localFile(files[2],500000):null;
  let report;
  try{report=JSON.parse(localFile(files.at(-1),1000000).toString('utf8'));}
  catch{reject('SOURCE_REPORT_JSON_INVALID');}
  return verifySourceIntake(source,raw,meta,report);
 }
 reject('USAGE: inspect SPEC.json [RAW.csv] [DATACITE.json] | inspect SPEC.json --datacite DATACITE.json | verify SPEC.json [RAW.csv] [DATACITE.json] REPORT.json');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(cli(process.argv.slice(2)),null,2));}
 catch(e){console.error('SOURCE_GATE_BLOCKED:'+e.message);process.exitCode=1;}
}
