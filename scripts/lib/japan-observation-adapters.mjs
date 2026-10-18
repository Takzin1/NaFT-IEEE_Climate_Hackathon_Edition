/* NaFT Japan/Monsoon Asia observation adapter registry. OFFLINE RESEARCH ONLY.
 * V2 does not change strict v1: observation provenance and credit eligibility remain unverified.
 */
import {createHash} from 'node:crypto';
import {utc} from './japan-raw-flux.mjs';

const FAIL=(message)=>{throw new Error(message)};
const DAY=86400n;
const SCALE=1000000n;
const MASS_MOLAR_G='16.04';
const ADAPTERS=Object.freeze({
  'INTERVAL_MG_CH4_M2_DAY_V1':Object.freeze({
    unit:'mg_CH4_m2_day',sampling_semantics:'INTERVAL_MEAN_FLUX_RATE',
    mass_basis:'CH4_MOLECULAR',max_seconds:604800n,exact_seconds:null
  }),
  'DAILY_G_CH4_M2_DAY_V1':Object.freeze({
    unit:'g_CH4_m2_day',sampling_semantics:'DAILY_INTERVAL_MEAN_FLUX_RATE',
    mass_basis:'CH4_MOLECULAR',max_seconds:DAY,exact_seconds:DAY
  }),
  'EDDY_NMOL_CH4_M2_S_V1':Object.freeze({
    unit:'nmol_CH4_m2_s',sampling_semantics:'EDDY_INTERVAL_MEAN_FLUX_RATE',
    mass_basis:'CH4_MOLECULAR',max_seconds:3600n,exact_seconds:null
  }),
  'EDDY_UMOL_CH4_M2_S_V1':Object.freeze({
    unit:'umol_CH4_m2_s',sampling_semantics:'EDDY_INTERVAL_MEAN_FLUX_RATE',
    mass_basis:'CH4_MOLECULAR',max_seconds:3600n,exact_seconds:null
  }),
  'DAILY_G_CH4_C_M2_DAY_V1':Object.freeze({
    unit:'g_CH4_C_m2_day',sampling_semantics:'DAILY_INTERVAL_MEAN_FLUX_RATE',
    mass_basis:'CH4_C',max_seconds:DAY,exact_seconds:DAY
  }),
});
export const observationAdapters=Object.freeze(
  Object.fromEntries(Object.entries(ADAPTERS).map(([id,a])=>[id,{unit:a.unit,
    sampling_semantics:a.sampling_semantics,mass_basis:a.mass_basis,max_seconds:String(a.max_seconds),
    exact_seconds:a.exact_seconds===null?null:String(a.exact_seconds)}])));

