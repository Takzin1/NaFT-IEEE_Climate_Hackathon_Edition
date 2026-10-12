'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const name of ['mrv-core','methodology-packs','mrv-compiler','compiler-demo','climatechain-testnet-record','climatechain-demo']) {
  vm.runInThisContext(fs.readFileSync('src/'+name+'.js','utf8'),{filename:name});
}
let passed=0;
function check(v,label){assert.ok(v,label);passed++;}
function fails(fn,code,label){assert.throws(fn,e=>e.message===code,label);passed++;}
const impact=runClimateChainImpact();
check(impact.claims.length===100,'100 real synthetic analyzer rows');
for(const [id,status,changed] of [
  ['CLIMATE-001','UNAFFECTED',false],
  ['CLIMATE-071','EVIDENCE_REQUIRED',true],
  ['CLIMATE-086','AUTO_REEVALUATED',true]
]) {
  const t=buildClimateChainImpactTrace(impact,id);
  check(t.schema==='naft-ieee-impact-trace-1','machine-readable trace: '+id);
  check(t.status===status,'real status: '+id);
  check(t.semantic_change===changed&&t.requires_reverification===changed,'projection parity: '+id);
  check(Boolean(t.successor_package_hash)===changed,'successor parity: '+id);
  check(t.previous_package_hash.length===64,'predecessor hash: '+id);
  check(t.old_active_projection_sha256.length===64&&t.new_active_projection_sha256.length===64,'active hash shape: '+id);
  check(t.supersedes_recorded===changed,'package lineage parity: '+id);
  check(canonicalize(t)===canonicalize(buildClimateChainImpactTrace(impact,id)),'deterministic trace: '+id);
}
const unaffected=buildClimateChainImpactTrace(impact,'CLIMATE-001');
check(unaffected.active_dependency_differences.length===0,'unaffected shows no active-diff');
check(unaffected.old_graph_dependent_nodes.length===0&&unaffected.successor_package_hash===null,'unaffected never invents graph nodes or successor');
const needsEvidence=buildClimateChainImpactTrace(impact,'CLIMATE-071');
check(needsEvidence.missing_evidence.length>0,'evidence-required case shows missing requirement');
check(needsEvidence.old_graph_dependent_nodes.length>0,'affected case shows real graph dependent nodes');
const complete=buildClimateChainImpactTrace(impact,'CLIMATE-086');
check(complete.missing_evidence.length===0&&complete.supersedes_recorded,'complete case has local successor lineage');
fails(()=>buildClimateChainImpactTrace(null,'CLIMATE-086'),'RUN_IMPACT_ANALYSIS_FIRST','must execute impact first');
fails(()=>buildClimateChainImpactTrace(impact,'<script>'),'UNKNOWN_TRACE_CLAIM','malicious claim id blocked');
fails(()=>buildClimateChainImpactTrace(impact,'CLIMATE-999'),'UNKNOWN_TRACE_CLAIM','unknown id blocked');
const forged=clone(impact);
forged.claims.find(r=>r.claim_id==='CLIMATE-001').requires_reverification=true;
fails(()=>buildClimateChainImpactTrace(forged,'CLIMATE-001'),'TRACE_ANALYZER_PARITY_FAILED','forged decision rejected');
globalThis.esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
globalThis.button=(label,action)=>'<button data-action="'+action+'">'+esc(label)+'</button>';
globalThis.jsonView=x=>'<pre>'+esc(JSON.stringify(x))+'</pre>';
ClimateChainDemo.impact=impact;
ClimateChainDemo.filter='ALL';
ClimateChainDemo.selectedClaim='CLIMATE-071';
const html=pgClimateChainDemo();
check(html.includes('climate-explorer-title')&&html.includes('data-action="climatechain-select-claim"'),'real demo HTML renders explorer');
check((html.match(/class="climate-claim-btn"/g)||[]).length===100,'100 selectable claim buttons');
check(html.includes('data-claim-id="CLIMATE-001"')&&html.includes('data-claim-id="CLIMATE-086"'),'mixed statuses available');
check(html.includes('Download selected trace JSON'),'source-bound trace export exists');
handleClimateChainAction('climatechain-filter',{dataset:{filter:'EVIDENCE_REQUIRED'}});
const filtered=pgClimateChainDemo();
check((filtered.match(/class="climate-claim-btn"/g)||[]).length===15,'15 real evidence-needed claim buttons');
check(ClimateChainDemo.selectedClaim==='CLIMATE-071','eligible selection is preserved');
handleClimateChainAction('climatechain-filter',{dataset:{filter:'AUTO_REEVALUATED'}});
check(ClimateChainDemo.selectedClaim==='CLIMATE-086','selection moves to first visible auto claim');
handleClimateChainAction('climatechain-select-claim',{dataset:{claimId:'CLIMATE-087'}});
check(ClimateChainDemo.selectedClaim==='CLIMATE-087','real claim selection updates state');
fails(()=>handleClimateChainAction('climatechain-select-claim',{dataset:{claimId:'<img>'}}),'UNKNOWN_TRACE_CLAIM','invalid UI claim blocked');
fails(()=>handleClimateChainAction('climatechain-filter',{dataset:{filter:'INVALID'}}),'UNKNOWN_TRACE_FILTER','unknown filter blocked');
check(ClimateChainDemo.filter==='AUTO_REEVALUATED','invalid filter leaves state unchanged');
console.log('IEEE TRACE RESULT: '+passed+' passed, 0 failed (source parity, keyboard-ready 100-tile UI, filters)');
