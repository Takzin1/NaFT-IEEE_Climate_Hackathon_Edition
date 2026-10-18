import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dec,exactDecimal,div,ceil} from '../src/mrv-rational.mjs';
import {organicEFReference,drainageClassFromAdjusted,classifyMeasuredDrainage,
  extendDaysReference,allocateMergedAreaReference,referenceEmissions,
  evaluateAg005V33Reference,compareAg005ReferenceDependencies} from '../src/ag005-v33-reference.mjs';
import {gxFuelResearch} from '../src/gxets-fuel-reference.mjs';
const p=JSON.parse(fs.readFileSync('data/japan-mrv-research-2026-10-18/ag005-gxets-gap-baseline.json','utf8'));
const v35=p.method_packs[0];
assert.equal(v35.original_sha256,null);
assert.equal(v35.status,'CONFIG_REQUIRED');
assert.equal(v35.official_effective_from,null);
assert.equal(v35.rounding_spec,null);
assert.equal(v35.certification_allowed,false);
assert.equal(exactDecimal(div(dec('16'),dec('12'))),null);
assert.equal(ceil(dec('10.01')),11n);
assert.throws(()=>dec(0.7),/DECIMAL_STRING_REQUIRED/);
assert.throws(()=>dec('1e-7'),/DECIMAL_STRING_REQUIRED/);
const f={unit:'kg_CH4_C_per_ha_year',factor_kind:'SYNTHETIC',none:'100',straw:'200',compost:'150'};
const org=(w,x)=>organicEFReference(f,{straw_percent:w,compost_t_per_10a:x});
assert.equal(org('0','0').ef.decimal_exact,'100');
assert.equal(org('45','0').ef.decimal_exact,'150');
assert.equal(org('89','0').ef.numerator,'1790');
assert.equal(org('89','0').ef.denominator,'9');
assert.equal(org('90','0').ef.decimal_exact,'200');
assert.equal(org('0','0.5').ef.decimal_exact,'125');
assert.equal(org('0','1').ef.decimal_exact,'150');
assert.equal(org('90','1').ef.decimal_exact,'200');
assert.equal(org('90','1').branch,'BOTH_CAPPED');
assert.equal(org('100','5').ef.decimal_exact,'200');
assert.equal(org('100','5').review_required,true);
assert.throws(()=>org('101','0'),/DECIMAL_OUT_OF_RANGE/);
for(const [n,out] of [['7.499','POOR_DRAINAGE'],['7.500','DAILY_DRAINAGE'],['12.499','DAILY_DRAINAGE'],['12.500','FOUR_HOUR_DRAINAGE']]){
 assert.equal(drainageClassFromAdjusted(n),out);
}
const proof={dry_24h:true,intake_closed:true,outlet_closed:true,measurement_record:true,
  date_and_conditions_documented:true};
assert.equal(classifyMeasuredDrainage('10',proof).drainage_class,'DAILY_DRAINAGE');
assert.equal(classifyMeasuredDrainage('10',{...proof,dry_24h:false}).status,'EVIDENCE_REQUIRED');
assert.equal(classifyMeasuredDrainage('10','trusted').status,'EVIDENCE_REQUIRED');
const cycles=[{year:2023,days:10},{year:2024,days:11}];
const d17=extendDaysReference(cycles,{start:'2025-07-01',end:'2025-07-17'},'2025-09-01');
assert.equal(d17.baseline_days_ceil,11);
assert.equal(d17.extension_days,6);
assert.equal(d17.day_condition_met,false);
assert.equal(extendDaysReference(cycles,{start:'2025-07-01',end:'2025-07-18'},'2025-09-01').extension_days,7);
const clipped=extendDaysReference(cycles,{start:'2025-07-01',end:'2025-07-20'},'2025-07-18');
assert.equal(clipped.project_days,17);
assert.equal(clipped.heading_clipped_end,'2025-07-17');
assert.throws(()=>extendDaysReference([{year:2024,days:10},{year:2024,days:11}],
 {start:'2025-07-01',end:'2025-07-18'},'2025-09-01'),/AG_TWO_HISTORICAL_YEARS_REQUIRED/);
assert.throws(()=>extendDaysReference(cycles,{start:'2025-02-29',end:'2025-03-10'},
 '2025-09-01'),/AG_DATE_INVALID/);
const allocated=allocateMergedAreaReference('3',[{id:'A',area_before_ha:'2'},
 {id:'B',area_before_ha:'1'}]);
assert.deepEqual(allocated.map(x=>x.allocated_area_ha.decimal_exact),['2','1']);
assert.throws(()=>allocateMergedAreaReference('3',[{id:'A',area_before_ha:'2'},
 {id:'A',area_before_ha:'1'}]),/AG_PARENT_DUPLICATE/);
const carbon=referenceEmissions('2','100','70','30');
assert.deepEqual([carbon.em_bl.decimal_exact,carbon.em_pj.decimal_exact,carbon.er.decimal_exact],['8','5.6','2.4']);
assert.throws(()=>referenceEmissions(2,'100','70','30'),/DECIMAL_STRING_REQUIRED/);
const seg={id:'FIELD1',area_ha:'2',historical_cycles:cycles,
 project:{start:'2025-07-01',end:'2025-07-18'},heading_date:'2025-08-05',
 evidence:{prior_cycles:true,water_log:true,field_area:true,heading_date:true,
 organic_records:true,sustainability_review:true},
 organic:{straw_percent:'0',compost_t_per_10a:'0'},factors:f,
 drainage_measurement:{value_mm_day:'10',proof}};
