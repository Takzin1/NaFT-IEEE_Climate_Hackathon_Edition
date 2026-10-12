'use strict';
function syntheticClaim(id,variant) {
  var input={provenance:'synthetic',program:{id:'SYNTHETIC-PROGRAM'},field:{id:'FIELD-'+id,farmer_id:'FARMER-DEMO',program_id:'SYNTHETIC-PROGRAM',area_ha:2,ambiguous:false},activity:{id:id,field_id:'FIELD-'+id,farmer_id:'FARMER-DEMO',program_id:'SYNTHETIC-PROGRAM',methodology_id:'NAFT-SYNTHETIC',methodology_version:'1',type:'synthetic_observation',start:'2026-06-01',end:'2026-06-30',days:10,stratum:'standard',sensitive:false},evidence:[],peers:[]};
  function evidence(category,adapter) { var content=JSON.stringify({provenance:'synthetic',claim:id,category:category,observation:'engineering fixture'});return {id:id+'-'+category,category:category,adapter:adapter,content:content,expected_hash:digestText(content),activity_id:id,field_id:input.field.id,methodology_id:'NAFT-SYNTHETIC',methodology_version:'1',period:{start:input.activity.start,end:input.activity.end},source:'urn:naft:synthetic-fixture',provenance:'synthetic'}; }
  input.evidence.push(evidence('record','farm-log-json-v1'));
  if(variant==='intensive') { input.activity.stratum='intensive';input.evidence.push(evidence('photo','photo-bytes-v1')); }
  if(variant==='intensive_complete') { input.activity.stratum='intensive';input.evidence.push(evidence('photo','photo-bytes-v1'),evidence('sensor','iot-json-v1')); }
  if(variant==='sensitive') input.activity.sensitive=true;
  if(variant==='expert') input.activity.expert_case=true;
  if(variant==='ambiguous') input.field.ambiguous=true;
  if(variant==='unsupported') input.activity.special_process=true;
  return input;
}
function demoClaims() { return ['standard','intensive','sensitive','unsupported','intensive_complete','intensive'].map(function(v,i) { return syntheticClaim('DEMO-'+(i+1),v); }); }
var CompilerUI={runId:null,impact:null,message:''};
function compilerPanel(route) {
  var out='<section class="card"><span class="eyebrow">Evidence Compiler · 3 minute synthetic demo</span><h2>Evidence → Package / Change → Re-verification</h2><p>合成データと合成ルールによる動作実験です。AG-005の改定や実農家データを表しません。正式認証ではありません。</p>';
  if(route==='methodologies') out+='<p>Versioned registry: '+Object.keys(COMPILER_REGISTRY).map(esc).join(' · ')+'</p><details><summary>Pack schema / source / unknowns</summary>'+jsonView(VERSIONED_PACKS)+'</details><label>Release pack<select id="compiler-pack">'+Object.keys(COMPILER_REGISTRY).map(function(k) { return '<option>'+esc(k)+'</option>'; }).join('')+'</select></label><label>Release rationale<textarea id="compiler-release-note"></textarea></label>'+button('Approve research Pack','compiler-release',currentUser().role!=='maintainer');
  out+=button('Demo A · Evidence → draft','compiler-demo-a',currentUser().role!=='operator')+button('Demo B · version diff / impact','compiler-demo-b',false)+button('Demo C · ambiguous → review','compiler-demo-c',currentUser().role!=='operator');
  if(route==='readiness') out+=button('Apply v1 → v2 to saved synthetic claims','compiler-apply-version',currentUser().role!=='operator');
  if(route==='evidence') out+='<details><summary>Compile normalized evidence input JSON</summary><p>写真はbytes、営農・IoT・GISは明示的なcontent/bytesとmetadataを受け取ります。内容の意味解析は未実装です。</p><textarea id="compiler-input" rows="12">'+esc(JSON.stringify(syntheticClaim('CUSTOM-1'),null,2))+'</textarea>'+button('Compile evidence → evaluation → draft','compiler-input',currentUser().role!=='operator')+'</details>';
  if(CompilerUI.impact) { out+=button('Download impact JSON','compiler-export-impact',false)+'<h3>Demo B · fixture-derived impact</h3>'+jsonView(CompilerUI.impact.counts)+'<details><summary>Structured methodology diff</summary>'+jsonView(compareMethodologyVersions(COMPILER_REGISTRY['NAFT-SYNTHETIC@1'],COMPILER_REGISTRY['NAFT-SYNTHETIC@2']))+'</details><table><thead><tr><th>Claim</th><th>Scope</th><th>Status</th></tr></thead><tbody>'+CompilerUI.impact.claims.map(function(r) { return '<tr><td>'+esc(r.claim_id)+'</td><td>'+esc(r.requires_reverification?'re-verify':'unchanged')+'</td><td>'+esc(r.status)+'</td></tr>'; }).join('')+'</tbody></table>'; }
  if(CompilerUI.runId) {
    try { var r=currentCompilerRun(CompilerUI.runId),pkg=compilerDraft(r.id);out+='<h3>Compiler claim '+esc(r.input.activity.id)+'</h3><p><b>'+esc(pkg.document.evaluation.status)+'</b> · hash <code>'+esc(pkg.package_hash)+'</code></p><details><summary>Exceptions / calculation / provenance</summary>'+jsonView({evaluation:pkg.document.evaluation,calculation:pkg.document.calculation,graph:pkg.document.provenance_graph})+'</details>';
      if(route==='review'||route==='exceptions') {
        var recorded=compilerDecisions(r),humanIssues=pkg.document.evaluation.issues.filter(function(e) { return e.status==='HUMAN_REVIEW_REQUIRED'; });
        out+='<h3>Individual human decisions</h3>'+(humanIssues.length?humanIssues.map(function(issue,i) { var d=recorded.find(function(x) { return x.exception_code===issue.code; });return '<article class="card"><b>'+esc(issue.code)+'</b><p>'+esc(issue.detail)+'</p>'+(d?'<p>Decision: <b>'+esc(d.decision)+'</b> · '+esc(d.reason)+'</p>':'<label>Reason<textarea id="compiler-reason-'+i+'"></textarea></label><button data-action="compiler-decision" data-index="'+i+'" data-code="'+esc(issue.code)+'" data-decision="ACCEPT" '+(currentUser().role!=='reviewer'?'disabled':'')+'>ACCEPT</button><button data-action="compiler-decision" data-index="'+i+'" data-code="'+esc(issue.code)+'" data-decision="REJECT" '+(currentUser().role!=='reviewer'?'disabled':'')+'>REJECT</button><button data-action="compiler-decision" data-index="'+i+'" data-code="'+esc(issue.code)+'" data-decision="NEED_MORE_EVIDENCE" '+(currentUser().role!=='reviewer'?'disabled':'')+'>NEED_MORE_EVIDENCE</button><button data-action="compiler-decision" data-index="'+i+'" data-code="'+esc(issue.code)+'" data-decision="ABSTAIN" '+(currentUser().role!=='reviewer'?'disabled':'')+'>ABSTAIN</button>')+'</article>'; }).join(''):'<p>No HUMAN_REVIEW_REQUIRED exceptions.</p>');
        out+='<label>Final attestation rationale<textarea id="compiler-note"></textarea></label><label><input id="compiler-ack" type="checkbox"> 原資料と制約を確認。研究Packageへの宣誓であり正式認証ではない。</label>'+button('Attest compiler package','compiler-attest',currentUser().role!=='reviewer');
      }
      out+=button('Download compiler draft','compiler-export',false)+button('Download attested compiler package','compiler-export-attested',false)+'<a href="#/review">Final attestationへ</a>';
    } catch(e) { out+='<p class="error">'+esc(e.message)+'</p>'; }
  }
  return out+'<p role="status">'+esc(CompilerUI.message)+'</p></section>';
}
async function handleCompilerAction(action,el) {
  try {
    if(action==='compiler-demo-a'||action==='compiler-demo-c'||action==='compiler-input') {
      var input=action==='compiler-input'?JSON.parse(readValue('compiler-input')):syntheticClaim(action==='compiler-demo-a'?'DEMO-A':'DEMO-C',action==='compiler-demo-c'?'ambiguous':'standard');
      var r=await compileAndSave(input);CompilerUI.runId=r.id;CompilerUI.message=r.package.document.evaluation.status+' · draft generated automatically';
    }
    if(action==='compiler-export-impact'&&CompilerUI.impact) downloadJSON(canonicalize(CompilerUI.impact),'naft-impact-analysis.json');
    if(action==='compiler-demo-b') { CompilerUI.impact=analyzeImpact(demoClaims(),{type:'methodology',old_key:'NAFT-SYNTHETIC@1',new_key:'NAFT-SYNTHETIC@2'});CompilerUI.message='Synthetic version transition; originals unchanged.'; }
    if(action==='compiler-apply-version') { CompilerUI.impact=await applyCompilerChange({type:'methodology',old_key:'NAFT-SYNTHETIC@1',new_key:'NAFT-SYNTHETIC@2'});if(CompilerUI.runId) {var old=db.compiler_runs.find(function(r) {return r.id===CompilerUI.runId;});CompilerUI.runId=latestCompilerRun(old.input.activity.id).id;}CompilerUI.message='Successor drafts saved; previous packages are historical and stale for current export.'; }
    if(action==='compiler-release') { await approveVersionedPack(readValue('compiler-pack'),readValue('compiler-release-note'));CompilerUI.message='Research Pack release approved.'; }
    if(action==='compiler-decision') { if(!el) throw new Error('DECISION_SELECTION_REQUIRED');await reviewCompilerRun(CompilerUI.runId,el.dataset.code,el.dataset.decision,readValue('compiler-reason-'+el.dataset.index));CompilerUI.message='Individual exception decision recorded against exact input and Pack.'; }
    if(action==='compiler-attest') { await attestCompilerRun(CompilerUI.runId,readValue('compiler-note'),document.getElementById('compiler-ack').checked);CompilerUI.message='Research package attested. Formal verification not performed.'; }
    if(action==='compiler-export'||action==='compiler-export-attested') downloadJSON(exportCompilerRun(CompilerUI.runId,action==='compiler-export-attested'),'naft-compiler-package.json');
  } catch(e) { CompilerUI.message='BLOCKED: '+e.message; }
}
