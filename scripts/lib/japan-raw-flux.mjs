/* NaFT raw-flux local scientific REPLAY only; never official AG-005 credits. */
import {createHash} from 'node:crypto';
const EXPECTED='start_utc,end_utc,flux_mg_m2_day,qc_status';
const BLOCKED='SOURCE_UNATTESTED_ENVIRONMENT_UNMATCHED';
const fail=(k)=>{throw new Error(k)};
const getStr=(x,k)=>{if(typeof x!=='string'||!x.trim()||x.length>512)fail('INVALID_META:'+k);return x};
const integer=(x,k)=>{if(!Number.isSafeInteger(x))fail('INVALID_INTEGER:'+k);return x};
export function utc(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s))
  fail('INVALID_UTC_TIMESTAMP');
 const ms=Date.parse(s);
 if(!Number.isFinite(ms)||new Date(ms).toISOString()!==s.replace('Z','.000Z'))
  fail('INVALID_UTC_CALENDAR');
 return BigInt(ms/1000);
}
const rate=(v)=>{
 if(typeof v!=='string'||!/^[-]?(?:0|[1-9]\d{0,5})(?:\.\d{1,6})?$/.test(v))
  fail('INVALID_FLUX_DECIMAL');
 const negative=v.startsWith('-'),parts=(negative?v.slice(1):v).split('.');
 const n=BigInt(parts[0])*1000000n+BigInt((parts[1]||'').padEnd(6,'0'));
 return negative?-n:n;
};
const format=(numerator,denominator,places=9)=>{
 const scale=10n**BigInt(places),neg=numerator<0n,n=neg?-numerator:numerator;
 const rounded=(2n*n*scale+denominator)/(2n*denominator);
 const s=rounded.toString().padStart(places+1,'0');
 return (neg&&rounded!==0n?'-':'')+(places?s.slice(0,-places)+'.'+s.slice(-places):s);
};
export function replayFlux(csvBytes,manifest){
 if(!Buffer.isBuffer(csvBytes)||csvBytes.length===0||csvBytes.length>2000000)
  fail('RAW_FILE_SIZE_OR_TYPE');
 const digest=createHash('sha256').update(csvBytes).digest('hex');
 if(!manifest||manifest.schema!=='naft-japan-flux-segment-v1'||
 !/^[0-9a-f]{64}$/.test(manifest.csv_sha256||'')||digest!==manifest.csv_sha256)
  fail('RAW_SHA256_MISMATCH_OR_SCHEMA');
 if(!['SYNTHETIC','USER_SUPPLIED_UNVERIFIED'].includes(manifest.data_class))
  fail('RAW_DATA_CLASS_UNSUPPORTED');
 if(manifest.original_publisher_bytes_verified!==false||manifest.original_field_conditions_verified!==false)
  fail('UNTRUSTED_ATTESTATION_CANNOT_ASSERT_TRUE');
 if(manifest.unit!=='mg_CH4_m2_day'||manifest.gas!=='CH4'||manifest.mass_basis!=='CH4'||
 manifest.sampling_semantics!=='INTERVAL_MEAN_FLUX_RATE'||manifest.gap_fill_policy!=='FORBID'||
 manifest.country!=='JP')fail('RAW_GAS_UNIT_OR_POLICY_MISMATCH');
 for(const k of ['source_uri','site_id','plot_id','treatment','soil_class','irrigation_schedule',
  'measurement_protocol','instrument_calibration_evidence','climate_series_ref',
  'fertilizer_and_residue_record','publication_metadata_status'])getStr(manifest[k],k);
 integer(manifest.season_year,'season_year');
 const start=utc(manifest.observation_start_utc),end=utc(manifest.observation_end_utc);
 if(end<=start||end-start>366n*86400n)fail('RAW_INVALID_WINDOW');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(csvBytes);
 if(text.includes('\r')||text.includes('\0')||!text.endsWith('\n')||text.startsWith('\ufeff'))
  fail('RAW_CSV_ENCODING_OR_NEWLINE');
 const lines=text.slice(0,-1).split('\n');
 if(lines[0]!==EXPECTED||lines.length<2||lines.length>10001)
  fail('RAW_CSV_HEADER_OR_ROWS');
 let last=start,weighted=0n,rowCount=0;
 for(const line of lines.slice(1)){
  const a=line.split(',');
  if(a.length!==4)fail('RAW_CSV_COLUMNS');
  const [from,to,value,qc]=a;
  if(qc!=='OBSERVED')fail('RAW_MISSING_OR_IMPUTED_FLUX_NOT_ALLOWED');
  const lo=utc(from),hi=utc(to);
  if(lo!==last)fail(lo<last?'RAW_OVERLAP_OR_REORDER':'RAW_GAP');
  if(hi<=lo||hi>end)fail('RAW_INTERVAL_OUT_OF_RANGE');
  if(hi-lo>7n*86400n)fail('RAW_SEGMENT_TOO_LONG');
  weighted+=rate(value)*(hi-lo);
  last=hi;rowCount++;
 }
 if(last!==end)fail('RAW_UNCOVERED_TAIL');
 // BigInt gives exact rational mg/m2; output rounding is explicitly 9 decimals half-away-from-zero.
 const mg=format(weighted,1000000n*86400n,9);
 const kg=format(weighted,1000000n*86400n*100n,9); // mg/m² to kg/ha = 0.01
 const missing=['instrument_calibration_evidence','climate_series_ref','fertilizer_and_residue_record']
  .filter(k=>manifest[k]==='UNKNOWN');
 return {
  schema:'naft-raw-replay-v1',status:BLOCKED,
  data_class:manifest.data_class,sha256_matches_supplied_manifest:true,
  digest_sha256:digest,record_count:rowCount,window_start_utc:manifest.observation_start_utc,
  window_end_utc:manifest.observation_end_utc,coverage:'FULL_EXPLICIT_INTERVALS_NO_GAP_FILL',
  integrated_mg_ch4_m2:mg,integrated_kg_ch4_ha:kg,
  environment_evidence_missing:missing,original_publisher_attested:false,
  conditions_independently_matched:false,measurement_uncertainty:null,
  statistical_confidence_interval:null,physical_model_reproduction:null,
  ag005_method_version_eligible:null,approved_jcredit_tco2e:null,
  residual_causal_allocation:null,
  notes:'Digest verifies input equality to manifest only; cannot attest publication or instrument truth.'
 };
}