function digits(s,name,nullable=false){
 if(nullable&&s==='')return null;
 if(typeof s!=='string'||!/^[-]?(?:0|[1-9]\d{0,5})(?:\.\d{1,6})?$/.test(s))
  FAIL('OBS_INVALID_RATE:'+name);
 const neg=s[0]==='-',v=neg?s.slice(1):s,[integer,fraction='']=v.split('.');
 const result=BigInt(integer)*SCALE+BigInt(fraction.padEnd(6,'0')||'0');
 return neg?-result:result;
}
function gcd(a,b){a=a<0n?-a:a;b=b<0n?-b:b;while(b){const t=a%b;a=b;b=t}return a||1n;}
function plus(a,b){
 const den=a[1]*b[1],num=a[0]*b[1]+b[0]*a[1],g=gcd(num,den);
 return [num/g,den/g];
}
function fmt(r,places=9){
 const n=r[0]<0n?-r[0]:r[0],d=r[1],neg=r[0]<0n;
 const p=10n**BigInt(places);
 const rounded=(n*p*2n+d)/(2n*d);
 const digits=rounded.toString().padStart(places+1,'0');
 return (neg&&rounded?'−':'')+(places?digits.slice(0,-places)+'.'+digits.slice(-places):digits);
}
function signedFmt(r,places=9){
 return fmt(r,places).replace('−','-');
}
function productForAdapter(value,seconds,id){
 const v=digits(value,'flux');
 // All terms in mg CH4 / m², exact rationals with 6-decimal input.
 if(id==='INTERVAL_MG_CH4_M2_DAY_V1')return [v*seconds,SCALE*DAY];
 if(id==='DAILY_G_CH4_M2_DAY_V1')return [v*seconds*1000n,SCALE*DAY];
 if(id==='EDDY_UMOL_CH4_M2_S_V1')
  return [v*seconds*1604n,SCALE*100000n]; // µmol to mg CH4; ×1000 vs nmol
 if(id==='DAILY_G_CH4_C_M2_DAY_V1')
  return [v*seconds*4000n,SCALE*3n*DAY]; // g(CH4-C) ×16/12 ×1000mg/g
 if(id==='EDDY_NMOL_CH4_M2_S_V1'){
  // nmol/s * (16.04 g/mol) * 10^-6 mg/nmol * seconds.
  return [v*seconds*1604n,SCALE*100000000n];
 }
 FAIL('OBS_ADAPTER_UNSUPPORTED');
}
function validManifest(m,buf){
 if(!m||m.schema!=='naft-observation-series-v2')FAIL('OBS_SCHEMA_UNSUPPORTED');
 if(!Buffer.isBuffer(buf)||!buf.length||buf.length>2000000)FAIL('OBS_RAW_INPUT_SIZE');
 const hash=createHash('sha256').update(buf).digest('hex');
 if(!/^[0-9a-f]{64}$/.test(m.csv_sha256||'')||m.csv_sha256!==hash)
  FAIL('OBS_SHA256_MISMATCH');
 const adapter=ADAPTERS[m.adapter_id];
 if(!adapter||m.unit!==adapter.unit||m.sampling_semantics!==adapter.sampling_semantics)
  FAIL('OBS_UNIT_OR_ADAPTER_MISMATCH');
 if(!['JP','KR','TW','VN','PH','CN'].includes(m.country)||m.gas!=='CH4'||
    m.mass_basis!==adapter.mass_basis||m.gap_fill_policy!=='FORBID')
  FAIL('OBS_GAS_JURISDICTION_OR_GAP_POLICY');
 if(m.data_class!=='SYNTHETIC'&&m.data_class!=='USER_SUPPLIED_UNVERIFIED')
  FAIL('OBS_DATA_CLASS_UNSUPPORTED');
 if(m.original_publisher_bytes_verified!==false||m.conditions_independently_matched!==false||
   m.official_eligibility_verified!==false)FAIL('OBS_ATTESTATION_CANNOT_BE_SELF_ASSERTED');
 for(const key of ['source_uri','site_id','plot_id','treatment','measurement_method',
   'source_license_status','time_basis']){
  if(typeof m[key]!=='string'||!m[key].trim()||m[key].length>512)
   FAIL('OBS_REQUIRED_METADATA:'+key);
 }
 if(m.time_basis!=='UTC_EXPLICIT_INTERVALS')FAIL('OBS_TIME_SEMANTICS_UNSUPPORTED');
 if((m.adapter_id==='EDDY_NMOL_CH4_M2_S_V1'||m.adapter_id==='EDDY_UMOL_CH4_M2_S_V1')&&m.molar_mass_g_mol!==MASS_MOLAR_G)
  FAIL('OBS_MOLAR_MASS_NOT_PINNED');
 const start=utc(m.observation_start_utc),end=utc(m.observation_end_utc);
 if(end<=start||end-start>366n*DAY)FAIL('OBS_WINDOW_INVALID');
 return {hash,adapter,start,end};
}
export function replayObservationSeries(csvBytes,manifest){
 const {hash,adapter,start,end}=validManifest(manifest,csvBytes);
 let text;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(csvBytes);}
 catch{FAIL('OBS_UTF8_DECODE_ERROR');}
 if(text.charCodeAt(0)===65279||text.includes('\r')||text.includes('\0')||!text.endsWith('\n'))
  FAIL('OBS_ENCODING_OR_NEWLINE');
 const lines=text.slice(0,-1).split('\n');
 if(lines[0]!=='start_utc,end_utc,value,qc_status'||lines.length<2||lines.length>10001)
  FAIL('OBS_HEADER_OR_ROW_COUNT');
 let last=start,observed=0n,excluded=0n,unrepresented=0n,rateIntegral=[0n,1n];
 let totalRows=0,acceptedRows=0,excludedRows=0,imputedRows=0;
 for(const line of lines.slice(1)){
  const cells=line.split(',');
  if(cells.length!==4)FAIL('OBS_CSV_COLUMNS');
  const [begin,finish,value,qc]=cells;
  const a=utc(begin),b=utc(finish);
  if(a<last)FAIL('OBS_OVERLAP_REORDER_OR_DUPLICATE');
  if(a>=end||b>end||b<=a||b-a>adapter.max_seconds)
   FAIL('OBS_INTERVAL_INVALID');
  if(adapter.exact_seconds!==null&&b-a!==adapter.exact_seconds)
   FAIL('OBS_DAILY_INTERVAL_MUST_BE_24H');
  unrepresented+=a-last;
  const duration=b-a;
  if(qc==='OBSERVED_GOOD'||qc==='OBSERVED_ACCEPTABLE'){
   observed+=duration;acceptedRows++;
   rateIntegral=plus(rateIntegral,productForAdapter(value,duration,manifest.adapter_id));
  }else if(qc==='MISSING'||qc==='IMPUTED_RESEARCH'){
   if(value!=='')FAIL('OBS_EXCLUDED_ROW_VALUE_MUST_BE_EMPTY');
   excluded+=duration;excludedRows++;
   if(qc==='IMPUTED_RESEARCH')imputedRows++;
  }else FAIL('OBS_QC_UNKNOWN');
  last=b;totalRows++;
 }
 unrepresented+=end-last;
 const span=end-start;
 if(observed+excluded+unrepresented!==span)FAIL('OBS_COVERAGE_IDENTITY_FAILURE');
 const coverage=observed===0n?'NO_OBSERVATION':observed===span?'COMPLETE_OBSERVED':'PARTIAL_OBSERVED';
 const amount=observed===0n?null:signedFmt(rateIntegral,9);
 const kg=observed===0n?null:signedFmt([rateIntegral[0],rateIntegral[1]*100n],9);
 return {
  schema:'naft-observation-replay-v2',status:'RESEARCH_UNATTESTED',coverage_status:coverage,
  data_class:manifest.data_class,adapter_id:manifest.adapter_id,gas:'CH4',
  input_unit:manifest.unit,input_mass_basis:manifest.mass_basis,output_unit:'mg_CH4/m2_observed_intervals',
  observed_only_integral_mg_ch4_m2:amount,observed_only_integral_kg_ch4_ha:kg,
  full_window_total_mg_ch4_m2:coverage==='COMPLETE_OBSERVED'?amount:null,
  full_window_total_kg_ch4_ha:coverage==='COMPLETE_OBSERVED'?kg:null,
  observed_seconds:String(observed),excluded_qc_seconds:String(excluded),
  unrepresented_gap_seconds:String(unrepresented),window_seconds:String(span),
  measured_coverage_percent:signedFmt([observed*100n,span],6),
  record_count:totalRows,accepted_rows:acceptedRows,excluded_rows:excludedRows,
  research_imputed_rows_excluded:imputedRows,
  csv_digest_sha256:hash,checksum_matches_supplied_manifest:true,
  gap_fill_applied:false,official_japan_factor_applicable:null,certified_tco2e:null,
  publisher_bytes_independently_attested:false,environment_conditions_independently_verified:false,
  uncertainty_interval:null,causal_attribution:null,
  warning:'Partial observations are NOT full-period GHG emissions; hash match is NOT publisher attestation.'
 };
}
