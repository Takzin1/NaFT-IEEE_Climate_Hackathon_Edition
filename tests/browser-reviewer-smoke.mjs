'use strict';
import {writeFileSync} from 'node:fs';

const evidenceFixturePath='/tmp/naft-browser-evidence.txt';
writeFileSync(evidenceFixturePath,'NAFT browser evidence fixture — synthetic bytes for file-input/recheck testing.\n','utf8');

const cdpBase=process.env.NAFT_CDP_URL||'http://127.0.0.1:9222';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function targetPage() {
  for(let i=0;i<40;i++) {
    try {
      const pages=await fetch(cdpBase+'/json/list').then(r=>r.json());
      const page=pages.find(p=>p.type==='page'&&p.url.includes('naft-app.html'));
      if(page) return page;
    } catch(e) {}
    await sleep(250);
  }
  throw new Error('CDP_PAGE_NOT_FOUND');
}

const page=await targetPage();
const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});
  ws.addEventListener('error',reject,{once:true});
});

let nextId=1;
const pending=new Map(),runtimeProblems=[];
ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);
  if(msg.method==='Runtime.exceptionThrown') runtimeProblems.push({type:'exception',detail:msg.params&&msg.params.exceptionDetails&&msg.params.exceptionDetails.text});
  if(msg.method==='Log.entryAdded'&&msg.params&&msg.params.entry&&msg.params.entry.level==='error') runtimeProblems.push({type:'console',detail:msg.params.entry.text});
  if(msg.id&&pending.has(msg.id)) {
    const pair=pending.get(msg.id);pending.delete(msg.id);
    if(msg.error) pair.reject(new Error(msg.error.message||'CDP_ERROR'));
    else pair.resolve(msg.result);
  }
});
function send(method,params={}) {
  return new Promise((resolve,reject)=>{
    const id=nextId++;pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression) {
  const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails) throw new Error('BROWSER_EVAL_FAILED');
  return result.result&&result.result.value;
}
async function until(expression,label) {
  for(let i=0;i<40;i++) {
    if(await evaluate(expression)) return;
    await sleep(250);
  }
  throw new Error('BROWSER_TIMEOUT:'+label);
}
async function setFileInput(selector,path) {
  const document=await send('DOM.getDocument',{depth:0,pierce:true});
  const found=await send('DOM.querySelector',{nodeId:document.root.nodeId,selector});
  if(!found.nodeId) throw new Error('FILE_INPUT_NOT_FOUND:'+selector);
  await send('DOM.setFileInputFiles',{nodeId:found.nodeId,files:[path]});
}

await send('Runtime.enable');
await send('Log.enable');
await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
await until(
  "document.querySelector('[data-action=\\\"reviewer-run\\\"]')!==null && document.body.innerText.includes('未踏アドバンスト審査用デモ')",
  'reviewer route render'
);
const firstView=await evaluate("({headingTop:document.querySelector('.reviewer-hero h2').getBoundingClientRect().top,scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,hasOperationalControls:!!document.querySelector('#actor,#activity,nav'),hasAg005Banner:document.body.innerText.includes('AG-005参照版')})");
if(firstView.headingTop>=812) throw new Error('REVIEWER_HEADING_BELOW_FIRST_VIEW:'+JSON.stringify(firstView));
if(firstView.scrollWidth>firstView.innerWidth) throw new Error('REVIEWER_HORIZONTAL_OVERFLOW:'+JSON.stringify(firstView));
if(firstView.hasOperationalControls||firstView.hasAg005Banner) throw new Error('REVIEWER_HEADER_NOT_ISOLATED:'+JSON.stringify(firstView));

await evaluate("document.querySelector('[data-action=\\\"reviewer-run\\\"]').click(); true");
await until("document.querySelectorAll('.metric').length===5",'metric render');

const metrics=await evaluate("Array.from(document.querySelectorAll('.metric')).map(function(x){return [x.querySelector('span').textContent.trim(),x.querySelector('strong').textContent.trim()];})");
const expected=[
  ['変更候補','100'],
  ['再検証対象','30'],
  ['影響なし','70'],
  ['自動再評価','15'],
  ['追加証憑が必要','15']
];
if(JSON.stringify(metrics)!==JSON.stringify(expected)) {
  throw new Error('UNEXPECTED_METRICS:'+JSON.stringify(metrics));
}
const text=await evaluate("document.body.innerText");
for(const phrase of [
  'この画面は合成方法論 NAFT-SYNTHETIC@1 → @2 の研究デモです。AG-005の制度評価ではありません。',
  'v2ではstratum=intensiveのClaimに対して、追加ルール extended（intensive_min_days=9）とsensor証憑要件が加わります。',
  'standard 70件 / intensive（sensorなし） 15件 / intensive_complete（sensorあり） 15件。',
  '30 / 70 は性能指標ではありません。',
  'fixture構成を変えれば30 / 70も変わります。',
  '実制度の再検証率を予測するものではありません。',
  'この70件は、fixture内のstandard 70件がv2のintensive専用変更に依存しないため非影響となった合成結果です。',
  '時間・費用・精度が70%改善したという意味ではなく、実制度の再検証率を予測するものでもありません。',
  '再検証30件 / 影響なし70件'
]) {
  if(!text.includes(phrase)) throw new Error('MISSING_REVIEWER_TEXT:'+phrase);
}
await evaluate("location.hash='#/climatechain'; true");
await until(
  "document.querySelector('[data-action=\\\"climatechain-run\\\"]')!==null && document.body.innerText.includes('When climate MRV rules change')",
  'climatechain route render'
);
const climateDocMeta=await evaluate("({lang:document.documentElement.lang,title:document.title})");
if(climateDocMeta.lang!=='en'||climateDocMeta.title!=='NaFT — Version-Aware Climate MRV | IEEE ClimateChain 2026') {
  throw new Error('CLIMATECHAIN_DOCUMENT_METADATA:'+JSON.stringify(climateDocMeta));
}
const scenarioBefore=await evaluate("(function(){var s=document.querySelector('.climate-scenario');return {exists:!!s,labels:s&&s.innerText.includes('FICTIONAL AGGREGATOR / SYNTHETIC CLAIMS'),values:s&&Array.from(s.querySelectorAll('.climate-scenario-result strong')).map(x=>x.textContent.trim()),limit:s&&s.innerText.includes('No participating farms, measured emissions reduction')};})()");
if(!scenarioBefore.exists||!scenarioBefore.labels||!scenarioBefore.limit||
   JSON.stringify(scenarioBefore.values)!==JSON.stringify(['100','—','—'])) {
   throw new Error('CLIMATECHAIN_PRACTICAL_SCENARIO_INITIAL_STATE:'+JSON.stringify(scenarioBefore));
}
const diagramBefore=await evaluate("({exists:!!document.querySelector('.climate-architecture img'),alt:document.querySelector('.climate-architecture img')?.alt,src:document.querySelector('.climate-architecture img')?.getAttribute('src')})");
if(!diagramBefore.exists||!diagramBefore.src?.includes('naft-climatechain-architecture.svg')||
   !diagramBefore.alt?.includes('off-chain evidence compiler')) {
   throw new Error('CLIMATECHAIN_ARCHITECTURE_MISSING:'+JSON.stringify(diagramBefore));
}
await evaluate("document.querySelector('.climate-architecture img').scrollIntoView();true");
await until("document.querySelector('.climate-architecture img').complete && document.querySelector('.climate-architecture img').naturalWidth===1600",'architecture SVG browser load');
const climateFirstView=await evaluate("({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,hasOperationalControls:!!document.querySelector('#actor,#activity,nav'),text:document.body.innerText})");
const climateVisual=await evaluate("({page:document.body.dataset.page,themeLoaded:Array.from(document.styleSheets).some(function(s){return s.href&&s.href.includes('climatechain-theme.css');}),heroGradient:getComputedStyle(document.querySelector('.climate-hero')).backgroundImage,heroRadius:getComputedStyle(document.querySelector('.climate-hero')).borderRadius,heroContent:!!document.querySelector('.climate-hero-evidence .climate-status .verified'),primaryRect:(function(){var r=document.querySelector('.climate-hero-primary').getBoundingClientRect();return {x:r.x,y:r.y};})(),proofRect:(function(){var r=document.querySelector('.climate-hero-evidence').getBoundingClientRect();return {x:r.x,y:r.y};})()})");
if(climateVisual.page!=='climatechain'||!climateVisual.themeLoaded||
   !climateVisual.heroGradient.includes('linear-gradient')||
   !climateVisual.heroContent||
   Math.abs(climateVisual.primaryRect.x-climateVisual.proofRect.x)>2||
   climateVisual.proofRect.y<=climateVisual.primaryRect.y){
   throw new Error('CLIMATECHAIN_MOBILE_THEME_OR_STACK_INVALID:'+JSON.stringify(climateVisual));
}

if(climateFirstView.scrollWidth>climateFirstView.innerWidth) throw new Error('CLIMATECHAIN_HORIZONTAL_OVERFLOW:'+JSON.stringify(climateFirstView));
if(climateFirstView.hasOperationalControls) throw new Error('CLIMATECHAIN_HEADER_NOT_ISOLATED:'+JSON.stringify(climateFirstView));
for(const phrase of [
  'Japanese rice-paddy methane MRV',
  'The currently adopted edition and coefficient applicability are not asserted by this demo.',
  'Blockchain witnesses version lineage; it does not decide climate truth.',
  'VERIFIED TESTNET',
  'change classes',
  'adversarial cases',
  'tested synthetic state space',
  'Adversarial cases',
  'False negatives'
]) {
  if(!climateFirstView.text.includes(phrase)) throw new Error('MISSING_CLIMATECHAIN_JUDGE_TEXT:'+phrase);
}
const adoptionRoles=await evaluate("Array.from(document.querySelectorAll('.climate-adoption article .eyebrow')).map(function(x){return x.textContent.trim();})");
const expectedAdoptionRoles=['Project aggregator','MRV / verification operator','Registry / carbon program'];
if(JSON.stringify(adoptionRoles)!==JSON.stringify(expectedAdoptionRoles)) throw new Error('UNEXPECTED_CLIMATECHAIN_ADOPTION_ROLES:'+JSON.stringify(adoptionRoles));

await evaluate("document.querySelector('[data-action=\\\"climatechain-run\\\"]').click(); true");
await until("ClimateChainDemo.impact!==null && document.querySelectorAll('.climate-impact .metric').length===5",'climatechain impact render');
const scenarioAfter=await evaluate("Array.from(document.querySelectorAll('.climate-scenario-result strong')).map(x=>x.textContent.trim())");
if(JSON.stringify(scenarioAfter)!==JSON.stringify(['100','30','70'])) {
   throw new Error('CLIMATECHAIN_PRACTICAL_SCENARIO_NOT_COMPUTED:'+JSON.stringify(scenarioAfter));
}
const scenarioAction=await evaluate("document.querySelector('.climate-scenario-result').innerText");
if(!scenarioAction.includes('15 automatically re-evaluated')||!scenarioAction.includes('15 evidence required')){
   throw new Error('CLIMATECHAIN_SCENARIO_SPLIT_NOT_COMPUTED:'+scenarioAction);
}
const climateMetrics=await evaluate("Array.from(document.querySelectorAll('.climate-impact .metric')).map(function(x){return [x.querySelector('span').textContent.trim(),x.querySelector('strong').textContent.trim()];})");
const expectedClimate=[
  ['Candidate claims','100'],
  ['Re-verify','30'],
  ['Unaffected','70'],
  ['Auto re-evaluated','15'],
  ['New evidence needed','15']
];
if(JSON.stringify(climateMetrics)!==JSON.stringify(expectedClimate)) throw new Error('UNEXPECTED_CLIMATECHAIN_METRICS:'+JSON.stringify(climateMetrics));
const climateDistribution=await evaluate("(function(){var bar=document.querySelector('.climate-distribution-bar');var review=bar.querySelector('.climate-part-review');var rest=bar.querySelector('.climate-part-unaffected');return {aria:bar.getAttribute('aria-label'),review:review.getBoundingClientRect().width/bar.getBoundingClientRect().width,unaffected:rest.getBoundingClientRect().width/bar.getBoundingClientRect().width};})()");
if(!climateDistribution.aria.includes('30 require re-verification; 70 unaffected out of 100 claims')||
  Math.abs(climateDistribution.review-.3)>.025||Math.abs(climateDistribution.unaffected-.7)>.025) {
  throw new Error('CLIMATECHAIN_VISUALIZED_COUNTS_NOT_DERIVED:'+JSON.stringify(climateDistribution));
}


await evaluate("document.querySelector('[data-action=\\\"climatechain-anchor-plan\\\"]').click(); true");
await until("ClimateChainDemo.anchorPlan!==null && document.querySelector('.climate-anchor')!==null && document.body.innerText.includes('Browser planner status: NOT_SUBMITTED') && document.body.innerText.includes('VERIFIED TESTNET')",'climatechain anchor plan');
const anchorPlan=await evaluate("(function(p){return {status:p.chain_status,formal:p.formal_certification,issued:p.carbon_credit_issued,genesis:p.genesis.previous_package_hash,successorParentMatches:p.successor.previous_package_hash===p.genesis.package_hash,lineage:p.lineage_checks};})(ClimateChainDemo.anchorPlan)");
if(anchorPlan.status!=='NOT_SUBMITTED'||anchorPlan.formal!==false||anchorPlan.issued!==false||anchorPlan.genesis!==('0x'+'0'.repeat(64))||!anchorPlan.successorParentMatches||!anchorPlan.lineage.successor_supersedes_previous) {
  throw new Error('CLIMATECHAIN_ANCHOR_PLAN_INVALID:'+JSON.stringify(anchorPlan));
}
const publicChainProof=await evaluate("(function(){var p=ClimateChainDemo.anchorPlan,r=climateChainTestnetRecord(),links=Array.from(document.querySelectorAll('.climate-anchor a')).map(function(a){return a.href;});return {status:r.status,source:r.source_commit,claim:p.claim_id,contract:r.contract_address,p1:p.genesis.package_hash,p2:p.successor.package_hash,links:links,detail:document.querySelector('.climate-anchor').innerText};})()");
if(publicChainProof.status!=='VERIFIED_TESTNET'||
   publicChainProof.source!=='fb9016c6c3041ec0e77098e631d62138fbae582e'||
   publicChainProof.claim!=='CLIMATE-086'||
   publicChainProof.p1!=='0xe69e7df04f5f3640d94de510308e71a3229fe7c71fe8cb437bfc084623b25477'||
   publicChainProof.p2!=='0xe5ee259abdc624bd6fd8cdf72fa72eef11397ba54556c01f2ce294824d70f71e'||
   !publicChainProof.links.some(x=>x.includes('/tx/0x85c25a7ee239d7178c7266bf50e22c41bd30debfc7e37e579d437f1730d8fc34'))||
   !publicChainProof.links.some(x=>x.includes('/tx/0xb5aef9810d6eb9c7516c0c9c6aadcf05fe952fb9170338fb915a5aa204579ac5'))||
   !publicChainProof.links.some(x=>x.includes('/commit/'+publicChainProof.source))||
   !publicChainProof.detail.includes('The browser itself does not broadcast a transaction.')) {
   throw new Error('PUBLIC_TESTNET_PROOF_MISMATCH:'+JSON.stringify(publicChainProof));
}

// Confirm desktop side-by-side judge hero and return to mobile before checking research workflows.
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
const climateDesktop=await evaluate("({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,primary:(function(){var r=document.querySelector('.climate-hero-primary').getBoundingClientRect();return {x:r.x,y:r.y};})(),proof:(function(){var r=document.querySelector('.climate-hero-evidence').getBoundingClientRect();return {x:r.x,y:r.y};})()})");
if(climateDesktop.scrollWidth>climateDesktop.innerWidth||
  climateDesktop.proof.x<=climateDesktop.primary.x||
  Math.abs(climateDesktop.primary.y-climateDesktop.proof.y)>100) {
  throw new Error('CLIMATECHAIN_DESKTOP_GRID_INVALID:'+JSON.stringify(climateDesktop));
}
await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});

