import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
 inspectSourceIntake,verifySourceIntake,linkSourceToDualReplay
} from '../scripts/ieee-source-provenance-gateway.mjs';
import {generateDualObservationReceipt} from '../scripts/ieee-observation-dual-replay.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':
 x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const rehash=x=>{const {report_sha256,...p}=x;return {...p,report_sha256:sha(Buffer.from(canonical(p)))};};
let n=0;
const eq=(a,b)=>{assert.deepEqual(a,b);n++;};
const ok=a=>{assert.ok(a);n++;};
const blocked=(run,error)=>{assert.throws(run,new RegExp(error));n++;};
const fixture='research/japan-observation-adapters-2026-10-19/daily';
const raw=readFileSync(fixture+'.csv');
const manifest=JSON.parse(readFileSync(fixture+'.manifest.json','utf8'));
const spec={
 schema:'naft-ieee-source-intake-v1',source_id:'SYNTHETIC_DAILY_CH4',
 data_class:'SYNTHETIC',doi:null,source_url:manifest.source_uri,
 publisher_claim:'NaFT built-in synthetic test fixture',
 license_claim:'SYNTHETIC_NO_EXTERNAL_LICENSE',
 site_id:manifest.site_id,
 measurement_kind:'SYNTHETIC_DAILY_INTERVAL_MEAN_RATE',
 retrieval_state:'SYNTHETIC_FIXTURE',expected_raw_sha256:sha(raw),
 original_file_name:'daily.csv',
 publisher_original_bytes_authenticated:false,
 publisher_checksum_independently_verified:false,
 source_license_independently_verified:false,
 site_environment_independently_matched:false,
 official_ag005_method_adopted_verified:false,
 certified_emission_reductions_verified:false,
 s3_object_lock_version_verified:false,certified_tco2e:null,verified_reduction_kg_ch4:null
};
const asBytes=x=>Buffer.from(JSON.stringify(x));
const good=inspectSourceIntake(asBytes(spec),raw);
eq(good.schema,'naft-ieee-source-intake-report-v1');
eq(good.decisions.local_raw_checksum_consistent,true);
eq(good.decisions.original_dataset_bytes_independently_acquired,false);
eq(good.decisions.gateway_status,'LOCAL_INPUT_CONSISTENT_SOURCE_AUTHENTICITY_UNVERIFIED');
eq(good.decisions.ag005_formal_rulepack_eligibility,null);
eq(good.decisions.certified_tco2e,null);
eq(good.metadata.state,'NOT_SUPPLIED');
eq(verifySourceIntake(asBytes(spec),raw,null,good).status,'LOCAL_SOURCE_PREFLIGHT_REPRODUCED');
const dual=generateDualObservationReceipt(fixture+'.manifest.json',fixture+'.csv');
const linked=linkSourceToDualReplay(good,dual);
eq(linked.source_report_sha256,good.report_sha256);
eq(linked.dual_replay_receipt_sha256,dual.receipt_sha256);
eq(linked.source_publisher_authenticated,false);
eq(linked.certified_tco2e,null);
const alternate=structuredClone(good);alternate.input.site_id_claimed='SOMEONE_ELSE';
blocked(()=>linkSourceToDualReplay(rehash(alternate),dual),'SOURCE_DUAL_LINK_CONTEXT_OR_HASH_MISMATCH');
const alternate2=structuredClone(good);alternate2.input.raw_bytes_sha256='0'.repeat(64);
blocked(()=>linkSourceToDualReplay(rehash(alternate2),dual),'SOURCE_DUAL_LINK_CONTEXT_OR_HASH_MISMATCH');

const conflictingLicense=structuredClone(good);
conflictingLicense.input.license_claimed='OTHER_LICENSE_DECLARATION';
blocked(()=>linkSourceToDualReplay(rehash(conflictingLicense),dual),
 'SOURCE_DUAL_LINK_CONTEXT_OR_HASH_MISMATCH');

