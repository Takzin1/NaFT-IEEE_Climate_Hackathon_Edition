#!/usr/bin/env node
/**
 * Source-bound rice MRV methodology reference router.
 *
 * Never calculates climate claims or certifies regulatory eligibility.
 * Gold Standard workbook "Tier" and Verra VM0051 "QA" are distinct namespaces.
 * The supplied Gold Standard validation checklist Q23 is internally inconsistent.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = resolve(ROOT,'research/rice-methodology-routing/source-formula-register.json');
const EXPECTED_FILES = Object.freeze({
  GS_TRAINING_SCENARIOS:'77519262ddf83e00a3dd04f89be7cef46a79f534c50496f1c770325e5f1ef461',
  GS_ER_CALCULATOR:'92ddfcf926ec2eaead54e674c06a608f8a29b8e6ff0698a0468aa29152cd8040',
  VERRA_VM0051_2026:'9b9738840824f5919e3a76f8807c68743ae3d64b5d931cda27598f3ab32c64e2',
  GS_AWD_VVB_CHECKLIST_2024:'532ec2c31daf95d911367b2516a5e0c67d17ba47031457c89d9d55844217478a'
});
const EXPECTED_GS_FORMULAS = Object.freeze({
  TIER_1_SIMPLIFIED:{sheet:'Tier 1_Simplified',cell:'E5',formula:'=E9*E10*E14/1000*E15*(1-E30)'},
  TIER_2_COUNTRY_SPECIFIC:{sheet:'Tier 2_Country specific',cell:'E4',formula:'=(E8-E22)*(1-E60)'},
  TIER_3_DIRECT:{sheet:'Tier 3_Direct measurement',cell:'E4',formula:'=(E8-E17)*(1-E49)'}
});
const VERRA = Object.freeze({
  QA1_MODEL:'MODEL',QA2_DIRECT_CHAMBER:'DIRECT_FLUX_CHAMBERS',QA3_DEFAULT_EF:'DEFAULT_EQUATIONS_FACTORS'
});
const GS = Object.freeze({
  TIER_1_SIMPLIFIED:'SIMPLIFIED_IPCC',TIER_2_COUNTRY_SPECIFIC:'COUNTRY_FACTOR',
  TIER_3_DIRECT:'DIRECT_MEASUREMENT'
});

function fail(code) {throw new Error('RICE_METHOD_ROUTE_BLOCKED:'+code);}
function assert(ok,code) {if (!ok) fail(code);}
function obj(a) {return a!==null&&typeof a==='object'&&!Array.isArray(a);}
export function sha256(b) {return createHash('sha256').update(b).digest('hex');}
export function loadRegistry(path=DATA) {
  return JSON.parse(readFileSync(path,'utf8'));
}

export function validateRegistry(registry) {
  assert(obj(registry)&&registry.schema==='naft-rice-external-methodology-reference-v1',
    'SOURCE_REGISTRY_SCHEMA');
  const p=registry.policy;
  assert(obj(p)&&p.certification_allowed===false&&p.reference_only===true
    &&p.calculator_can_derive_certified_tco2e===false
    &&p.gs_checklist_selection_conflict_unresolved===true
    &&p.verra_qa_not_equivalent_to_gs_tier===true
    &&p.j_credit_ag005_has_separate_methodology_namespace===true,
    'SOURCE_REGISTRY_TRUST_POLICY');
  assert(Array.isArray(registry.sources)&&registry.sources.length===4,
    'SOURCE_COUNT_OR_DUPLICATE');
  assert(new Set(registry.sources.map(x=>x.id)).size===4,'SOURCE_COUNT_OR_DUPLICATE');
  for(const x of registry.sources) {
    assert(Object.hasOwn(EXPECTED_FILES,x.id)&&x.sha256===EXPECTED_FILES[x.id],
      'SOURCE_FILE_HASH_OR_ID_MISMATCH:'+x.id);
    assert(typeof x.file==='string'&&x.file.length>2&&x.file.indexOf('/')===-1,
      'SOURCE_FILE_PATH_UNSAFE');
  }
  const g=registry.programs?.GS_AWD_TRAINING_2024;
  const v=registry.programs?.VERRA_VM0051_V1_1_2026;
  assert(obj(g)&&obj(v),'PROGRAM_ID_MISSING');
  assert(g.status==='TRAINING_ROUTING_ONLY_NOT_FORMAL_APPROVAL'
    &&g.selection_conflict?.id==='GS_Q23_TIER_LABEL_CONFLICT'
    &&g.selection_conflict?.resolution
       ==='UNRESOLVED_CHECKLIST_INTERNAL_CONTRADICTION_NO_AUTOMATIC_TIER_CERTIFICATION',
       'GS_TIER_Q23_CONFLICT_LOST');
  assert(obj(g.lanes)&&Object.keys(g.lanes).sort().join(',')===
    Object.keys(EXPECTED_GS_FORMULAS).sort().join(','),'GS_LANE_SET');
  for(const [lane,expected] of Object.entries(EXPECTED_GS_FORMULAS)){
    const actual=g.lanes[lane];
    assert(actual.sheet===expected.sheet&&actual.formula_cell===expected.cell
      &&actual.formula===expected.formula
      &&Array.isArray(actual.evidence_required)&&actual.evidence_required.length>=3,
      'GS_WORKBOOK_FORMULA_OR_REQUIREMENTS_CHANGED:'+lane);
  }
  assert(g.common_workbook_refs?.gwp_ch4_ar5_training===28
    &&g.common_workbook_refs?.gwp_n2o_ar5_training===265,
    'GS_TRAINING_GWP_NOT_VERIFIED');
  assert(Object.keys(v.lanes||{}).sort().join(',')===Object.keys(VERRA).sort().join(','),
    'VERRA_LANE_SET');
  for(const [lane,kind] of Object.entries(VERRA)) {
    assert(v.lanes[lane]?.kind===kind&&v.lanes[lane]?.requires?.length>=3,
      'VERRA_QA_DEFINITION_CHANGED:'+lane);
  }
  assert(v.forced_QA2_practices?.join(',')===
    'methanotrophs,biochar,low_emission_rice_variety,awd_below_10cm_with_expert',
    'VERRA_MANDATORY_QA2_RULE_CHANGED');
  assert(Array.isArray(registry.explicit_non_equivalences)
    &&registry.explicit_non_equivalences.length>=5,
    'MISSING_CROSS_STANDARD_BOUNDARY');
  return true;
}

function hasProof(evidence,key) {return evidence[key]===true;}
function saneEnum(v,allowed,code){assert(typeof v==='string'&&Object.hasOwn(allowed,v),code);}
function uniqueSorted(a){return [...new Set(a)].sort();}

/** Route to a reference lane only. Output cannot be mistaken for certified calculation. */
export function routeRiceMethodology(input,registry=loadRegistry()) {
  validateRegistry(registry);
  assert(obj(input)&&input.schema==='naft-rice-method-route-request-v1','REQUEST_SCHEMA');
  const program=input.program;
  assert(program==='GS_AWD_TRAINING_2024'||program==='VERRA_VM0051_V1_1_2026',
    'UNKNOWN_METHOD_NAMESPACE_OR_JCREDIT_NOT_MAPPED');
  assert(obj(input.evidence),'EVIDENCE_OBJECT_REQUIRED');
  assert(Object.values(input.evidence).every(x=>typeof x==='boolean'),
    'EVIDENCE_FLAGS_MUST_BE_BOOLEAN');
  assert(Array.isArray(input.practices||[])&&
    (input.practices||[]).every(x=>typeof x==='string'),'PRACTICES_INVALID');
  const lane=input.requested_lane;
  const isGS=program==='GS_AWD_TRAINING_2024';
  saneEnum(lane,isGS?GS:VERRA,'WRONG_LANE_FOR_PROGRAM');
  const config=registry.programs[program];
  const reference=config.lanes[lane];
  const missing=reference[isGS?'evidence_required':'requires'].filter(
    key=>!hasProof(input.evidence,key));
  const blocks=[];
  if(isGS){
    assert(['MICRO','SMALL','LARGE'].includes(input.project_scale),
      'GS_SCALE_REQUIRED');
    if(lane==='TIER_1_SIMPLIFIED'&&input.project_scale==='LARGE')
      blocks.push('GS_TIER_1_SMALL_MICRO_ONLY');
    if(lane==='TIER_3_DIRECT'&&input.measurement_kind==='EDDY_COVARIANCE_FCH4')
      blocks.push('GS_DIRECT_MEASUREMENT_CANNOT_INFER_FROM_UNVERIFIED_EC');
  }else{
    const source=input.measurement_kind;
    if(lane==='QA2_DIRECT_CHAMBER'&&source!=='FLUX_CHAMBER')
      blocks.push('VERRA_QA2_REQUIRES_CHAMBER_MEASUREMENTS_NOT_EC');
    const forced=(input.practices||[]).filter(
      p=>config.forced_QA2_practices.includes(p));
    if(forced.length&&lane!=='QA2_DIRECT_CHAMBER')
      blocks.push('VERRA_SPECIAL_PRACTICE_REQUIRES_QA2:'+forced.join(','));
    if(input.measurement_kind==='EDDY_COVARIANCE_FCH4'&&lane==='QA3_DEFAULT_EF')
      blocks.push('FCH4_EC_NOT_A_DEFAULT_FACTOR');
  }
  const status=blocks.length?'BLOCKED_APPROACH_MISMATCH':
    missing.length?'BLOCKED_INCOMPLETE_EVIDENCE':'REFERENCE_ROUTED_HUMAN_REVIEW_REQUIRED';
  const sourceIds=isGS?config.sources:[config.source];
  const sourceFiles=registry.sources.filter(s=>sourceIds.includes(s.id))
    .map(s=>({id:s.id,sha256:s.sha256,document:s.document,version:s.version}));
  const output={
    schema:'naft-rice-method-route-result-v1',
    program,requested_lane:lane,route_kind:isGS?GS[lane]:VERRA[lane],
    status,blocks,missing_evidence:uniqueSorted(missing),
    source_file_refs:sourceFiles,
    reference:isGS?{sheet:reference.sheet,cell:reference.formula_cell,
      formula:reference.formula,supporting:reference.supporting,
      source:'USER_SUPPLIED_GS_CALCULATOR_TRAINING_WORKBOOK'}:
      {methodology_section:reference.reference,
       source:'USER_SUPPLIED_VERRA_VM0051_1_1_2026'},
    unresolved_gs_q23_checklist_tier_conflict:isGS,
    institutional_eligibility_verified:false,
    source_materials_fully_implemented_as_rules:false,
    accepted_observation_qc:false,
    verified_annual_emission_tco2e:null,
    certified_reduction_tco2e:null,
    allowed_for_jcredit_ag005:false
  };
  return output;
}

