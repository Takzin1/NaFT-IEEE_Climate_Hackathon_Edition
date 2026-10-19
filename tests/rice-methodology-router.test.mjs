import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {
  loadRegistry,validateRegistry,routeRiceMethodology,
  verifyLocalSourceFiles,sha256
} from '../scripts/rice-methodology-router.mjs';

const registry=loadRegistry();
let assertions=0;
function eq(a,b){assert.deepEqual(a,b);assertions++;}
function ok(a){assert.ok(a);assertions++;}
function blocked(fn,code){assert.throws(fn,new RegExp(code));assertions++;}
const request=(program,requested_lane,props={})=>({
  schema:'naft-rice-method-route-request-v1',
  program,requested_lane,project_scale:'LARGE',practices:[],
  evidence:{},...props
});
const GS='GS_AWD_TRAINING_2024',VCS='VERRA_VM0051_V1_1_2026';
const allG=(lane)=>Object.fromEntries(registry.programs[GS].lanes[lane].evidence_required.map(n=>[n,true]));
const allV=(lane)=>Object.fromEntries(registry.programs[VCS].lanes[lane].requires.map(n=>[n,true]));

eq(validateRegistry(registry),true);
eq(registry.sources.length,4);
eq(registry.sources.find(x=>x.id==='GS_ER_CALCULATOR').sha256,
  '92ddfcf926ec2eaead54e674c06a608f8a29b8e6ff0698a0468aa29152cd8040');
eq(registry.sources.find(x=>x.id==='VERRA_VM0051_2026').version,'1.1');
eq(registry.programs[GS].selection_conflict.id,'GS_Q23_TIER_LABEL_CONFLICT');
eq(registry.programs[VCS].lanes.QA2_DIRECT_CHAMBER.kind,'DIRECT_FLUX_CHAMBERS');
eq(registry.programs[GS].common_workbook_refs.gwp_ch4_ar5_training,28);
eq(registry.programs[GS].common_workbook_refs.gwp_n2o_ar5_training,265);

const s1=routeRiceMethodology(request(GS,'TIER_1_SIMPLIFIED',{
  project_scale:'SMALL',evidence:allG('TIER_1_SIMPLIFIED')}));
