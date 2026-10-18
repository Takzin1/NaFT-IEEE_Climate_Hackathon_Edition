/**
 * AG-005 Ver.3.3 USER-TRANSCRIBED research math. NOT verified source,
 * NOT Ver.3.5, NOT J-Credit eligibility or credit issuance.
 *
 * All arithmetic uses exact rationals; no unreviewed default coefficient.
 */
import {createHash} from 'node:crypto';
import {add,sub,mul,div,cmp,min,max,ceil,dec,repr,guardedValue} from './mrv-rational.mjs';
const STOP=code=>{throw Error(code);};
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const canon=v=>Array.isArray(v)?'['+v.map(canon).join(',')+']':
  obj(v)?'{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}':JSON.stringify(v===undefined?null:v);
const sha=v=>createHash('sha256').update(canon(v)).digest('hex');
const requireId=(x,code)=>{if(typeof x!=='string'||! /^[A-Za-z0-9_.:-]{1,96}$/.test(x))STOP(code);return x;};
const date=s=>{
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))STOP('AG_DATE_INVALID');
  const t=Date.parse(s+'T00:00:00.000Z');
  if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==s)STOP('AG_DATE_INVALID');
  return Math.floor(t/86400000);
};
const showDate=day=>new Date(day*86400000).toISOString().slice(0,10);
export function drainageClassFromAdjusted(adjusted){
  const v=guardedValue(adjusted,'0','100000','drainage_mm_day_adjusted');
  if(cmp(v,dec('7.5'))<0)return 'POOR_DRAINAGE';
  if(cmp(v,dec('12.5'))<0)return 'DAILY_DRAINAGE';
  return 'FOUR_HOUR_DRAINAGE';
}
export function classifyMeasuredDrainage(d, proof){
  const x=guardedValue(d,'0','100000','measured_drainage_mm_day');
  const mandatory=['dry_24h','intake_closed','outlet_closed','measurement_record',
    'date_and_conditions_documented'];
  if(!obj(proof)||!mandatory.every(k=>proof[k]===true))
    return {status:'EVIDENCE_REQUIRED',adjusted_mm_day:repr(mul(x,dec('1.22'))),
      drainage_class:null,missing:mandatory.filter(k=>!proof||proof[k]!==true)};
  const adjusted=mul(x,dec('1.22'));
  const label=cmp(adjusted,dec('7.5'))<0?'POOR_DRAINAGE':
    cmp(adjusted,dec('12.5'))<0?'DAILY_DRAINAGE':'FOUR_HOUR_DRAINAGE';
  return {status:'REFERENCE_CLASSIFICATION_ONLY',adjusted_mm_day:repr(adjusted),
    drainage_class:label,approved_measurement:false};
}
export function organicEFReference(factors,organic){
  if(!obj(factors)||factors.unit!=='kg_CH4_C_per_ha_year'||
     factors.factor_kind!=='SYNTHETIC'||!obj(organic))STOP('AG_FACTOR_UNIT_OR_SOURCE_UNSUPPORTED');
  const E0=guardedValue(factors.none,'0','1000000','E0'),
    Es=guardedValue(factors.straw,'0','1000000','Es'),
    Ec=guardedValue(factors.compost,'0','1000000','Ec');
  const w=guardedValue(organic.straw_percent,'0','100','straw_percent'),
    x=guardedValue(organic.compost_t_per_10a,'0','1000','compost_t_per_10a');
  const w90=dec('90'),one=dec('1');
  let v,branch;
  if(cmp(w,dec('0'))===0&&cmp(x,dec('0'))===0){v=E0;branch='NO_ORGANIC';}
  else if(cmp(x,dec('0'))===0) {
    v=cmp(w,w90)>=0?Es:add(E0,mul(sub(Es,E0),div(w,w90)));
    branch=cmp(w,w90)>=0?'STRAW_GE90':'STRAW_LT90';
  } else if(cmp(w,dec('0'))===0) {
    v=cmp(x,one)>=0?Ec:add(E0,mul(sub(Ec,E0),x));
    branch=cmp(x,one)>=0?'COMPOST_GE1':'COMPOST_LT1';
  }else {
    v=min(add(add(E0,mul(sub(Es,E0),div(min(w,w90),w90))),
      mul(sub(Ec,E0),min(x,one))),max(Es,Ec));
    branch='BOTH_CAPPED';
  }
  return {branch,ef:repr(v),ef_rational:v,
    review_required:cmp(w,w90)>0||cmp(x,one)>0,
    note:'User-transcribed V3.3 expression, not verified V3.5 formula'};
}
export function extendDaysReference(cycles,project,headingDate){
  if(!Array.isArray(cycles)||cycles.length<2||cycles.length>40||
    !obj(project))STOP('AG_HISTORY_INVALID');
  const years=new Set();
  let sum=0n;
  for(const c of cycles) {
    if(!obj(c)||!Number.isInteger(c.year)||c.year<1990||c.year>2100||
      !Number.isInteger(c.days)||c.days<1||c.days>90)STOP('AG_CROP_CYCLE_INVALID');
    years.add(c.year);sum+=BigInt(c.days);
  }
  if(years.size<2)STOP('AG_TWO_HISTORICAL_YEARS_REQUIRED');
  const start=date(project.start),end=date(project.end),heading=date(headingDate);
  if(end<start)STOP('AG_PROJECT_DATE_ORDER');
  if(![project.start,project.end,headingDate].every(x=>x.slice(0,4)===project.start.slice(0,4)))
    STOP('AG_CROSS_YEAR_NEEDS_REVIEW');
  const last=Math.min(end,heading-1);
  const actual=last<start?0:last-start+1;
  if(actual>90)STOP('AG_PROJECT_DAYS_ABNORMAL');
  const base=ceil(div({n:sum,d:1n},{n:BigInt(cycles.length),d:1n}));
  const increment=BigInt(actual)-base;
  return {historical_crop_count:cycles.length,historical_distinct_years:years.size,
    baseline_days_ceil:Number(base),project_days:actual,extension_days:Number(increment),
    heading_clipped_end:last<start?null:showDate(last),
    day_condition_met:increment>=7n,
    condition_code:increment>=7n?'DAY_CONDITION_MET_REFERENCE':'NOT_ELIGIBLE_BY_DAYS'};
}
export function allocateMergedAreaReference(newArea,parents){
  const total=guardedValue(newArea,'0.000000000001','1000000','new_ha');
  if(!Array.isArray(parents)||parents.length<2||parents.length>30)STOP('AG_MERGE_LINEAGE_REQUIRED');
  const seen=new Set();let sum=dec('0');
  for(const p of parents){
    if(!obj(p))STOP('AG_PARENT_INVALID');
    requireId(p.id,'AG_PARENT_ID');
    if(seen.has(p.id))STOP('AG_PARENT_DUPLICATE');
    seen.add(p.id);
    sum=add(sum,guardedValue(p.area_before_ha,'0.000000000001','1000000','parent_ha'));
  }
  return parents.map(p=>({id:p.id,allocated_area_ha:repr(div(mul(total,dec(p.area_before_ha)),sum)),
    requires_prior_cycle_mapping:true,requires_soil_change_review:true}));
}
export function referenceEmissions(area,efBL,efPJ,gwp){
  const a=guardedValue(area,'0.000000000001','1000000','area_ha');
  const bl=guardedValue(efBL,'0','1000000','efBL'),pj=guardedValue(efPJ,'0','1000000','efPJ');
  const g=guardedValue(gwp,'0.000000000001','1000','gwp');
  const conversion=div(mul(g,dec('16')),dec('12000'));
  const baseline=mul(mul(a,bl),conversion);
  const project=mul(mul(a,pj),conversion);
  return {em_bl:repr(baseline),em_pj:repr(project),er:repr(sub(baseline,project)),
    unit:'indicative_tCO2e_per_year',
    input_factor_unit:'kg_CH4_C_per_ha_year',
    ratio_ch4_per_carbon:'16/12',kg_to_t:'1/1000',
    official_aggregation_and_rounding_applied:false};
}
export function evaluateAg005V33Reference(input) {
  if(!obj(input)||input.schema!=='naft-ag005-v33-scenario-1')
    STOP('AG_V33_INPUT_SCHEMA_INVALID');
  requireId(input.scenario_id,'AG_SCENARIO_ID_INVALID');
  const method=input.method;
  if(!obj(method))STOP('AG_METHOD_REQUIRED');
  if(method.version==='3.5')return {
    schema:'naft-ag005-v33-reference-result-1',scenario_id:input.scenario_id,
    status:'UNSUPPORTED',method_status:'CONFIG_REQUIRED',reference_preview:null,
    certified_tco2e:null,credits_issued:null,certification:false,
    issues:['AG005_V35_ORIGINAL_SHA_AND_ADOPTION_UNVERIFIED'],
    from_input_sha256:sha(input)};
  if(method.version!=='3.3-reference'||method.official_verified!==false||
    method.official_source_sha256!==null)
    STOP('AG_V33_NOT_AN_OFFICIAL_PACK');
  if(input.origin!=='SYNTHETIC'&&input.origin!=='USER_SUPPLIED_UNVERIFIED')
    STOP('AG_ORIGIN_INVALID');
  if(!obj(input.inventory)||input.inventory.edition!=='SYNTHETIC'||
     input.inventory.original_sha256!==null||input.inventory.official_verified!==false)
    STOP('AG_OFFICIAL_INVENTORY_NOT_AVAILABLE');
  if(!obj(input.gwp)||input.gwp.status!=='SYNTHETIC'||input.gwp.source_verified!==false)
    STOP('AG_OFFICIAL_GWP_NOT_AVAILABLE');
  const gwp=guardedValue(input.gwp.value,'0.000000000001','1000','synthetic_gwp');
  if(!Array.isArray(input.segments)||input.segments.length<1||input.segments.length>100)
    STOP('AG_SEGMENTS_INVALID');
  const allIds=new Set(),outputs=[],issues=[];
  let sumBL=dec('0'),sumPJ=dec('0');
  for(const seg of input.segments){
    if(!obj(seg))STOP('AG_SEGMENT_INVALID');
    requireId(seg.id,'AG_FIELD_ID_INVALID');
    if(allIds.has(seg.id))STOP('AG_FIELD_DUPLICATE');
    allIds.add(seg.id);
    const dayResult=extendDaysReference(seg.historical_cycles,seg.project,seg.heading_date);
    const area=guardedValue(seg.area_ha,'0.000000000001','1000000','segment_area_ha');
    let organic=null,drainage=null,emissions=null;
    if(!obj(seg.evidence)||!['prior_cycles','water_log','field_area','heading_date',
      'organic_records','sustainability_review'].every(k=>seg.evidence[k]===true))
      issues.push({id:seg.id,code:'EVIDENCE_REQUIRED'});
    if(!dayResult.day_condition_met)issues.push({id:seg.id,code:'NOT_ELIGIBLE_BY_DAYS'});
    if(seg.land_merge===true&&
       (!Array.isArray(seg.parent_field_ids)||seg.parent_field_ids.length<2||
        !seg.evidence?.land_lineage_map))
      issues.push({id:seg.id,code:'LAND_LINEAGE_EVIDENCE_REQUIRED'});
    if(Array.isArray(seg.special_cases)&&seg.special_cases.length)
      issues.push({id:seg.id,code:'HUMAN_REVIEW_REQUIRED_SPECIAL_CASE'});
    if(seg.drainage_measurement) {
      if(!obj(seg.drainage_measurement))STOP('AG_DRAINAGE_MEASUREMENT_INVALID');
      drainage=classifyMeasuredDrainage(seg.drainage_measurement.value_mm_day,
        seg.drainage_measurement.proof);
      if(drainage.status==='EVIDENCE_REQUIRED')
        issues.push({id:seg.id,code:'DRAINAGE_EVIDENCE_REQUIRED'});
    }else issues.push({id:seg.id,code:'DRAINAGE_SELECTION_CONFIG_REQUIRED'});
    if(seg.organic&&seg.factors){
      organic=organicEFReference(seg.factors,seg.organic);
      if(organic.review_required)issues.push({id:seg.id,code:'HUMAN_REVIEW_REQUIRED_ORGANIC_LIMIT'});
      // Multiplying by 0.7 is an explicitly user-transcribed V3.3 REF branch,
      // not an independently verified production rule or official V3.5 rate.
      const ef=organic.ef_rational;
      const baseline=mul(mul(area,ef),div(mul(gwp,dec('16')),dec('12000')));
      const project=mul(baseline,dec('0.7'));
      emissions={em_bl:repr(baseline),em_pj:repr(project),er:repr(sub(baseline,project)),
        ratio:'0.7',ef_m0:repr(ef),ef_m1:repr(mul(ef,dec('0.7'))),
        unit:'indicative_tCO2e_per_year'};
    } else issues.push({id:seg.id,code:'OFFICIAL_COEFFICIENT_CONFIG_REQUIRED'});
    const allowed=!issues.some(i=>i.id===seg.id);
    if(allowed&&emissions){
      const factor=div(mul(gwp,dec('16')),dec('12000'));
      const baseline=mul(mul(area,organic.ef_rational),factor);
      sumBL=add(sumBL,baseline);
      sumPJ=add(sumPJ,mul(baseline,dec('0.7')));
      outputs.push({id:seg.id,days:dayResult,drainage,organic_branch:organic.branch,
        arithmetic_reference:emissions,evidence_gate:'PASSED_SELF_DECLARED_SYNTHETIC'});
    }else outputs.push({id:seg.id,days:dayResult,drainage,
      organic_branch:organic?.branch||null,arithmetic_reference:null,
      evidence_gate:'BLOCKED'});
  }
  const status=issues.some(x=>x.code==='NOT_ELIGIBLE_BY_DAYS')?'NOT_ELIGIBLE_BY_DAYS':
    issues.some(x=>x.code.includes('EVIDENCE_REQUIRED'))?'EVIDENCE_REQUIRED':
    issues.some(x=>x.code.includes('HUMAN_REVIEW'))?'HUMAN_REVIEW_REQUIRED':
    issues.length?'CONFIG_REQUIRED':'RESEARCH_PREVIEW_ONLY';
  const payload={schema:'naft-ag005-v33-reference-result-1',scenario_id:input.scenario_id,
    from_input_sha256:sha(input),method_version:'3.3-reference',
    rules_status:'REFERENCE_UNVERIFIED_ORIGINAL',status,issues,segments:outputs,
    preview_available:status==='RESEARCH_PREVIEW_ONLY',
    aggregate_reference:status==='RESEARCH_PREVIEW_ONLY'?{
      em_bl:repr(sumBL),em_pj:repr(sumPJ),er:repr(sub(sumBL,sumPJ)),
      formula:'sum(area * (E0/Eorganic - 0.7 * E0/Eorganic) * (16/12) * illustrative_GWP / 1000)',
      unit:'indicative_tCO2e_per_year',official_rounding_applied:false}:null,
    certified_tco2e:null,credits_issued:null,certification:false,
    gx_ets_combination_allowed:false,onchain_writes:false};
  return {...payload,report_sha256:sha(payload)};
}
const impactKeys={
  method_version:i=>i.method,
  inventory_edition:i=>i.inventory,
  factor_year:i=>i.factor_year,
  gwp_version:i=>i.gwp,
  organic_material:i=>i.segments?.map(s=>s.organic),
  drainage_measurement:i=>i.segments?.map(s=>s.drainage_measurement),
  midseason_dates:i=>i.segments?.map(s=>({historical_cycles:s.historical_cycles,project:s.project,heading_date:s.heading_date})),
  'field_geometry/lineage':i=>i.segments?.map(s=>({id:s.id,area_ha:s.area_ha,land_merge:s.land_merge,parent_field_ids:s.parent_field_ids})),
  raw_evidence_bytes:i=>i.segments?.map(s=>s.evidence),
  human_review_decision:i=>i.segments?.map(s=>s.human_review_decision)
};
export function compareAg005ReferenceDependencies(oldInput,newInput) {
  if(oldInput?.scenario_id!==newInput?.scenario_id)STOP('AG_SCENARIO_CHANGED');
  const changed=Object.entries(impactKeys).filter(([,fn])=>canon(fn(oldInput))!==canon(fn(newInput))).map(([name])=>name);
  return {status:changed.length?'REVERIFY_REQUIRED':'NO_DEPENDENCY_CHANGE',
    changed_dependencies:changed,automated_official_eligibility:false,
    certification:false,old_sha256:sha(oldInput),new_sha256:sha(newInput)};
}

/** Source-bound replay refuses forged report fields even after re-hashing. */
export function verifyAg005V33ReferenceReport(input,report){
  if(!obj(report)||typeof report.report_sha256!=='string')STOP('AG_REPORT_INVALID');
  const {report_sha256,...body}=report;
  if(sha(body)!==report_sha256)STOP('AG_REPORT_DIGEST_MISMATCH');
  if(canon(evaluateAg005V33Reference(input))!==canon(report))
    STOP('AG_SOURCE_BOUND_REPLAY_MISMATCH');
  return {verified:true,report_sha256};
}