const bothMissingSourceLicense=structuredClone(good);
const bothMissingObservationLicense=structuredClone(dual);
delete bothMissingSourceLicense.input.license_claimed;
delete bothMissingObservationLicense.source_bound_local_receipt.input.source_license_status_claimed;
blocked(()=>linkSourceToDualReplay(
 rehash(bothMissingSourceLicense),bothMissingObservationLicense),'SOURCE_DUAL_LINK_SCHEMA');
const incompleteDual=structuredClone(dual);
delete incompleteDual.source_bound_local_receipt.input;
blocked(()=>linkSourceToDualReplay(good,incompleteDual),'SOURCE_DUAL_LINK_SCHEMA');
const invalidHash=structuredClone(good);
invalidHash.input.raw_bytes_sha256='not-a-digest';
blocked(()=>linkSourceToDualReplay(rehash(invalidHash),dual),'SOURCE_DUAL_LINK_SCHEMA');
const untrustedClass=structuredClone(good);
const untrustedClassDual=structuredClone(dual);
untrustedClass.input.data_class='CERTIFIED_REAL';
untrustedClassDual.source_bound_local_receipt.input.declared_data_class='CERTIFIED_REAL';
blocked(()=>linkSourceToDualReplay(rehash(untrustedClass),untrustedClassDual),
 'SOURCE_DUAL_LINK_SCHEMA');
const stringBoolean=structuredClone(good);
stringBoolean.decisions.local_raw_checksum_consistent='true';
blocked(()=>linkSourceToDualReplay(rehash(stringBoolean),dual),
 'SOURCE_DUAL_LINK_CONTEXT_OR_HASH_MISMATCH');


blocked(()=>inspectSourceIntake(asBytes(spec),Buffer.concat([raw,Buffer.from('x')])),
 'SOURCE_RAW_SHA256_MISMATCH');
blocked(()=>inspectSourceIntake(asBytes(spec)),
 'SOURCE_RAW_FILE_MISSING');
for(const [key,value,error] of [
 ['publisher_original_bytes_authenticated',true,'SOURCE_UNTRUSTED_ATTESTATION'],
 ['source_license_independently_verified',true,'SOURCE_UNTRUSTED_ATTESTATION'],
 ['s3_object_lock_version_verified',true,'SOURCE_UNTRUSTED_ATTESTATION'],
 ['official_ag005_method_adopted_verified',true,'SOURCE_UNTRUSTED_ATTESTATION'],
 ['certified_tco2e',1,'SOURCE_UNSAFE_CREDIT_CLAIM'],
 ['data_class','PRIMARY_DATASET_VERIFIED','SOURCE_DATA_CLASS_UNSUPPORTED'],
 ['doi','10.9999/fake','SOURCE_SYNTHETIC_IMPERSONATES_PUBLISHER'],
 ['original_file_name','../secret.txt','SOURCE_FILENAME_PATH_TRAVERSAL'],
 ['expected_raw_sha256','0'.repeat(64),'SOURCE_RAW_SHA256_MISMATCH']
]){
 blocked(()=>inspectSourceIntake(asBytes({...spec,[key]:value}),raw),error);
}
const edited=structuredClone(good);edited.decisions.certified_tco2e=999;
blocked(()=>verifySourceIntake(asBytes(spec),raw,null,rehash(edited)),
 'SOURCE_REPORT_INPUT_OR_ENGINE_MISMATCH');
const edited2=structuredClone(good);edited2.input.publisher_claimed='NOT_PUBLISHER';
blocked(()=>verifySourceIntake(asBytes(spec),raw,null,rehash(edited2)),
 'SOURCE_REPORT_INPUT_OR_ENGINE_MISMATCH');
blocked(()=>verifySourceIntake(asBytes({...spec,publisher_claim:'DIFFERENT'}),raw,null,good),
 'SOURCE_REPORT_INPUT_OR_ENGINE_MISMATCH');
const notHashed=structuredClone(good);notHashed.input.site_id_claimed='TAMPER';
blocked(()=>verifySourceIntake(asBytes(spec),raw,null,notHashed),
 'SOURCE_REPORT_DIGEST_MISMATCH');
