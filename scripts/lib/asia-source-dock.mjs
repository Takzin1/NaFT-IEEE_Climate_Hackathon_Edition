// Portable research-only IEEE Dock contract. Does not ingest source bytes or certify credits.
import {createHash} from 'node:crypto';
const BLOCK=(m)=>{throw Error(m)};
const MODEL=new Set(['MODEL_GRID_ESTIMATE_NOT_FIELD_OBSERVATION',
'MODEL_INVENTORY_AND_UNCERTAINTY_NOT_FIELD_OBSERVATION']);
const OBSERVED=new Set(['CHAMBER_DAILY_RESEARCH_OBSERVATION','EDDY_OBSERVATION_AND_METADATA',
'SITE_EDDY_COVARIANCE_DATASET','HARMONIZED_TOWER_DATASET']);
const CATALOG=new Set(['PUBLISHED_AGGREGATE_NO_RAW_TIMESERIES']);
const KNOWN=new Set([...MODEL,...OBSERVED,...CATALOG]);
export function validateSourceIndex(index){
 if(!index||index.schema!=='naft-asia-source-index-v1'||!Array.isArray(index.sources)||
   index.sources.length<7||index.ieee_dock?.transfer_policy!=='METADATA_ONLY'||
   index.ieee_dock?.contract!=='naft-ieee-observation-source-dock-v1')
  BLOCK('DOCK_SOURCE_SCHEMA_INCOMPATIBLE');
 const ids=new Set();
 for(const s of index.sources){
  if(ids.has(s.id))BLOCK('DOCK_DUPLICATE_SOURCE_ID');ids.add(s.id);
  if(!KNOWN.has(s.source_class)||s.downloaded_original_bytes!==false||
    s.original_sha256!==null||s.certified_jcredit_usable!==false||
    s.independent_field_environment_verified!==false||s.redistribution_permitted!==null)
   BLOCK('DOCK_UNVERIFIED_SOURCE_PROMOTED');
  if(s.license_status!=='REVIEW_REQUIRED'||!/^10\.\d{4,9}\/\S+$/.test(s.doi))
   BLOCK('DOCK_LICENSE_OR_DOI_NOT_REVIEWABLE');
  if(typeof s.record_url!=='string'||!s.record_url.startsWith('https://'))BLOCK('DOCK_SOURCE_URL');
  if(MODEL.has(s.source_class)&&(!s.target_adapter.includes('MODEL')&&!s.target_adapter.includes('BENCHMARK')))
   BLOCK('DOCK_MODEL_AS_RAW_OBSERVATION');
  for(const f of s.files||[]){
   if(!/^[a-f0-9]{32}$/.test(f.md5_published)||!f.filename||f.filename.includes('/')||
      'original_sha256' in f&&f.original_sha256!==null)BLOCK('DOCK_PUBLISHER_CHECKSUM_INVALID');
  }
 }
 return index;
}
export function exportIEEEDock(index){
 validateSourceIndex(index);
 const sources=index.sources.map(s=>({
  source_id:s.id,doi:s.doi,record_url:s.record_url,
  source_class:s.source_class,jurisdiction:s.jurisdiction,
  data_reuse_status:'LICENSE_REVIEW_REQUIRED',
  evidence_state:'SOURCE_CATALOG_ONLY',
  downloaded_original_bytes:false,original_sha256:null,
  model_inference:MODEL.has(s.source_class),
  field_observation:OBSERVED.has(s.source_class),
  regulatory_coefficient_transfer:false,verified_measurement:null,
  status:'CONFIG_REQUIRED',
  source_files:(s.files||[]).map(f=>({name:f.filename,publisher_md5:f.md5_published,
    source_sha256:null,original_bytes_retrieved:false}))
 }));
 const canonical=JSON.stringify(sources);
 return {schema:'naft-ieee-observation-source-dock-v1',
  provenance:'JAPAN_SOURCE_CATALOG_NOT_RAW_DATA',source_schema:index.schema,
  manifest_digest_sha256:createHash('sha256').update(canonical).digest('hex'),
  source_count:sources.length,sources,
  approved_tco2e:null,independent_environment_comparison:null,
  no_mixed_model_and_observation:true,
  accepted_into_ieee_core:false,
  next_gate:'RETRIEVE_BYTES_INDEPENDENTLY_THEN_LICENSE_QC_UNIT_TEMPORAL_CHECK'};
}
export function sourceComparisonGate(source,request){
 if(!source||!request||!KNOWN.has(source.source_class))BLOCK('DOCK_UNKNOWN_SOURCE');
 if(request.purpose==='J_CREDIT_CERTIFICATION'||request.purpose==='OFFICIAL_GXETS_REPORT')
  BLOCK('DOCK_NOT_FOR_OFFICIAL_REPORTED_EMISSIONS');
 if(request.expected_data_kind==='FIELD_OBSERVATION'&&!OBSERVED.has(source.source_class))
  BLOCK('DOCK_MODEL_OR_AGGREGATE_NOT_FIELD_OBSERVATION');
 if(source.jurisdiction!==request.jurisdiction&&request.require_same_jurisdiction===true)
  BLOCK('DOCK_CROSS_JURISDICTION_DENIED');
 return {result:'CATALOG_COMPARISON_ONLY',source_id:source.id,
  source_bytes_verified:false,origin_and_license_reviewed:false,
  scientific_measurement_comparison_allowed:false,
  regulatory_coefficient_usable:false,approved_tco2e:null};
}
