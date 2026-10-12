'use strict';

var CLIMATECHAIN_ROUTE='climatechain';
var ZERO_BYTES32='0x'+'0'.repeat(64);
var ClimateChainDemo={impact:null,anchorPlan:null,message:''};

function hex32(value) {
  if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value)) throw new Error('INVALID_BYTES32_HEX');
  return '0x'+value;
}

function climateReferenceScenario() {
  return {
    domain:'Japanese rice-paddy methane MRV',
    methodology:'AG-005 reference context',
    source_status:'The retained repository reference is AG-005 3.1-reference. The currently adopted edition and coefficient applicability are not asserted by this demo.',
    evidence_examples:[
      'pre-project baseline records',
      'project record',
      'drainage start and end evidence',
      'heading-date record',
      'field-area record',
      'sustainability record'
    ],
    experiment_boundary:'The real-world context motivates the problem. The hackathon impact experiment itself uses NAFT-SYNTHETIC@1 -> @2 so the demo does not pretend to implement an official methodology revision.'
  };
}

function climateAdoptionRoles() {
  return [
    {role:'Project aggregator',need:'Collect evidence across many farms / fields and know which claims need attention after a rule change.'},
    {role:'MRV / verification operator',need:'Inspect only the affected claims, missing evidence and version lineage instead of silently reusing stale decisions.'},
    {role:'Registry / carbon program',need:'Verify package lineage and hashes without receiving raw private evidence on-chain.'}
  ];
}

function climateTrustModel() {
  return {
    on_chain:['claim hash','package hash','methodology hash','previous package hash','submitter','block timestamp'],
    off_chain:['raw evidence bytes','methodology interpretation','deterministic evaluation','human decisions','package construction'],
    never_claimed:['formal certification','observation truth','credit issuance','credit price','registry acceptance'],
    design_rule:'Blockchain witnesses version lineage; it does not decide climate truth.'
  };
}
function climateTestnetStatus() {
  var record=climateChainTestnetRecord();
  validateClimateChainTestnetRecord(record);
  return record;
}

function climateTestnetStatusCard(record) {
  var verified=record.status==='VERIFIED_TESTNET';
  var cls=verified?'verified':'pending';
  var label=verified?'VERIFIED TESTNET':'NOT SUBMITTED';
  var detail=verified
    ? esc(record.network)+' · chain '+esc(record.chain_id)+' · '+esc(record.contract_address)
    : 'No public-testnet transaction is claimed yet. Exact deployment and lineage fields remain empty until confirmed.';
  var links='';
  if(verified) {
    var explorer=climateChainExplorerLinks(record);
    links='<span class="climate-chain-links">'+
      '<a href="'+esc(explorer.contract)+'" target="_blank" rel="noopener noreferrer">Contract</a> · '+
      '<a href="'+esc(explorer.deployment)+'" target="_blank" rel="noopener noreferrer">Deploy Tx</a> · '+
      '<a href="'+esc(explorer.genesis)+'" target="_blank" rel="noopener noreferrer">P1 Tx</a> · '+
      '<a href="'+esc(explorer.successor)+'" target="_blank" rel="noopener noreferrer">P2 Tx</a> · '+
      '<a href="https://github.com/Takzin1/NaFT/commit/'+esc(record.source_commit)+'" target="_blank" rel="noopener noreferrer">Deployment source</a> · '+
      '<a href="https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/blob/main/scripts/verify-climatechain-testnet.mjs" target="_blank" rel="noopener noreferrer">Read-only verifier</a>'+
      '</span>';
  }
  return '<div class="climate-status"><span class="pill '+cls+'">'+label+'</span><span>'+detail+'</span>'+links+'</div>';
}


function climateChainClaims() {
  var claims=[];
  for(var i=1;i<=100;i++) {
    var variant=i<=70?'standard':i<=85?'intensive':'intensive_complete';
    claims.push(syntheticClaim('CLIMATE-'+String(i).padStart(3,'0'),variant));
  }
  return claims;
}

function runClimateChainImpact() {
  return analyzeImpact(
    climateChainClaims(),
    {type:'methodology',old_key:'NAFT-SYNTHETIC@1',new_key:'NAFT-SYNTHETIC@2'}
  );
}

function climateChainRepresentative(impact) {
  if(!impact) return null;
  return impact.claims.find(function(row) {
    return row.requires_reverification&&row.status==='AUTO_REEVALUATED'&&row.successor;
  })||impact.claims.find(function(row) {
    return row.requires_reverification&&row.successor;
  })||null;
}

