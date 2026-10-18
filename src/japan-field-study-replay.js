'use strict';
/* Published measured aggregates only: no raw time-series, no AG-005 credits.
   JS BigInt fixed-point oracle compared with independent Python Decimal. */
const NAFT_JP_OBS_SCALE=1000000n;
function naftJpStop(code){throw Error(code)}
function naftJpScaled(value){
 if(typeof value!=='string'||! /^-?(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/.test(value)||value.length>36)
  naftJpStop('OBS_INVALID_DECIMAL');
 const neg=value[0]==='-',raw=neg?value.slice(1):value;
 const parts=raw.split('.');
 const n=BigInt(parts[0])*NAFT_JP_OBS_SCALE+BigInt((parts[1]||'').padEnd(6,'0'));
 return neg?-n:n;
}
function naftJpFormatScaled(n){
 let sign=n<0n?'-':'',z=n<0n?-n:n;
 const frac=(z%NAFT_JP_OBS_SCALE).toString().padStart(6,'0').replace(/0+$/,'');
 return sign+(z/NAFT_JP_OBS_SCALE).toString()+(frac?'.'+frac:'');
}
function naftJpRatio(numerator,denominator,decimalPlaces=6){
 if(!denominator)naftJpStop('OBS_ZERO_DENOMINATOR');
 const places=10n**BigInt(decimalPlaces);
 let n=numerator*places,d=denominator,negative=(n<0n)!==(d<0n);
 if(n<0n)n=-n;if(d<0n)d=-d;
 const rounded=(2n*n+d)/(2n*d);
 const output=rounded.toString().padStart(decimalPlaces+1,'0');
 const value=decimalPlaces?output.slice(0,-decimalPlaces)+'.'+output.slice(-decimalPlaces):output;
 return (negative?'-':'')+value;
}
const NAFT_JP_PUBLISHED={
 YAGI_1996:{'1991':['14.8','8.63'],'1993':['9.49','5.18']},
 NISHIMURA_2004:{
  CH4:['mg_CH4_m2','3180','-51','3128','1'],
  N2O:['mg_N2O_N_m2','2.6','57.7','60.2','0.1']}
};
function naftJpStudy(d,id,doi){
 if(!d||d.schema!=='naft-jp-original-published-observation-1'||
  d.published_reported_aggregates_not_raw_measurements!==true||
  d.source_file_integrity!=='ORIGINAL_FULLTEXT_BYTES_NOT_RETRIEVED_OR_HASHED'||
  !Array.isArray(d.studies)||d.studies.length!==2)naftJpStop('OBS_RESEARCH_SOURCE_SCHEMA_INVALID');
 const st=d.studies.filter(s=>s.id===id);
 if(st.length!==1||st[0].doi!==doi||st[0].url!=='https://doi.org/'+doi||
   st[0].data_kind!=='PEER_REVIEWED_PUBLISHED_MEASURED_AGGREGATES')
    naftJpStop('OBS_SOURCE_ID_OR_DOI_MISMATCH');
 return st[0];
}
function naftJpYagiReplay(d){
 const s=naftJpStudy(d,'YAGI_1996','10.1029/96GB00517');
 if(s.unit!=='g_CH4_m2_cropping_season'||s.site_id!=='YAGI_EXPERIMENTAL_JAPAN_FIELD'||
  s.environment?.match_verified!==false||!Array.isArray(s.contrasts)||
  s.contrasts.length!==2)naftJpStop('YAGI_EXPERIMENT_SCOPE_INVALID');
 const seen=new Set();
 const results=s.contrasts.map(row=>{
  if(!row||![1991,1993].includes(row.year)||seen.has(row.year)||
   row.baseline_regime!=='CONTINUOUS_FLOOD'||
   row.alternative_regime!=='INTERMITTENT_DRAINAGE'||
   row.raw_daily_measurements_available!==false)naftJpStop('YAGI_PAIRED_YEAR_OR_TREATMENT_MISMATCH');
  seen.add(row.year);
  const pinned=NAFT_JP_PUBLISHED.YAGI_1996[String(row.year)];
  if(row.baseline_g_ch4_m2!==pinned[0]||row.alternative_g_ch4_m2!==pinned[1])
    naftJpStop('YAGI_PUBLISHED_OBSERVATION_MUTATED');
  const baseline=naftJpScaled(row.baseline_g_ch4_m2),alternative=naftJpScaled(row.alternative_g_ch4_m2);
  const contrast=baseline-alternative;
  return {
   calendar_year:row.year,
   crop_cycle:'REPORTED_CROPPING_SEASON',
   comparison:'CONTINUOUS_FLOOD_VS_INTERMITTENT_DRAINAGE_SAME_YEAR',
   baseline_g_ch4_m2:naftJpFormatScaled(baseline),
   alternative_g_ch4_m2:naftJpFormatScaled(alternative),
   within_year_contrast_g_ch4_m2:naftJpFormatScaled(contrast),
   within_year_contrast_kg_ch4_ha:naftJpFormatScaled(contrast*10n),
   relative_contrast_percent:naftJpRatio(contrast*100n,baseline),
   environment_attribution_percent:null,
   model_error_percent:null,
   measured_daily_flux_recreated:false
  };
 });
 if(seen.size!==2)naftJpStop('YAGI_REQUIRED_YEARS_MISSING');
 return {status:'PUBLISHED_OBSERVATION_AGGREGATE_REPLAY_ONLY',study:'YAGI_1996',
   source_doi:s.doi,measurements_are_original_paper_reported:true,
   original_individual_measurements_obtained:false,
   controls_verified_by:'same-site same-year published experimental design, not independent environmental reconstruction',
   cross_year_comparison_prohibited:true,results,official_jcredit_credits:null};
}
function naftJpNishimuraReplay(d){
 const s=naftJpStudy(d,'NISHIMURA_2004','10.1029/2003GB002207');
 if(s.year!==2002||s.environment?.crop_period_start!=='2002-05-09'||
  s.environment?.crop_period_end!=='2002-09-24'||
  s.environment?.environment_match_verified!==false||
  s.environment?.raw_2hour_chamber_measurements_available!==false||
  !Array.isArray(s.cumulative)||s.cumulative.length!==2)
  naftJpStop('NISHIMURA_PERIOD_OR_OBSERVATION_SCOPE_INVALID');
 const seen=new Set();
 const results=s.cumulative.map(row=>{
  if(!row||!['CH4','N2O'].includes(row.gas)||seen.has(row.gas))
    naftJpStop('NISHIMURA_GAS_DUPLICATED_OR_INVALID');
  seen.add(row.gas);
  const pinned=NAFT_JP_PUBLISHED.NISHIMURA_2004[row.gas];
  for(const [i,key] of ['mass_basis','crop_period','fallow_period','annual','printed_resolution_mg_m2'].entries())
   if(row[key]!==pinned[i])naftJpStop('NISHIMURA_PUBLISHED_MEAN_MUTATED:'+key);
  const crop=naftJpScaled(row.crop_period),fallow=naftJpScaled(row.fallow_period);
  const annual=naftJpScaled(row.annual),sum=crop+fallow,residual=annual-sum;
  // Each of three displayed values has half-a-print-unit rounding error.
  const printedTolerance=naftJpScaled(row.printed_resolution_mg_m2)*3n/2n;
  if((residual<0n?-residual:residual)>printedTolerance)
    naftJpStop('NISHIMURA_CUMULATIVE_OUTSIDE_PRINTED_RESOLUTION');
  const output={gas:row.gas,mass_basis:row.mass_basis,
    crop_period_mg_m2:naftJpFormatScaled(crop),fallow_period_mg_m2:naftJpFormatScaled(fallow),
    independently_summed_mg_m2:naftJpFormatScaled(sum),reported_annual_mg_m2:naftJpFormatScaled(annual),
    reported_minus_summed_mg_m2:naftJpFormatScaled(residual),
    rounding_bound_mg_m2:naftJpFormatScaled(printedTolerance),
    display_resolution_compatible:true,discrepancy_cause_verified:false,
    period_accounting_not_causal_attribution:true,
    printed_sd_not_independent_standard_error:true,
    daily_time_series_reproduced:false,certified_tco2e:null};
  const annualKgOfReportedSpecies=naftJpFormatScaled(annual/100n); // mg/m² -> 0.01 kg/ha
  output.reported_annual_kg_basis_ha=annualKgOfReportedSpecies;
  if(row.gas==='N2O')output.reported_annual_kg_n2o_ha=
    naftJpFormatScaled(annual*44n/2800n); // (mg N/m²)*0.01*(44/28)
  return output;
 });
 if(seen.size!==2)naftJpStop('NISHIMURA_REQUIRED_GASES_MISSING');
 return {status:'PUBLISHED_OBSERVATION_PERIOD_ACCOUNTING_ONLY',
  study:'NISHIMURA_2004',source_doi:s.doi,year:2002,results,
  independent_field_source_confirmed:false,official_jcredit_credits:null};
}
function naftJpModelResidual(d,x){
 const replay=naftJpYagiReplay(d);
 if(!x||x.study!=='YAGI_1996'||![1991,1993].includes(x.year)||
  x.site_id!=='YAGI_EXPERIMENTAL_JAPAN_FIELD'||
  x.crop_cycle!=='REPORTED_CROPPING_SEASON'||
  !['CONTINUOUS_FLOOD','INTERMITTENT_DRAINAGE'].includes(x.water_regime)||
  x.mass_basis!=='g_CH4_m2'||
  x.attributed_components!==undefined&&(!Array.isArray(x.attributed_components)||x.attributed_components.length!==0))
  naftJpStop('MODEL_CONTEXT_OR_CAUSAL_ALLOCATION_UNSUPPORTED');
 // The original daily weather/soil inputs are not published here; never silently certify matching.
 if(x.environment_validation!=='NOT_INDEPENDENTLY_MATCHED')naftJpStop('MODEL_ENVIRONMENT_MATCH_UNVERIFIED');
 const r=replay.results.find(y=>y.calendar_year===x.year);
 const actual=x.water_regime==='CONTINUOUS_FLOOD'?r.baseline_g_ch4_m2:r.alternative_g_ch4_m2;
 const observed=naftJpScaled(actual),predicted=naftJpScaled(x.predicted_g_ch4_m2);
 if(predicted<0n)naftJpStop('MODEL_NEGATIVE_EMISSION_NOT_SUPPORTED');
 const difference=predicted-observed;
 return {status:'UNATTRIBUTED_MODEL_VS_AGGREGATE_DIFFERENCE',
  year:x.year,water_regime:x.water_regime,
  published_observed_g_ch4_m2:naftJpFormatScaled(observed),
  modelled_g_ch4_m2:naftJpFormatScaled(predicted),
  model_minus_observed_g_ch4_m2:naftJpFormatScaled(difference),
  allocated_mechanism_components:[],
  unallocated_difference_g_ch4_m2:naftJpFormatScaled(difference),
  environment_component:null,measurement_component:null,model_component:null,
  quantitative_causal_decomposition_allowed:false,
  status_reason:'No matched raw daily temperature, water depth, soil redox and flux data; do not attribute residual percentage to mechanisms.',
  official_jcredit_credits:null};
}


// Conditional two-factor accounting, not causal decomposition.
// Only synthetic, fully matched context is allowed; primary observations need independently attested raw series.
const NAFT_JP_CONTEXT_REQUIRED=['site_id','calendar_year','crop_cycle','treatment_regime',
 'measurement_start','measurement_end','soil_class','irrigation_schedule','organic_management',
 'fertilizer_schedule','flux_measurement_method','climate_record_id','gas','mass_basis','plot_lineage'];
function naftJpSyntheticAttribution(x){
 if(!x||x.data_status!=='SYNTHETIC'){
  return {status:'BLOCKED_PRIMARY_ENVIRONMENT_UNVERIFIED',area_contribution_kg_ch4:null,
   rate_contribution_kg_ch4:null,causal_attribution:null,original_raw_measurement_verified:false};
 }
 const obs=x.observed,pred=x.predicted,missing=[],mismatched=[];
 for(const k of NAFT_JP_CONTEXT_REQUIRED){
  const a=obs&&obs.context&&obs.context[k],b=pred&&pred.context&&pred.context[k];
  if(typeof a!=='string'||!a||a==='UNKNOWN'||typeof b!=='string'||!b||b==='UNKNOWN')missing.push(k);
  else if(a!==b)mismatched.push(k);
 }
 if(missing.length||mismatched.length)return {status:'BLOCKED_CONTEXT_MISMATCH',
  missing_context:missing,mismatched_context:mismatched,
  area_contribution_kg_ch4:null,rate_contribution_kg_ch4:null,
  causal_attribution:null,original_raw_measurement_verified:false};
 if(obs.context.gas!=='CH4'||obs.context.mass_basis!=='kg_CH4_per_ha_period')
  naftJpStop('ACCOUNTING_UNIT_MISMATCH');
 const ao=naftJpScaled(obs.area_ha),ap=naftJpScaled(pred.area_ha);
 const ro=naftJpScaled(obs.rate_kg_ch4_ha),rp=naftJpScaled(pred.rate_kg_ch4_ha);
 if(ao<=0n||ap<=0n)naftJpStop('ACCOUNTING_NONPOSITIVE_AREA');
 // Scale 10^6; assignment of last scaled digit to rate factor preserves exact arithmetic identity.
 const total=(ao*ro-ap*rp)/NAFT_JP_OBS_SCALE;
 const area=((ao-ap)*(ro+rp))/(2n*NAFT_JP_OBS_SCALE);
 const rate=total-area;
 return {status:'SYNTHETIC_ACCOUNTING_NOT_CAUSAL',
  total_difference_kg_ch4:naftJpFormatScaled(total),
  area_contribution_kg_ch4:naftJpFormatScaled(area),
  rate_contribution_kg_ch4:naftJpFormatScaled(rate),
  rounding_remainder_kg_ch4:'0',causal_attribution:null,
  original_raw_measurement_verified:false,field_environment_recreated:false,
  formula:'Delta_area=(Ao-Ap)(ro+rp)/2; Delta_rate=(ro-rp)(Ao+Ap)/2',
  numeric_parity_preserved:true};
}
