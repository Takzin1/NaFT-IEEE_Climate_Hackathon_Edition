'use strict';

var CLIMATECHAIN_ROUTE='climatechain';
var ZERO_BYTES32='0x'+'0'.repeat(64);
var ClimateChainDemo={impact:null,anchorPlan:null,tamper:null,triad:null,selectedClaim:null,filter:'ALL',message:''};

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


/**
 * Portable, deterministic receipt for the *synthetic* IEEE experiment.
 * A receipt is neither a digital signature nor independent proof of climate truth.
 * The Node replay tool recomputes it from the exact checked-out source.
 */
function buildClimateChainAuditReceipt(impact) {
  if(!impact||!Array.isArray(impact.claims)||!impact.counts) throw new Error('RUN_IMPACT_ANALYSIS_FIRST');
  var oldPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@1'];
  var newPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@2'];
  var plan=buildClimateChainAnchorPlan(impact);
  var payload={
    schema:'naft-ieee-audit-receipt-1',
    scope:'Synthetic engineering replay only; no field effectiveness, certification, or source authenticity proof',
    experiment:'NAFT-SYNTHETIC@1 -> @2',
    workload_sha256:hashObject(climateChainClaims()),
    old_pack_sha256:hashObject(oldPack),
    new_pack_sha256:hashObject(newPack),
    change:clone(impact.change),
    counts:clone(impact.counts),
    claims:impact.claims.map(function(row) {
      return {
        claim_id:row.claim_id,
        status:row.status,
        requires_reverification:row.requires_reverification===true,
        previous_package_hash:row.previous_package_hash,
        previous_package_stale:row.previous_package_stale===true,
        successor_package_hash:row.successor?row.successor.package_hash:null,
        successor_graph_reference:row.successor?row.successor.document.provenance_graph_reference:null,
        reasons:clone(row.reasons||[]),
        affected_nodes:clone(row.affected_nodes||[])
      };
    }).sort(function(x,y){return x.claim_id<y.claim_id?-1:x.claim_id>y.claim_id?1:0;}),
    anchor_arguments:{
      chain_status:'NOT_SUBMITTED',
      claim_id:plan.claim_id,
      genesis:clone(plan.genesis),
      successor:clone(plan.successor),
      lineage_checks:clone(plan.lineage_checks)
    }
  };
  return Object.assign({},payload,{receipt_sha256:hashObject(payload)});
}

/** Deliberately corrupt synthetic raw evidence without changing its expected hash. */
function runClimateChainTamperChallenge() {
  var input=syntheticClaim('CLIMATE-086','intensive_complete');
  var pack=COMPILER_REGISTRY['NAFT-SYNTHETIC@1'];
  var original=compileEvidence(input,pack);
  var tampered=clone(input);
  var evidenceId=tampered.evidence[0].id;
  // Change exactly one printable byte while preserving valid JSON syntax.
  var originalContent=tampered.evidence[0].content;
  tampered.evidence[0].content=originalContent.replace('engineering fixture','engineering fixturf');
  if(originalContent===tampered.evidence[0].content) throw new Error('TAMPER_FIXTURE_MISSING');
  var challenged=compileEvidence(tampered,pack);
  var rejection=challenged.document.evaluation.issues.some(function(issue) {
    return issue.code==='content_hash:'+evidenceId&&issue.status==='UNSUPPORTED';
  });
  return {
    schema:'naft-ieee-tamper-challenge-1',
    boundary:'Synthetic offline evidence alteration. This is a content-integrity demonstration, not proof of observation truth or blockchain validation.',
    claim_id:'CLIMATE-086',
    evidence_id:evidenceId,
    original:{status:original.document.evaluation.status,package_hash:original.package_hash},
    modified:{status:challenged.document.evaluation.status,package_hash:challenged.package_hash,issues:clone(challenged.document.evaluation.issues)},
    hash_mismatch_detected:rejection,
    parse_preserved:!challenged.document.evaluation.issues.some(function(issue){return issue.code==='evidence_parse:'+evidenceId;}),
    fail_closed:rejection&&challenged.document.evaluation.status==='UNSUPPORTED'&&original.package_hash!==challenged.package_hash
  };
}


