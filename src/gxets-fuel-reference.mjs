/**
 * GX-ETS RESEARCH-ONLY fuel combustion formula, separate accounting domain.
 * No published approved emission factors, company boundary or verification.
 * Unit-tagged exact rational inputs; electricity is NEVER silently added.
 */
import {createHash} from 'node:crypto';
import {dec,guardedValue,mul,div,add,repr} from './mrv-rational.mjs';
const error=code=>{throw Error(code);};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':
 obj(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const sha=v=>createHash('sha256').update(canonical(v)).digest('hex');
const validId=(v,c)=>{if(typeof v!=='string'||! /^[A-Za-z0-9_.:-]{1,96}$/.test(v))error(c);};
const supportedSource=['FUEL_COMBUSTION','INDUSTRIAL_PROCESS','REDUCTANT','BYPRODUCT_FUEL',
  'SCOPE_BOUNDARY_CHANGE','PURCHASED_ELECTRICITY'];
export function gxFuelResearch(input) {
  if(!obj(input)||input.schema!=='naft-gxets-fuel-reference-1')
    error('GX_SCHEMA_INVALID');
  validId(input.entity_id,'GX_ENTITY_ID_INVALID');
  if(!obj(input.boundary)||!['UNCERTIFIED_FIXED','REVIEW_REQUIRED'].includes(input.boundary.status))
    error('GX_BOUNDARY_STATUS_REQUIRED');
  if(!Array.isArray(input.sources)||input.sources.length<1||input.sources.length>100)
    error('GX_SOURCES_REQUIRED');
  let sum=dec('0'),blocked=[],results=[],ids=new Set();
  for(const s of input.sources){
    if(!obj(s)||!supportedSource.includes(s.type))error('GX_SOURCE_KIND_INVALID');
    validId(s.id,'GX_SOURCE_ID_INVALID');
    if(ids.has(s.id))error('GX_DUPLICATE_SOURCE');
    ids.add(s.id);
    if(s.type!=='FUEL_COMBUSTION'){
      blocked.push({id:s.id,code:s.type==='PURCHASED_ELECTRICITY'?
        'GX_PURCHASED_POWER_NOT_DIRECT_FUEL_CO2':'GX_SOURCE_SPECIFIC_RULE_MISSING'});
      results.push({id:s.id,type:s.type,status:'UNSUPPORTED',tco2_reference:null});
      continue;
    }
    if(s.scope!=='DIRECT_CO2')error('GX_FUEL_SCOPE_MUST_BE_DIRECT_CO2');
    if(!obj(s.fuel)||!obj(s.heat)||!obj(s.carbon))
      error('GX_SOURCE_INPUT_MISSING');
    if(typeof s.fuel.unit!=='string'||!['t','kl','1000m3'].includes(s.fuel.unit))
      error('GX_FUEL_UNIT_INVALID');
    if(s.heat.unit!=='GJ/'+s.fuel.unit)error('GX_HEAT_UNIT_MISMATCH');
    if(s.carbon.unit!=='tC/GJ')error('GX_CARBON_UNIT_MISMATCH');
    if(!obj(s.source)||s.source.status!=='SYNTHETIC'||
      s.source.approved_factors_verified!==false)
      error('GX_SOURCE_COEFFICIENTS_NOT_VERIFIED');
    const amount=guardedValue(s.fuel.amount,'0','10000000000','fuel_quantity');
    const heat=guardedValue(s.heat.value,'0','100000','heating_value');
    const carbon=guardedValue(s.carbon.value,'0','100','carbon_factor');
    const tco2=mul(mul(mul(amount,heat),carbon),div(dec('44'),dec('12')));
    const evidence= s.evidence;
    if(!obj(evidence)||evidence.activity_record!==true||
      evidence.fuel_type_verified!==true||
      evidence.unit_conversion_verified!==true) {
      blocked.push({id:s.id,code:'GX_FUEL_EVIDENCE_REQUIRED'});
      results.push({id:s.id,type:s.type,status:'EVIDENCE_REQUIRED',tco2_reference:null});
      continue;
    }
    if(input.boundary.status==='REVIEW_REQUIRED'){
      blocked.push({id:s.id,code:'GX_ORGANIZATIONAL_BOUNDARY_REVIEW_REQUIRED'});
      results.push({id:s.id,type:s.type,status:'HUMAN_REVIEW_REQUIRED',tco2_reference:null});
      continue;
    }
    sum=add(sum,tco2);
    results.push({id:s.id,type:s.type,status:'RESEARCH_PREVIEW_ONLY',tco2_reference:repr(tco2),
      calculation_unit:'indicative_tCO2_direct_fuel',
      formula:'Q_fuel*HV*(tC/GJ)*(44/12)'});
  }
  const payload={
    schema:'naft-gxets-fuel-reference-result-1',entity_id:input.entity_id,
    origin:'SYNTHETIC_UNVERIFIED',source_input_sha256:sha(input),
    calculation_domain:'GX_ETS_DIRECT_FUEL_CO2_ONLY',
    unrelated_jcredit_amounts_excluded:true,purchased_electricity_excluded:true,
    results,issues:blocked,
    // Do not present a sum when ANY source in the requested inventory is unhandled.
    aggregate_reference:blocked.length?null:repr(sum),
    status:blocked.length?'UNSUPPORTED_OR_REVIEW_REQUIRED':'RESEARCH_PREVIEW_ONLY',
    verified_reportable_emissions_tco2:null,allowances:null,credit_surrenders:null,
    formal_verification:false,registered_checker_attestation:false,
    source_factor_and_boundary_review_missing:true
  };
  return {...payload,report_sha256:sha(payload)};
}
