'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const name of ['mrv-core','methodology-packs','mrv-compiler','compiler-demo','reviewer-demo']) {
  vm.runInThisContext(fs.readFileSync('src/'+name+'.js','utf8'));
}
let passed=0,failed=0;
function check(value,label) {
  try { assert.ok(value,label);passed++; }
  catch(error) { failed++;console.error('FAIL: '+label);process.exitCode=1; }
}
function eq(actual,expected,label) {
  try { assert.deepEqual(actual,expected);passed++; }
  catch(error) { failed++;console.error('FAIL: '+label+'\n'+error.message);process.exitCode=1; }
}

const claims=mitouReviewerClaims();
const before=canonicalize(claims);
const impact=runMitouReviewerExperiment(claims);
const rerun=runMitouReviewerExperiment();

eq(claims.length,100,'100-claim synthetic batch');
eq(impact.counts,{
  total:100,
  potentially_affected:100,
  require_reverification:30,
  UNAFFECTED:70,
  AUTO_REEVALUATED:15,
  EVIDENCE_REQUIRED:15,
  HUMAN_REVIEW_REQUIRED:0,
  UNSUPPORTED:0
},'selective re-verification count matrix');
eq(canonicalize(claims),before,'impact analysis does not mutate source claims');
eq(canonicalize(impact),canonicalize(rerun),'impact result is deterministic');
check(impact.claims.filter(r=>r.requires_reverification).every(r=>r.successor&&r.successor.document.provenance_graph.edges.some(e=>e.type==='supersedes')),'all reverified claims create linked successors');
check(impact.claims.filter(r=>!r.requires_reverification).every(r=>r.successor===null),'unaffected claims do not create successor packages');
eq(impact.claims.slice(0,70).filter(r=>r.requires_reverification).length,0,'70 standard claims remain outside re-verification scope');
eq(impact.claims.slice(70).filter(r=>r.requires_reverification).length,30,'30 intensive claims enter re-verification scope');
check(claims.every(c=>c.activity.methodology_version==='1'),'original methodology versions remain immutable');
eq((impact.counts.total-impact.counts.require_reverification)/impact.counts.total,0.7,'count-based re-verification scope reduction is 70 percent');

const report={
  schema:'naft-mitou-impact-experiment-1',
  title:'Selective re-verification under a synthetic methodology revision',
  boundary:'Synthetic engineering experiment only. This is not an AG-005 revision, field validation, measured runtime saving, MRV cost reduction, or verifier acceptance result.',
  corpus:{
    total_claims:100,
    methodology:'NAFT-SYNTHETIC',
    from_version:'1',
    to_version:'2',
    composition:{
      standard_claims:70,
      intensive_missing_new_sensor_evidence:15,
      intensive_complete_for_new_requirements:15
    }
  },
  result:{
    potentially_affected_candidates:impact.counts.potentially_affected,
    require_reverification:impact.counts.require_reverification,
    unaffected:impact.counts.UNAFFECTED,
    auto_reevaluated:impact.counts.AUTO_REEVALUATED,
    evidence_required:impact.counts.EVIDENCE_REQUIRED,
    human_review_required:impact.counts.HUMAN_REVIEW_REQUIRED,
    unsupported:impact.counts.UNSUPPORTED,
    count_based_scope_reduction_ratio:0.7
  },
  interpretation:'All 100 claims reference the changed methodology version, but per-claim active dependency projections limit actual re-verification to 30 claims. The remaining 70 claims are not recompiled as successors. The 70% figure is a count-based scope reduction, not a measured time, cost, or accuracy improvement.',
  invariants:{
    deterministic_replay:true,
    source_claims_immutable:true,
    reverified_successors_link_previous_package:true,
    unaffected_claims_have_no_successor:true
  }
};
fs.writeFileSync('reports/mitou-impact-experiment.json',JSON.stringify(report,null,2)+'\n');
console.log('MITOU IMPACT RESULT: '+passed+' passed, '+failed+' failed');
if(failed) process.exit(1);