/** A second, full-compilation oracle for the 100 synthetic claims.
 * The selective analyzer's own counts are NOT trusted as the expected answer.
 * Only off-chain deterministic statements are checked here.
 */
function verifyClimateChainSelection(impact) {
  if(!impact||!impact.change||impact.change.type!=='methodology'||
     impact.change.old_key!=='NAFT-SYNTHETIC@1'||impact.change.new_key!=='NAFT-SYNTHETIC@2'||
     !Array.isArray(impact.claims)) throw new Error('TRIAD_INVALID_CHANGE_SCOPE');
  var original=climateChainClaims();
  if(impact.claims.length!==original.length) throw new Error('TRIAD_CLAIMS_MISSING_OR_ADDED');
  var oldPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@1'];
  var newPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@2'];
  var counts={total:0,potentially_affected:0,require_reverification:0,UNAFFECTED:0,AUTO_REEVALUATED:0,EVIDENCE_REQUIRED:0,HUMAN_REVIEW_REQUIRED:0,UNSUPPORTED:0};
  var seen=new Set();
  original.forEach(function(item,index){
    var before=canonicalCompilerInput(item),id=before.activity.id,row=impact.claims[index];
    if(!row||seen.has(row.claim_id)||row.claim_id!==id) throw new Error('TRIAD_CLAIM_ID_OR_ORDER_MISMATCH');
    seen.add(id);
    var prior=compileEvidence(before,oldPack);
    var next=clone(before);
    next.activity.methodology_version=newPack.methodology_version;
    next.evidence=next.evidence.map(function(e) {
      return e.methodology_version===oldPack.methodology_version
        ? Object.assign({},e,{methodology_version:newPack.methodology_version}) : e;
    });
    // Re-compile the *entire* synthetic input under each exact pack; do not
    // use row.requires_reverification, row.reasons or analyzer counts as oracle.
    var changed=hashObject(activeProjection(oldPack,before))!==hashObject(activeProjection(newPack,next));
    var successor=changed?compileEvidence(next,newPack,{supersedes:prior.package_hash}):null;
    var status=successor?successor.document.evaluation.status:'UNAFFECTED';
    if(row.previous_package_hash!==prior.package_hash||row.potentially_affected!==true)
      throw new Error('TRIAD_PREDECESSOR_OR_CANDIDATE_MISMATCH:'+id);
    if(row.requires_reverification!==changed||row.status!==status)
      throw new Error('TRIAD_MISSED_CHANGE_OR_STATUS:'+id);
    if(!row.next_input||canonicalize(row.next_input)!==canonicalize(next))
      throw new Error('TRIAD_INPUT_REBIND_MISMATCH:'+id);
    if(changed) {
      if(!row.successor||row.successor.package_hash!==successor.package_hash||
        row.successor.document.evaluation.status!==status||
        row.previous_package_stale!==true||!row.affected_nodes.length)
        throw new Error('TRIAD_SUCCESSOR_OR_DEPENDENCY_MISMATCH:'+id);
      counts.require_reverification++;
    } else if(row.successor!==null||row.affected_nodes.length!==0) {
      throw new Error('TRIAD_UNAFFECTED_SUCCESSOR_OR_DEPENDENCY:'+id);
    }
    counts.total++;counts.potentially_affected++;counts[status]++;
  });
  if(canonicalize(counts)!==canonicalize(impact.counts)) throw new Error('TRIAD_COUNT_MISMATCH');
  return {oracle:'Independent full-compilation of each synthetic claim under both pack versions',
    status:'PASS',counts:counts,checked_claims:counts.total,
    boundary:'Synthetic source-bound equivalence only; no measured error rate or field accuracy'};
}

