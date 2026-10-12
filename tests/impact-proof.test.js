'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const name of ['mrv-core','methodology-packs','mrv-compiler','compiler-demo']) {
  vm.runInThisContext(fs.readFileSync('src/'+name+'.js','utf8'));
}

let passed=0,failed=0;
function check(value,label) {
  try { assert.ok(value,label);passed++; }
  catch(error) { failed++;console.error('FAIL: '+label);process.exitCode=1; }
}
function valueAt(obj,path) {
  return String(path||'').split('.').reduce(function(v,k) {
    return v&&Object.prototype.hasOwnProperty.call(v,k)?v[k]:undefined;
  },obj);
}
function oracleWhen(input,when) {
  if(!when) return true;
  return canonicalize(valueAt(input,when.path))===canonicalize(when.equals);
}
function rebindMethodology(input,version) {
  var next=clone(input),oldVersion=next.activity.methodology_version;
  next.activity.methodology_version=version;
  next.evidence=(next.evidence||[]).map(function(e) {
    return e.methodology_version===oldVersion?Object.assign({},e,{methodology_version:version}):e;
  });
  return next;
}
function semanticView(input,pack) {
  var pkg=compileEvidence(input,pack).document;
  var activeRequirements=Object.keys(pack.evidence_requirements).sort().filter(function(id) {
    return oracleWhen(input,pack.evidence_requirements[id].when);
  }).map(function(id) {
    var r=pack.evidence_requirements[id];
    return {id:id,category:r.category,required:!!r.required};
  });
  var used=new Set((pack.calculation_spec.parameters||[]).slice());
  Object.keys(pack.rules).sort().forEach(function(id) {
    var r=pack.rules[id];
    if(oracleWhen(input,r.when)&&r.parameter) used.add(r.parameter);
  });
  var usedParameters={};
  Array.from(used).sort().forEach(function(id) {
    usedParameters[id]=pkg.calculation.inputs.parameters[id];
  });
  return {
    rules:pkg.evaluation.rules.map(function(r) {
      return {id:r.id,pass:r.pass,supported:r.supported,input:r.input,value:r.value,threshold:r.threshold};
    }),
    evidence_requirements:activeRequirements,
    missing_evidence:pkg.evaluation.missing_evidence.slice().sort(),
    issues:pkg.evaluation.issues.map(function(i) { return {code:i.code,status:i.status}; }),
    used_parameters:usedParameters,
    calculation_spec:{
      operation:pack.calculation_spec.operation,
      inputs:clone(pack.calculation_spec.inputs||[]),
      parameters:clone(pack.calculation_spec.parameters||[]),
      unit:pack.calculation_spec.unit||null
    },
    calculation_values:clone(pkg.calculation.inputs.values),
    arithmetic_preview:pkg.calculation.arithmetic_preview,
    status:pkg.evaluation.status
  };
}
function variantClaim(id,variant) {
  var input=syntheticClaim(id,
    ['intensive','intensive_complete','sensitive','expert','ambiguous','unsupported'].includes(variant)?variant:undefined);
  if(variant==='low_days') input.activity.days=5;
  if(variant==='zero_area') input.field.area_ha=0;
  if(variant==='missing_record') input.evidence=input.evidence.filter(function(e) { return e.category!=='record'; });
  if(variant==='tamper') input.evidence[0].content+='-tampered';
  if(variant==='unknown_stratum') delete input.activity.stratum;
  return input;
}
function proofPack(index,mutate) {
  var p=clone(COMPILER_REGISTRY['NAFT-SYNTHETIC@1']);
  p.methodology_version='proof-'+String(index).padStart(2,'0');
  p.rule_pack_version='impact-proof-'+String(index).padStart(2,'0');
  p.source_url='urn:naft:impact-proof:'+String(index).padStart(2,'0');
  p.source_hash='SYNTHETIC-PROOF-'+String(index).padStart(2,'0');
  p.source_checked_at='2026-09-29';
  p.scope='Deterministic adversarial proof fixture; not an institutional methodology.';
  mutate(p);
  return p;
}

const variants=[
  'standard','intensive','intensive_complete','sensitive','expert','ambiguous',
  'unsupported','low_days','zero_area','missing_record','tamper','unknown_stratum'
];