const example={schema:'naft-ag005-v33-scenario-1',scenario_id:'TEST-AG005-1',
 method:{version:'3.3-reference',official_verified:false,official_source_sha256:null},
 origin:'SYNTHETIC',
 inventory:{edition:'SYNTHETIC',original_sha256:null,official_verified:false},
 gwp:{value:'30',status:'SYNTHETIC',source_verified:false},segments:[seg]};
const copy=x=>structuredClone(x);
const out=evaluateAg005V33Reference(example);
assert.equal(out.status,'RESEARCH_PREVIEW_ONLY');
assert.equal(out.segments[0].arithmetic_reference.er.decimal_exact,'2.4');
assert.equal(out.certified_tco2e,null);
assert.equal(out.certification,false);
assert.equal(out.report_sha256,evaluateAg005V33Reference(copy(example)).report_sha256);
const changed=copy(example);changed.segments[0].organic.straw_percent='45';
assert.deepEqual(compareAg005ReferenceDependencies(example,changed).changed_dependencies,['organic_material']);
assert.equal(compareAg005ReferenceDependencies(example,copy(example)).status,'NO_DEPENDENCY_CHANGE');
const withoutProof=copy(example);withoutProof.segments[0].evidence.water_log=false;
assert.equal(evaluateAg005V33Reference(withoutProof).status,'EVIDENCE_REQUIRED');
assert.equal(evaluateAg005V33Reference(withoutProof).segments[0].arithmetic_reference,null);
const early=copy(example);early.segments[0].project.end='2025-07-17';
assert.equal(evaluateAg005V33Reference(early).status,'NOT_ELIGIBLE_BY_DAYS');
const drainageMissing=copy(example);drainageMissing.segments[0].drainage_measurement.proof.dry_24h=false;
assert.equal(evaluateAg005V33Reference(drainageMissing).status,'EVIDENCE_REQUIRED');
const v35Scenario=copy(example);v35Scenario.method.version='3.5';
assert.equal(evaluateAg005V33Reference(v35Scenario).status,'UNSUPPORTED');
assert.equal(evaluateAg005V33Reference(v35Scenario).reference_preview,null);
assert.throws(()=>evaluateAg005V33Reference({...example,
 method:{version:'3.3-reference',official_verified:true,official_source_sha256:null}}),/AG_V33_NOT_AN_OFFICIAL_PACK/);
const fake=copy(example);fake.segments[0].factors.factor_kind='OFFICIAL';
assert.throws(()=>evaluateAg005V33Reference(fake),/AG_FACTOR_UNIT_OR_SOURCE_UNSUPPORTED/);
const merge=copy(example);merge.segments[0].land_merge=true;
assert.equal(evaluateAg005V33Reference(merge).status,'EVIDENCE_REQUIRED');
const over=copy(example);over.segments[0].organic.straw_percent='100';
assert.equal(evaluateAg005V33Reference(over).status,'HUMAN_REVIEW_REQUIRED');
const gx={schema:'naft-gxets-fuel-reference-1',entity_id:'ORG1',
 boundary:{status:'UNCERTIFIED_FIXED'},
 sources:[{id:'F1',type:'FUEL_COMBUSTION',scope:'DIRECT_CO2',
 fuel:{unit:'kl',amount:'10'},heat:{unit:'GJ/kl',value:'40'},
 carbon:{unit:'tC/GJ',value:'0.02'},source:{status:'SYNTHETIC',approved_factors_verified:false},
 evidence:{activity_record:true,fuel_type_verified:true,unit_conversion_verified:true}}]};
const outGx=gxFuelResearch(gx);
assert.equal(outGx.aggregate_reference.numerator,'88');
assert.equal(outGx.aggregate_reference.denominator,'3');
assert.equal(outGx.aggregate_reference.decimal_exact,null);
assert.equal(outGx.verified_reportable_emissions_tco2,null);
const power=copy(gx);power.sources.push({id:'ELEC',type:'PURCHASED_ELECTRICITY'});
assert.equal(gxFuelResearch(power).aggregate_reference,null);
assert.ok(gxFuelResearch(power).issues.some(x=>x.code==='GX_PURCHASED_POWER_NOT_DIRECT_FUEL_CO2'));
const mismatch=copy(gx);mismatch.sources[0].heat.unit='GJ/t';
assert.throws(()=>gxFuelResearch(mismatch),/GX_HEAT_UNIT_MISMATCH/);
const wrongC=copy(gx);wrongC.sources[0].carbon.unit='kgC/GJ';
assert.throws(()=>gxFuelResearch(wrongC),/GX_CARBON_UNIT_MISMATCH/);
const boundary=copy(gx);boundary.boundary.status='REVIEW_REQUIRED';
assert.equal(gxFuelResearch(boundary).aggregate_reference,null);
const process=copy(gx);process.sources[0].type='INDUSTRIAL_PROCESS';
assert.equal(gxFuelResearch(process).aggregate_reference,null);
const missingEvidence=copy(gx);missingEvidence.sources[0].evidence.activity_record=false;
assert.equal(gxFuelResearch(missingEvidence).aggregate_reference,null);
console.log('JAPAN_METHOD_GAP_PASS: source-lock, V33-day/organic/drainage boundaries, rational mass units and isolated GX-ETS fail-closed gates');