function buildClimateChainAnchorPlan(impact) {
  var row=climateChainRepresentative(impact);
  if(!row) throw new Error('NO_SUCCESSOR_PACKAGE_FOR_ANCHOR');
  var oldPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@1'];
  var nextPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@2'];
  var claimHash=hex32(digestText(row.claim_id));

  return {
    schema:'naft-climatechain-anchor-plan-1',
    purpose:'External provenance witness for versioned MRV packages',
    boundary:'Prepared transaction arguments only. NOT_SUBMITTED means no blockchain transaction has been sent by this browser demo. Anchoring does not certify climate impact or issue a carbon credit.',
    contract:'NaFTMRVAnchor',
    function:'anchorPackage(bytes32,bytes32,bytes32,bytes32)',
    chain_status:'NOT_SUBMITTED',
    formal_certification:false,
    carbon_credit_issued:false,
    claim_id:row.claim_id,
    transition:'NAFT-SYNTHETIC@1 -> @2',
    genesis:{
      claim_id_hash:claimHash,
      package_hash:hex32(row.previous_package_hash),
      methodology_hash:hex32(hashObject(oldPack)),
      previous_package_hash:ZERO_BYTES32
    },
    successor:{
      claim_id_hash:claimHash,
      package_hash:hex32(row.successor.package_hash),
      methodology_hash:hex32(hashObject(nextPack)),
      previous_package_hash:hex32(row.previous_package_hash)
    },
    lineage_checks:{
      successor_supersedes_previous:!!(row.successor.document&&row.successor.document.provenance_graph&&row.successor.document.provenance_graph.edges.some(function(edge) {
        return edge.type==='supersedes';
      })),
      previous_package_stale:row.previous_package_stale===true,
      requires_reverification:row.requires_reverification===true
    }
  };
}

function climateMetric(label,value,note) {
  return '<div class="metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(note||'')+'</small></div>';
}

function climateRoleCard(item) {
  return '<article class="card"><span class="eyebrow">'+esc(item.role)+'</span><p>'+esc(item.need)+'</p></article>';
}


function climateScenarioSection(impact) {
  var c=impact?impact.counts:null;
  var display=function(value){return c?esc(value):'—';};
  return '<section class="card climate-scenario" aria-labelledby="climate-scenario-title">'+
    '<div class="climate-section-top"><span class="eyebrow">Practical climate workflow · illustrative only</span>'+
    '<span class="climate-context-label">FICTIONAL AGGREGATOR / SYNTHETIC CLAIMS</span></div>'+
    '<h2 id="climate-scenario-title">One operator. 100 claims. A changed methodology.</h2>'+
    '<p>Imagine a project aggregator coordinating evidence for <b>100 synthetic rice-paddy MRV claims</b>. '+
    'A new synthetic methodology version adds requirements to the intensive pathway. The operator must decide which records need attention, and which are unaffected.</p>'+
    '<div class="climate-scenario-steps" role="list">'+
    '<article role="listitem"><span class="climate-scenario-index">01 / TRIGGER</span><h3>Requirements change</h3>'+
      '<p>NAFT-SYNTHETIC@1 → @2. This is a modeled change, not an official AG-005 amendment.</p></article>'+
    '<article role="listitem"><span class="climate-scenario-index">02 / TRIAGE</span><h3>Trace affected claims</h3>'+
      '<p>NaFT examines dependency bindings rather than treating every claim as changed.</p></article>'+
    '<article role="listitem"><span class="climate-scenario-index">03 / ACTION</span><h3>Review or request evidence</h3>'+
      '<p>Re-evaluate eligible claims, stop when required evidence is missing, and retain predecessor packages.</p></article>'+
    '</div>'+
    '<div class="climate-scenario-result" aria-live="polite">'+
      '<div><span class="climate-scenario-caption">All-claims review queue · hypothetical comparison</span>'+
      '<strong>100</strong><small>Illustrative baseline, not observed industry practice</small></div>'+
      '<div><span class="climate-scenario-caption">NaFT re-verification set · computed</span>'+
      '<strong>'+display(c&&c.require_reverification)+'</strong><small>'+ (c?esc(c.AUTO_REEVALUATED)+' automatically re-evaluated · '+esc(c.EVIDENCE_REQUIRED)+' evidence required':'Click the live demo above to compute the result') +'</small></div>'+
      '<div><span class="climate-scenario-caption">Unaffected claims · computed</span>'+
      '<strong>'+display(c&&c.UNAFFECTED)+'</strong><small>Unchanged semantic dependencies; not a field cost-savings result</small></div>'+
    '</div>'+
    '<p class="climate-scenario-limit"><b>Not a climate-impact measurement:</b> This illustrates a possible verification workflow with synthetic claims. No participating farms, measured emissions reduction, labor savings, registry approval, or commercial adoption is asserted.</p>'+
    '</section>';
}