const mutations=[
  ['metadata_only',function(){}],
  ['rule_threshold',function(p){p.rules.area.value=1;}],
  ['rule_operation',function(p){p.rules.area.op='gte';}],
  ['rule_add_unconditional',function(p){p.rules.proof={op:'gte',input:'activity.days',value:1};}],
  ['rule_add_conditional',function(p){p.rules.proof={op:'gte',input:'activity.days',value:9,when:{path:'activity.stratum',equals:'intensive'}};}],
  ['rule_removed',function(p){delete p.rules.area;}],
  ['rule_condition_changed',function(p){p.rules.area.when={path:'activity.stratum',equals:'intensive'};}],
  ['rule_input_changed',function(p){p.rules.area.input='activity.days';}],
  ['rule_metadata_only',function(p){p.rules.area.note='proof-metadata-only';}],
  ['parameter_used_calculation',function(p){p.parameters.factor.value=3;}],
  ['parameter_used_rule',function(p){p.parameters.minimum_days.value=8;}],
  ['parameter_unused',function(p){p.parameters.unused.value=9;}],
  ['calculation_unit',function(p){p.calculation_spec.unit='proof-index';}],
  ['calculation_inputs',function(p){p.calculation_spec.inputs=['field.area_ha'];}],
  ['calculation_parameters',function(p){p.calculation_spec.parameters=[];}],
  ['calculation_operation',function(p){p.calculation_spec.operation='UNSUPPORTED';}],
  ['requirement_add_unconditional',function(p){p.evidence_requirements.sensor={category:'sensor',required:true};}],
  ['requirement_add_conditional',function(p){p.evidence_requirements.sensor={category:'sensor',required:true,when:{path:'activity.stratum',equals:'intensive'}};}],
  ['requirement_removed',function(p){delete p.evidence_requirements.record;}],
  ['requirement_category_changed',function(p){p.evidence_requirements.record.category='photo';}],
  ['requirement_required_changed',function(p){p.evidence_requirements.record.required=false;}],
  ['exception_add_inactive',function(p){p.exceptions.proof={input:'activity.proof_flag',equals:true,disposition:'HUMAN_REVIEW_REQUIRED'};}],
  ['exception_add_conditional',function(p){p.exceptions.proof={input:'activity.sensitive',equals:true,when:{path:'activity.sensitive',equals:true},disposition:'HUMAN_REVIEW_REQUIRED'};}],
  ['exception_disposition',function(p){p.exceptions.expert.disposition='UNSUPPORTED';}],
  ['unsupported_condition_changed',function(p){p.unsupported_conditions.special_process.equals=false;}],
  ['effective_period',function(p){p.effective_to='2026-06-15';}],
  ['pack_status',function(p){p.status='UNSUPPORTED';}],
  ['pack_provenance_metadata',function(p){p.provenance='public';}],
  ['unknown_condition_rule',function(p){p.rules.proof={op:'gte',input:'activity.days',value:1,when:{path:'activity.missing_gate',equals:true}};}],
  ['interaction_rule_parameter',function(p){p.parameters.minimum_days.value=8;p.rules.proof={op:'gte',input:'activity.days',value:9};}],
  ['interaction_rule_requirement',function(p){p.rules.proof={op:'gte',input:'activity.days',value:9,when:{path:'activity.stratum',equals:'intensive'}};p.evidence_requirements.sensor={category:'sensor',required:true,when:{path:'activity.stratum',equals:'intensive'}};}],
  ['interaction_calculation_parameter',function(p){p.parameters.factor.value=3;p.calculation_spec.inputs=['field.area_ha'];}],
  ['interaction_condition_parameter',function(p){p.parameters.minimum_days.value=8;p.rules.duration.when={path:'activity.stratum',equals:'intensive'};}],
  ['interaction_multi_category',function(p){p.rules.area.value=1;p.parameters.factor.value=3;p.evidence_requirements.sensor={category:'sensor',required:true,when:{path:'activity.stratum',equals:'intensive'}};p.exceptions.proof={input:'activity.sensitive',equals:true,when:{path:'activity.sensitive',equals:true},disposition:'HUMAN_REVIEW_REQUIRED'};}]
];

const stats={total_cases:0,oracle_changed:0,oracle_unchanged:0,analyzer_reverify:0,analyzer_unaffected:0,true_positive:0,true_negative:0,false_positive:0,false_negative:0};
const groupStats={methodology:{cases:0,tp:0,tn:0,fp:0,fn:0},parameter:{cases:0,tp:0,tn:0,fp:0,fn:0},field:{cases:0,tp:0,tn:0,fp:0,fn:0},activity:{cases:0,tp:0,tn:0,fp:0,fn:0},evidence:{cases:0,tp:0,tn:0,fp:0,fn:0}};
const falseNegatives=[],falsePositives=[];

