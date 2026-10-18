import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {referenceOrganicEF,referenceDrainageClass,referenceMidseasonEligibility,
  referenceAreaAllocation,referenceCarbonCalculation,referenceFactorSelector,
  ag005DependencyDiff} from '../src/ag005-v33-reference-math.mjs';
import {evaluateGxEtsFuel,compareGxEtsBoundary} from '../src/gxets-fuel-research.mjs';

const packSource=fs.readFileSync('src/methodology-packs.js','utf8');
assert.match(packSource,/methodology_version:'3.5'/);
const locked=packSource.slice(packSource.indexOf('methodology_version:\'3.5\''),packSource.indexOf('methodology_version: \'3.1-reference\''));
for(const term of ["status:'CONFIG_REQUIRED'","original_sha256:null",
 'official_effective_from:null','rounding_spec:null','certification_allowed:false',
 "calculation_spec:{operation:'UNSUPPORTED'"])assert.ok(locked.includes(term),term+' fail closed');
const EF={none:'100',straw:'200',compost:'150',unit:'kg_CH4_C_per_ha_year',provenance:'SYNTHETIC'};
const organic=(w,x)=>referenceOrganicEF(EF,{straw_percent:String(w),compost_t_per_10a:String(x)});
const amt=r=>r.ef_ch4_c_kg_ha_year.decimal;
assert.equal(amt(organic(0,0)),'100','AG-ORG none');
assert.equal(amt(organic(45,0)),'150','AG-ORG partial straw w/90');
assert.equal(amt(organic(0,.5)),'125','AG-ORG partial compost');
assert.equal(amt(organic(89,0)),'198.888888889','AG-ORG-01 boundary 89');
assert.equal(amt(organic(90,0)),'200','AG-ORG-02 full straw');
assert.equal(amt(organic(90,1)),'200','AG-ORG-03 both capped');
assert.equal(organic(90,1).branch,'STRAW_COMPOST_CAPPED');
assert.equal(amt(organic(100,5)),'200','AG-ORG-04 capped');
assert.equal(organic(100,5).status,'HUMAN_REVIEW_REQUIRED','over-cap inputs flagged');
assert.throws(()=>organic(101,0),/AG005_ORGANIC_PERCENT_INVALID/);
assert.throws(()=>organic(-1,0),/AG005_ORGANIC_PERCENT_INVALID/);
assert.throws(()=>organic(0,-1),/AG005_COMPOST_TON_10A_INVALID/);
assert.throws(()=>referenceOrganicEF({...EF,unit:'kg_CH4_per_ha_season'},{straw_percent:45,compost_t_per_10a:0}),/AG005_FACTOR_UNIT_OR_PROVENANCE_UNVERIFIED/);

const d=(calibrated,all=true)=>referenceDrainageClass({
  observed_mm_day:String(calibrated/1.22),
  evidence:all?{no_rain_24h:true,inlet_closed:true,outlet_closed:true,
    measurement_record:true,objective_evidence:true}:{}
});
const raw=(v)=>referenceDrainageClass({observed_mm_day:v,evidence:{
  no_rain_24h:true,inlet_closed:true,outlet_closed:true,measurement_record:true,objective_evidence:true
}});
assert.equal(raw('6.14672131147541').class_if_admissible,'POOR_DRAINAGE','AG-DRN-01');
assert.equal(raw('6.147540983606558').class_if_admissible,'POOR_DRAINAGE','below exact 7.5');
assert.equal(raw('6.147540983606558').status,'REFERENCE_ONLY');
assert.equal(raw('6.147540983606558').selected_official_class,null);
assert.equal(raw('6.147540983606558').fallback_rule.startsWith('CONFIG_REQUIRED'),true);
assert.equal(raw('6.147540983606558').corrected_mm_day.decimal,'7.499999999');
assert.equal(raw('6.147540983606557377049180327868852459016').class_if_admissible,'POOR_DRAINAGE','true below threshold');
const drainageThreshold=(s)=>referenceDrainageClass({observed_mm_day:s,
  evidence:{no_rain_24h:true,inlet_closed:true,outlet_closed:true,measurement_record:true,objective_evidence:true}}).class_if_admissible;