function climateArchitectureSection() {
  return '<section class="card climate-architecture" aria-labelledby="climate-architecture-title">'+
    '<span class="eyebrow">Why this is different / Architecture</span>'+
    '<h2 id="climate-architecture-title">Verify evidence semantics off-chain. Witness package lineage on-chain.</h2>'+
    '<p>NaFT focuses on the gap between changing methodology rules and a durable audit history. The chain records package hashes and parentage; it cannot assess the underlying observation or methodology eligibility.</p>'+
    '<figure class="climate-architecture-figure">'+
      '<a href="docs/assets/naft-climatechain-architecture.svg" target="_blank" rel="noopener noreferrer" aria-label="Open full-size editable NaFT system architecture diagram">'+
        '<img src="docs/assets/naft-climatechain-architecture.svg" width="1600" height="760" loading="lazy" alt="NaFT architecture diagram: evidence and methodology versions flow through an off-chain evidence compiler, dependency-based impact analysis, selective re-verification, and P1-to-P2 package lineage; only package hashes and lineage are witnessed by the Sepolia contract." />'+
      '</a>'+
      '<figcaption>Architecture is a technical design, not a claim of a live registry integration or an officially certified methodology. Open the diagram to inspect it at full size.</figcaption>'+
    '</figure></section>';
}

function climateChainHeader() {
  return '<header class="reviewer-header"><div class="climate-topbar">'+
    '<a class="climate-brand" href="#/climatechain" aria-label="NaFT ClimateChain demo home">'+
    '<span class="climate-logomark" aria-hidden="true">N</span><span class="climate-brand-name">NaFT<small>CLIMATECHAIN LAB</small></span></a>'+
    '<div class="climate-topbar-right"><span class="climate-event">IEEE ClimateChain Hackathon 2026</span>'+
    '<a class="reviewer-home" href="#/methodologies">Research UI ↗</a></div></div>'+
    '<h1>Version-Aware Climate MRV</h1><p>Carbon markets need evidence that survives methodology change.</p></header>';
}