function record(group,label,oracleChanged,analyzerReverify) {
  stats.total_cases++;groupStats[group].cases++;
  if(oracleChanged) stats.oracle_changed++; else stats.oracle_unchanged++;
  if(analyzerReverify) stats.analyzer_reverify++; else stats.analyzer_unaffected++;
  var kind;
  if(oracleChanged&&analyzerReverify){stats.true_positive++;groupStats[group].tp++;kind='tp';}
  else if(!oracleChanged&&!analyzerReverify){stats.true_negative++;groupStats[group].tn++;kind='tn';}
  else if(!oracleChanged&&analyzerReverify){stats.false_positive++;groupStats[group].fp++;kind='fp';falsePositives.push(label);}
  else {stats.false_negative++;groupStats[group].fn++;kind='fn';falseNegatives.push(label);}
  check(kind!=='fn','no false negative: '+label);
}

const p1=COMPILER_REGISTRY['NAFT-SYNTHETIC@1'];

mutations.forEach(function(entry,index) {
  var name=entry[0],next=proofPack(index+1,entry[1]);
  var registry=createMethodologyRegistry([p1,next]);
  variants.forEach(function(variant,vindex) {
    var id='PROOF-M-'+String(index+1).padStart(2,'0')+'-'+String(vindex+1).padStart(2,'0');
    var before=variantClaim(id,variant),after=rebindMethodology(before,next.methodology_version);
    var oracleChanged=canonicalize(semanticView(before,p1))!==canonicalize(semanticView(after,next));
    var impact=analyzeImpact([before],{type:'methodology',old_key:compilerKey(p1),new_key:compilerKey(next)},registry);
    record('methodology',name+'/'+variant,oracleChanged,impact.claims[0].requires_reverification);
  });
});

variants.forEach(function(variant,index) {
  var id='PROOF-P-USED-'+String(index+1).padStart(2,'0'),before=variantClaim(id,variant),after=clone(before);
  after.parameter_overrides=Object.assign({},after.parameter_overrides||{},{factor:3});
  var oracleChanged=canonicalize(semanticView(before,p1))!==canonicalize(semanticView(after,p1));
  var impact=analyzeImpact([before],{type:'parameter',pack_key:compilerKey(p1),parameter:'factor',value:3});
  record('parameter','used_factor/'+variant,oracleChanged,impact.claims[0].requires_reverification);
});
variants.forEach(function(variant,index) {
  var id='PROOF-P-UNUSED-'+String(index+1).padStart(2,'0'),before=variantClaim(id,variant),after=clone(before);
  after.parameter_overrides=Object.assign({},after.parameter_overrides||{},{unused:9});
  var oracleChanged=canonicalize(semanticView(before,p1))!==canonicalize(semanticView(after,p1));
  var impact=analyzeImpact([before],{type:'parameter',pack_key:compilerKey(p1),parameter:'unused',value:9});
  record('parameter','unused_parameter/'+variant,oracleChanged,impact.claims[0].requires_reverification);
});

variants.forEach(function(variant,index) {
  var id='PROOF-F-AREA-'+String(index+1).padStart(2,'0'),before=variantClaim(id,variant),after=clone(before);
  after.field.area_ha=3;
  var oracleChanged=canonicalize(semanticView(before,p1))!==canonicalize(semanticView(after,p1));
  var impact=analyzeImpact([before],{type:'field',field_id:before.field.id,patch:{area_ha:3}});
  record('field','area/'+variant,oracleChanged,impact.claims[0].requires_reverification);
});
variants.forEach(function(variant,index) {
  var id='PROOF-F-AMB-'+String(index+1).padStart(2,'0'),before=variantClaim(id,variant),after=clone(before);
  after.field.ambiguous=true;
  var oracleChanged=canonicalize(semanticView(before,p1))!==canonicalize(semanticView(after,p1));
  var impact=analyzeImpact([before],{type:'field',field_id:before.field.id,patch:{ambiguous:true}});
  record('field','ambiguity/'+variant,oracleChanged,impact.claims[0].requires_reverification);
});

[
  ['days',function(before){return {days:12};}],
  ['stratum',function(before){return {stratum:'intensive'};}],
  ['start',function(before){return {start:'2026-06-02'};}],
  ['unused_sensitive_flag',function(before){return {sensitive:true};}]
].forEach(function(spec) {
  variants.forEach(function(variant,index) {
    var id='PROOF-A-'+spec[0].toUpperCase()+'-'+String(index+1).padStart(2,'0'),before=variantClaim(id,variant),patch=spec[1](before),after=clone(before);
    after.activity=Object.assign({},after.activity,clone(patch));
    var oracleChanged=canonicalize(semanticView(before,p1))!==canonicalize(semanticView(after,p1));
    var impact=analyzeImpact([before],{type:'activity',activity_id:before.activity.id,patch:patch});
    record('activity',spec[0]+'/'+variant,oracleChanged,impact.claims[0].requires_reverification);
  });
});

