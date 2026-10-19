#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {inspectSourceIntake} from '../scripts/ieee-source-provenance-gateway.mjs';
import {generateDualObservationReceipt} from '../scripts/ieee-observation-dual-replay.mjs';
import {
 generateVerifiedSourceDualLink,verifyVerifiedSourceDualLink
} from '../scripts/ieee-verified-source-dual-link.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':
 x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':
 JSON.stringify(x);
const rehash=(x,k)=>{
 const {[k]:_,...body}=x;
 return {...body,[k]:sha(Buffer.from(canonical(body)))};
};
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const blocked=(fn,match)=>{assert.throws(fn,new RegExp(match));checks++;};
const fixture='research/japan-observation-adapters-2026-10-19/daily';
const csv=readFileSync(fixture+'.csv');
const manifest=JSON.parse(readFileSync(fixture+'.manifest.json','utf8'));
const spec={
 schema:'naft-ieee-source-intake-v1',
 source_id:'SYNTHETIC_DAILY_CH4',
 data_class:'SYNTHETIC',doi:null,source_url:manifest.source_uri,
 publisher_claim:'NaFT synthetic test input',
 license_claim:'SYNTHETIC_NO_EXTERNAL_LICENSE',
 site_id:manifest.site_id,measurement_kind:'SYNTHETIC_DAILY_INTERVAL_MEAN_RATE',
 retrieval_state:'SYNTHETIC_FIXTURE',expected_raw_sha256:sha(csv),
 original_file_name:'daily.csv',
 publisher_original_bytes_authenticated:false,
 publisher_checksum_independently_verified:false,
 source_license_independently_verified:false,
 site_environment_independently_matched:false,
 official_ag005_method_adopted_verified:false,
 certified_emission_reductions_verified:false,
 s3_object_lock_version_verified:false,
 certified_tco2e:null,verified_reduction_kg_ch4:null
};
const temp=mkdtempSync(join(tmpdir(),'naft-verified-dual-link-'));
try{
 const specFile=join(temp,'spec.json'),rawFile=join(temp,'raw.csv'),
  manifestFile=join(temp,'manifest.json'),sourceFile=join(temp,'source.json'),
  dualFile=join(temp,'dual.json'),linkFile=join(temp,'link.json');
 writeFileSync(specFile,JSON.stringify(spec));
 writeFileSync(rawFile,csv);
 writeFileSync(manifestFile,JSON.stringify(manifest));
 const sourceReport=inspectSourceIntake(readFileSync(specFile),csv);
 const dualReceipt=generateDualObservationReceipt(manifestFile,rawFile);
 const link=generateVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt);
 eq(link.status,'LOCAL_SOURCE_AND_TWO_ENGINE_INPUT_REPRODUCED');
 eq(link.data_class,'SYNTHETIC');
 eq(link.coverage_status,'PARTIAL_OBSERVED');
 eq(link.exact_input_sha256.normalized_csv,sha(csv));
 eq(link.source_report_sha256,sourceReport.report_sha256);
 eq(link.dual_replay_receipt_sha256,dualReceipt.receipt_sha256);
 eq(link.independent_engines_verified_for_this_input,true);
 eq(link.trust.publisher_original_bytes_authenticated,false);
 eq(link.trust.actual_environmental_effect_verified,null);
 eq(link.trust.accepted_regulatory_methodology,null);
 eq(link.trust.certified_tco2e,null);
 eq(verifyVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt,link).status,
  'SOURCE_AND_DUAL_LINK_REPRODUCED');
 eq(generateVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt),link);
 writeFileSync(sourceFile,JSON.stringify(sourceReport));
 writeFileSync(dualFile,JSON.stringify(dualReceipt));
 const run=(...args)=>spawnSync(process.execPath,
  ['scripts/ieee-verified-source-dual-link.mjs',...args],
  {encoding:'utf8',timeout:30000,maxBuffer:1000000});
 const generated=run('generate',specFile,rawFile,manifestFile,sourceFile,dualFile);
 eq(generated.status,0);
 eq(JSON.parse(generated.stdout),link);
 writeFileSync(linkFile,generated.stdout);
 const checked=run('verify',specFile,rawFile,manifestFile,sourceFile,dualFile,linkFile);
 eq(checked.status,0);
 eq(JSON.parse(checked.stdout).status,'SOURCE_AND_DUAL_LINK_REPRODUCED');
 // A self-rehashed edited output still fails full independent replay.
 const altered=structuredClone(link);altered.trust.certified_tco2e=12;
 blocked(()=>verifyVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt,
  rehash(altered,'link_receipt_sha256')),'LINK_RECEIPT_SOURCE_BOUND_MISMATCH');
 const alteredLink=structuredClone(link);alteredLink.exact_input_sha256.normalized_csv='f'.repeat(64);
 blocked(()=>verifyVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt,alteredLink),
  'LINK_RECEIPT_DIGEST_MISMATCH');
 // Forging one component's internal SHA cannot bypass its recomputed verifier.
 const modifiedSource=structuredClone(sourceReport);
 modifiedSource.input.site_id_claimed='FORGED';
 blocked(()=>generateVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,rehash(modifiedSource,'report_sha256'),dualReceipt),
  'SOURCE_REPORT_INPUT_OR_ENGINE_MISMATCH');
 const modifiedDual=structuredClone(dualReceipt);
 modifiedDual.independent_python.result.observed_only_integral_mg_ch4_m2='99.000000000';
 blocked(()=>generateVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,rehash(modifiedDual,'receipt_sha256')),
  'DUAL_RECEIPT_SOURCE_BOUND_MISMATCH');
 // Site/source labels are NOT substitutable even when normalized CSV hash matches.
 const anotherSpec={...spec,site_id:'UNRELATED_SYNTHETIC_SITE'};
 writeFileSync(specFile,JSON.stringify(anotherSpec));
 const anotherReport=inspectSourceIntake(readFileSync(specFile),csv);
 blocked(()=>generateVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,anotherReport,dualReceipt),
  'SOURCE_DUAL_LINK_CONTEXT_OR_HASH_MISMATCH');
 writeFileSync(specFile,JSON.stringify(spec));
 const alteredManifest={...manifest,site_id:'UNRELATED_SYNTHETIC_SITE'};
 writeFileSync(manifestFile,JSON.stringify(alteredManifest));
 blocked(()=>generateVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt),
  'DUAL_RECEIPT_SOURCE_BOUND_MISMATCH');
 writeFileSync(manifestFile,JSON.stringify(manifest));
 // Local bytes cannot silently drift while the two receipts stay unchanged.
 writeFileSync(rawFile,Buffer.concat([csv,Buffer.from('\n')]));
 blocked(()=>generateVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt),
  'SOURCE_RAW_SHA256_MISMATCH');
 writeFileSync(rawFile,csv);
 // An original-source pending record must not be upgraded by a synthetic dual proof.
 const pending=readFileSync(
  'research/japan-primary-evidence-2026-10-18/japanflux-jp-hrt-intake-pending.json');
 writeFileSync(specFile,pending);
 blocked(()=>generateVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt),
  'SOURCE_PRIMARY_DATASET_NOT_ACQUIRED');
 writeFileSync(specFile,JSON.stringify(spec));
 const forgedReceipt=rehash({...link,scope:'CERTIFIED'},'link_receipt_sha256');
 blocked(()=>verifyVerifiedSourceDualLink(
  specFile,rawFile,manifestFile,sourceReport,dualReceipt,forgedReceipt),
  'LINK_RECEIPT_SOURCE_BOUND_MISMATCH');
 const malformed=run('verify',specFile,rawFile,manifestFile,sourceFile,dualFile);
 assert.notEqual(malformed.status,0);checks++;
}finally{rmSync(temp,{recursive:true,force:true});}
console.log('IEEE_VERIFIED_SOURCE_DUAL_LINK_PASS:',checks,
 'checks; local provenance and arithmetic parity only; certified_tco2e=null');
