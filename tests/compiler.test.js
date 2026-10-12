'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const name of ['mrv-core','methodology-packs','mrv-compiler','compiler-session','compiler-demo','mrv-ui']) vm.runInThisContext(fs.readFileSync('src/'+name+'.js','utf8'));
let passed=0,failed=0;
function check(value,label) { try { assert.ok(value,label);passed++; } catch(e) { failed++;console.error('FAIL: '+label);process.exitCode=1; } }
function eq(a,b,label) { check(canonicalize(a)===canonicalize(b),label); }
async function blocks(fn,message,label) { try { await fn();check(false,label+' did not block'); } catch(e) { eq(e.message,message,label); } }
const p1=COMPILER_REGISTRY['NAFT-SYNTHETIC@1'],p2=COMPILER_REGISTRY['NAFT-SYNTHETIC@2'];
const corpus=JSON.parse(fs.readFileSync('fixtures/evaluation-corpus.json','utf8'));
let calculationMatched=0,reproductionMatched=0;
const counts={missing:{tp:0,fp:0,fn:0,tn:0},tamper:{tp:0,fp:0,fn:0,tn:0},mismatch:{tp:0,fp:0,fn:0,tn:0},duplicate:{tp:0,fp:0,fn:0,tn:0}};
function confusion(name,expected,actual) { counts[name][expected?(actual?'tp':'fn'):(actual?'fp':'tn')]++; }
function humanDecision(input,pack,code,decision,reason,runId,reviewer) {
  var binding={claim_id:input.activity.id,run_id:runId||'RUN-TEST',exception_code:code,input_fingerprint:inputFingerprint(input),pack_hash:hashObject(pack),reviewer:reviewer||'reviewer',reason:reason||'Synthetic reviewer rationale with sufficient detail for deterministic testing.',decision:decision};
  return Object.assign({},binding,{decision_hash:hashObject(binding)});
}
function appendLineageRun(input,pack,supersedes) {
  var pkg=compileEvidence(input,pack,{supersedes:supersedes||undefined});
  var r=seal({id:uid('lineage'),owner:'operator',input:canonicalCompilerInput(input),pack:clone(pack),package:pkg,supersedes:supersedes||null},'run_hash');
  db.compiler_runs.push(r);audit('compiler_run',r.id,{hash:r.run_hash});return r;
}
(async function() {
  for(const p of VERSIONED_PACKS) check(validatePack(p)===p,'valid Pack schema '+compilerKey(p));
  check(Object.isFrozen(COMPILER_REGISTRY['NAFT-SYNTHETIC@1'].rules),'registry deep frozen');
  await blocks(()=>createMethodologyRegistry([p1,p1]),'DUPLICATE_PACK_VERSION','duplicate immutable version refused');
  const bad=clone(p1);delete bad.effective_to;await blocks(()=>validatePack(bad),'PACK_FIELD_REQUIRED:effective_to','missing applicability fails');
  check(METHODOLOGY_REGISTRY['AG-005@3.1-reference']===AG005_RULE,'old reference exactly retained');
  eq(AG005_RULE.methodology_version,'3.1-reference','reference not replaced');
  check(COMPILER_REGISTRY['AG-004@UNKNOWN'].status==='UNSUPPORTED','AG004 fail closed');
  const diff=compareMethodologyVersions(p1,p2);eq(diff.changed_rules.map(r=>r.id),['extended'],'rule addition');eq(diff.changed_parameters.map(r=>r.id),['intensive_min_days'],'parameter change');eq(diff.changed_evidence_requirements.map(r=>r.id),['sensor'],'requirement addition');eq(diff.changed_exceptions.map(r=>r.id),['sensitive'],'exception addition');
  const reverse=compareMethodologyVersions(p2,p1);eq(reverse.changed_exceptions[0].change,'removed','exception removal');eq(reverse.changed_rules[0].change,'removed','rule removal');
  eq(diff,compareMethodologyVersions(clone(p1),clone(p2)),'diff reproducible');
  await blocks(()=>compareMethodologyVersions(p1,COMPILER_REGISTRY['AG-004@UNKNOWN']),'DIFFERENT_METHODOLOGIES','cross methodology refused');
  const calcChange=clone(p1);calcChange.calculation_spec.unit='other';eq(compareMethodologyVersions(p1,calcChange).changed_calculation_spec.map(x=>x.id),['unit'],'calculation spec diff');
  const invalidOp=clone(p1);invalidOp.rules.duration.op='unknown';eq(compileEvidence(syntheticClaim('op'),invalidOp).document.evaluation.status,'UNSUPPORTED','unknown operation not executed');
  for(const c of corpus.cases) {
    check(c.metadata.origin==='synthetic'&&!c.metadata.real_farmer_data,'truthful origin '+c.id);
    const before=canonicalize(c.input),r=compileEvidence(c.input,COMPILER_REGISTRY[c.pack_key]);
    eq(r.document.evaluation.status,c.expected.status,'corpus '+c.id);
    const issues=r.document.evaluation.issues;
    const missing=r.document.evaluation.missing_evidence.length>0,tamper=issues.some(e=>e.code.startsWith('content_hash:')),mismatch=issues.some(e=>e.code==='methodology_mismatch'||e.code.startsWith('manifest_binding:')),duplicate=issues.some(e=>e.code==='duplicate_overlap');
    confusion('missing',c.expected.missing_evidence,missing);confusion('tamper',c.expected.tamper,tamper);confusion('mismatch',c.expected.methodology_mismatch,mismatch);confusion('duplicate',c.expected.duplicate,duplicate);
    eq({missing,tamper,mismatch,duplicate},{missing:c.expected.missing_evidence,tamper:c.expected.tamper,mismatch:c.expected.methodology_mismatch,duplicate:c.expected.duplicate},'oracle detection '+c.id);
    if(r.document.calculation.arithmetic_preview===c.expected.expected_arithmetic_preview)calculationMatched++;
    if(r.package_hash===compileEvidence(clone(c.input),clone(COMPILER_REGISTRY[c.pack_key])).package_hash)reproductionMatched++;
    eq(r.document.calculation.arithmetic_preview,c.expected.expected_arithmetic_preview,'independent multiplication oracle '+c.id);
    eq(r.package_hash,compileEvidence(clone(c.input),clone(COMPILER_REGISTRY[c.pack_key])).package_hash,'package reproducibility '+c.id);
    eq(canonicalize(c.input),before,'pure input '+c.id);
  }
  eq(corpus.cases.length,36,'36 labeled cases');
  const normal=syntheticClaim('graph'),result=compileEvidence(normal,p1),graph=result.document.provenance_graph;
  const types=new Set(graph.nodes.map(n=>n.type));check(['evidence','field','activity','methodology','rule','parameter','calculation','package'].every(x=>types.has(x)),'graph structural node types');
  check(graph.edges.every(e=>graph.nodes.some(n=>n.id===e.from)&&graph.nodes.some(n=>n.id===e.to)),'no dangling edges');
  const reached=traceDependents(graph,['evidence:graph-record']);check(reached.includes('calculation:graph')&&reached.includes('package:graph'),'evidence transitively reaches calc/package');
  eq(graph,compileEvidence(clone(normal),p1).document.provenance_graph,'graph determinism');
  const reversed=syntheticClaim('permute','intensive'),permuted=clone(reversed);permuted.evidence.reverse();eq(compileEvidence(reversed,p1),compileEvidence(permuted,p1),'unordered evidence permutation stable');
  const claims=demoClaims(),change={type:'methodology',old_key:compilerKey(p1),new_key:compilerKey(p2)},impact=analyzeImpact(claims,change);
  eq(impact.counts,{total:6,potentially_affected:6,require_reverification:4,UNAFFECTED:2,AUTO_REEVALUATED:1,EVIDENCE_REQUIRED:2,HUMAN_REVIEW_REQUIRED:1,UNSUPPORTED:0},'fixture impact counts');
  eq(impact,analyzeImpact(claims.slice().reverse(),change),'impact input order stable');
  check(impact.claims.filter(r=>r.requires_reverification).every(r=>r.successor.document.provenance_graph.edges.some(e=>e.type==='supersedes')),'successor links originals');
  eq(claims.map(c=>c.activity.methodology_version),Array(6).fill('1'),'original claims unchanged');
  const isolated=clone(p2);isolated.parameters.factor=clone(p1.parameters.factor);delete isolated.exceptions.sensitive;
  const reg=createMethodologyRegistry([p1,isolated]);const selective=analyzeImpact(claims,change,reg);
  eq(selective.claims.filter(r=>r.requires_reverification).map(r=>r.claim_id),['DEMO-2','DEMO-5','DEMO-6'],'conditional added rule/requirement exact scope');
  eq(selective.counts.potentially_affected,6,'candidate set wider than re-evaluation');
  const unused=analyzeImpact(claims,{type:'parameter',pack_key:compilerKey(p1),parameter:'unused',value:9});eq(unused.counts.require_reverification,0,'unused parameter skips recalculation');
  const factor=analyzeImpact(claims,{type:'parameter',pack_key:compilerKey(p1),parameter:'factor',value:9});eq(factor.counts.require_reverification,6,'used parameter affects all dependent claims');
  eq(factor.claims[0].successor.document.calculation.arithmetic_preview,180,'changed factor recalculated');
  const field=analyzeImpact(claims,{type:'field',field_id:claims[0].field.id,patch:{area_ha:3}});eq(field.claims.filter(r=>r.requires_reverification).map(r=>r.claim_id),['DEMO-1'],'field exact scope');
  eq(field.claims[0].successor.document.calculation.arithmetic_preview,60,'field change calculation');
  const activityDays=analyzeImpact(claims,{type:'activity',activity_id:'DEMO-1',patch:{days:12}});eq(activityDays.claims.filter(r=>r.requires_reverification).map(r=>r.claim_id),['DEMO-1'],'activity exact scope');
  eq(activityDays.claims[0].successor.document.calculation.arithmetic_preview,48,'activity change calculation');
  const activityStratum=analyzeImpact([claims[0]],{type:'activity',activity_id:'DEMO-1',patch:{stratum:'intensive'}});eq(activityStratum.claims[0].status,'EVIDENCE_REQUIRED','activity conditional transition triggers evidence obligation');
  const activityNoop=analyzeImpact([claims[0]],{type:'activity',activity_id:'DEMO-1',patch:{days:10}});eq(activityNoop.counts.potentially_affected,0,'activity no-op ignored');
  await blocks(()=>analyzeImpact([claims[0]],{type:'activity',activity_id:'DEMO-1',patch:{id:'rewritten'}}),'ACTIVITY_IDENTITY_CHANGE_UNSUPPORTED','activity id rewrite refused');
  await blocks(()=>analyzeImpact([claims[0]],{type:'activity',activity_id:'DEMO-1',patch:{methodology_version:'2'}}),'ACTIVITY_IDENTITY_CHANGE_UNSUPPORTED','activity methodology rewrite uses methodology change path');
  await blocks(()=>analyzeImpact([claims[0]],{type:'activity',activity_id:'DEMO-1',patch:null}),'INVALID_CHANGE_PATCH','activity patch shape validated');
  await blocks(()=>analyzeImpact([claims[0]],{type:'field',field_id:claims[0].field.id,patch:JSON.parse('{"__proto__":{"polluted":true}}')}),'UNSAFE_CHANGE_PATCH_KEY','patch prototype key refused');
  const replacement=clone(claims[0].evidence[0]);replacement.content+='tamper';const evidence=analyzeImpact(claims,{type:'evidence',activity_id:'DEMO-1',evidence_id:replacement.id,replacement});eq(evidence.counts.require_reverification,1,'evidence exact scope');eq(evidence.claims[0].status,'UNSUPPORTED','changed byte hash mismatch');
  eq(factor.claims[0].status,'HUMAN_REVIEW_REQUIRED','material override routes to human');
  const unknownCondition=syntheticClaim('unknown-condition');delete unknownCondition.activity.stratum;
  eq(compileEvidence(unknownCondition,p1).document.evaluation.status,'UNSUPPORTED','unknown applicability is fail closed');
  const conditionalUpdate=analyzeImpact([unknownCondition],change);check(conditionalUpdate.claims[0].requires_reverification,'unknown applicability is included in impact scope');
  const malformed=syntheticClaim('bad-json');malformed.evidence[0].content='{broken';malformed.evidence[0].expected_hash=digestText('{broken');eq(compileEvidence(malformed,p1).document.evaluation.status,'UNSUPPORTED','valid hash cannot authorize malformed JSON');
  check(result.document.evidence_manifests[0].normalized_data.provenance==='synthetic','JSON evidence normalized');
  const io=syntheticClaim('io');for(const adapter of ['iot-json-v1','gis-json-v1','photo-bytes-v1']) {io.evidence[0].adapter=adapter;eq(compileEvidence(io,p1).document.evaluation.status,'AUTO_REEVALUATED','explicit adapter '+adapter);}
  const oldBinding=syntheticClaim('wrong-binding');oldBinding.evidence[0].methodology_version='wrong';const bindingImpact=analyzeImpact([oldBinding],{type:'parameter',pack_key:compilerKey(p1),parameter:'factor',value:4});eq(bindingImpact.claims[0].status,'UNSUPPORTED','change does not repair mismatched evidence silently');
  const noChange=analyzeImpact(claims,{type:'field',field_id:claims[0].field.id,patch:{area_ha:2}});eq(noChange.counts.potentially_affected,0,'no-op ignored');
  await blocks(()=>analyzeImpact([claims[0],claims[0]],change),'DUPLICATE_CLAIM_ID','duplicate claim batch refused');
  const changedInput=clone(normal);changedInput.field.area_ha=8;check(!packageCurrent(result,changedInput,p1),'field invalidates package');
  await blocks(()=>exportCompilerPackage(result,changedInput,p1),'STALE_PACKAGE','stale export refused');
  const badPkg=clone(result);badPkg.document.calculation.result=123;check(!packageCurrent(badPkg,normal,p1),'tampered package refused');
  const ag=syntheticClaim('ag');ag.activity.methodology_id='AG-005';ag.activity.methodology_version='3.1-reference';eq(compileEvidence(ag,COMPILER_REGISTRY['AG-005@3.1-reference']).document.evaluation.status,'UNSUPPORTED','reference cannot masquerade as fully compiled official Pack');
  const unknown=clone(ag);unknown.activity.methodology_id='AG-004';unknown.activity.methodology_version='UNKNOWN';eq(compileEvidence(unknown,COMPILER_REGISTRY['AG-004@UNKNOWN']).document.calculation.result,null,'AG004 quantity remains null');
  const expert=syntheticClaim('review','expert'),expertResult=compileEvidence(expert,p1);
  const decision=humanDecision(expert,p1,'exceptions:expert','ACCEPT','Inspected synthetic evidence and resolved the explicit judgement condition.');
  const reviewed=compileEvidence(expert,p1,{review:[decision]});eq(reviewed.document.evaluation.status,'AUTO_REEVALUATED','judgement resolution only');check(reviewed.document.provenance_graph.nodes.some(n=>n.type==='review'),'review node');check(reviewed.document.provenance_graph.edges.some(e=>e.type==='reviewed_by'),'review edge');
  const staleDecision=clone(decision);staleDecision.input_fingerprint='stale';await blocks(()=>compileEvidence(expert,p1,{review:[staleDecision]}),'STALE_REVIEW','stale decision refused');
  const override=humanDecision(expert,p1,'content_hash:review-record','ACCEPT','Attempted override of deterministic hash failure is not permitted.');await blocks(()=>compileEvidence(expert,p1,{review:[override]}),'BLOCKING_EXCEPTION_NOT_OVERRIDABLE','hard issue cannot be waived');
  db=seedDB();actorId='operator';const run=await compileAndSave(normal);check(run.package.document.evaluation.status==='AUTO_REEVALUATED','one input creates draft automatically');
  setActor('reviewer');await blocks(()=>compileAndSave(normal),'ROLE_BLOCKED','reviewer cannot ingest');
  const note='I inspected this synthetic research package and acknowledge all limitations.';
  await blocks(()=>attestCompilerRun(run.id,note,true),'PACK_RELEASE_APPROVAL_REQUIRED','release approval mandatory');
  setActor('maintainer');await approveVersionedPack(compilerKey(p1),note);setActor('reviewer');
  await blocks(()=>attestCompilerRun(run.id,note,false),'ATTESTATION_ACKNOWLEDGEMENT_REQUIRED','explicit final ack');
  const attested=await attestCompilerRun(run.id,note,true),exported=exportCompilerRun(run.id,true);eq(JSON.parse(exported).package_hash,attested.package_hash,'attested export');
  audit('unrelated','other',{});eq(exportCompilerRun(run.id,true),exported,'unrelated audit does not change bytes');
  setActor('operator');await compileAndSave(changedInput);await blocks(()=>exportCompilerRun(run.id,true),'STALE_PACKAGE','successor invalidates old attestation export');
  const er=await compileAndSave(expert);setActor('reviewer');await reviewCompilerRun(er.id,'exceptions:expert','ACCEPT',note);eq(compilerDraft(er.id).document.evaluation.status,'AUTO_REEVALUATED','audited exception resolution');await attestCompilerRun(er.id,note,true);check(JSON.parse(exportCompilerRun(er.id,true)).document.human_decisions[0].reviewer==='reviewer','human decision exported');
  setActor('operator');const unsupportedRun=await compileAndSave(syntheticClaim('bad','unsupported'));setActor('reviewer');await blocks(()=>reviewCompilerRun(unsupportedRun.id,'unsupported_conditions:special_process','ACCEPT',note),'BLOCKING_EXCEPTION_NOT_OVERRIDABLE','unsupported remains blocked');
  await blocks(()=>attestCompilerRun(unsupportedRun.id,note,true),'UNRESOLVED_EXCEPTIONS','unsupported attestation refused');
  // Individual Human Decision and attestation-gate regression matrix A-I.
  setActor('operator');const multiA=syntheticClaim('multi-a','expert');multiA.field.ambiguous=true;const runA=await compileAndSave(multiA);setActor('reviewer');
  const aAccept=await reviewCompilerRun(runA.id,'identity_ambiguity','ACCEPT',note);const aReject=await reviewCompilerRun(runA.id,'exceptions:expert','REJECT',note);
  eq(aAccept.claim_id,'multi-a','A decision binds claim');eq(aAccept.exception_code,'identity_ambiguity','A decision binds exact exception');check(aAccept.decision_hash===hashObject({claim_id:aAccept.claim_id,run_id:aAccept.run_id,exception_code:aAccept.exception_code,input_fingerprint:aAccept.input_fingerprint,pack_hash:aAccept.pack_hash,reviewer:aAccept.reviewer,reason:aAccept.reason,decision:aAccept.decision}),'A decision hash binding');
  eq(compilerDraft(runA.id).document.evaluation.status,'HUMAN_REVIEW_REQUIRED','A ACCEPT plus REJECT blocks package');await blocks(()=>attestCompilerRun(runA.id,note,true),'UNRESOLVED_EXCEPTIONS','A attestation blocked');
  setActor('operator');const multiB=syntheticClaim('multi-b','expert');multiB.field.ambiguous=true;const runB=await compileAndSave(multiB);setActor('reviewer');
  await reviewCompilerRun(runB.id,'identity_ambiguity','ACCEPT',note);await reviewCompilerRun(runB.id,'exceptions:expert','NEED_MORE_EVIDENCE',note);eq(compilerDraft(runB.id).document.evaluation.status,'HUMAN_REVIEW_REQUIRED','B NEED_MORE_EVIDENCE blocks package');await blocks(()=>attestCompilerRun(runB.id,note,true),'UNRESOLVED_EXCEPTIONS','B attestation blocked');
  setActor('operator');const multiC=syntheticClaim('multi-c','expert');multiC.field.ambiguous=true;const runC=await compileAndSave(multiC);setActor('reviewer');
  await reviewCompilerRun(runC.id,'identity_ambiguity','ACCEPT',note);await reviewCompilerRun(runC.id,'exceptions:expert','ACCEPT',note);eq(compilerDraft(runC.id).document.evaluation.status,'AUTO_REEVALUATED','C all human exceptions accepted');const attC=await attestCompilerRun(runC.id,note,true);check(!!attC.package_hash,'C attestation allowed');
  const pureMulti=syntheticClaim('pure-multi','expert');pureMulti.field.ambiguous=true;const dIdentity=humanDecision(pureMulti,p1,'identity_ambiguity','ACCEPT',note,'PURE-RUN');const dExpert=humanDecision(pureMulti,p1,'exceptions:expert','ACCEPT',note,'PURE-RUN');
  const changedEvidence=clone(pureMulti);changedEvidence.field.area_ha=3;await blocks(()=>compileEvidence(changedEvidence,p1,{review:[dIdentity,dExpert]}),'STALE_REVIEW','D evidence/input change makes old decisions stale');
  const changedPack=clone(p1);changedPack.rule_pack_version='synthetic-rules-1b';await blocks(()=>compileEvidence(pureMulti,changedPack,{review:[dIdentity,dExpert]}),'STALE_REVIEW','E Pack change makes old decisions stale');
  const tampered=syntheticClaim('hard-tamper');tampered.evidence[0].content+='x';const hardAccept=humanDecision(tampered,p1,'content_hash:hard-tamper-record','ACCEPT',note,'HARD-RUN');await blocks(()=>compileEvidence(tampered,p1,{review:[hardAccept]}),'BLOCKING_EXCEPTION_NOT_OVERRIDABLE','F UNSUPPORTED cannot be human accepted');
  const missingInput=syntheticClaim('hard-missing','intensive');missingInput.evidence=missingInput.evidence.filter(e=>e.category!=='photo');const missingAccept=humanDecision(missingInput,p1,'missing_evidence:photo','ACCEPT',note,'MISS-RUN');await blocks(()=>compileEvidence(missingInput,p1,{review:[missingAccept]}),'BLOCKING_EXCEPTION_NOT_OVERRIDABLE','G EVIDENCE_REQUIRED cannot be human accepted');
  const hashTamper=clone(dIdentity);hashTamper.reason='Tampered decision reason that no longer matches the committed decision hash.';await blocks(()=>compileEvidence(pureMulti,p1,{review:[hashTamper,dExpert]}),'DECISION_INTEGRITY_BLOCKED','H single decision hash tamper blocked');
  const packageOne=compileEvidence(pureMulti,p1,{review:[dIdentity,dExpert]}),packageTwo=compileEvidence(clone(pureMulti),clone(p1),{review:[clone(dIdentity),clone(dExpert)]});eq(packageOne.package_hash,packageTwo.package_hash,'I final package hash reproducibility with same input decisions Pack');
  setActor('operator');
  const saved=clone(db);db.compiler_runs[0].input.field.area_ha=100;await blocks(()=>compilerRun(run.id),'COMPILER_RUN_INTEGRITY','saved input tamper detected');db=saved;
  setActor('operator');const latest=await compileAndSave(syntheticClaim('apply'));const applied=await applyCompilerChange({type:'field',field_id:'FIELD-apply',patch:{area_ha:4}});eq(applied.counts.require_reverification,1,'applied change exact scope');await blocks(()=>exportCompilerRun(latest.id,false),'STALE_PACKAGE','applied metadata invalidates prior');
  const latestFieldRun=latestCompilerRun('apply');await applyCompilerChange({type:'parameter',pack_key:compilerKey(p1),parameter:'factor',value:4});await blocks(()=>exportCompilerRun(latestFieldRun.id,false),'STALE_PACKAGE','sequential parameter change invalidates updated field package');
  eq(compilerDraft(latestCompilerRun('apply').id).document.evaluation.status,'HUMAN_REVIEW_REQUIRED','applied material parameter requires human');
  const activitySaved=await compileAndSave(syntheticClaim('activity-apply'));const activityApplied=await applyCompilerChange({type:'activity',activity_id:'activity-apply',patch:{days:12}});
  eq(activityApplied.counts.require_reverification,1,'applied activity change exact scope');
  eq(latestCompilerRun('activity-apply').input.activity.days,12,'applied activity successor stores corrected activity');
  const overlapClaim=syntheticClaim('overlap-new');overlapClaim.field=clone(normal.field);overlapClaim.field.area_ha=8;overlapClaim.activity.field_id=normal.field.id;overlapClaim.evidence[0].field_id=normal.field.id;
  await blocks(()=>compileAndSave(overlapClaim),'DUPLICATE_FIELD_ACTIVITY_BLOCKED','stored overlapping activities refused');
  check(verifyAuditChain().status==='VALID','compiler operations preserve audit chain');
  const head=db.audit_head;db.audit_head='tamper';await blocks(()=>compilerDraft(latestCompilerRun('apply').id),'AUDIT_CHAIN_BROKEN','broken audit stops compiler');db.audit_head=head;
  await saveDB();db=null;await loadDB();check(db.compiler_runs.length>0&&verifyAuditChain().status==='VALID','compiler collections store round trip');

  // Lineage integrity regression A-I: array order must never define current/stale state.
  const beforeLineage=clone(db);
  db=seedDB();actorId='operator';
  const lineageA=await compileAndSave(syntheticClaim('lineage-order'));
  setActor('maintainer');await approveVersionedPack(compilerKey(p1),note);
  setActor('reviewer');await attestCompilerRun(lineageA.id,note,true);
  setActor('operator');
  const lineageBInput=syntheticClaim('lineage-order');lineageBInput.field.area_ha=3;
  const lineageB=await compileAndSave(lineageBInput);
  db.compiler_runs.reverse();
  eq(latestCompilerRun('lineage-order').id,lineageB.id,'A array reorder keeps lineage head B current');
  setActor('reviewer');await blocks(()=>exportCompilerRun(lineageA.id,true),'STALE_PACKAGE','B array reorder never revives A attested export');
  setActor('operator');
  const lineageCInput=syntheticClaim('lineage-order');lineageCInput.field.area_ha=4;
  const lineageC=await compileAndSave(lineageCInput);
  eq(latestCompilerRun('lineage-order').id,lineageC.id,'G A to B to C current is C');
  await blocks(()=>currentCompilerRun(lineageA.id),'STALE_PACKAGE','G A remains stale');
  await blocks(()=>currentCompilerRun(lineageB.id),'STALE_PACKAGE','G B remains stale');
  await saveDB();db=null;await loadDB();
  eq(latestCompilerRun('lineage-order').id,lineageC.id,'H reload preserves lineage head');

  db=seedDB();actorId='operator';
  const forkA=await compileAndSave(syntheticClaim('lineage-fork'));
  const forkBInput=syntheticClaim('lineage-fork');forkBInput.field.area_ha=3;
  const forkCInput=syntheticClaim('lineage-fork');forkCInput.field.area_ha=4;
  appendLineageRun(forkBInput,p1,forkA.package.package_hash);
  appendLineageRun(forkCInput,p1,forkA.package.package_hash);
  await blocks(()=>latestCompilerRun('lineage-fork'),'COMPILER_LINEAGE_CONFLICT','C fork fails closed');

  db=seedDB();actorId='operator';
  const lineageMissingInput=syntheticClaim('lineage-missing');
  appendLineageRun(lineageMissingInput,p1,'missing-parent-package-hash');
  await blocks(()=>latestCompilerRun('lineage-missing'),'COMPILER_LINEAGE_BROKEN','D missing parent fails closed');

  db=seedDB();actorId='operator';
  const crossParent=await compileAndSave(syntheticClaim('lineage-parent'));
  appendLineageRun(syntheticClaim('lineage-child'),p1,crossParent.package.package_hash);
  await blocks(()=>latestCompilerRun('lineage-child'),'COMPILER_LINEAGE_CONFLICT','E cross-Claim parent fails closed');

  // I: isolate lineage-cycle detection. Package hashes commit the supersedes edge, so a
  // cryptographically self-consistent A<->B cycle cannot be produced by normal compilation
  // without a hash fixed point. This fixture therefore keeps each Package valid for its
  // input/Pack while bypassing only supersedes-aware packageCurrent() for this claim.
  // Run seals and audit bindings remain real, so the expected failure is the topology cycle.
  db=seedDB();actorId='operator';
  const cycleAInput=syntheticClaim('lineage-cycle');
  const cycleBInput=syntheticClaim('lineage-cycle');cycleBInput.field.area_ha=3;
  const cycleAPackage=compileEvidence(cycleAInput,p1),cycleBPackage=compileEvidence(cycleBInput,p1);
  const cycleA=seal({id:uid('lineage'),owner:'operator',input:canonicalCompilerInput(cycleAInput),pack:clone(p1),package:cycleAPackage,supersedes:cycleBPackage.package_hash},'run_hash');
  const cycleB=seal({id:uid('lineage'),owner:'operator',input:canonicalCompilerInput(cycleBInput),pack:clone(p1),package:cycleBPackage,supersedes:cycleAPackage.package_hash},'run_hash');
  db.compiler_runs.push(cycleA,cycleB);audit('compiler_run',cycleA.id,{hash:cycleA.run_hash});audit('compiler_run',cycleB.id,{hash:cycleB.run_hash});
  const realPackageCurrent=packageCurrent;
  packageCurrent=function(pkg,input,pack,options) {
    if(input&&input.activity&&input.activity.id==='lineage-cycle') return !!pkg&&pkg.package_hash===compileEvidence(input,pack).package_hash;
    return realPackageCurrent(pkg,input,pack,options);
  };
  try {
    await blocks(()=>latestCompilerRun('lineage-cycle'),'COMPILER_LINEAGE_CONFLICT','I cycle fails closed');
  } finally {
    packageCurrent=realPackageCurrent;
  }

  db=seedDB();actorId='operator';
  const peerRun=await compileAndSave(syntheticClaim('peer-source'));
  peerRun.run_hash='tampered-run-hash';
  await blocks(()=>compileAndSave(syntheticClaim('peer-target')),'COMPILER_RUN_INTEGRITY','F corrupt peer blocked before peer evaluation');

  db=beforeLineage;actorId='operator';
  // All real page functions with all runtime scripts loaded; this is explicitly a DOM stub.
  const elements={app:{innerHTML:''},'compiler-note':{value:note},'compiler-ack':{checked:true}};
  global.location={hash:'#/methodologies'};global.document={getElementById:id=>elements[id]||null,querySelectorAll:()=>[]};global.window={};
  setActor('operator');for(const route of ROUTES) { location.hash='#/'+route;render();check(elements.app.innerHTML.includes('Evidence Compiler'),'compiler visible on '+route);check(elements.app.innerHTML.includes(esc(DISCLAIMER)),'boundary on '+route); }
  await handleAction('compiler-demo-a',{});check(CompilerUI.runId&&CompilerUI.message.includes('AUTO_REEVALUATED'),'Demo A real dispatcher');
  await handleAction('compiler-demo-b',{});eq(CompilerUI.impact.counts.total,6,'Demo B real dispatcher');
  await handleAction('compiler-demo-c',{});check(CompilerUI.message.includes('HUMAN_REVIEW_REQUIRED'),'Demo C real dispatcher');
  const xss=syntheticClaim('<img src=x onerror=alert(1)>');await compileAndSave(xss);CompilerUI.runId=latestCompilerRun(xss.activity.id).id;check(!compilerPanel('packages').includes('<img src=x'),'compiler output XSS escaped');
  const metrics={schema:'naft-corpus-kpi-1',scope:'Synthetic conformance corpus: 36 labeled synthetic engineering cases; no field, production, institutional or real-world MRV accuracy claim',cases:corpus.cases.length,confusion:counts};
  for(const [name,c] of Object.entries(counts)) { metrics[name]={synthetic_conformance_rate:(c.tp+c.tn)/corpus.cases.length,synthetic_precision:c.tp+c.fp?c.tp/(c.tp+c.fp):null,synthetic_recall:c.tp+c.fn?c.tp/(c.tp+c.fn):null};check(c.fp===0&&c.fn===0,'KPI oracle '+name); }
  metrics.calculation_reproducibility={matched:calculationMatched,total:corpus.cases.length};metrics.deterministic_reevaluation={matched:reproductionMatched,total:corpus.cases.length};
  // Differential oracle: full recompilation's semantic result vs incremental scope, not self-declared coverage.
  let covered=0,required=0;
  for(const input of claims) { const next=clone(input);next.activity.methodology_version='2';next.evidence.forEach(e=>e.methodology_version='2');const old=compileEvidence(input,p1),all=compileEvidence(next,isolated);const changed=canonicalize({rules:old.document.evaluation.rules,issues:old.document.evaluation.issues})!==canonicalize({rules:all.document.evaluation.rules,issues:all.document.evaluation.issues});if(changed){required++;if(selective.claims.find(r=>r.claim_id===input.activity.id).requires_reverification)covered++;} }
  metrics.impact_analysis_coverage={covered,required,ratio:required?covered/required:null};eq(covered,required,'full recomputation oracle coverage');check(required>0,'impact oracle non-vacuous');
  metrics.future_field_poc_kpis={mrv_cost_reduction:null,human_review_time_reduction:null,income_increase:null,verifier_acceptance:null};
  if(!failed) fs.writeFileSync('reports/evaluation-kpis.json',JSON.stringify(metrics,null,2)+'\n');
  console.log('COMPILER RESULT: '+passed+' passed, '+failed+' failed');if(failed) process.exitCode=1;
})();