const sourcePath='research/japan-primary-evidence-2026-10-18/japanflux-jp-hrt-intake-pending.json';
const candidateBytes=readFileSync(sourcePath);
const candidate=JSON.parse(candidateBytes);
const pending=inspectSourceIntake(candidateBytes);
eq(pending.decisions.gateway_status,'BLOCKED_ORIGINAL_FILE_NOT_ACQUIRED');
eq(pending.decisions.local_raw_checksum_consistent,false);
eq(pending.decisions.actual_climate_reduction_verified,null);
eq(pending.input.expected_raw_sha256,null);
eq(verifySourceIntake(candidateBytes,null,null,pending).status,'LOCAL_SOURCE_PREFLIGHT_REPRODUCED');
blocked(()=>inspectSourceIntake(candidateBytes,raw),'SOURCE_PRIMARY_DATASET_NOT_ACQUIRED');
blocked(()=>inspectSourceIntake(asBytes({...candidate,expected_raw_sha256:sha(raw)})),
 'SOURCE_ORIGINAL_BYTES_NOT_YET_AVAILABLE');
blocked(()=>inspectSourceIntake(asBytes({...candidate,retrieval_state:'ORIGINAL_RETRIEVED'})),
 'SOURCE_ORIGINAL_BYTES_NOT_YET_AVAILABLE');
blocked(()=>inspectSourceIntake(asBytes({...candidate,source_url:'https://example.com/source'})),
 'SOURCE_DOI_IDENTITY');
const metadata={
 data:{id:candidate.doi,type:'dois',
  attributes:{doi:candidate.doi,publisher:candidate.publisher_claim,
   titles:[{title:'Synthetic test of DOI JSON parsing; NOT the real JapanFlux metadata'}],
   rightsList:[{rights:'UNVERIFIED_TEST_LICENSE'}]}}
};
const fakeMetadataBytes=asBytes(metadata);
const pendingWithMeta=inspectSourceIntake(candidateBytes,null,fakeMetadataBytes);
eq(pendingWithMeta.metadata.state,'LOCAL_DATACITE_JSON_DOI_AND_PUBLISHER_MATCHED');
eq(pendingWithMeta.metadata.metadata_from_official_api_verified,false);
eq(pendingWithMeta.metadata.snapshot_sha256,sha(fakeMetadataBytes));
eq(pendingWithMeta.decisions.gateway_status,'BLOCKED_ORIGINAL_FILE_NOT_ACQUIRED');
blocked(()=>inspectSourceIntake(candidateBytes,null,asBytes({
 ...metadata,data:{...metadata.data,id:'10.5555/unrelated'}})),
 'SOURCE_DATACITE_DOI_MISMATCH');
blocked(()=>inspectSourceIntake(candidateBytes,null,asBytes({
 ...metadata,data:{...metadata.data,attributes:{
 ...metadata.data.attributes,publisher:'DIFFERENT'}}})),
 'SOURCE_DATACITE_PUBLISHER_MISMATCH');
blocked(()=>inspectSourceIntake(asBytes(spec),raw,fakeMetadataBytes),
 'SOURCE_SYNTHETIC_HAS_DATACITE_SNAPSHOT');
const user={...candidate,data_class:'USER_SUPPLIED_UNVERIFIED',
 retrieval_state:'LOCAL_USER_SUPPLIED_UNVERIFIED',expected_raw_sha256:sha(raw),original_file_name:'daily.csv'};
