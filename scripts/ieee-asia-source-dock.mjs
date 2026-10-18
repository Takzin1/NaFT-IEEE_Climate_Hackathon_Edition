/**
 * IEEE ClimateChain metadata-only Dock for NaFT Japan Asian methane data-source register.
 * This code validates copied manifests and accession log consistency, NOT remote publisher bytes.
 * No climate claims, field reproduction, credit eligibility or official factor transfer.
 */
import {createHash} from 'node:crypto';
import {exportIEEEDock} from './lib/asia-source-dock.mjs';
const fail=x=>{throw new Error(x)};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':
  object(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
export function verifyAsianIEEEDock(index,proof){
 const catalog=exportIEEEDock(index);
 if(!object(proof)||proof.schema!=='naft-ephemeral-upstream-byte-verification-v1'||
    !Array.isArray(proof.files)||proof.files.length!==6||
    proof.verified_ephemeral_file_count!==6||
    proof.original_bytes_available_in_repo!==false||
    proof.data_license_independently_reviewed!==false||
    proof.formal_calculation_or_certification_allowed!==false||
    proof.export_to_ieee!=='SOURCE_PROVENANCE_METADATA_ONLY')
   fail('IEEE_ASIA_DOCK_ACCSESSION_SCHEMA_INVALID');
 if(!/^https:\/\/github\.com\/Takzin1\/NaFT\/actions\/runs\/\d+$/.test(proof.github_action_run_url))
   fail('IEEE_ASIA_DOCK_UPSTREAM_RUN_NOT_LINKED');
 const available=new Map();
 for(const s of index.sources)for(const f of s.files||[])
   available.set(s.id+'\0'+f.filename,{md5:f.md5_published,source:s});
 const mapped=new Set(),verified=[];
 for(const item of proof.files){
  if(!object(item)||!item.dataset_id||!item.filename)fail('IEEE_ASIA_DOCK_INVALID_FILE');
  const key=item.dataset_id+'\0'+item.filename;
  if(mapped.has(key))fail('IEEE_ASIA_DOCK_DUPLICATE_SOURCE_FILE');
  mapped.add(key);
  const listed=available.get(key);
  if(!listed||item.published_md5!==listed.md5||
    item.integrity_status!=='PUBLISHER_MD5_MATCHED_IN_EPHEMERAL_RUN'||
    !/^[a-f0-9]{64}$/.test(item.downloaded_sha256||'')||
    !Number.isSafeInteger(item.size_bytes)||item.size_bytes<=0||
    item.license_reviewed!==false||item.source_specific_adapter_approved!==false||
    item.original_dataset_republished!==false)
   fail('IEEE_ASIA_DOCK_UNSUPPORTED_UPSTREAM_PROOF');
  verified.push({source_id:item.dataset_id,filename:item.filename,
    upstream_md5:item.published_md5,upstream_recorded_sha256:item.downloaded_sha256,
    bytes:item.size_bytes,source_class:listed.source.source_class,
    scientific_measurement_attested:false,license_approved:false,
    reverified_by_ieee_workflow:false});
 }
 const result={
  schema:'naft-ieee-asia-reference-dock-1',
  status:'METADATA_ONLY_UPSTREAM_ORIGINAL_BYTES_VERIFIED',
  source_catalog_digest_sha256:catalog.manifest_digest_sha256,
  transfer_contract:catalog.schema,source_count:catalog.source_count,
  upstream_reference_workflow:proof.github_action_run_url,
  upstream_original_byte_evidence:'CHECKSUM_MATCH_OBSERVED_IN_EXTERNAL_JAPAN_ACTIONS_NOT_RERUN',
  verified_files_in_upstream_run:verified.length,
  references:verified,
  independent_publisher_authenticity_validation:false,
  original_dataset_bytes_in_ieee:false,
  derived_flux_or_field_observation_in_ieee:false,
  observed_flux_values_imported:0,
  model_values_imported:0,
  official_jcredit_eligibility:null,
  official_gxets_eligibility:null,
  certified_tco2e:null,
  scientific_measurement_reproduction:false,
  independent_environment_comparison:false,
  source_license_approved:false,
  pending:'REVIEW_LICENSE_AND_ORIGINAL_QC_THEN_SOURCE_SPECIFIC_NORMALIZATION',
 };
 result.dock_report_sha256=sha(canonical(result));
 return result;
}