await evaluate("location.hash='#/methodologies'; true");
await until("document.body.innerText.includes('Rule Packを版で固定する')",'methodologies route render');
const researchScope=await evaluate("({page:document.body.dataset.page,hasClimateHero:!!document.querySelector('.climate-hero'),background:getComputedStyle(document.body).backgroundColor})");
if(researchScope.page!=='research'||researchScope.hasClimateHero) throw new Error('CLIMATECHAIN_THEME_LEAK:'+JSON.stringify(researchScope));

const researchDocMeta=await evaluate("({lang:document.documentElement.lang,title:document.title})");
if(researchDocMeta.lang!=='ja'||researchDocMeta.title!=='NaFT — Version-aware MRV Evidence Compiler') {
  throw new Error('RESEARCH_DOCUMENT_METADATA:'+JSON.stringify(researchDocMeta));
}
const methodologyViewport=await evaluate("({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth})");
if(methodologyViewport.scrollWidth>methodologyViewport.innerWidth) throw new Error('METHODOLOGY_HORIZONTAL_OVERFLOW:'+JSON.stringify(methodologyViewport));

// Real-browser operator flow: actor selection -> Activity registration -> synthetic Evidence -> deterministic evaluation.
const operatorSelected=await evaluate("(function(){var user=db.users.find(function(u){return u.role==='operator'&&u.status==='active';});var el=document.getElementById('actor');if(!user||!el)return false;el.value=user.id;el.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
if(!operatorSelected) throw new Error('OPERATOR_SELECTION_FAILED');
await until("currentUser()&&currentUser().role==='operator'",'operator role selection');

await evaluate("location.hash='#/evidence'; true");
await until("document.querySelector('#activity-json')!==null && document.querySelector('[data-action=\\\"register\\\"]')!==null",'evidence registration render');
await evaluate("document.querySelector('[data-action=\\\"register\\\"]').click(); true");
await until("UI.activityId!==null && selectedActivity()!==null && document.body.innerText.includes('証憑をManifestへ')",'activity registration');

// Exercise a real browser File object through the actual file input and hash/recheck UI.
await until("document.getElementById('evidence-file')!==null && document.querySelector('[data-action=\\\"attach\\\"]')!==null",'evidence file controls');
await setFileInput('#evidence-file',evidenceFixturePath);
await evaluate("document.querySelector('[data-action=\\\"attach\\\"]').click(); true");
await until("evidenceFor(selectedActivity()).some(function(e){return e.original_filename==='naft-browser-evidence.txt';})",'file evidence attach');
const browserEvidenceId=await evaluate("evidenceFor(selectedActivity()).find(function(e){return e.original_filename==='naft-browser-evidence.txt';}).evidence_id");

await until("document.getElementById('recheck-file')!==null && document.getElementById('recheck-id')!==null",'evidence recheck controls');
await evaluate("(function(id){var el=document.getElementById('recheck-id');el.value=id;return el.value===id;})("+JSON.stringify(browserEvidenceId)+")");
await setFileInput('#recheck-file',evidenceFixturePath);
await evaluate("document.querySelector('[data-action=\\\"recheck\\\"]').click(); true");
await until("db.evidence_content_checks.some(function(c){return c.evidence_id==="+JSON.stringify(browserEvidenceId)+"&&c.result==='MATCH';})",'file evidence recheck');
const fileEvidenceCheck=await evaluate("(function(id){var e=evidenceFor(selectedActivity()).find(function(x){return x.evidence_id===id;});var c=db.evidence_content_checks.filter(function(x){return x.evidence_id===id;}).slice(-1)[0];return {filename:e.original_filename,byte_length:e.byte_length,hashLength:e.hash.length,content_storage:e.content_storage,recheck:c.result,uiMessage:UI.message};})("+JSON.stringify(browserEvidenceId)+")");
if(fileEvidenceCheck.filename!=='naft-browser-evidence.txt'||fileEvidenceCheck.byte_length<=0||fileEvidenceCheck.hashLength!==64||fileEvidenceCheck.content_storage!=='not_stored'||fileEvidenceCheck.recheck!=='MATCH'||fileEvidenceCheck.uiMessage!=='MATCH') {
  throw new Error('FILE_EVIDENCE_RECHECK_INVALID:'+JSON.stringify(fileEvidenceCheck));
}

await evaluate("document.querySelector('[data-action=\\\"sample\\\"]').click(); true");
await until("UI.message.includes('SYNTHETIC evidence recorded') && evidenceFor(selectedActivity()).length>1",'synthetic evidence');

await evaluate("location.hash='#/readiness'; true");
await until("document.querySelector('[data-action=\\\"evaluate\\\"]')!==null",'readiness render');
await evaluate("document.querySelector('[data-action=\\\"evaluate\\\"]').click(); true");
await until("currentEvaluation(selectedActivity())!==null && document.body.innerText.includes('Calculation Assist')",'deterministic evaluation');

const workflowRoutes=[
  ['methodologies','Rule Packを版で固定する'],
  ['evidence','証憑をManifestへ'],
  ['readiness','機械が評価し、例外を抽出する'],
  ['exceptions','判断が必要な案件だけを人間へ'],
  ['review','最終パッケージに一度だけ宣誓する'],
  ['packages','再現可能なMRVパッケージ']
];
const routeChecks={};
for(const [route,phrase] of workflowRoutes) {
  await evaluate("location.hash='#/"+route+"'; true");
  await until("document.body.innerText.includes("+JSON.stringify(phrase)+")",'workflow route '+route);
  const state=await evaluate("({hash:location.hash,scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,renderError:!!document.querySelector('section.error'),statusError:!!document.querySelector('.status.error')})");
  if(state.hash!=='#/'+route) throw new Error('WORKFLOW_ROUTE_HASH_MISMATCH:'+route+':'+JSON.stringify(state));
  if(state.scrollWidth>state.innerWidth) throw new Error('WORKFLOW_HORIZONTAL_OVERFLOW:'+route+':'+JSON.stringify(state));
  if(state.renderError||state.statusError) throw new Error('WORKFLOW_RENDER_ERROR:'+route+':'+JSON.stringify(state));
  routeChecks[route]='PASS';
}
// Real-browser Compiler role flow: Operator draft -> Maintainer release -> Reviewer attestation -> attested JSON export.
await evaluate("location.hash='#/methodologies'; true");
await until("document.querySelector('[data-action=\\\"compiler-demo-a\\\"]')!==null",'compiler demo render');
await evaluate("document.querySelector('[data-action=\\\"compiler-demo-a\\\"]').click(); true");
await until("CompilerUI.runId!==null && CompilerUI.message.includes('AUTO_REEVALUATED')",'compiler operator draft');
const compilerRunId=await evaluate("CompilerUI.runId");

const maintainerSelected=await evaluate("(function(){var user=db.users.find(function(u){return u.role==='maintainer'&&u.status==='active';});var el=document.getElementById('actor');if(!user||!el)return false;el.value=user.id;el.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
if(!maintainerSelected) throw new Error('MAINTAINER_SELECTION_FAILED');
await until("currentUser()&&currentUser().role==='maintainer'",'maintainer role selection');
await until("document.getElementById('compiler-pack')!==null && document.getElementById('compiler-release-note')!==null",'compiler release controls');
await evaluate("(function(){document.getElementById('compiler-pack').value='NAFT-SYNTHETIC@1';document.getElementById('compiler-release-note').value='Browser maintainer release rationale for synthetic research Pack validation.';document.querySelector('[data-action=\\\"compiler-release\\\"]').click();return true;})()");
await until("validRelease(COMPILER_REGISTRY['NAFT-SYNTHETIC@1'])",'compiler Pack release');

const reviewerSelected=await evaluate("(function(){var user=db.users.find(function(u){return u.role==='reviewer'&&u.status==='active';});var el=document.getElementById('actor');if(!user||!el)return false;el.value=user.id;el.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
if(!reviewerSelected) throw new Error('REVIEWER_SELECTION_FAILED');
await until("currentUser()&&currentUser().role==='reviewer'",'reviewer role selection');
await evaluate("location.hash='#/review'; true");
await until("document.getElementById('compiler-note')!==null && document.getElementById('compiler-ack')!==null && document.querySelector('[data-action=\\\"compiler-attest\\\"]')!==null",'compiler attestation controls');
await evaluate("(function(){document.getElementById('compiler-note').value='Browser reviewer attestation rationale for synthetic research package validation.';document.getElementById('compiler-ack').checked=true;document.querySelector('[data-action=\\\"compiler-attest\\\"]').click();return true;})()");
await until("db.compiler_attestations.some(function(a){return a.run_id===CompilerUI.runId;})",'compiler attestation');
const attestedRunId=await evaluate("CompilerUI.runId");
if(attestedRunId!==compilerRunId) throw new Error('COMPILER_RUN_CHANGED_DURING_ATTESTATION:'+compilerRunId+':'+attestedRunId);

await evaluate("(function(){window.__naftDownloads=[];window.__naftExportText=null;var original=URL.createObjectURL.bind(URL);URL.createObjectURL=function(blob){blob.text().then(function(t){window.__naftExportText=t;});return original(blob);};HTMLAnchorElement.prototype.click=function(){window.__naftDownloads.push({download:this.download,href:this.href});};return true;})()");
await evaluate("document.querySelector('[data-action=\\\"compiler-export-attested\\\"]').click(); true");
await until("window.__naftExportText!==null && window.__naftDownloads.length===1",'compiler attested export');
const exportedCompiler=await evaluate("(function(){var x=JSON.parse(window.__naftExportText);return {download:window.__naftDownloads[0].download,status:x.document.status,formal_certification:x.document.formal_certification,acknowledged:x.document.attestation&&x.document.attestation.acknowledged,scope:x.document.attestation&&x.document.attestation.scope,hashMatches:typeof x.package_hash==='string'&&x.package_hash.length===64};})()");
if(exportedCompiler.download!=='naft-compiler-package.json') throw new Error('COMPILER_EXPORT_FILENAME:'+JSON.stringify(exportedCompiler));
if(exportedCompiler.status!=='ATTESTED_RESEARCH_PACKAGE'||exportedCompiler.formal_certification!==false||exportedCompiler.acknowledged!==true||exportedCompiler.scope!=='not_formal_certification'||!exportedCompiler.hashMatches) {
  throw new Error('COMPILER_ATTESTED_EXPORT_INVALID:'+JSON.stringify(exportedCompiler));
}
if(runtimeProblems.length) throw new Error('BROWSER_RUNTIME_PROBLEMS:'+JSON.stringify(runtimeProblems));

console.log('ClimateChain browser impact/anchor-plan flow: PASS');
console.log('Reviewer Demo browser click/mobile: PASS');
console.log(JSON.stringify(Object.fromEntries(metrics)));
console.log('Six-route browser operator flow: PASS');
console.log(JSON.stringify(routeChecks));
console.log('File input hash/recheck browser flow: PASS');
console.log(JSON.stringify(fileEvidenceCheck));
console.log('Compiler role attestation/export browser flow: PASS');
console.log(JSON.stringify(exportedCompiler));
ws.close();