const userReport=inspectSourceIntake(asBytes(user),raw,fakeMetadataBytes);
eq(userReport.decisions.local_raw_checksum_consistent,true);
eq(userReport.decisions.original_dataset_bytes_independently_acquired,false);
eq(userReport.decisions.publisher_api_response_authenticated,false);
eq(userReport.decisions.source_license_legally_reviewed,false);
eq(userReport.decisions.gateway_status,'LOCAL_INPUT_CONSISTENT_SOURCE_AUTHENTICITY_UNVERIFIED');
blocked(()=>linkSourceToDualReplay(userReport,dual),'SOURCE_DUAL_LINK_CONTEXT_OR_HASH_MISMATCH');
const tmp=mkdtempSync(join(tmpdir(),'naft-source-intake-'));
try{
 const mf=join(tmp,'spec.json'),df=join(tmp,'data.csv'),
  rf=join(tmp,'report.json'),meta=join(tmp,'datacite.json');
 writeFileSync(mf,asBytes(spec));writeFileSync(df,raw);
 const run=(...args)=>spawnSync('node',['scripts/ieee-source-provenance-gateway.mjs',...args],
  {encoding:'utf8',timeout:15000,maxBuffer:1000000});
 const collected=run('inspect',mf,df);
 eq(collected.status,0);
 const built=JSON.parse(collected.stdout);
 eq(built.report_sha256,good.report_sha256);
 writeFileSync(rf,collected.stdout);
 const verify=run('verify',mf,df,rf);
 eq(verify.status,0);
 eq(JSON.parse(verify.stdout).report_sha256,good.report_sha256);
 writeFileSync(rf,JSON.stringify({...built,report_sha256:'0'.repeat(64)}));
 const rejectCli=run('verify',mf,df,rf);
 ok(rejectCli.status!==0&&rejectCli.stderr.includes('SOURCE_REPORT_DIGEST_MISMATCH'));
 writeFileSync(mf,candidateBytes);writeFileSync(meta,fakeMetadataBytes);
 const candidateReport=run('inspect',mf);
 eq(candidateReport.status,0);
 eq(JSON.parse(candidateReport.stdout).decisions.gateway_status,'BLOCKED_ORIGINAL_FILE_NOT_ACQUIRED');
 // When no raw publisher file exists, a DataCite metadata snapshot must NOT
 // be interpreted as CSV merely because it is the second CLI argument.
 const metadataOnly=run('inspect',mf,'--datacite',meta);
 eq(metadataOnly.status,0);
 const metadataOnlyReceipt=JSON.parse(metadataOnly.stdout);
 eq(metadataOnlyReceipt.metadata.state,'LOCAL_DATACITE_JSON_DOI_AND_PUBLISHER_MATCHED');
 eq(metadataOnlyReceipt.decisions.gateway_status,'BLOCKED_ORIGINAL_FILE_NOT_ACQUIRED');
 writeFileSync(rf,metadataOnly.stdout);
 const checkedMetadataOnly=run('verify',mf,rf,'--datacite',meta);
 eq(checkedMetadataOnly.status,0);
 eq(JSON.parse(checkedMetadataOnly.stdout).report_sha256,metadataOnlyReceipt.report_sha256);
 const missingMetadataArg=run('inspect',mf,'--datacite');
 ok(missingMetadataArg.status!==0&&missingMetadataArg.stderr.includes('SOURCE_DATACITE_OPTION_PATH_REQUIRED'));
 const duplicatedMetadataArg=run('inspect',mf,'--datacite',meta,'--datacite',meta);
 ok(duplicatedMetadataArg.status!==0&&duplicatedMetadataArg.stderr.includes('SOURCE_DATACITE_OPTION_DUPLICATED'));
 writeFileSync(mf,asBytes(user));
 const userCli=run('inspect',mf,df,'--datacite',meta);
 eq(userCli.status,0);
 eq(JSON.parse(userCli.stdout).report_sha256,userReport.report_sha256);
 writeFileSync(mf,candidateBytes);
 const metadataReport=run('inspect',mf,df,meta);
 ok(metadataReport.status!==0&&metadataReport.stderr.includes('SOURCE_PRIMARY_DATASET_NOT_ACQUIRED'));
}finally{rmSync(tmp,{recursive:true,force:true});}
console.log('IEEE_SOURCE_PROVENANCE_GATE_PASS: '+n+' synthetic/candidate/tamper assertions; no publisher source attested');
