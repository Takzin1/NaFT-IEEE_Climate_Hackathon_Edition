#!/usr/bin/env node
/**
 * Verify both source preflight and dual-engine observation replay against the
 * ORIGINAL local inputs before binding their receipts. Local parity only:
 * never publisher authentication, a legal methodology gate, or certification.
 */
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifySourceIntake,linkSourceToDualReplay} from './ieee-source-provenance-gateway.mjs';
import {verifyDualObservationReceipt} from './ieee-observation-dual-replay.mjs';

const fail=code=>{throw Error('VERIFIED_SOURCE_DUAL_LINK_BLOCKED:'+code);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':
 object(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':
 JSON.stringify(x);
const digest=x=>sha(Buffer.from(canonical(x)));
function bounded(path,max){
 const stat=statSync(path);
 if(!stat.isFile()||stat.size<1||stat.size>max)fail('FILE_NOT_REGULAR_OR_BOUNDED');
 return readFileSync(path);
}
function jsonFile(path,max){
 let parsed;
 try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bounded(path,max)));}
 catch{fail('RECEIPT_JSON_INVALID');}
 if(!object(parsed))fail('RECEIPT_OBJECT_REQUIRED');
 return parsed;
}

/**
 * This accepts only normalized CSV bytes that are identical in the source
 * gateway and scientific replay. Publisher-native files need reviewed adapters.
 * The two component verify functions independently recompute their receipts.
 */
export function generateVerifiedSourceDualLink(
 specPath,rawPath,manifestPath,sourceReport,dualReceipt,datacitePath=null
){
 const specBytes=bounded(specPath,100000);
 const rawBytes=bounded(rawPath,2000000);
 const manifestBytes=bounded(manifestPath,100000);
 const metadataBytes=datacitePath===null?null:bounded(datacitePath,500000);
 const sourceVerification=verifySourceIntake(specBytes,rawBytes,metadataBytes,sourceReport);
 const dualVerification=verifyDualObservationReceipt(manifestPath,rawPath,dualReceipt);
 if(sourceVerification.status!=='LOCAL_SOURCE_PREFLIGHT_REPRODUCED'||
    dualVerification.status!=='TWO_ENGINE_LOCAL_INPUT_REPLAY_REPRODUCED'||
    sourceVerification.gateway_status!=='LOCAL_INPUT_CONSISTENT_SOURCE_AUTHENTICITY_UNVERIFIED'||
    dualReceipt.status!=='JS_BIGINT_PYTHON_DECIMAL_PARITY'||
    dualReceipt.trust?.independent_second_engine_executed_for_this_input!==true)
  fail('INDEPENDENT_REPLAY_OR_GATE_NOT_VERIFIED');
 const joined=linkSourceToDualReplay(sourceReport,dualReceipt);
 if(joined.scope!=='LOCAL_INPUT_AND_TWO_ENGINE_REPLAY_LINK_ONLY'||
    joined.source_publisher_authenticated!==false||
    joined.certified_tco2e!==null||
    dualReceipt.original_input?.manifest_bytes_sha256!==sha(manifestBytes)||
    dualReceipt.original_input?.csv_sha256!==sha(rawBytes))
  fail('LINKED_SOURCE_OR_MANIFEST_MISMATCH');
 // Refuse a moving local input after the second engine has re-read its file.
 if(sha(bounded(rawPath,2000000))!==sha(rawBytes)||
    sha(bounded(manifestPath,100000))!==sha(manifestBytes))
  fail('INPUT_CHANGED_DURING_VERIFICATION');
 const payload={
  schema:'naft-ieee-verified-source-dual-link-v1',
  status:'LOCAL_SOURCE_AND_TWO_ENGINE_INPUT_REPRODUCED',
  scope:'OFFLINE_LOCAL_INPUT_CONSISTENCY_AND_NUMERICAL_PARITY_ONLY',
  source_report_sha256:sourceReport.report_sha256,
  dual_replay_receipt_sha256:dualReceipt.receipt_sha256,
  exact_input_sha256:{
   source_spec:sha(specBytes),normalized_csv:sha(rawBytes),
   observation_manifest:sha(manifestBytes),
   datacite_snapshot:metadataBytes===null?null:sha(metadataBytes)
  },
  data_class:sourceReport.input.data_class,
  coverage_status:dualVerification.coverage_status,
  independent_engines_verified_for_this_input:true,
  trust:{
   publisher_original_bytes_authenticated:false,
   official_metadata_api_delivery_authenticated:false,
   independently_verified_source_license:false,
   accepted_regulatory_methodology:null,
   actual_environmental_effect_verified:null,
   certified_tco2e:null,
   blockchain_attestation_performed:false
  }
 };
 return {...payload,link_receipt_sha256:digest(payload)};
}

export function verifyVerifiedSourceDualLink(
 specPath,rawPath,manifestPath,sourceReport,dualReceipt,candidate,datacitePath=null
){
 if(!object(candidate)||candidate.schema!=='naft-ieee-verified-source-dual-link-v1'||
    !/^[a-f0-9]{64}$/.test(candidate.link_receipt_sha256||''))
  fail('LINK_RECEIPT_SCHEMA');
 const {link_receipt_sha256,...payload}=candidate;
 if(digest(payload)!==link_receipt_sha256)fail('LINK_RECEIPT_DIGEST_MISMATCH');
 const recreated=generateVerifiedSourceDualLink(
  specPath,rawPath,manifestPath,sourceReport,dualReceipt,datacitePath);
 if(canonical(candidate)!==canonical(recreated))
  fail('LINK_RECEIPT_SOURCE_BOUND_MISMATCH');
 return {
  status:'SOURCE_AND_DUAL_LINK_REPRODUCED',
  link_receipt_sha256,
  original_publisher_authenticated:false,
  certified_tco2e:null
 };
}
function main(args){
 const [mode,...files]=args;
 if(mode!=='generate'&&mode!=='verify')fail('USAGE_GENERATE_OR_VERIFY');
 const min=mode==='generate'?5:6;
 if(files.length!==min&&files.length!==min+1)
  fail('USAGE: generate SPEC RAW MANIFEST SOURCE_REPORT DUAL_REPORT [DATACITE] | verify SPEC RAW MANIFEST SOURCE_REPORT DUAL_REPORT LINK_REPORT [DATACITE]');
 const [spec,raw,manifest,source,dual]=files;
 const sourceReport=jsonFile(source,1000000),dualReceipt=jsonFile(dual,500000);
 if(mode==='generate')return generateVerifiedSourceDualLink(
  spec,raw,manifest,sourceReport,dualReceipt,files[5]||null);
 const candidate=jsonFile(files[5],500000);
 return verifyVerifiedSourceDualLink(
  spec,raw,manifest,sourceReport,dualReceipt,candidate,files[6]||null);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(main(process.argv.slice(2)),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