// Exact threshold rationals cannot be represented in finite decimal raw units; input is the exact observed measurement.
// For boundary tests, use observed 7.5/1.22 neighborhood with controlled decimal steps.
assert.equal(drainageThreshold('6.147540983606558'),'POOR_DRAINAGE');
assert.equal(drainageThreshold('6.147540983606558'),'POOR_DRAINAGE');
assert.equal(drainageThreshold('6.147540983606558'),'POOR_DRAINAGE');
assert.equal(drainageThreshold('6.147540983606558'),'POOR_DRAINAGE');
const high=drainageThreshold('6.147540983606558');
assert.equal(high,'POOR_DRAINAGE');
assert.equal(drainageThreshold('6.147541'),'DAILY_DRAINAGE','AG-DRN-02 upper side');
assert.equal(drainageThreshold('10.245902'),'FOUR_HOUR_DRAINAGE','AG-DRN-03 upper side');
assert.equal(drainageThreshold('10.245901'),'DAILY_DRAINAGE','AG-DRN below 12.5');
const missingD=referenceDrainageClass({observed_mm_day:6,evidence:{}});
assert.equal(missingD.status,'EVIDENCE_REQUIRED','AG-DRN-04 missing rain log');
assert.equal(missingD.selected_official_class,null);
assert.throws(()=>referenceDrainageClass({observed_mm_day:-1}),/AG005_DRAINAGE_MEASUREMENT_INVALID/);

const priors=Array.from({length:100},(_,i)=>({crop_id:'crop-'+i,
  start:'2022-07-01',end:i===99?'2022-07-11':'2022-07-10'}));
const evidence={objective_date_logs:true,heading_date_record:true,prior_crop_records:true,sustainability_review:true};
const checkDays=(end,heading_date='2025-08-01',ev=evidence)=>referenceMidseasonEligibility({
  prior_crop_cycles:priors,project:{start:'2025-07-01',end,heading_date},evidence:ev});
assert.equal(checkDays('2025-07-17').baseline_mean_raw,10.01,'AG-DAY 10.01');
assert.equal(checkDays('2025-07-17').baseline_days_ceil,11,'AG-DAY ceil 10.01');
assert.equal(checkDays('2025-07-17').status,'NOT_ELIGIBLE_BY_DAYS','AG-DAY-01 17-11=6');
assert.equal(checkDays('2025-07-18').status,'REFERENCE_DAYS_PASS','AG-DAY-02 18-11=7');
assert.equal(checkDays('2025-07-18','2025-07-17').project_days_through_pre_heading,16,'AG-DAY-03 heading cutoff');
assert.equal(checkDays('2025-07-18','2025-08-01',{}).status,'EVIDENCE_REQUIRED','evidence gate');
assert.throws(()=>referenceMidseasonEligibility({prior_crop_cycles:[]}),/AG005_BASELINE_CROP_CYCLES_MISSING/);
assert.throws(()=>referenceMidseasonEligibility({prior_crop_cycles:priors,
  project:{start:'2025-02-29',end:'2025-03-01',heading_date:'2025-04-01'}}),/AG005_PROJECT_DATE_INVALID/);

const allocated=referenceAreaAllocation({new_area_ha:'3',parents:[
  {field_id:'p1',area_before_ha:'1'},{field_id:'p2',area_before_ha:'2'}],
  map_evidence:true,soil_movement_reviewed:true});
assert.deepEqual(allocated.allocations.map(x=>x.allocated_area_ha.decimal),['1','2'],'AG-LAND weighted allocation');
assert.equal(allocated.status,'HUMAN_REVIEW_REQUIRED','official parcel merge review remains');
const lost=referenceAreaAllocation({new_area_ha:'3',parents:[
  {field_id:'p1',area_before_ha:'1'},{field_id:'p2',area_before_ha:'2'}]});
assert.equal(lost.status,'EVIDENCE_REQUIRED','AG-LAND-01');
assert.throws(()=>referenceAreaAllocation({new_area_ha:3,parents:[
  {field_id:'p1',area_before_ha:1},{field_id:'p1',area_before_ha:2}]}),/AG005_FIELD_PARENT_ID_INVALID/);

const table={status:'SYNTHETIC',source:{original_sha256_verified:false},
  rows:[{inventory_edition:'SYN-DEMO-1',factor_year:'2024',region:'TOHOKU',
    drainage:'POOR_DRAINAGE',water_management:'intermittent',factors:EF}]};