/** Fail-closed, deterministic 3-pillar submission proof; no RPC or wallet call. */
function buildClimateChainTriadProof(impact) {
  var verified=verifyClimateChainSelection(impact);
  var tamper=runClimateChainTamperChallenge();
  if(!tamper.hash_mismatch_detected||!tamper.parse_preserved||!tamper.fail_closed)
    throw new Error('TRIAD_TAMPER_DETECTION_FAILED');
  var plan=buildClimateChainAnchorPlan(impact),record=climateChainTestnetRecord();
  validateClimateChainTestnetRecord(record);
  if(record.status!=='VERIFIED_TESTNET'||record.chain_id!==11155111||
     plan.chain_status!=='NOT_SUBMITTED'||plan.formal_certification!==false||
     plan.carbon_credit_issued!==false||plan.genesis.previous_package_hash!==ZERO_BYTES32||
     plan.successor.previous_package_hash!==plan.genesis.package_hash||
     plan.successor.claim_id_hash!==plan.genesis.claim_id_hash||
     !plan.lineage_checks.successor_supersedes_previous||
     !plan.lineage_checks.previous_package_stale||
     !plan.lineage_checks.requires_reverification)
    throw new Error('TRIAD_SEPOLIA_LINKAGE_MISMATCH');
  var links=climateChainExplorerLinks(record);
  var payload={
    schema:'naft-ieee-triad-proof-1',
    scope:'Reproducible synthetic 100-claim engineering proof, with previously recorded public Sepolia lineage',
    pillars:{
      error_detection:{status:'PASS',claim_id:tamper.claim_id,
        change:'Modified synthetic evidence content without updating its SHA-256 manifest',
        rejected_issue:'content_hash:'+tamper.evidence_id,
        observed_status:tamper.modified.status,fail_closed:tamper.fail_closed},
      selective_reverification:verified,
      sepolia_lineage:{status:'RECORDED_TESTNET_REFERENCE',chain_id:record.chain_id,
        contract_address:record.contract_address,source_commit:record.source_commit,
        claim_id:plan.claim_id,genesis_package_hash:plan.genesis.package_hash,
        successor_package_hash:plan.successor.package_hash,
        successor_parent_hash:plan.successor.previous_package_hash,
        explorer_tx_genesis:links.genesis,explorer_tx_successor:links.successor,
        local_planner_status:'NOT_SUBMITTED',
        live_rpc_checked_by_browser:false,
        independent_rpc_check:'Run bash scripts/verify-live-sepolia.sh (read-only, no key)',
        limitation:'Hash and parentage witness only; no certification, credit issuance or climate truth assertion'}
    }
  };
  return Object.assign({},payload,{proof_sha256:hashObject(payload)});
}