/** Exact-byte consistency for the four local uploaded files (not issuer authentication). */
export function verifyLocalSourceFiles(fileById,registry=loadRegistry()){
  validateRegistry(registry);
  assert(obj(fileById)&&Object.keys(fileById).length===4,'FOUR_LOCAL_FILES_REQUIRED');
  for(const x of registry.sources){
    const path=fileById[x.id];
    assert(typeof path==='string'&&path.length>0,'LOCAL_FILE_MISSING:'+x.id);
    const actual=sha256(readFileSync(path));
    assert(actual===x.sha256,'LOCAL_FILE_DIGEST_MISMATCH:'+x.id);
  }
  return {state:'LOCAL_BYTES_MATCH_UPLOADED_SOURCES_NOT_PUBLISHER_AUTHENTICATED',
    file_count:4,official_current_approval_verified:false,certified_tco2e:null};
}

function cli(argv){
  if(argv[0]==='route'&&argv.length===2){
    console.log(JSON.stringify(routeRiceMethodology(JSON.parse(readFileSync(argv[1],'utf8'))),null,2));
    return;
  }
  if(argv[0]==='verify-sources'&&argv.length===5){
    const [_,scenario,calculator,method,checklist]=argv;
    console.log(JSON.stringify(verifyLocalSourceFiles({
      GS_TRAINING_SCENARIOS:scenario,GS_ER_CALCULATOR:calculator,
      VERRA_VM0051_2026:method,GS_AWD_VVB_CHECKLIST_2024:checklist
    }),null,2));
    return;
  }
  if(argv[0]==='check-registry'&&argv.length===1){
    console.log(JSON.stringify({ok:validateRegistry(loadRegistry()),
      source_count:4,scope:'REFERENCE_ONLY',certified_tco2e:null}));
    return;
  }
  fail('USAGE_ROUTE_OR_VERIFY_LOCAL_SOURCES_OR_CHECK_REGISTRY');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {cli(process.argv.slice(2));}
  catch(error){console.error(String(error.message));process.exitCode=1;}
}
