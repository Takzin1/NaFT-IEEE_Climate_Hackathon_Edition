'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),native=require('crypto'),assert=require('assert/strict');
const root=path.join(__dirname,'..');
vm.runInThisContext(fs.readFileSync(path.join(root,'src/mrv-core.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'src/mrv-ui.js'),'utf8'));
let passed=0,failed=0;
function check(condition,label){try{assert.ok(condition,label);passed++;console.log('  ok: '+label);}catch(e){failed++;console.error('  FAIL: '+label);process.exitCode=1;}}
function eq(actual,expected,label){check(canonicalize(actual)===canonicalize(expected),label);}
async function blocked(fn,code,label){try{await fn();check(false,label+' (did not refuse)');}catch(e){check(e.message===code,label+' ['+e.message+']');}}
function fresh(){db=seedDB();actorId='operator';UI.activityId=null;UI.evidencePage=0;UI.inspect=false;UI.busy=false;}
function fileOf(bytes,name='fixture.txt'){return {name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}
const evidenceBytes=new TextEncoder().encode('SYNTHETIC DEMO evidence fixture');
async function completeEvidence(a){for(const spec of evaluateSnapshot(snapshotFor(a)).evidence_completeness.missing){const parts=spec.split(':');await attachEvidence(a.id,fileOf(evidenceBytes),parts[0],Number(parts[1]),'SYNTHETIC DEMO test');}}
async function completeActivity(){const a=await registerActivity(exampleActivity());await completeEvidence(a);return a;}
async function releasePack(){setActor('maintainer');const r=await approvePack('AG-005@3.1-reference','I reviewed this reference implementation; adoption and coefficients remain unconfirmed.');setActor('operator');return r;}
const statement='I inspected the evidence and declarations, and attest this research package with configuration limitations.';
(async function(){
  console.log('Cryptographic and canonical primitives');
  for(const length of [0,1,55,56,63,64,65,119,120,127,128,129,100000,5*1024*1024]){const bytes=Uint8Array.from({length},(_,i)=>(i*137+11)&255);eq(digestBytes(bytes),native.createHash('sha256').update(bytes).digest('hex'),'SHA-256 native parity '+length+' bytes');}
  eq(digestText('日本語🌾'),native.createHash('sha256').update('日本語🌾').digest('hex'),'UTF-8 SHA-256 parity');
  eq(hashObject({b:2,a:1}),hashObject({a:1,b:2}),'canonical key order');
  check(hashObject(['ab','c'])!==hashObject(['a','bc']),'canonical delimiter ambiguity avoided');
  check(hashObject([1,2])!==hashObject([2,1]),'array order preserved');
  eq(await sha256Canonical({hello:'世界'}),hashObject({hello:'世界'}),'Web Crypto canonical parity');
  eq(await hashEvidenceBytes(evidenceBytes),digestBytes(evidenceBytes),'file hash Web Crypto/fallback parity');

  console.log('Dates, deterministic calculations and rule versions');
  fresh();
  eq(inclusiveDays('2024-02-28','2024-03-01'),3,'leap-year inclusive dates');
  eq(isoDay('2025-02-29'),null,'invalid calendar date refused');
  eq(inclusiveDays('2026-07-02','2026-07-01'),null,'reversed interval refused');
  eq(drainageDays({start:'2026-06-01',end:'2026-06-20',heading_date:'2026-06-15'}),14,'drainage cutoff precedes heading');
  eq(drainageDays({start:'2026-06-01',end:'2026-06-20',heading_date:'2026-06-01'}),null,'heading cannot precede drainage');
  const calcInput=exampleActivity();calcInput.calculation_parameters={baseline_ef:100,project_ef:60,gwp_ch4:28,coefficient_source:'Illustrative test only',coefficient_version:'test',stratum:'test'};
  const calculation=calculateAG005(calcInput);check(Math.abs(calculation.arithmetic_preview-7.466666666666668)<1e-10,'equation arithmetic with explicitly supplied coefficients');
  eq(calculation.result,null,'no certified quantity');eq(calculation.status,'CONFIG REQUIRED','supplied factors do not clear configuration');
  eq(calculateAG005(exampleActivity()).arithmetic_preview,null,'missing coefficients not invented');
  for(const bad of [0,-1,Infinity,'28']){const x=clone(calcInput);x.calculation_parameters.gwp_ch4=bad;eq(calculateAG005(x).status,'INVALID','invalid coefficient '+String(bad));}
  const inverted=clone(calcInput);inverted.calculation_parameters.project_ef=101;eq(calculateAG005(inverted).status,'INVALID','negative abatement parameters rejected');
  const wrongVersion=exampleActivity();wrongVersion.methodology_version='unknown';await blocked(()=>registerActivity(wrongVersion),'INVALID_ACTIVITY','unsupported version registration refused');
  const wrongMethod=exampleActivity();wrongMethod.methodology_id='UNKNOWN';await blocked(()=>registerActivity(wrongMethod),'INVALID_ACTIVITY','unknown methodology registration refused');
  const empty=exampleActivity();empty.field_id=' ';await blocked(()=>registerActivity(empty),'INVALID_field_id','empty field refused');
  const nullBase=exampleActivity();nullBase.baseline_periods=[null];await blocked(()=>registerActivity(nullBase),'INVALID_BASELINE','malformed baseline refused');
  const a=await registerActivity(exampleActivity());
  let result=evaluateSnapshot(snapshotFor(a));eq(result.evidence_completeness.required,8,'eight required evidence categories');eq(result.status,'BLOCKED','missing evidence blocks attestation');
  eq(result.baseline_days,8,'baseline average rounded up');eq(result.extension_days,7,'reference extension threshold');
  eq(result.input_fingerprint,hashObject(snapshotFor(a)),'assessment binds exact input and rule snapshot');
  for(const [label,mutate,id] of [
    ['methodology version',x=>x.methodology_version='unknown','pack_version'],
    ['activity type',x=>x.activity_type='unsupported','pack_version'],
    ['wrong crop year',x=>x.crop_year=2025,'activity_period'],
    ['drainage outside activity',x=>x.project_drainage.start='2026-03-01','activity_period'],
    ['baseline not consecutive',x=>x.baseline_periods[0].crop_year=2023,'baseline'],
    ['duplicate baseline',x=>x.baseline_periods.push(clone(x.baseline_periods[0])),'baseline'],
    ['short extension',x=>x.project_drainage.end='2026-06-14','extension'],
    ['unsupported land change',x=>x.land_change=true,'land_changes'],
    ['negative area',x=>x.field_area_ha=-1,'area']
  ]){const snap=snapshotFor(a);mutate(snap.activity);snap.rule=clone(methodologyPack(snap.activity));const report=evaluateSnapshot(snap);check(report.checks.some(c=>c.id===id&&c.status==='FAIL'),label+' detected');}

  console.log('Identity, duplicate and scope guards');
  await blocked(()=>registerActivity(exampleActivity()),'DUPLICATE_FIELD_ACTIVITY_BLOCKED','exact duplicate rejected');
  const overlap=exampleActivity();overlap.activity_start='2026-09-01';overlap.activity_end='2026-12-01';await blocked(()=>registerActivity(overlap),'DUPLICATE_FIELD_ACTIVITY_BLOCKED','partial period overlap rejected');
  const alias=exampleActivity();alias.field_id='  ＤＥＭＯ-ＦＩＥＬＤ-００１  ';await blocked(()=>registerActivity(alias),'DUPLICATE_FIELD_ACTIVITY_BLOCKED','NFKC field alias normalized');
  const changedArea=exampleActivity();changedArea.field_area_ha=6;await blocked(()=>registerActivity(changedArea),'FIELD_IDENTITY_CONFLICT','field area conflict rejected');
  const next=exampleActivity();next.crop_year=2027;next.activity_year=2027;next.activity_start='2027-04-01';next.activity_end='2027-10-31';const nextActivity=await registerActivity(next);check(nextActivity.id!==a.id,'nonoverlapping next-year activity allowed');
  const aggregate=programAggregate(a.program_id);eq(aggregate.fields,1,'same field reused across years');eq(aggregate.area_ha,5,'field area counted once');eq(aggregate.activities,2,'program activity aggregation');
  const shadow=clone(a);shadow.id='injected-overlap';db.activities.push(shadow);check(evaluateSnapshot(snapshotFor(a)).exceptions.some(e=>e.id==='duplicate_overlap'),'evaluation rechecks overlap');db.activities.pop();
  db.users.push({id:'other',role:'operator',name:'Other',status:'active'});setActor('other');eq(visibleActivities().length,0,'other operator cannot list program');
  await blocked(()=>evaluateActivity(a.id),'ROLE_BLOCKED','other operator cannot evaluate');await blocked(()=>programAggregate(a.program_id),'ROLE_BLOCKED','other operator cannot aggregate');
  setActor('maintainer');eq(visibleActivities().length,0,'pack maintainer has no activity scope');setActor('operator');

  console.log('Evidence adapter and tamper/stale guards');
  await blocked(()=>attachEvidence(a.id,fileOf(new Uint8Array()),'project_record',2026,'source'),'FILE_REQUIRED_MAX_5_MIB','empty upload refused');
  await blocked(()=>attachEvidence(a.id,{size:5*1024*1024+1,arrayBuffer:async()=>new ArrayBuffer(0)},'project_record',2026,'source'),'FILE_REQUIRED_MAX_5_MIB','oversized upload refused');
  await blocked(()=>attachEvidence(a.id,{size:2,arrayBuffer:async()=>new ArrayBuffer(1)},'project_record',2026,'source'),'FILE_SIZE_CHANGED','declared byte size checked');
  await blocked(()=>attachEvidence(a.id,fileOf(evidenceBytes),'project_record',2025,'source'),'EVIDENCE_YEAR_MISMATCH','wrong evidence year refused');
  await blocked(()=>attachEvidence(a.id,fileOf(evidenceBytes),'unknown',2026,'source'),'INVALID_MANIFEST','unknown evidence category refused');
  await blocked(()=>attachEvidence(a.id,{size:1,arrayBuffer:async()=>{setActor('reviewer');return new Uint8Array([1]).buffer;}},'project_record',2026,'source'),'ROLE_BLOCKED','actor switch during upload refused');setActor('operator');
  const oldRegion=a.region;
  await blocked(()=>attachEvidence(a.id,{size:1,arrayBuffer:async()=>{a.region='changed';return new Uint8Array([1]).buffer;}},'project_record',2026,'source'),'STALE_EVIDENCE_OPERATION','input switch during upload refused');a.region=oldRegion;
  await completeEvidence(a);const manifest=evidenceFor(a)[0];
  eq(manifest.hash,digestBytes(evidenceBytes),'actual bytes hashed');eq(manifest.rule_pack_hash,hashObject(AG005_RULE),'manifest pins rule pack hash');eq(manifest.methodology_version,'3.1-reference','manifest pins methodology version');eq(manifest.adapter_version,'file-manifest-1','manifest pins adapter version');
  check(sealed(manifest,'manifest_hash'),'manifest metadata bound');check(!('content' in manifest),'original file not stored');
  const oldSource=manifest.source;manifest.source+='tampered';check(evaluateSnapshot(snapshotFor(a)).exceptions.some(e=>e.id==='manifest_integrity'),'tampered manifest blocked');manifest.source=oldSource;
  const savedManifest=clone(manifest);manifest.methodology_version='wrong';delete manifest.manifest_hash;seal(manifest,'manifest_hash');check(evaluateSnapshot(snapshotFor(a)).exceptions.some(e=>e.id==='manifest_binding'),'rehash cannot hide methodology mismatch');Object.assign(manifest,clone(savedManifest));
  manifest.activity_period.start='2000-01-01';delete manifest.manifest_hash;seal(manifest,'manifest_hash');check(evaluateSnapshot(snapshotFor(a)).exceptions.some(e=>e.id==='manifest_binding'),'rehash cannot hide wrong evidence period');Object.assign(manifest,clone(savedManifest));
  manifest.source='unanchored replacement';delete manifest.manifest_hash;seal(manifest,'manifest_hash');check(evaluateSnapshot(snapshotFor(a)).exceptions.some(e=>e.id==='manifest_binding'),'rehash cannot replace attachment audit binding');Object.assign(manifest,clone(savedManifest));
  const fieldRow=db.fields.find(f=>f.id===a.field_ref),originalArea=fieldRow.area_ha;fieldRow.area_ha=6;check(evaluateSnapshot(snapshotFor(a)).exceptions.some(e=>e.id==='field_identity'),'field and activity area disagreement blocked');fieldRow.area_ha=originalArea;
  eq(await verifyEvidenceContent(manifest.evidence_id,fileOf(new Uint8Array([9]))),'MISMATCH','different original bytes detected');check(evaluateSnapshot(snapshotFor(a)).exceptions.some(e=>e.id==='content_recheck'),'mismatch blocks readiness');
  eq(await verifyEvidenceContent(manifest.evidence_id,fileOf(evidenceBytes)),'MATCH','matching original clears mismatch');
  const recheck=db.evidence_content_checks.at(-1);recheck.result='tamper';check(evidenceMismatches(a).length===1,'tampered recheck result fails closed');recheck.result='MATCH';
  const ev=await evaluateActivity(a.id);check(evaluationCurrent(a,ev),'evaluation initially current');eq(ev.result.status,'READY_FOR_ATTESTATION','normal evidence requires no per-check approval');
  check(db.attestations.length===0&&db.exception_decisions.length===0,'evaluation does not make a human decision');
  a.region='changed';check(!evaluationCurrent(a,ev),'changed activity invalidates evaluation');await blocked(()=>draftPackage(a.id),'STALE_EVALUATION','stale draft refused');a.region=oldRegion;
  ev.result.status='fake';check(!evaluationCurrent(a,ev),'tampered evaluation rejected');ev.result.status='READY_FOR_ATTESTATION';
  const goodHash=ev.evaluation_hash;ev.result.status='fake';delete ev.evaluation_hash;seal(ev,'evaluation_hash');check(!evaluationCurrent(a,ev),'rehashing evaluation without audit event refused');ev.result.status='READY_FOR_ATTESTATION';ev.evaluation_hash=goodHash;
  const packBefore=clone(METHODOLOGY_REGISTRY['AG-005@3.1-reference']);eq(ev.snapshot.rule,packBefore,'evaluation stores versioned rule snapshot');

  console.log('Rule Pack release and final attestation');
  await blocked(()=>approvePack('AG-005@3.1-reference',statement),'ROLE_BLOCKED','operator cannot release rule pack');
  await blocked(()=>attestPackage(a.id,statement,true),'ROLE_BLOCKED','operator cannot attest');
  setActor('reviewer');await blocked(()=>attestPackage(a.id,statement,false),'ATTESTATION_ACKNOWLEDGEMENT_REQUIRED','explicit acknowledgement required');
  await blocked(()=>attestPackage(a.id,'short',true),'EXPLICIT_HUMAN_REASON_REQUIRED','final human statement required');
  await blocked(()=>attestPackage(a.id,statement,true),'PACK_RELEASE_APPROVAL_REQUIRED','unreleased rule pack blocks final attestation');
  setActor('maintainer');await blocked(()=>approvePack('AG-005@3.1-reference','short'),'EXPLICIT_HUMAN_REASON_REQUIRED','release rationale required');
  const release=await approvePack('AG-005@3.1-reference',statement);check(validRelease(AG005_RULE),'maintainer release approval recorded');eq(release.official_adoption_confirmed,false,'release never implies official adoption');
  release.note+='tampered';setActor('reviewer');await blocked(()=>attestPackage(a.id,statement,true),'PACK_RELEASE_APPROVAL_REQUIRED','tampered pack release blocks final attestation');release.note=statement;setActor('maintainer');
  await blocked(()=>approvePack('AG-005@3.1-reference',statement),'PACK_ALREADY_RELEASED','duplicate pack release refused');
  setActor('reviewer');const beforeDecision=db.attestations.length;const record=await attestPackage(a.id,statement,true);eq(db.attestations.length,beforeDecision+1,'one final attestation for normal case');eq(db.exception_decisions.length,0,'no redundant normal-case exception approval');
  eq(record.document.calculation.result,null,'attested document retains null reduction result');eq(record.document.formal_verification,'not_performed','formal verification not claimed');eq(record.document.status,'attested_incomplete_configuration','incomplete configuration retained');
  await blocked(()=>attestPackage(a.id,statement,true),'DUPLICATE_ATTESTATION_BLOCKED','duplicate attestation refused');setActor('operator');
  await blocked(()=>attachEvidence(a.id,fileOf(evidenceBytes),'project_record',2026,'source'),'ATTESTED_ACTIVITY_LOCKED','attested evidence set locked');
  await blocked(()=>evaluateActivity(a.id),'ATTESTED_ACTIVITY_LOCKED','attested evaluation not silently replaced');
  const export1=exportMonitoringJSON(a.id,true);eq(export1,exportMonitoringJSON(a.id,true),'attested export is byte reproducible');audit('unrelated_event','test',{note:'no package change'});eq(export1,exportMonitoringJSON(a.id,true),'unrelated audit additions do not change attested JSON');
  const draft1=exportMonitoringJSON(a.id,false);audit('another_event','test',{});eq(draft1,exportMonitoringJSON(a.id,false),'draft JSON reproducible across unrelated audit events');
  eq(hashObject(JSON.parse(export1).document),record.package_hash,'export package hash verifies document');
  record.document.attestation.statement+='tampered';await blocked(()=>exportMonitoringJSON(a.id,true),'ATTESTATION_INTEGRITY_BLOCKED','attestation tamper blocks export');record.document.attestation.statement=statement;
  a.region='changed';await blocked(()=>exportMonitoringJSON(a.id,true),'STALE_PACKAGE','changed input blocks attested export');a.region=oldRegion;
  await verifyEvidenceContent(manifest.evidence_id,fileOf(new Uint8Array([8])));await blocked(()=>exportMonitoringJSON(a.id,true),'STALE_PACKAGE','later mismatched original blocks attested export');await verifyEvidenceContent(manifest.evidence_id,fileOf(evidenceBytes));eq(export1,exportMonitoringJSON(a.id,true),'matching original restores exact package');
  db.users.find(u=>u.id==='reviewer').status='inactive';await blocked(()=>exportMonitoringJSON(a.id,true),'ATTESTATION_INTEGRITY_BLOCKED','inactive final reviewer blocks export');db.users.find(u=>u.id==='reviewer').status='active';

  console.log('Human-on-the-exception: conflicting evidence and hard failures');
  fresh();await releasePack();const conflictActivity=await completeActivity();
  await attachEvidence(conflictActivity.id,fileOf(new Uint8Array([5,7,9])),'project_record',2026,'Conflicting field observation');const conflicted=await evaluateActivity(conflictActivity.id);eq(conflicted.result.status,'EXCEPTION','different evidence hashes route to exception');
  const judgement=conflicted.result.exceptions.find(e=>e.kind==='judgement');check(!!judgement,'judgement exception identified');
  await blocked(()=>decideException(conflictActivity.id,judgement.id,'accept_with_reason',statement),'ROLE_BLOCKED','operator cannot resolve exception');setActor('reviewer');
  await blocked(()=>attestPackage(conflictActivity.id,statement,true),'UNRESOLVED_EXCEPTIONS','unresolved evidence conflict blocks attestation');
  await blocked(()=>decideException(conflictActivity.id,judgement.id,'accept_with_reason','short'),'EXPLICIT_HUMAN_REASON_REQUIRED','exception explanation required');
  const decision=await decideException(conflictActivity.id,judgement.id,'accept_with_reason',statement);eq(unresolvedExceptions(conflicted).length,0,'explicit reason resolves judgement exception');
  await blocked(()=>decideException(conflictActivity.id,judgement.id,'reject',statement),'EXCEPTION_ALREADY_DECIDED','decision replay refused');
  decision.note+='tampered';await blocked(()=>draftPackage(conflictActivity.id),'DECISION_INTEGRITY_BLOCKED','tampered exception decision blocks package');decision.note=statement;
  const attestedConflict=await attestPackage(conflictActivity.id,statement,true);eq(attestedConflict.document.exception_decisions[0].decision,'accept_with_reason','exception rationale preserved in final package');
  fresh();await releasePack();const rejectedActivity=await completeActivity();await attachEvidence(rejectedActivity.id,fileOf(new Uint8Array([3])),'project_record',2026,'Conflicting source');const rejectEval=await evaluateActivity(rejectedActivity.id);setActor('reviewer');await decideException(rejectedActivity.id,rejectEval.result.exceptions[0].id,'reject',statement);await blocked(()=>attestPackage(rejectedActivity.id,statement,true),'UNRESOLVED_EXCEPTIONS','human rejection blocks attestation');
  fresh();await releasePack();const blockedActivity=await registerActivity(exampleActivity());const missingEval=await evaluateActivity(blockedActivity.id);setActor('reviewer');
  await blocked(()=>decideException(blockedActivity.id,'evidence','accept_with_reason',statement),'BLOCKING_EXCEPTION_NOT_OVERRIDABLE','missing evidence cannot be human-overridden');
  await blocked(()=>attestPackage(blockedActivity.id,statement,true),'UNRESOLVED_EXCEPTIONS','hard failures block final attestation');
  const missingDecision=await decideException(blockedActivity.id,'evidence','reject',statement);eq(missingDecision.decision,'reject','human can reject unsupported/incomplete case');
  setActor('operator');await completeEvidence(blockedActivity);await evaluateActivity(blockedActivity.id);setActor('reviewer');check(decisionsFor(latestEvaluation(blockedActivity)).length===0,'old decisions never carry into reevaluation');
  await attestPackage(blockedActivity.id,statement,true);

  console.log('Audit-chain integrity and domain independence');
  eq(verifyAuditChain().status,'VALID','valid audit chain');
  const pristine=clone(db);db.audit_events[0].payload.extra='tampered';eq(verifyAuditChain().status,'BROKEN','event payload tamper detected');
  await blocked(()=>exportMonitoringJSON(blockedActivity.id,true),'AUDIT_CHAIN_BROKEN','broken chain blocks export');db=clone(pristine);
  db.audit_events.pop();eq(verifyAuditChain().status,'BROKEN','event deletion detected');db=clone(pristine);
  [db.audit_events[0],db.audit_events[1]]=[db.audit_events[1],db.audit_events[0]];eq(verifyAuditChain().status,'BROKEN','event reordering detected');db=clone(pristine);
  db.audit_head='0'.repeat(64);eq(verifyAuditChain().status,'BROKEN','changed chain head detected');await blocked(()=>evaluateActivity(blockedActivity.id),'AUDIT_CHAIN_BROKEN','broken chain blocks evaluation');db=clone(pristine);
  const originalRelease=db.pack_releases[0];originalRelease.note+='tamper';check(!validRelease(AG005_RULE),'pack release metadata tamper detected');db=clone(pristine);
  setActor('operator');db.users.find(u=>u.id==='operator').status='inactive';await blocked(()=>exportMonitoringJSON(blockedActivity.id,true),'ROLE_BLOCKED','inactive operator cannot export');db=clone(pristine);setActor('reviewer');
  eq(DB_KEY,'naft_mrv_core_v1','independent persistence namespace');
  check(!['wallets','transactions','candidate_units','unit_transfers','unit_retirements','projects','rewards','reservations'].some(k=>k in db),'dataset contains only MRV domains');
  var contractDir=path.join(root,'contracts'),contractFiles=fs.existsSync(contractDir)?fs.readdirSync(contractDir).filter(function(name){return name.endsWith('.sol');}).sort():[];check(JSON.stringify(contractFiles)===JSON.stringify(['NaFTMRVAnchor.sol']),'only minimal ClimateChain provenance contract retained');
  for(const symbol of ['issueCandidateUnit','transferCandidateUnit','retireCandidateUnit','reviewAction','execSupport','addTx','pgIEEEDemo'])check(typeof global[symbol]==='undefined','removed runtime symbol '+symbol);
  const runtime=fs.readFileSync(path.join(root,'naft-app.html'),'utf8')+fs.readFileSync(path.join(root,'src/mrv-core.js'),'utf8')+fs.readFileSync(path.join(root,'src/mrv-ui.js'),'utf8');
  check(!/qrcodejs|ERC1155|CarbonMarketplace|wallet|marketplace|tokenomics|#\/ieee/i.test(runtime),'removed runtime/domain dependencies absent');
  eq(ROUTES,['methodologies','evidence','readiness','exceptions','review','packages'],'six focused MRV routes');
  global.location={hash:'#/methodologies'};const nodeMap={app:{innerHTML:''}};global.document={getElementById:id=>nodeMap[id]||null};global.window={};
  for(const routeName of ROUTES){location.hash='#/'+routeName;render();check(nodeMap.app.innerHTML.includes('aria-current="page"'),'route renders '+routeName);check(nodeMap.app.innerHTML.includes(esc(DISCLAIMER)),'boundary on '+routeName);}
  const viewActivity=getActivity(blockedActivity.id);const previousField=viewActivity.field_id;viewActivity.field_id='<img src=x onerror="alert(1)">';location.hash='#/evidence';render();check(nodeMap.app.innerHTML.includes('&lt;img')&&!nodeMap.app.innerHTML.includes('<img src=x'),'untrusted field HTML escaped');viewActivity.field_id=previousField;
  const evidenceItem=evidenceFor(viewActivity)[0],oldName=evidenceItem.original_filename;evidenceItem.original_filename='<script>alert(1)</script>';render();check(!nodeMap.app.innerHTML.includes('<script>alert(1)</script>'),'evidence filename escaped');evidenceItem.original_filename=oldName;
  const beforeRender=JSON.stringify(db);for(const routeName of ROUTES){location.hash='#/'+routeName;render();}eq(JSON.stringify(db),beforeRender,'rendering does not mutate domain state');
  location.hash='#/ieee';eq(activeRoute(),'methodologies','removed route resolves to MRV entry');
  // Actual action dispatch, still a Node DOM stub, not a browser claim.
  fresh();global.document.querySelectorAll=()=>[];nodeMap['activity-json']={value:JSON.stringify(exampleActivity())};await handleAction('register',{});check(db.activities.length===1&&!UI.error,'UI action registers activity');
  await handleAction('sample',{});check(db.evidence_manifests.length===8&&!UI.error,'UI action constructs synthetic manifests');await handleAction('evaluate',{});check(latestEvaluation(selectedActivity()).result.status==='READY_FOR_ATTESTATION','UI action evaluates without approval');
  setActor('maintainer');nodeMap['pack-note']={value:statement};await handleAction('release',{});check(validRelease(AG005_RULE),'UI action releases reference pack');setActor('reviewer');nodeMap['attestation-note']={value:statement};nodeMap['attestation-ack']={checked:true};await handleAction('attest',{});check(db.attestations.length===1&&!UI.error,'UI action records final attestation');
  let downloaded='';const originalDownload=downloadJSON;downloadJSON=(text)=>{downloaded=text;};await handleAction('export-attested',{});check(JSON.parse(downloaded).document.status==='attested_incomplete_configuration','UI export action returns structured attested JSON');downloadJSON=originalDownload;
  await saveDB();const saved=JSON.stringify(db);db=null;await loadDB();eq(JSON.stringify(db),saved,'MRV namespace round trip');memoryStore[DB_KEY]=JSON.stringify({schema:'legacy'});await blocked(()=>loadDB(),'INVALID_SAVED_DATASET','legacy schema is not silently migrated');
  memoryStore[DB_KEY]=JSON.stringify({schema:'naft-mrv-core-1',audit_events:[],audit_head:hashObject([])});await blocked(()=>loadDB(),'INVALID_SAVED_DATASET','missing MRV collections rejected on load');
  console.log('\nRESULT: '+passed+' passed, '+failed+' failed');
})().catch(e=>{console.error(e);process.exitCode=1;});