const evidenceMutations=[
  ['content',function(e){e.content+='-proof-change';}],
  ['adapter',function(e){e.adapter='photo-bytes-v1';}],
  ['activity_binding',function(e){e.activity_id='OTHER-ACTIVITY';}],
  ['field_binding',function(e){e.field_id='OTHER-FIELD';}],
  ['methodology_binding',function(e){e.methodology_version='wrong';}],
  ['period',function(e){e.period=Object.assign({},e.period,{end:'2026-07-01'});}],
  ['category',function(e){e.category='photo';}],
  ['expected_hash',function(e){e.expected_hash='0'.repeat(64);}],
  ['provenance',function(e){e.provenance='private';}],
  ['source_metadata_only',function(e){e.source='urn:naft:changed-source-metadata';}]
];
evidenceMutations.forEach(function(spec) {
  variants.forEach(function(variant,index) {
    var id='PROOF-E-'+spec[0].toUpperCase()+'-'+String(index+1).padStart(2,'0'),before=variantClaim(id,variant);
    if(!before.evidence.length) return;
    var targetId=before.evidence[0].id,replacement=clone(before.evidence[0]);spec[1](replacement,before);
    var after=clone(before);after.evidence=after.evidence.map(function(e){return e.id===targetId?clone(replacement):e;});
    var oracleChanged=canonicalize(semanticView(before,p1))!==canonicalize(semanticView(after,p1));
    var impact=analyzeImpact([before],{type:'evidence',activity_id:before.activity.id,evidence_id:targetId,replacement:replacement});
    record('evidence',spec[0]+'/'+variant,oracleChanged,impact.claims[0].requires_reverification);
  });
});

check(stats.false_negative===0,'zero false negatives in tested state space');
check(stats.oracle_changed>0,'oracle matrix is non-vacuous');
check(stats.oracle_unchanged>0,'oracle includes unchanged semantics');
check(stats.true_positive>0,'matrix contains true positives');
check(stats.true_negative>0,'matrix contains true negatives');

const report={
  schema:'naft-impact-proof-1',
  research_question:"Within NaFT's explicitly supported rule interpreter and evidence model, can selective re-verification avoid false negatives when compared with an independent full re-computation oracle across deterministic adversarial changes?",
  boundary:'Synthetic deterministic adversarial engineering cases only. No universal proof, institutional-methodology proof, field accuracy, runtime saving, cost reduction, or verifier acceptance is asserted.',
  oracle:{
    name:'full-recomputation-semantic-view-v1',
    independence:'The oracle compiles before/after states directly and compares an independently normalized verification-semantic view. It does not call analyzeImpact or activeProjection.',
    semantics:['active rule results','active evidence obligations','missing evidence','issue code/status','used parameter values','calculation operation/inputs/parameters/unit','calculation values/arithmetic preview','evaluation status'],
    ignored_metadata:['methodology version identifier','rule-pack version identifier','source URL/hash/check timestamp','scope text']
  },
  matrix:{
    methodology_mutations:mutations.map(function(x){return x[0];}),
    claim_variants:variants,
    groups:{methodology_cases:mutations.length*variants.length,parameter_cases:variants.length*2,field_cases:variants.length*2,activity_cases:variants.length*4,evidence_cases:evidenceMutations.length*(variants.length-1)}
  },
  result:Object.assign({},stats,{
    soundness_within_tested_space:stats.false_negative===0,
    false_negative_rate:stats.oracle_changed?stats.false_negative/stats.oracle_changed:null,
    conservative_oververification_rate:stats.oracle_unchanged?stats.false_positive/stats.oracle_unchanged:null
  }),
  interpretation:'No false negatives found in '+stats.total_cases+' deterministic adversarial cases within the currently supported interpreter and change APIs.',
  counterexamples:{false_negatives:falseNegatives}
};
if(!failed) fs.writeFileSync('reports/impact-proof.json',JSON.stringify(report,null,2)+'\n');
console.log('IMPACT PROOF SUMMARY '+JSON.stringify(report.result));
console.log('IMPACT PROOF RESULT: '+passed+' passed, '+failed+' failed');
if(failed) process.exit(1);