/** Source-bound synthetic claim reasoning. No external institutional assertion. */
function buildClimateChainImpactTrace(impact,claimId) {
  if(!impact||!Array.isArray(impact.claims)||!impact.change||impact.change.type!=='methodology') throw new Error('RUN_IMPACT_ANALYSIS_FIRST');
  var row=impact.claims.find(function(c){return c.claim_id===claimId;});
  if(!row) throw new Error('UNKNOWN_TRACE_CLAIM');
  var original=climateChainClaims().find(function(c){return c.activity.id===claimId;});
  var oldPack=COMPILER_REGISTRY[impact.change.old_key],newPack=COMPILER_REGISTRY[impact.change.new_key];
  if(!original||!oldPack||!newPack||!row.next_input) throw new Error('TRACE_SOURCE_UNAVAILABLE');
  var oldActive=activeProjection(oldPack,original),newActive=activeProjection(newPack,row.next_input);
  var changed=hashObject(oldActive)!==hashObject(newActive);
  if(changed!==row.requires_reverification) throw new Error('TRACE_ANALYZER_PARITY_FAILED');
  var categories=['rules','parameters','evidence_requirements','calculation_spec','exceptions','unsupported_conditions'];
  var diffs=categories.map(function(k){
    return {category:k,changes:changesBetween(oldActive[k],newActive[k]).map(function(item){
      return {id:item.id,kind:item.change};
    })};
  }).filter(function(item){return item.changes.length>0;});
  var successor=row.successor;
  return {
    schema:'naft-ieee-impact-trace-1',
    scope:'Synthetic source-bound reasoning; not independently certified climate semantics, authentic observations, or blockchain validation',
    claim_id:row.claim_id,
    stratum:original.activity.stratum,
    from:impact.change.old_key,
    to:impact.change.new_key,
    candidate:row.potentially_affected===true,
    old_active_projection_sha256:hashObject(oldActive),
    new_active_projection_sha256:hashObject(newActive),
    semantic_change:changed,
    requires_reverification:row.requires_reverification===true,
    status:row.status,
    active_dependency_differences:diffs,
    reason_tags:clone(row.reasons||[]),
    old_graph_dependent_nodes:clone(row.affected_nodes||[]),
    previous_package_hash:row.previous_package_hash,
    successor_package_hash:successor?successor.package_hash:null,
    previous_package_stale:row.previous_package_stale===true,
    missing_evidence:successor?clone(successor.document.evaluation.missing_evidence):[],
    supersedes_recorded:!!(successor&&successor.document.provenance_graph.edges.some(function(e){
      return e.type==='supersedes'&&e.from==='package:'+row.previous_package_hash;
    }))
  };
}
function climateImpactExplorer(impact) {
  var permitted=['ALL','REVERIFY','UNAFFECTED','AUTO_REEVALUATED','EVIDENCE_REQUIRED'];
  var filter=permitted.includes(ClimateChainDemo.filter)?ClimateChainDemo.filter:'ALL';
  var visible=impact.claims.filter(function(r) {
    return filter==='ALL'||filter==='REVERIFY'&&r.requires_reverification||r.status===filter;
  });
  var id=ClimateChainDemo.selectedClaim;
  if(!visible.some(function(r){return r.claim_id===id;})) id=visible.length?visible[0].claim_id:null;
  var trace=id?buildClimateChainImpactTrace(impact,id):null,c=impact.counts;
  var controls=[['ALL','All',c.total],['REVERIFY','Re-verify',c.require_reverification],
    ['UNAFFECTED','Unaffected',c.UNAFFECTED],['AUTO_REEVALUATED','Auto re-evaluated',c.AUTO_REEVALUATED],
    ['EVIDENCE_REQUIRED','Evidence needed',c.EVIDENCE_REQUIRED]];
  var out='<section class="card climate-explorer" aria-labelledby="climate-explorer-title">'+
    '<span class="eyebrow">02 / Source-bound Impact Explorer · synthetic</span>'+
    '<h2 id="climate-explorer-title">Select any claim. Inspect why it changed — or did not.</h2>'+
    '<p>Every tile comes from the real analyzer. Select a claim to inspect active requirements, affected graph nodes and its resulting package lineage.</p>'+
    '<div class="climate-explorer-filters" role="group" aria-label="Filter synthetic claim statuses">'+
    controls.map(function(v){return '<button class="climate-explorer-filter" type="button" data-action="climatechain-filter" data-filter="'+esc(v[0])+
      '" aria-pressed="'+(filter===v[0]?'true':'false')+'">'+esc(v[1])+' '+esc(v[2])+'</button>';}).join('')+'</div>'+
    '<div class="climate-claim-grid" role="group" aria-label="Synthetic claim selection">'+
    visible.map(function(row){
      var state=row.status==='UNAFFECTED'?'unaffected':row.status==='AUTO_REEVALUATED'?'auto':row.status==='EVIDENCE_REQUIRED'?'evidence':'other';
      return '<button class="climate-claim-btn" type="button" data-state="'+esc(state)+'" data-action="climatechain-select-claim" data-claim-id="'+esc(row.claim_id)+
        '" aria-label="'+esc(row.claim_id+' · '+row.status)+'" aria-pressed="'+(row.claim_id===id?'true':'false')+'">'+esc(row.claim_id.slice(-3))+'</button>';
    }).join('')+'</div>'+
    '<p class="climate-explorer-caption">All records fictional. Tiles are keyboard- and touch-selectable.</p>';
  if(trace) {
    var result=trace.successor_package_hash?'Successor emitted':'No successor generated';
    out+='<div class="climate-trace" aria-live="polite">'+
      '<div class="climate-trace-header"><h3>'+esc(trace.claim_id)+'</h3><strong>'+esc(trace.status.replace(/_/g,' '))+'</strong></div>'+
      '<div class="climate-trace-flow" role="list">'+
        '<div role="listitem"><small>01 · Methodology change</small><b>'+esc(trace.from)+' → '+esc(trace.to)+'</b><span>'+esc(trace.stratum)+' synthetic pathway</span></div>'+
        '<div role="listitem"><small>02 · Active-rule comparison</small><b>'+esc(trace.semantic_change?'Semantic difference':'No active semantic difference')+'</b><span>SHA-256 projections in details</span></div>'+
        '<div role="listitem"><small>03 · Decision</small><b>'+esc(trace.requires_reverification?'Re-verify':'Unaffected')+'</b><span>'+esc(trace.old_graph_dependent_nodes.length)+' old-graph dependent node IDs</span></div>'+
        '<div role="listitem"><small>04 · Package outcome</small><b>'+esc(result)+'</b><span>'+esc(trace.status.replace(/_/g,' '))+'</span></div></div>'+
      '<div class="climate-trace-details"><div><h4>Active dependency changes</h4>'+
        (trace.active_dependency_differences.length?trace.active_dependency_differences.map(function(d){
          return '<p><b>'+esc(d.category)+'</b> '+d.changes.map(function(x){return '<code>'+esc(x.kind+' · '+x.id)+'</code>';}).join(' ')+'</p>';
        }).join(''):'<p>No active rule, parameter or evidence-requirement difference.</p>')+'</div>'+
      '<div><h4>Package and evidence</h4>'+
        '<p>Previous <code>'+esc(trace.previous_package_hash.slice(0,20))+'…</code></p>'+
        (trace.successor_package_hash?'<p>Successor <code>'+esc(trace.successor_package_hash.slice(0,20))+'…</code></p>':
          '<p>No successor; baseline package compilation still takes place.</p>')+
        (trace.missing_evidence.length?'<p>Missing '+trace.missing_evidence.map(function(x){return '<code>'+esc(x)+'</code>';}).join(' ')+'</p>':'')+
      '</div></div>'+
      '<details><summary>Exact hashes, reason tags and old-graph node IDs</summary>'+jsonView(trace)+'</details>'+
      button('Download selected trace JSON','climatechain-export-trace',false)+
      '<p class="climate-explorer-caption">The methodology-version candidate tag alone is not proof of a semantic change. Dependency node IDs are exposed only when the analyzer selects re-verification. Not a certification or live chain transaction.</p>'+
      '</div>';
  }
  return out+'</section>';
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
    '<img class="climate-logomark" src="assets/naft-logo.webp" width="44" height="44" alt="" decoding="async"><span class="climate-brand-name">NaFT<small>CLIMATECHAIN LAB</small></span></a>'+
    '<div class="climate-topbar-right"><span class="climate-event">IEEE ClimateChain Hackathon 2026</span>'+
    '<a class="reviewer-home" href="#/methodologies">Research UI ↗</a>'+
     '<a class="climate-corner-logo" href="#/climatechain" aria-label="NaFT home"><img src="assets/naft-logo.webp" width="60" height="60" alt="NaFT geometric star logo" decoding="async"></a></div></div>'+
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
    '<div class="notice"><b>Boundary:</b> '+esc(reference.source_status)+' '+esc(reference.experiment_boundary)+'</div></section>' +
  '<section class="card climate-japan-research" aria-labelledby="climate-japan-research-title">'+
  '<span class="eyebrow">Japan / attributed research baseline · 2026-10-18</span>'+
  '<h2 id="climate-japan-research-title">Reference evidence, not a carbon-credit claim</h2>'+
  '<p>Japan-focused MRV reference: <b>9</b> reported trial-site treatment designs (2008–2009), <b>3</b> selected research aggregate ratios with standard errors, <b>4</b> published operator-program totals, and <b>10</b> descriptive AG-005 evidence fields. Source links and supplied-archive SHA-256 are pinned for replay.</p>'+
  '<p><a href="https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/blob/main/data/japan-mrv-research-2026-10-18/baseline.json" target="_blank" rel="noopener noreferrer">Inspect source-attributed Japan baseline →</a> · <a href="https://github.com/Takzin1/NaFT-IEEE_Climate_Hackthon_Edition/blob/main/docs/japan-mrv-research-baseline.md" target="_blank" rel="noopener noreferrer">Verification protocol →</a></p>'+
  '<div class="notice"><b>Not field evidence:</b> no original raw methane readings, applicable official coefficients, confirmed current AG-005 pack, individual farm eligibility or credits can be derived from this research compilation. The 100-claim demonstration below remains synthetic.</div>'+
  '</section>';

  if(impact) {
    out+=climateImpactExplorer(impact);
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
      button('Download reproducible audit receipt','climatechain-export-receipt',false)+
      button('Run evidence tamper challenge','climatechain-tamper',false)+
       button('Verify all 3 pillars','climatechain-triad',false)+
      '</section>';
  }

  if(ClimateChainDemo.triad) {
    var proof=ClimateChainDemo.triad,checks=proof.pillars;
    out+='<section class="card climate-triad" aria-labelledby="climate-triad-title">'+
      '<span class="eyebrow">Submission integrity / reproducible · synthetic</span>'+
      '<h2 id="climate-triad-title">Detect errors. Re-verify only changes. Inspect Sepolia lineage.</h2>'+
      '<div class="grid">'+
      '<article><h3>01 / Error detection · PASS</h3><p>Altered raw evidence fails SHA-256 integrity checks and the compiler blocks it.</p><code>'+esc(checks.error_detection.rejected_issue)+'</code></article>'+
      '<article><h3>02 / Selective re-verification · PASS</h3><p>Independent full-compilation oracle confirms <b>'+esc(checks.selective_reverification.counts.require_reverification)+'</b> to re-verify, <b>'+esc(checks.selective_reverification.counts.UNAFFECTED)+'</b> unaffected and <b>'+esc(checks.selective_reverification.counts.EVIDENCE_REQUIRED)+'</b> requiring evidence.</p></article>'+
      '<article><h3>03 / Sepolia · RECORDED</h3><p>Local P1 → P2 hashes match the prepared successor lineage. Public testnet transactions are linked; this browser does not independently query RPC or submit transactions.</p></article>'+
      '</div>'+
      '<p class="muted">This is an offline, source-bound integrity demonstration for synthetic claims, not measured climate performance or certification. Confirm live on-chain state separately using the read-only verifier.</p>'+
      '<details><summary>Inspect proof digest and all three machine-readable checks</summary>'+jsonView(proof)+'</details>'+
      button('Download 3-pillar proof JSON','climatechain-export-triad',false)+
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

  if(ClimateChainDemo.tamper) {
    var challenge=ClimateChainDemo.tamper;
    out+='<section class="card climate-audit-challenge" aria-labelledby="climate-challenge-title">'+
      '<span class="eyebrow">03 / Adversarial evidence check · synthetic</span>'+
      '<h2 id="climate-challenge-title">Change one evidence byte. Detect an invalid manifest.</h2>'+
      '<p>This local challenge mutates the raw content while retaining its original expected SHA-256. The deterministic compiler must fail closed.</p>'+
      '<div class="metric-grid">'+
        climateMetric('Before',challenge.original.status,'untampered synthetic input')+
        climateMetric('After',challenge.modified.status,'expected hash no longer matches')+
        climateMetric('Tamper rejected',challenge.fail_closed?'YES':'NO','not a certification claim')+
      '</div>'+
      '<details><summary>Inspect failure codes and package hash changes</summary>'+jsonView(challenge)+'</details>'+
      button('Download tamper challenge JSON','climatechain-export-tamper',false)+
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

function handleClimateChainAction(action,element) {
  if(action==='climatechain-run') {
    ClimateChainDemo.impact=runClimateChainImpact();
    ClimateChainDemo.anchorPlan=null;
    ClimateChainDemo.tamper=null;
    ClimateChainDemo.triad=null;
    ClimateChainDemo.filter='ALL';
    ClimateChainDemo.selectedClaim='CLIMATE-071';
    ClimateChainDemo.message='Synthetic 100-claim impact analysis completed.';
  }
  if(action==='climatechain-filter') {
    if(!ClimateChainDemo.impact) throw new Error('RUN_IMPACT_ANALYSIS_FIRST');
    var allowed=['ALL','REVERIFY','UNAFFECTED','AUTO_REEVALUATED','EVIDENCE_REQUIRED'];
    var key=element&&element.dataset&&element.dataset.filter;
    if(!allowed.includes(key)) throw new Error('UNKNOWN_TRACE_FILTER');
    ClimateChainDemo.filter=key;
    var matching=ClimateChainDemo.impact.claims.filter(function(r) {return key==='ALL'||key==='REVERIFY'&&r.requires_reverification||r.status===key;});
    if(!matching.some(function(r){return r.claim_id===ClimateChainDemo.selectedClaim;})) ClimateChainDemo.selectedClaim=matching.length?matching[0].claim_id:null;
    ClimateChainDemo.message='Synthetic claim filter: '+key+'.';
  }
  if(action==='climatechain-select-claim') {
    if(!ClimateChainDemo.impact) throw new Error('RUN_IMPACT_ANALYSIS_FIRST');
    var id=element&&element.dataset&&element.dataset.claimId;
    if(!ClimateChainDemo.impact.claims.some(function(r){return r.claim_id===id;})) throw new Error('UNKNOWN_TRACE_CLAIM');
    ClimateChainDemo.selectedClaim=id;
    ClimateChainDemo.message='Inspecting synthetic trace '+id+'.';
  }
  if(action==='climatechain-triad') {
    if(!ClimateChainDemo.impact) throw new Error('RUN_IMPACT_ANALYSIS_FIRST');
    // Commit only on success so failures cannot show a stale green result.
    ClimateChainDemo.triad=null;
    ClimateChainDemo.triad=buildClimateChainTriadProof(ClimateChainDemo.impact);
    ClimateChainDemo.message='All three synthetic integrity checks passed. Sepolia evidence is a recorded reference, not a live browser RPC check.';
  }
  if(action==='climatechain-anchor-plan') {
    if(!ClimateChainDemo.impact) throw new Error('RUN_IMPACT_ANALYSIS_FIRST');
    ClimateChainDemo.anchorPlan=buildClimateChainAnchorPlan(ClimateChainDemo.impact);
    ClimateChainDemo.message='Anchor arguments prepared locally; no transaction broadcast from this browser. Public Sepolia reference evidence is shown separately.';
  }
  if(action==='climatechain-tamper') {
    if(!ClimateChainDemo.impact) throw new Error('RUN_IMPACT_ANALYSIS_FIRST');
    ClimateChainDemo.tamper=runClimateChainTamperChallenge();
    ClimateChainDemo.message=ClimateChainDemo.tamper.fail_closed
      ? 'Synthetic evidence tampering detected and blocked.'
      : 'Tamper challenge inconclusive; do not assert successful detection.';
  }
  if(action==='climatechain-export-triad'&&ClimateChainDemo.triad) {
    downloadJSON(canonicalize(ClimateChainDemo.triad),'naft-ieee-three-pillars-proof.json');
  }
  if(action==='climatechain-export-trace'&&ClimateChainDemo.impact&&ClimateChainDemo.selectedClaim) {
    downloadJSON(canonicalize(buildClimateChainImpactTrace(ClimateChainDemo.impact,ClimateChainDemo.selectedClaim)),'naft-ieee-impact-trace-'+ClimateChainDemo.selectedClaim+'.json');
  }
  if(action==='climatechain-export-receipt'&&ClimateChainDemo.impact) {
    downloadJSON(canonicalize(buildClimateChainAuditReceipt(ClimateChainDemo.impact)),'naft-ieee-audit-receipt.json');
  }
  if(action==='climatechain-export-tamper'&&ClimateChainDemo.tamper) {
    downloadJSON(canonicalize(ClimateChainDemo.tamper),'naft-ieee-tamper-challenge.json');
  }
  if(action==='climatechain-export-impact'&&ClimateChainDemo.impact) {
    downloadJSON(canonicalize(ClimateChainDemo.impact),'naft-climatechain-impact.json');
  }
  if(action==='climatechain-export-anchor'&&ClimateChainDemo.anchorPlan) {
    downloadJSON(canonicalize(ClimateChainDemo.anchorPlan),'naft-climatechain-anchor-plan.json');
  }
}
