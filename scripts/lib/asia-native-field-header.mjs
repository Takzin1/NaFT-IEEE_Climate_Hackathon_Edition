// Scientific native-file header contracts from publisher-md5-matched ephemeral ZIP/CSV inspection.
// RESEARCH-ONLY. Header matching is not publisher attestation, measurement QC or AG-005 approval.
const STOP=(msg)=>{throw Error(msg)};
const KR=['DAT','tavg','course_type','ch4_flux','rain_mm'];
const CN_DAILY=['Year','DOY','Month','day','NEE-gC/m2/day','Re-gC/m2/day',
 'GPP-gC/m2/day','CH4-gC/m2/day'];
export function nativeHeaderGate(sourceId,header,request={}){
 if(!Array.isArray(header)||header.some(x=>typeof x!=='string'))STOP('NATIVE_HEADER_NOT_ARRAY');
 if(sourceId==='KR_GIMJE_DAILY_2022_2024'){
  if(header.length!==KR.length||KR.some((x,i)=>header[i]!==x))
   STOP('KR_GIMJE_UNVERIFIED_HEADER');
  return {status:'HEADER_CLASSIFIED_NOT_MAPPED',source_id:sourceId,
   input_gas:'CH4',rate_column:'ch4_flux',rate_unit_from_repository_description:'g_CH4_m2_day',
   time_basis:'DAT_OFFSET_NOT_CALENDAR_DATE',native_qc_column_present:false,
   missing_requirements:['VERIFIED_TRANSPLANTING_DATE_BY_FIELD','DAT_TIME_ALIGNMENT',
      'SOURCE_QC_AND_CALIBRATION_REVIEW','WATER_REGIME_MAPPING'],
   eligible_for_automatic_replay:false,scientifically_matched:false,certified_tco2e:null};
 }
 if(sourceId==='CN_RICE_EDDY_EAST_2023'){
  if(!CN_DAILY.every((x,i)=>header[i]===x))
   STOP('CN_CH4_CARBON_HEADER_NOT_VERIFIED');
  return {status:'CARBON_MASS_BASIS_REQUIRES_EXPLICIT_CONVERSION',
   source_id:sourceId,rate_column:'CH4-gC/m2/day',gas:'CH4',
   mass_basis:'CH4_C',source_unit:'g_CH4_C_m2_day',
   convert_to_molecular_ch4:'value_gC × (16/12) × 1000 = mg_CH4/m2/day',
   time_basis:'YEAR_AND_DOY_NOT_UTC_INTERVAL',
   missing_requirements:['ORIGINAL_MEASUREMENT_METHOD_REVIEW','DOY_CALENDAR_CHECK',
      'TIMEZONE_AND_INTERVAL_SUPPORT','SOURCE_QC_REVIEW','GWP_OR_REGULATORY_CONTEXT'],
   eligible_for_automatic_replay:false,scientifically_matched:false,certified_tco2e:null};
 }
 STOP('UNREGISTERED_NATIVE_SOURCE');
}
function decimalToScaled(x){
 if(typeof x!=='string'||!/^[-]?(?:0|[1-9]\d{0,5})(?:\.\d{1,6})?$/.test(x))
  STOP('CH4_CARBON_INVALID_DECIMAL');
 const negative=x[0]==='-',raw=negative?x.slice(1):x,[n,f='']=raw.split('.');
 let whole=BigInt(n)*1000000n+BigInt(f.padEnd(6,'0')||'0');
 return negative?-whole:whole;
}
function outFixed(num,den,places=9){
 const negative=num<0n,abs=negative?-num:num,scale=10n**BigInt(places);
 const r=(abs*scale*2n+den)/(2n*den),str=r.toString().padStart(places+1,'0');
 return (negative&&r>0n?'-':'')+str.slice(0,-places)+'.'+str.slice(-places);
}
export function syntheticCarbonToMethaneResearch(amountGC){
 // g(CH4-C) -> mg(CH4) == gC × 16/12 × 1000; exact rationals before final rounding.
 const carbon=decimalToScaled(amountGC),numerator=carbon*4000n,denominator=3000000n;
 return {source_mass_basis:'CH4_C',requested_mass_basis:'CH4_MOLECULAR',
  input_g_ch4_c_per_m2_day:amountGC,
  output_mg_ch4_per_m2_day:outFixed(numerator,denominator),
  status:'SYNTHETIC_UNIT_CONVERSION_ONLY',actual_source_flux_replayed:false,
  official_jcredit_eligibility:null};
}
