'use strict';
// NaFT Asia/MRV: bounded RESEARCH_ONLY comparisons; no official coefficients or credits.
var NAFT_ASIA_RESEARCH_DISCLAIMER='RESEARCH_ONLY: no AG-005, JCM, GX-ETS legal calculation or certified credits';
function naftAsiaFail(code){throw Error(code)}
function naftAsiaNum(v,k){if(typeof v!=='number'||!Number.isFinite(v)||v<0)naftAsiaFail('INVALID_QUANTITY:'+k);return v}
function naftAsiaText(v,k){if(typeof v!=='string'||!v.trim()||v.length>300)naftAsiaFail('MISSING_METADATA:'+k);return v}
function naftAsiaCh4Kg(v,b){v=naftAsiaNum(v,'value');if(b==='kg_CH4')return v;if(b==='kg_CH4_C')return v*16/12;naftAsiaFail('UNSUPPORTED_CH4_MASS_BASIS')}
function naftAsiaN2oKg(v,b){v=naftAsiaNum(v,'value');if(b==='kg_N2O')return v;if(b==='kg_N2O_N')return v*44/28;naftAsiaFail('UNSUPPORTED_N2O_MASS_BASIS')}
function naftAsiaPhysicalCompare(a,b){
 for(var side of [a,b]){
  if(!side||typeof side!=='object')naftAsiaFail('PHYSICAL_INPUT_REQUIRED');
  for(var k of ['assertion_id','field_id','country','gas','quantity_kind','area_unit','period_basis','period_id','stratum_id','water_regime','mass_basis','source_uri','methodology_id','data_status'])
    naftAsiaText(side[k],k);
  if(side.gas!=='CH4'||side.area_unit!=='ha'||side.quantity_kind!=='emission_factor')naftAsiaFail('PHYSICAL_GAS_AREA_OR_QUANTITY_UNSUPPORTED');
  if(!['cropping_season','crop_year'].includes(side.period_basis))naftAsiaFail('PHYSICAL_PERIOD_UNSUPPORTED');
  if(!['SYNTHETIC','RESEARCH_REFERENCE'].includes(side.data_status))naftAsiaFail('PHYSICAL_UNVERIFIED_SOURCE_STATUS');
  naftAsiaNum(side.value_kg_per_ha,'value_kg_per_ha');
 }
 for(var k of ['assertion_id','field_id','country','gas','quantity_kind','area_unit','period_basis','period_id','stratum_id','water_regime'])
   if(a[k]!==b[k])naftAsiaFail('PHYSICAL_CONTEXT_MISMATCH:'+k);
 var left=naftAsiaCh4Kg(a.value_kg_per_ha,a.mass_basis),right=naftAsiaCh4Kg(b.value_kg_per_ha,b.mass_basis);
 if(!Number.isFinite(left)||!Number.isFinite(right))naftAsiaFail('PHYSICAL_OVERFLOW');
 var delta=left-right;
 return {schema:'naft-asia-physical-parity-1',status:'RESEARCH_PHYSICAL_COMPARISON_ONLY',
  normalized_unit:'kg_CH4_per_ha_per_'+a.period_basis,normalized_left:left,normalized_right:right,delta_kg_ch4_per_ha:delta,
  numerically_equal_within_1e_9:Math.abs(delta)<=1e-9*Math.max(1,Math.abs(left),Math.abs(right)),
  left_method:a.methodology_id,right_method:b.methodology_id,
  methodology_equivalence_claimed:false,coefficient_transfer_allowed:false,jcredit_eligibility:null,certified_tco2e:null};
}
function naftAsiaRegulatoryFactorGate(factor,request){
 for(var x of [factor,request])if(!x||typeof x!=='object')naftAsiaFail('REGULATORY_CONTEXT_REQUIRED');
 for(var k of ['country','methodology_id','methodology_version','period_id']){
  naftAsiaText(factor[k],'factor_'+k);naftAsiaText(request[k],'request_'+k);
 }
 if(factor.country!==request.country)naftAsiaFail('CROSS_COUNTRY_FACTOR_TRANSFER_BLOCKED');
 if(factor.methodology_id!==request.methodology_id||factor.methodology_version!==request.methodology_version)
  naftAsiaFail('CROSS_METHODOLOGY_FACTOR_TRANSFER_BLOCKED');
 if(factor.period_id!==request.period_id)naftAsiaFail('CROSS_PERIOD_FACTOR_TRANSFER_BLOCKED');
 if(factor.status!=='SYNTHETIC'&&factor.status!=='RESEARCH_REFERENCE')
  naftAsiaFail('UNVERIFIED_OR_OFFICIAL_FACTOR_NOT_ACCEPTED_BY_RESEARCH_GATE');
 return {status:'CONFIG_REQUIRED',research_comparable_context:true,regulatory_factor_usable:false,approved_reduction_tco2e:null};
}
function naftAsiaIpcc2019Example(strata){
 if(!Array.isArray(strata)||strata.length!==5)naftAsiaFail('IPCC_EXPECTED_FIVE_REFERENCE_STRATA');
 var seen=new Set(),sum=0;
 for(var x of strata){
  naftAsiaText(x.id,'stratum_id');if(seen.has(x.id))naftAsiaFail('IPCC_DUPLICATE_STRATUM');seen.add(x.id);
  if(x.unit!=='kg_CH4_ha_day'||x.status!=='PUBLISHED_ROUNDED_REFERENCE')naftAsiaFail('IPCC_UNIT_OR_SCOPE_MISMATCH');
  var n=naftAsiaNum(x.harvested_area_ha_year,'area')*naftAsiaNum(x.daily_ef_kg_ch4_ha_day,'daily_EF')*naftAsiaNum(x.season_days,'days')/1e6;
  if(!Number.isFinite(n))naftAsiaFail('IPCC_OVERFLOW');sum+=n;
 }
 return {status:'PUBLISHED_ROUNDED_EXAMPLE_REPLAY',annual_gg_ch4:sum,
  published_2dp:Math.round((sum+Number.EPSILON)*100)/100,
  domain:'IPCC_2019_NATIONAL_INVENTORY',actual_japan_emissions:null,approved_jcredit_tco2e:null};
}
function naftAsiaPhAm004(input){
 if(!input||input.country!=='PH'||input.methodology_id!=='PH_AM004@1.0')naftAsiaFail('PH_ONLY_METHOD_TRANSFER_BLOCKED');
 if(input.data_status!=='SYNTHETIC')naftAsiaFail('PH_ONLY_SYNTHETIC_FORMULA_REPLAY');
 if(!Number.isSafeInteger(input.measurement_interval_years))naftAsiaFail('PH_INVALID_MEASUREMENT_INTERVAL');
 var rates={'DIRECT_MEASUREMENT:3':0.05,'DIRECT_MEASUREMENT:4':0.10,'DIRECT_MEASUREMENT:5':0.10,'COUNTRY_FACTOR_PLUS_MEASUREMENT:5':0.15};
 var key=input.approach+':'+input.measurement_interval_years;
 if(!Object.prototype.hasOwnProperty.call(rates,key))naftAsiaFail('PH_UNSUPPORTED_UNCERTAINTY_SCHEDULE');
 var gases=['CH4','N2O','PUMP_CO2'],re=input.reference_tco2e,pe=input.project_tco2e;
 for(var d of [re,pe]){
  if(!d||typeof d!=='object'||Object.keys(d).length!==3||gases.some(g=>!Object.prototype.hasOwnProperty.call(d,g)))naftAsiaFail('PH_MISSING_OR_EXTRA_GHG_COMPONENT');
  for(var gas of gases)naftAsiaNum(d[gas],gas);
 }
 for(var f of ['paired_water_regime','soil_stratum_recorded','fertilizer_n_recorded','preseason_water_recorded','pump_boundary_recorded','evidence_manifest_present'])
  if(!input.boundary||input.boundary[f]!==true)naftAsiaFail('PH_EVIDENCE_OR_BOUNDARY_REQUIRED:'+f);
 var before=gases.reduce((acc,g)=>acc+re[g]-pe[g],0),after=before*(1-rates[key]);
 if(!Number.isFinite(after))naftAsiaFail('PH_CALCULATION_OVERFLOW');
 return {schema:'naft-ph-am004-research-1',status:before<0?'NEGATIVE_NET_RESEARCH_ONLY':'SYNTHETIC_FORMULA_REPLAY',
  method:'PH_AM004@1.0',uncertainty_deduction:rates[key],research_net_before_tco2e:before,research_net_after_tco2e:after,
  gas_coverage:gases,approved_jcm_credits:null,approved_jcredit_credits:null,independently_verified_field_evidence:false};
}
function naftAsiaSeasonalAggregate(rows){
 if(!Array.isArray(rows)||!rows.length)naftAsiaFail('SEASON_DATA_REQUIRED');
 var first=rows[0],identity=['country','calendar_year','field_id','area_unit','gas','mass_basis'];
 for(var k of identity)naftAsiaText(first[k],k);
 if(first.area_unit!=='ha'||first.gas!=='CH4'||first.mass_basis!=='kg_CH4')naftAsiaFail('SEASON_SCOPE_UNSUPPORTED');
 var ids=new Set(),ref=0,proj=0;
 for(var x of rows){
  for(var k of identity)if(x[k]!==first[k])naftAsiaFail('SEASON_CONTEXT_MISMATCH:'+k);
  naftAsiaText(x.season_id,'season_id');if(ids.has(x.season_id))naftAsiaFail('SEASON_DUPLICATED');ids.add(x.season_id);
  var area=naftAsiaNum(x.area_ha,'area_ha');
  ref+=area*naftAsiaNum(x.reference_kg_ch4_ha_season,'reference');
  proj+=area*naftAsiaNum(x.project_kg_ch4_ha_season,'project');
 }
 if(!Number.isFinite(ref)||!Number.isFinite(proj))naftAsiaFail('SEASON_OVERFLOW');
 if(ref===0)naftAsiaFail('SEASON_ZERO_REFERENCE');
 return {status:'RESEARCH_WEIGHTED_ANNUAL_COMPARISON',calendar_year:first.calendar_year,
  baseline_kg_ch4:ref,project_kg_ch4:proj,reduction_percent:(ref-proj)/ref*100,
  derived_from_absolute_seasonal_amounts:true,official_jcredit_tco2e:null};
}