eq(s1.status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
eq(s1.route_kind,'SIMPLIFIED_IPCC');
eq(s1.reference.sheet,'Tier 1_Simplified');
eq(s1.reference.cell,'E5');
eq(s1.reference.formula,'=E9*E10*E14/1000*E15*(1-E30)');
eq(s1.unresolved_gs_q23_checklist_tier_conflict,true);
eq(s1.source_file_refs.length,3);
eq(s1.certified_reduction_tco2e,null);
eq(s1.verified_annual_emission_tco2e,null);
eq(s1.institutional_eligibility_verified,false);
eq(s1.allowed_for_jcredit_ag005,false);

const s1micro=routeRiceMethodology(request(GS,'TIER_1_SIMPLIFIED',{
  project_scale:'MICRO',evidence:allG('TIER_1_SIMPLIFIED')}));
eq(s1micro.status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
const largeT1=routeRiceMethodology(request(GS,'TIER_1_SIMPLIFIED',{
  project_scale:'LARGE',evidence:allG('TIER_1_SIMPLIFIED')}));
eq(largeT1.status,'BLOCKED_APPROACH_MISMATCH');
ok(largeT1.blocks.includes('GS_TIER_1_SMALL_MICRO_ONLY'));

const s2=routeRiceMethodology(request(GS,'TIER_2_COUNTRY_SPECIFIC',{
  evidence:allG('TIER_2_COUNTRY_SPECIFIC')}));
eq(s2.status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
eq(s2.route_kind,'COUNTRY_FACTOR');
eq(s2.reference.formula,'=(E8-E22)*(1-E60)');
eq(s2.reference.sheet,'Tier 2_Country specific');
const s3=routeRiceMethodology(request(GS,'TIER_3_DIRECT',{
  evidence:allG('TIER_3_DIRECT'),measurement_kind:'DIRECT_CHAMBER'}));
eq(s3.status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
eq(s3.route_kind,'DIRECT_MEASUREMENT');
eq(s3.reference.formula,'=(E8-E17)*(1-E49)');
const s3ec=routeRiceMethodology(request(GS,'TIER_3_DIRECT',{
  evidence:allG('TIER_3_DIRECT'),measurement_kind:'EDDY_COVARIANCE_FCH4'}));
eq(s3ec.status,'BLOCKED_APPROACH_MISMATCH');

const missing=routeRiceMethodology(request(GS,'TIER_2_COUNTRY_SPECIFIC',{
 evidence:{country_specific_factor_source:true}}));
eq(missing.status,'BLOCKED_INCOMPLETE_EVIDENCE');
ok(missing.missing_evidence.includes('uncertainty_policy'));
eq(missing.certified_reduction_tco2e,null);

const v1=routeRiceMethodology(request(VCS,'QA1_MODEL',{
 evidence:allV('QA1_MODEL')}));
eq(v1.status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
eq(v1.route_kind,'MODEL');
eq(v1.source_file_refs.length,1);
const v2=routeRiceMethodology(request(VCS,'QA2_DIRECT_CHAMBER',{
 evidence:allV('QA2_DIRECT_CHAMBER'),measurement_kind:'FLUX_CHAMBER'}));
eq(v2.status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
eq(v2.route_kind,'DIRECT_FLUX_CHAMBERS');
eq(v2.accepted_observation_qc,false);
const v3=routeRiceMethodology(request(VCS,'QA3_DEFAULT_EF',{
 evidence:allV('QA3_DEFAULT_EF')}));
eq(v3.status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
eq(v3.route_kind,'DEFAULT_EQUATIONS_FACTORS');
const ec=routeRiceMethodology(request(VCS,'QA2_DIRECT_CHAMBER',{
 evidence:allV('QA2_DIRECT_CHAMBER'),measurement_kind:'EDDY_COVARIANCE_FCH4'}));
eq(ec.status,'BLOCKED_APPROACH_MISMATCH');
ok(ec.blocks.includes('VERRA_QA2_REQUIRES_CHAMBER_MEASUREMENTS_NOT_EC'));
for(const practice of registry.programs[VCS].forced_QA2_practices){
 const forced=routeRiceMethodology(request(VCS,'QA3_DEFAULT_EF',{
  evidence:allV('QA3_DEFAULT_EF'),practices:[practice]}));
 eq(forced.status,'BLOCKED_APPROACH_MISMATCH');
 ok(forced.blocks[0].includes('VERRA_SPECIAL_PRACTICE_REQUIRES_QA2'));
}
const v3ec=routeRiceMethodology(request(VCS,'QA3_DEFAULT_EF',{
 evidence:allV('QA3_DEFAULT_EF'),measurement_kind:'EDDY_COVARIANCE_FCH4'}));
eq(v3ec.status,'BLOCKED_APPROACH_MISMATCH');
const v2missing=routeRiceMethodology(request(VCS,'QA2_DIRECT_CHAMBER',{
 evidence:{},measurement_kind:'FLUX_CHAMBER'}));
eq(v2missing.status,'BLOCKED_INCOMPLETE_EVIDENCE');
ok(v2missing.missing_evidence.includes('weekly_during_cultivation'));

blocked(()=>routeRiceMethodology(request(GS,'QA1_MODEL')),'WRONG_LANE_FOR_PROGRAM');
blocked(()=>routeRiceMethodology(request(VCS,'TIER_1_SIMPLIFIED')),'WRONG_LANE_FOR_PROGRAM');
blocked(()=>routeRiceMethodology(request('AG-005','QA3_DEFAULT_EF')),'UNKNOWN_METHOD_NAMESPACE');
blocked(()=>routeRiceMethodology({...request(GS,'TIER_1_SIMPLIFIED'),project_scale:'UNKNOWN'}),
  'GS_SCALE_REQUIRED');
blocked(()=>routeRiceMethodology({...request(GS,'TIER_1_SIMPLIFIED'),evidence:{verified_factor_choice:'YES'}}),
  'EVIDENCE_FLAGS_MUST_BE_BOOLEAN');
blocked(()=>routeRiceMethodology({...request(VCS,'QA2_DIRECT_CHAMBER'),practices:'biochar'}),
  'PRACTICES_INVALID');

const altered=(op)=>{const c=structuredClone(registry);op(c);return c;};
blocked(()=>validateRegistry(altered(x=>x.sources[0].sha256='0'.repeat(64))),
  'SOURCE_FILE_HASH_OR_ID_MISMATCH');
blocked(()=>validateRegistry(altered(x=>x.sources.push(x.sources[0]))),
  'SOURCE_COUNT_OR_DUPLICATE');
blocked(()=>validateRegistry(altered(x=>x.sources[0].file='../private.pdf')),
  'SOURCE_FILE_PATH_UNSAFE');
blocked(()=>validateRegistry(altered(x=>x.programs[GS].selection_conflict.resolution='SOLVED')),
  'GS_TIER_Q23_CONFLICT_LOST');
blocked(()=>validateRegistry(altered(x=>x.programs[GS].lanes.TIER_2_COUNTRY_SPECIFIC.formula='=E8-E22')),
  'GS_WORKBOOK_FORMULA_OR_REQUIREMENTS_CHANGED');
blocked(()=>validateRegistry(altered(x=>x.programs[VCS].lanes.QA2_DIRECT_CHAMBER.kind='EDDY_COVARIANCE')),
  'VERRA_QA_DEFINITION_CHANGED');
blocked(()=>validateRegistry(altered(x=>x.programs[VCS].forced_QA2_practices=[])),
  'VERRA_MANDATORY_QA2_RULE_CHANGED');
blocked(()=>validateRegistry(altered(x=>x.policy.certification_allowed=true)),
  'SOURCE_REGISTRY_TRUST_POLICY');

const files=Object.fromEntries(registry.sources.map(x=>[x.id,'/not/found']));
blocked(()=>verifyLocalSourceFiles({...files,untrusted:'x'}),'FOUR_LOCAL_FILES_REQUIRED');
eq(sha256(Buffer.from('abc')),
 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

const tmp=mkdtempSync(join(tmpdir(),'naft-rice-method-'));
try{
 const req=join(tmp,'route.json');
 writeFileSync(req,JSON.stringify(request(VCS,'QA2_DIRECT_CHAMBER',{
 evidence:allV('QA2_DIRECT_CHAMBER'),measurement_kind:'FLUX_CHAMBER'})));
 const cmd=(...args)=>spawnSync(process.execPath,['scripts/rice-methodology-router.mjs',...args],
  {encoding:'utf8',timeout:15000,maxBuffer:200000});
 const cli=cmd('route',req);
 eq(cli.status,0);
 eq(JSON.parse(cli.stdout).status,'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED');
 const registryCli=cmd('check-registry');
 eq(registryCli.status,0);
 eq(JSON.parse(registryCli.stdout).source_count,4);
 const illegal=cmd('verify-sources','/bad1','/bad2','/bad3','/bad4');
 ok(illegal.status!==0&&illegal.stderr.includes('ENOENT'));
}finally{rmSync(tmp,{force:true,recursive:true});}
console.log('RICE_METHOD_SOURCE_ROUTER_PASS:',assertions,
  'checks; no certified tCO2e, no GS/Verra tier aliasing');