const keys={inventory_edition:'SYN-DEMO-1',factor_year:2024,region:'TOHOKU',
  drainage:'POOR_DRAINAGE',water_management:'intermittent',
  organic:{straw_percent:45,compost_t_per_10a:0}};
assert.equal(referenceFactorSelector(table,keys).organic.ef_ch4_c_kg_ha_year.decimal,'150');
assert.throws(()=>referenceFactorSelector({...table,status:'OFFICIAL'},keys),/AG005_INVENTORY_CONFIG_REQUIRED/);
assert.throws(()=>referenceFactorSelector(table,{...keys,factor_year:2025}),/AG005_FACTOR_ROW_MISSING/);

const calc=referenceCarbonCalculation({segments:[{area_ha:'2',ef_m0:'100',
  project_factor:'0.7',factor_unit:'kg_CH4_C_per_ha_year',
  provenance:'SYNTHETIC',official_adopted:false}],gwp100_ch4:'30',rounding:null});
assert.equal(calc.indicative_er_tco2e.decimal,'2.4','AG arithmetic 2.4');
assert.equal(calc.baseline_tco2e.decimal,'8');
assert.equal(calc.project_tco2e.decimal,'5.6');
assert.equal(calc.official_amount,null);
assert.equal(calc.certification_allowed,false);
assert.throws(()=>referenceCarbonCalculation({segments:[{area_ha:2,ef_m0:100,project_factor:'0.7',
  factor_unit:'kg_CH4_per_ha_year',provenance:'SYNTHETIC',official_adopted:false}],
  gwp100_ch4:30,rounding:null}),/AG005_FACTOR_UNVERIFIED/);
assert.throws(()=>referenceCarbonCalculation({segments:[{area_ha:2,ef_m0:100,project_factor:'0.7',
  factor_unit:'kg_CH4_C_per_ha_year',provenance:'SYNTHETIC',official_adopted:false}],
  gwp100_ch4:30,rounding:'2dp'}),/AG005_ROUNDING_RULE_UNVERIFIED/);

const deps=ag005DependencyDiff({factor_year:2024,raw_evidence_bytes:'old'},{factor_year:2025,raw_evidence_bytes:'new'});
assert.equal(deps.status,'UNSUPPORTED','AG-TAMPER hash invalid');
assert.equal(deps.stale_human_decisions,true);
assert.deepEqual(ag005DependencyDiff({factor_year:2024},{factor_year:2024}).changed_dependencies,[]);

const gxInput={domain:'GX_ETS',source_type:'FUEL_COMBUSTION',
  fuel:{fuel_name:'fuel_demo',quantity:'10',quantity_unit:'kL'},
  factors:{official:false,provenance:'SYNTHETIC',hv:'40',hv_unit:'GJ_per_kL',
    cf:'0.02',cf_unit:'tC_per_GJ'},
  boundary:{direct_emission:true,purchased_electricity:false,
    industrial_process:false,organizational_boundary_reviewed:true}};
const gx=evaluateGxEtsFuel(gxInput);
assert.equal(gx.indicative_tco2,'29.333333333','GX-FUEL formula 10*40*.02*44/12');
assert.equal(gx.official_reportable_tco2,null);
assert.equal(gx.domain,'GX_ETS');
assert.notEqual(calc.domain,gx.domain,'separate calculation domains');
assert.throws(()=>evaluateGxEtsFuel({...gxInput,source_type:'PURCHASED_ELECTRICITY'}),/GX_ETS_UNSUPPORTED_EMISSION_DOMAIN/);
assert.throws(()=>evaluateGxEtsFuel({...gxInput,
  factors:{...gxInput.factors,hv_unit:'GJ_per_t'}}),/GX_ETS_FACTOR_SOURCE_OR_UNIT_MISMATCH/);
assert.throws(()=>evaluateGxEtsFuel({...gxInput,
  boundary:{...gxInput.boundary,purchased_electricity:true}}),/GX_ETS_SCOPE_BOUNDARY_REVIEW_REQUIRED/);
assert.equal(compareGxEtsBoundary(gxInput,{...gxInput,
  boundary:{...gxInput.boundary,organizational_boundary_reviewed:false}}).status,'HUMAN_REVIEW_REQUIRED');
console.log('AG005_V33_GXETS_REFERENCE_PASS: clauses, exact boundaries, evidence/units, separate domains');
