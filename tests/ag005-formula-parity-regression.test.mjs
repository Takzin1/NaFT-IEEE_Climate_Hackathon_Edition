/**
 * Cause-isolated parity and regression suite:
 * - no inference that synthetic math is legally adopted AG-005
 * - compare kg CH4 vs kg CH4-C ONLY after explicit 12/16 conversion
 * - force fail-closed when modified evidence has no independently checked hash
 * - GX-ETS must re-evaluate fuel quantity/factors, not just organizational boundary
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {evaluateAg005Scenario} from '../src/ag005-research-engine.mjs';
import {referenceCarbonCalculation,referenceMidseasonEligibility,
  ag005DependencyDiff,referenceOrganicEF,referenceDrainageClass} from '../src/ag005-v33-reference-math.mjs';
import {evaluateGxEtsFuel,compareGxEtsBoundary} from '../src/gxets-fuel-research.mjs';

const getExample=spawnSync(process.execPath,['scripts/ag005-engine.mjs','example'],{encoding:'utf8'});
assert.equal(getExample.status,0,getExample.stderr);
const template=JSON.parse(getExample.stdout);
const stable=x=>structuredClone(x);
const oldOfficial=evaluateAg005Scenario(template);
assert.equal(oldOfficial.arithmetic_preview.indicative_net_tco2e,2.52,
  'previous synthetic 180-120 CH4 model remains 2.52, not v3.3 policy');
assert.equal(oldOfficial.official_outputs.approved_emission_reduction_tco2e,null);
assert.equal(oldOfficial.official_outputs.credits_issued,null);

// Enforce genuinely comparable synthetic values before checking formula equivalence:
// 180 kg CH4/ha -> 135 kg CH4-C/ha; project = 70% of baseline (126 kg CH4).
const compatible=stable(template);
compatible.factors.project_ch4_kg_ha_season=126;
const ch4Old=evaluateAg005Scenario(compatible);
const carbonNew=referenceCarbonCalculation({
 segments:[{area_ha:'1.5',ef_m0:'135',project_factor:'0.7',
  factor_unit:'kg_CH4_C_per_ha_year',provenance:'SYNTHETIC',official_adopted:false}],
 gwp100_ch4:'28',rounding:null
});
assert.equal(ch4Old.arithmetic_preview.indicative_net_tco2e,2.268);
assert.equal(carbonNew.indicative_er_tco2e.fraction,'567/250');
assert.equal(carbonNew.indicative_er_tco2e.decimal,'2.268');
assert.equal(ch4Old.arithmetic_preview.indicative_net_tco2e,
 Number(carbonNew.indicative_er_tco2e.decimal),
 'legacy CH4 and v3.3 CH4-C arithmetic match ONLY on normalized synthetic input');
assert.equal(carbonNew.official_amount,null);
assert.equal(carbonNew.gwp_source_verified,false);
assert.equal(carbonNew.certification_allowed,false);
assert.notEqual(oldOfficial.arithmetic_preview.indicative_net_tco2e,
 Number(carbonNew.indicative_er_tco2e.decimal),
 'historical training example has a DIFFERENT 120/180 ratio from v3.3 reference 0.7');

// Independently hand-computed v3.3 synthesis, including multi-segment aggregation.
const two=referenceCarbonCalculation({segments:[
 {area_ha:'2',ef_m0:'100',project_factor:'0.7',
  factor_unit:'kg_CH4_C_per_ha_year',provenance:'SYNTHETIC',official_adopted:false},
 {area_ha:'1',ef_m0:'50',project_factor:'0.7',
  factor_unit:'kg_CH4_C_per_ha_year',provenance:'SYNTHETIC',official_adopted:false}
],gwp100_ch4:'30',rounding:null});
assert.equal(two.indicative_er_tco2e.decimal,'3',
 '2*30 + 1*15 kg CH4-C => *16/12*30/1000 = 3 tCO2e');
assert.equal(two.baseline_tco2e.decimal,'10');
assert.equal(two.project_tco2e.decimal,'7');
assert.throws(()=>referenceCarbonCalculation({segments:[{
 area_ha:'2',ef_m0:'100',project_factor:'0.7',
 factor_unit:'kg_CH4_per_ha_year',provenance:'SYNTHETIC',official_adopted:false
}],gwp100_ch4:'30',rounding:null}),/AG005_FACTOR_UNVERIFIED/);

// Source-bound evidence: bytes, not boolean self-assertion, must be trusted.
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const old={method_version:'3.3',factor_year:2024,raw_evidence_bytes:'v1',
 expected_evidence_sha256:digest('v1'),evidence_hash_valid:true};
const modified={...old,raw_evidence_bytes:'v2',factor_year:2025};
const rejected=ag005DependencyDiff(old,modified);
assert.equal(rejected.status,'UNSUPPORTED','hash does NOT match altered bytes');
assert.equal(rejected.evidence_integrity_valid,false);
assert.equal(rejected.stale_human_decisions,true);
const rehashed=ag005DependencyDiff(old,{...modified,expected_evidence_sha256:digest('v2')});
assert.equal(rehashed.status,'REVERIFY_REQUIRED',
 'correct digest proves bytes only, triggers rule/claim review');
assert.equal(rehashed.evidence_integrity_valid,true);
assert.deepEqual(rehashed.changed_dependencies,
 ['factor_year','raw_evidence_bytes','expected_evidence_sha256']);
const changedNoDigest=ag005DependencyDiff(
 {raw_evidence_bytes:'old'},{raw_evidence_bytes:'changed',evidence_hash_valid:true});
assert.equal(changedNoDigest.status,'UNSUPPORTED',
 'no trust in self-reported evidence_hash_valid true');
const missingNewDigest=ag005DependencyDiff({}, {raw_evidence_bytes:'new',evidence_hash_valid:true});
assert.equal(missingNewDigest.status,'UNSUPPORTED');
const changedExpectedOnly=ag005DependencyDiff(old,{...old,expected_evidence_sha256:digest('bad')});
assert.equal(changedExpectedOnly.status,'UNSUPPORTED');
assert.deepEqual(ag005DependencyDiff(
 {organic_material:{straw:'45',compost:'0'}},
 {organic_material:{compost:'0',straw:'45'}}).changed_dependencies,[],
 'JSON key order does not cause spurious claim-impact');
assert.equal(ag005DependencyDiff({factor_year:2024},{factor_year:2025}).status,'REVERIFY_REQUIRED');
assert.equal(ag005DependencyDiff({},{}).status,'UNCHANGED');

// Day and source chronology errors must not silently become "day condition unmet".
const validDays={prior_crop_cycles:[
 {crop_id:'a',start:'2022-07-01',end:'2022-07-10'},
 {crop_id:'b',start:'2023-07-01',end:'2023-07-11'}
],project:{start:'2025-07-01',end:'2025-07-20',heading_date:'2025-08-01'},
 evidence:{objective_date_logs:true,heading_date_record:true,
  prior_crop_records:true,sustainability_review:true}};
assert.equal(referenceMidseasonEligibility(validDays).status,'REFERENCE_DAYS_PASS');
assert.throws(()=>referenceMidseasonEligibility({...validDays,
 project:{...validDays.project,heading_date:'2025-06-30'}}),/AG005_HEADING_ON_OR_BEFORE_START/);
assert.throws(()=>referenceMidseasonEligibility({...validDays,
 project:{...validDays.project,heading_date:'2025-07-01'}}),/AG005_HEADING_ON_OR_BEFORE_START/);
assert.throws(()=>referenceMidseasonEligibility({...validDays,
 prior_crop_cycles:[validDays.prior_crop_cycles[0],{
  crop_id:'future',start:'2026-07-01',end:'2026-07-10'}]}),
 /AG005_BASELINE_NOT_BEFORE_PROJECT/);
assert.throws(()=>referenceOrganicEF({
 none:'1'.repeat(121),straw:'200',compost:'150',
 unit:'kg_CH4_C_per_ha_year',provenance:'SYNTHETIC'
},{straw_percent:'45',compost_t_per_10a:'0'}),/DECIMAL_PRECISION_LIMIT_EXCEEDED/);

// Independent GX-fuel quantity, heating value, carbon factor change scenarios.
const gx={domain:'GX_ETS',source_type:'FUEL_COMBUSTION',
 fuel:{fuel_name:'fuel_demo',quantity:'10',quantity_unit:'kL'},
 factors:{official:false,provenance:'SYNTHETIC',hv:'40',
  hv_unit:'GJ_per_kL',cf:'0.02',cf_unit:'tC_per_GJ'},
 boundary:{direct_emission:true,purchased_electricity:false,
  industrial_process:false,organizational_boundary_reviewed:true}};
const base=evaluateGxEtsFuel(gx);
assert.equal(base.indicative_tco2,'29.333333333');
const doubled=compareGxEtsBoundary(gx,{...gx,fuel:{...gx.fuel,quantity:'20'}});
assert.equal(doubled.status,'REVERIFY_REQUIRED');
assert.deepEqual(doubled.changed_dependencies,['fuel']);
assert.equal(doubled.current_indicative_tco2,'58.666666667');
const newHeat=compareGxEtsBoundary(gx,{...gx,factors:{...gx.factors,hv:'50'}});
assert.equal(newHeat.status,'REVERIFY_REQUIRED');
assert.equal(newHeat.current_indicative_tco2,'36.666666667');
assert.deepEqual(newHeat.changed_dependencies,['factors']);
const newCarbon=compareGxEtsBoundary(gx,{...gx,factors:{...gx.factors,cf:'0.03'}});
assert.equal(newCarbon.status,'REVERIFY_REQUIRED');
assert.equal(newCarbon.current_indicative_tco2,'44');
const invalidBoundary=compareGxEtsBoundary(gx,{...gx,
 boundary:{...gx.boundary,purchased_electricity:true}});
assert.equal(invalidBoundary.status,'HUMAN_REVIEW_REQUIRED');
assert.equal(invalidBoundary.current_indicative_tco2,null);
assert.deepEqual(invalidBoundary.changed_dependencies,['boundary']);
const changedValidBoundary=compareGxEtsBoundary(gx,{...gx,
 boundary:{...gx.boundary,asset_reconciliation:'pending'}});
assert.equal(changedValidBoundary.status,'HUMAN_REVIEW_REQUIRED');
assert.equal(changedValidBoundary.independent_boundary_review_required,true);
assert.equal(compareGxEtsBoundary(gx,{...gx,source_type:'PURCHASED_ELECTRICITY'}).status,
 'UNSUPPORTED');
assert.equal(compareGxEtsBoundary(gx,structuredClone(gx)).status,'UNCHANGED');
assert.deepEqual(compareGxEtsBoundary(gx,structuredClone(gx)).changed_dependencies,[]);
assert.throws(()=>evaluateGxEtsFuel({...gx,fuel:{...gx.fuel,fuel_name:1234}}),
 /GX_ETS_FUEL_IDENTITY_INVALID/);
assert.throws(()=>compareGxEtsBoundary(gx,{...gx,
 factors:{...gx.factors,hv_unit:'GJ_per_t'}}),
 /GX_ETS_FACTOR_SOURCE_OR_UNIT_MISMATCH/);
console.log('AG005_GXETS_PARITY_REGRESSION_PASS: 3 false-unchanged/forged-evidence causes fixed, unit normalization and chronology verified');