function pgClimateChainDemo() {
  var impact=ClimateChainDemo.impact;
  var reference=climateReferenceScenario();
  var trust=climateTrustModel();
  var testnet=climateTestnetStatus();
  var out='<section class="card reviewer-hero climate-hero" aria-labelledby="climate-hero-title">'+
    '<div class="climate-hero-grid"><div class="climate-hero-primary">'+
    '<span class="eyebrow climate-hero-label"><span class="climate-pulse" aria-hidden="true"></span>Carbon Markets &amp; Emissions Transparency</span>'+
    '<h2 id="climate-hero-title">When climate MRV rules change, <span>know what needs re-verification.</span></h2>'+
    '<p class="climate-hero-description"><b>NaFT turns methodology change into a traceable engineering decision.</b> Find affected claims, preserve unaffected ones, and link each successor to the exact package it replaces.</p>'+
    '<div class="climate-hero-actions">'+button('Run 100-claim methodology update','climatechain-run',false)+'</div>'+
    '<p class="climate-hero-caption">LIVE SYNTHETIC DEMO · NAFT-SYNTHETIC@1 → @2 · Only intensive claims receive additional requirements.</p>'+
    '</div><aside class="climate-hero-evidence" aria-label="Independently verified public testnet proof">'+
    '<span class="eyebrow">Independently verifiable</span><h3>Proof that can be inspected.</h3>'+
    climateTestnetStatusCard(testnet)+
    '<div class="climate-proof-strip"><div class="climate-proof"><strong>5</strong><span>change classes</span></div><div class="climate-proof"><strong>614</strong><span>adversarial cases</span></div><div class="climate-proof"><strong>0 FN</strong><span>tested synthetic state space</span></div></div>'+
    '<div class="climate-boundary-note"><b>Research prototype.</b> Synthetic claims; no certification, credit issuance, or claim of real-world accuracy.</div>'+
    '</aside></div><div class="climate-process" aria-label="MRV change-control process">'+
    '<div class="climate-process-step"><span>01</span> Rules change</div>'+
    '<div class="climate-process-step"><span>02</span> Trace dependencies</div>'+
    '<div class="climate-process-step"><span>03</span> Re-verify affected</div>'+
    '<div class="climate-process-step"><span>04</span> Witness lineage</div>'+
    '</div></section>';

  out+=climateScenarioSection(impact);

  out+='<section class="card climate-reference"><span class="eyebrow">Real-world reference context</span><h2>Why this problem exists outside the demo</h2>'+
    '<p>NaFT is motivated by evidence-heavy climate programs such as <b>'+esc(reference.domain)+'</b>. The repository retains an '+esc(reference.methodology)+' in which evidence categories include:</p>'+
    '<div class="grid">'+reference.evidence_examples.map(function(item){return '<div class="climate-evidence-item">'+esc(item)+'</div>';}).join('')+'</div>'+
    '<div class="notice"><b>Boundary:</b> '+esc(reference.source_status)+' '+esc(reference.experiment_boundary)+'</div></section>';

  if(impact) {
    var c=impact.counts,row=climateChainRepresentative(impact);
    var total=c.total||c.potentially_affected;
    var reviewPercent=total>0?Math.max(0,Math.min(100,c.require_reverification/total*100)):0;
    var unaffectedPercent=total>0?Math.max(0,Math.min(100,c.UNAFFECTED/total*100)):0;
    out+='<section class="card climate-impact"><span class="eyebrow">01 / Selective re-verification</span><h2>One rule change. Not every claim changes.</h2>'+
      '<p>The impact analyzer computes the affected set from the synthetic methodology transition. Nothing in this breakdown is a claimed productivity improvement.</p>'+
      '<div class="climate-distribution">'+
      '<div class="climate-distribution-head"><b>100-claim change-impact breakdown</b><span>computed from live analyzer output</span></div>'+
      '<div class="climate-distribution-bar" role="img" aria-label="'+esc(c.require_reverification)+' require re-verification; '+esc(c.UNAFFECTED)+' unaffected out of '+esc(total)+' claims">'+
      '<span class="climate-part-review" style="width:'+reviewPercent+'%"></span>'+
      '<span class="climate-part-unaffected" style="width:'+unaffectedPercent+'%"></span></div>'+
      '<div class="climate-distribution-legend"><span><b>'+esc(c.require_reverification)+'</b> re-verify</span><span><b>'+esc(c.UNAFFECTED)+'</b> unaffected</span></div></div>'+
      '<div class="metric-grid">'+
      climateMetric('Candidate claims',c.potentially_affected,'same methodology family')+
      climateMetric('Re-verify',c.require_reverification,'semantic dependency changed')+
      climateMetric('Unaffected',c.UNAFFECTED,'no successor generated')+
      climateMetric('Auto re-evaluated',c.AUTO_REEVALUATED,'deterministic successor')+
      climateMetric('New evidence needed',c.EVIDENCE_REQUIRED,'fail closed')+
      '</div>'+
      '<div class="notice"><b>30 / 70 is fixture-derived, not a performance claim.</b> The synthetic workload contains 70 standard and 30 intensive claims. Changing the workload changes this ratio.</div>'+
      '<h3>Representative lineage</h3>'+
      (row?'<div class="flow"><span>'+esc(row.claim_id)+'</span><span>old package '+esc(row.previous_package_hash.slice(0,12))+'…</span><span>→ re-verify →</span><span>successor '+esc(row.successor.package_hash.slice(0,12))+'…</span></div>'+
      '<details><summary>Why this claim changed</summary>'+jsonView({status:row.status,reasons:row.reasons,affected_nodes:row.affected_nodes,supersedes:row.successor.document.provenance_graph.edges.filter(function(e){return e.type==='supersedes';})})+'</details>':'')+
      button('Prepare blockchain anchor plan','climatechain-anchor-plan',!row)+
      button('Download impact JSON','climatechain-export-impact',false)+
      '</section>';
  }

  if(ClimateChainDemo.anchorPlan) {
    var plan=ClimateChainDemo.anchorPlan;
    out+='<section class="card climate-anchor"><span class="eyebrow">02 / Public provenance witness</span><h2>From package P1 to P2, on chain.</h2>'+
      '<p>The contract stores package hashes and lineage only. MRV logic remains deterministic and off-chain.</p>'+
      '<div class="flow"><span>Genesis package</span><span>→</span><span>Successor package</span><span>→</span><span>Claim head</span></div>'+
      '<p><b>Browser planner status:</b> '+esc(plan.chain_status)+' (this button prepares arguments locally; it never sends a transaction).</p>'+
      climateTestnetStatusCard(testnet)+
      (testnet.status==='VERIFIED_TESTNET'
        ? '<div class="reviewer-boundary"><b>Previously anchored on Ethereum Sepolia · '+esc(plan.claim_id)+'.</b> '+
          'P1 package <code>'+esc(plan.genesis.package_hash.slice(0,16))+'…</code> → '+
          'P2 package <code>'+esc(plan.successor.package_hash.slice(0,16))+'…</code>. '+
          'The independent read-only verifier reconstructed this lineage from the deployment source commit and checked bytecode, transaction calldata, events and final head. '+
          'The browser itself does not broadcast a transaction. Blockchain witnesses lineage; it cannot certify climate truth.</div>'
        : '<div class="notice"><b>No public testnet transaction recorded.</b> This browser demo only prepares exact <code>bytes32</code> arguments for <code>NaFTMRVAnchor.anchorPackage</code>.</div>')+
      '<details open><summary>Prepared transaction arguments</summary>'+jsonView(plan)+'</details>'+
      button('Download anchor plan JSON','climatechain-export-anchor',false)+
      '</section>';
  }

  out+=climateArchitectureSection();

  out+='<section class="card climate-trust"><span class="eyebrow">03 / Explicit trust boundary</span><h2>External witness, not climate truth</h2>'+
    '<div class="grid"><article><h3>On-chain</h3><p>'+trust.on_chain.map(esc).join(' · ')+'</p></article>'+
    '<article><h3>Off-chain</h3><p>'+trust.off_chain.map(esc).join(' · ')+'</p></article>'+
    '<article><h3>Never claimed</h3><p>'+trust.never_claimed.map(esc).join(' · ')+'</p></article></div>'+
    '<p><b>'+esc(trust.design_rule)+'</b> The anchor contract rejects duplicate package hashes, missing parents and lineage forks.</p></section>';

  out+='<section class="card climate-adoption"><span class="eyebrow">04 / From prototype to operations</span><h2>Who uses NaFT?</h2><div class="grid">'+
    climateAdoptionRoles().map(climateRoleCard).join('')+
    '</div><div class="flow"><span>Project aggregator</span><span>→</span><span>NaFT compiler</span><span>→</span><span>Verification operator</span><span>→</span><span>Registry / program</span></div>'+
    '<p class="muted">NaFT is infrastructure for evidence and verification operations; it is not a consumer carbon-credit wallet.</p></section>';

  out+='<section class="card climate-engineering"><span class="eyebrow">05 / Engineering evidence</span><h2>Designed to fail closed</h2>'+
    '<div class="grid">'+
    climateMetric('Adversarial cases','614','independent full-recomputation oracle')+
    climateMetric('False negatives','0','within the tested synthetic state space')+
    climateMetric('Change classes','5','methodology · evidence · parameter · field · activity')+
    '</div>'+
    '<p>Unknown institutional requirements remain unsupported; missing evidence does not become a pass; stale human decisions do not silently survive input or methodology changes.</p>'+
    '<p class="muted">These are engineering results, not field accuracy, measured cost savings, verifier acceptance, or universal proof.</p></section>';

  return out+'<p role="status">'+esc(ClimateChainDemo.message)+'</p>';
}

function handleClimateChainAction(action) {
  if(action==='climatechain-run') {
    ClimateChainDemo.impact=runClimateChainImpact();
    ClimateChainDemo.anchorPlan=null;
    ClimateChainDemo.message='Synthetic 100-claim impact analysis completed.';
  }
  if(action==='climatechain-anchor-plan') {
    if(!ClimateChainDemo.impact) throw new Error('RUN_IMPACT_ANALYSIS_FIRST');
    ClimateChainDemo.anchorPlan=buildClimateChainAnchorPlan(ClimateChainDemo.impact);
    ClimateChainDemo.message='Anchor arguments prepared locally; no transaction broadcast from this browser. Public Sepolia reference evidence is shown separately.';
  }
  if(action==='climatechain-export-impact'&&ClimateChainDemo.impact) {
    downloadJSON(canonicalize(ClimateChainDemo.impact),'naft-climatechain-impact.json');
  }
  if(action==='climatechain-export-anchor'&&ClimateChainDemo.anchorPlan) {
    downloadJSON(canonicalize(ClimateChainDemo.anchorPlan),'naft-climatechain-anchor-plan.json');
  }
}
