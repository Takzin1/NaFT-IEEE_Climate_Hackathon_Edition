'use strict';
// Pure compilation: no clock, random IDs, network, DOM or mutable database reads.
function compilerKey(p) { return p.methodology_id + '@' + p.methodology_version; }
function stableSort(items) { return items.slice().sort(function(a,b) { var x=canonicalize(a),y=canonicalize(b); return x<y?-1:x>y?1:0; }); }
function deepFreeze(x) { if(x && typeof x==='object') { Object.values(x).forEach(deepFreeze); Object.freeze(x); } return x; }
function validatePack(p) {
  ['methodology_id','methodology_version','rule_pack_version','effective_from','effective_to','source_url','source_hash','source_checked_at','status','parameters','evidence_requirements','rules','calculation_spec','exceptions','unsupported_conditions'].forEach(function(k) { if(!Object.prototype.hasOwnProperty.call(p,k)) throw new Error('PACK_FIELD_REQUIRED:'+k); });
  ['parameters','evidence_requirements','rules','calculation_spec','exceptions','unsupported_conditions'].forEach(function(k) { if(!p[k] || typeof p[k]!=='object' || Array.isArray(p[k])) throw new Error('INVALID_PACK_MAP:'+k); });
  if(!['SYNTHETIC','CONFIG_REQUIRED','UNSUPPORTED','REFERENCE'].includes(p.status)) throw new Error('UNSUPPORTED_PACK_STATUS');
  return p;
}
function createMethodologyRegistry(packs) {
  var map=Object.create(null);
  packs.forEach(function(p) { validatePack(p); var key=compilerKey(p); if(map[key]) throw new Error('DUPLICATE_PACK_VERSION'); map[key]=deepFreeze(clone(p)); });
  return Object.freeze(map);
}
var COMPILER_REGISTRY=createMethodologyRegistry(VERSIONED_PACKS);
function changesBetween(a,b) {
  return Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort().filter(function(k) { return canonicalize(a[k])!==canonicalize(b[k]); }).map(function(k) {
    return {id:k,change:!Object.prototype.hasOwnProperty.call(a,k)?'added':!Object.prototype.hasOwnProperty.call(b,k)?'removed':'modified',before:Object.prototype.hasOwnProperty.call(a,k)?clone(a[k]):null,after:Object.prototype.hasOwnProperty.call(b,k)?clone(b[k]):null};
  });
}
function compareMethodologyVersions(oldPack,newPack) {
  validatePack(oldPack);validatePack(newPack);
  if(oldPack.methodology_id!==newPack.methodology_id) throw new Error('DIFFERENT_METHODOLOGIES');
  var out={old_key:compilerKey(oldPack),new_key:compilerKey(newPack),old_hash:hashObject(oldPack),new_hash:hashObject(newPack)};
  var names={rules:'changed_rules',parameters:'changed_parameters',evidence_requirements:'changed_evidence_requirements',calculation_spec:'changed_calculation_spec',exceptions:'changed_exceptions',unsupported_conditions:'changed_unsupported_conditions'};
  Object.keys(names).forEach(function(k) { out[names[k]]=changesBetween(oldPack[k],newPack[k]); });
  var a=clone(oldPack),b=clone(newPack);Object.keys(names).forEach(function(k) { delete a[k];delete b[k]; });out.changed_fields=changesBetween(a,b);
  return out;
}
function getPath(obj,path) {
  if(typeof path!=='string'||path.split('.').some(function(k) { return ['__proto__','prototype','constructor'].includes(k); })) return undefined;
  return path.split('.').reduce(function(v,k) { return v && Object.prototype.hasOwnProperty.call(v,k)?v[k]:undefined; },obj);
}
function matchesWhen(input,when) { return !when || canonicalize(getPath(input,when.path))===canonicalize(when.equals); }
function normalizedEvidence(raw,activity) {
  return stableSort((raw||[]).map(function(e) {
    var content=typeof e.content==='string'?new TextEncoder().encode(e.content):Array.isArray(e.bytes)&&e.bytes.every(function(n) { return Number.isInteger(n)&&n>=0&&n<=255; })?new Uint8Array(e.bytes):null;
    var hash=content?digestBytes(content):null,normalized=null,parseValid=!!content;
    if(['farm-log-json-v1','iot-json-v1','gis-json-v1'].includes(e.adapter)) {
      try { normalized=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(content));parseValid=!!normalized&&typeof normalized==='object'; } catch(error) { parseValid=false; }
    }

    var value={id:e.id,category:e.category,adapter:e.adapter||'text-v1',activity_id:e.activity_id,field_id:e.field_id,methodology_id:e.methodology_id,methodology_version:e.methodology_version,period:clone(e.period||{}),source:e.source||'UNKNOWN',provenance:e.provenance||'UNKNOWN',content_hash:hash,expected_hash:e.expected_hash||null,byte_length:content?content.length:null,normalized_data:normalized,parse_valid:parseValid,content_verified:!!(hash&&e.expected_hash===hash),binding_valid:e.activity_id===activity.id&&e.field_id===activity.field_id&&e.methodology_id===activity.methodology_id&&e.methodology_version===activity.methodology_version};
    value.manifest_hash=hashObject(value);return value;
  }));
}
function canonicalCompilerInput(input) {
  var x=clone(input);x.evidence=stableSort(x.evidence||[]);x.peers=stableSort(x.peers||[]);return x;
}
function inputFingerprint(input) { return hashObject(canonicalCompilerInput(input)); }
function activeProjection(pack,input) {
  var p=clone(pack);delete p.methodology_version;delete p.rule_pack_version;delete p.source_url;delete p.source_hash;delete p.source_checked_at;delete p.scope;
  ['rules','evidence_requirements','exceptions','unsupported_conditions'].forEach(function(k) { Object.keys(p[k]).forEach(function(id) { var item=p[k][id];if(item&&typeof item==='object'&&item.when&&getPath(input,item.when.path)!==undefined&&!matchesWhen(input,item.when)) delete p[k][id]; }); });
  var used=new Set(pack.calculation_spec.parameters||[]);Object.values(p.rules).forEach(function(r) { if(r.parameter) used.add(r.parameter); });
  Object.keys(p.parameters).forEach(function(k) { if(!used.has(k)) delete p.parameters[k]; });return p;
}
function compileEvidence(input,pack,options) {
  validatePack(pack);input=canonicalCompilerInput(input);options=options||{};
  if(!input.activity||!input.field) throw new Error('IDENTITY_REQUIRED');
  var a=input.activity,f=input.field,manifests=normalizedEvidence(input.evidence,a),issues=[],checks=[],missing=[];
  function issue(code,status,detail) { issues.push({code:code,status:status,detail:detail||code}); }
  function check(code,ok,status) { checks.push({code:code,pass:!!ok});if(!ok) issue(code,status||'UNSUPPORTED'); }
  ['rules','evidence_requirements','exceptions','unsupported_conditions'].forEach(function(group) { Object.keys(pack[group]).forEach(function(id) { var item=pack[group][id];if(item&&item.when&&getPath(input,item.when.path)===undefined) issue('ambiguous_condition:'+group+':'+id,'UNSUPPORTED'); }); });
  check('methodology_mismatch',a.methodology_id===pack.methodology_id&&a.methodology_version===pack.methodology_version);
  check('field_identity',!!a.id&&!!f.id&&!!a.program_id&&!!a.farmer_id&&a.field_id===f.id&&a.farmer_id===f.farmer_id&&a.program_id===f.program_id,'UNSUPPORTED');
  check('identity_ambiguity',!f.ambiguous,'HUMAN_REVIEW_REQUIRED');
  check('activity_period',!!inclusiveDays(a.start,a.end));
  check('effective_period',isoDay(pack.effective_from)!==null&&isoDay(pack.effective_to)!==null&&a.start>=pack.effective_from&&a.end<=pack.effective_to);
  if(pack.status!=='SYNTHETIC') issue('official_configuration','UNSUPPORTED','UNKNOWN / CONFIG_REQUIRED: complete institutional semantics not implemented');
  var duplicates=(input.peers||[]).some(function(p) { return p.id!==a.id&&p.field_id===a.field_id&&p.methodology_id===a.methodology_id&&p.type===a.type&&p.start<=a.end&&p.end>=a.start; });
  check('duplicate_overlap',!duplicates);
  check('duplicate_evidence_id',new Set(manifests.map(function(e) { return e.id; })).size===manifests.length);
  manifests.forEach(function(e) {
    check('content_hash:'+e.id,e.content_verified);
    check('evidence_parse:'+e.id,e.parse_valid);
    check('evidence_id:'+e.id,typeof e.id==='string'&&!!e.id&&typeof e.category==='string');
    check('manifest_binding:'+e.id,e.binding_valid);
    check('evidence_period:'+e.id,!!inclusiveDays(e.period.start,e.period.end)&&e.period.start>=a.start&&e.period.end<=a.end);
    check('adapter:'+e.id,['text-v1','photo-bytes-v1','farm-log-json-v1','iot-json-v1','gis-json-v1'].includes(e.adapter));
    if(['public','synthetic','derived'].indexOf(e.provenance)<0) issue('evidence_provenance:'+e.id,'UNSUPPORTED');
  });
  var applicableRequirements=Object.keys(pack.evidence_requirements).sort().filter(function(k) { return matchesWhen(input,pack.evidence_requirements[k].when); });
  applicableRequirements.forEach(function(k) {
    var r=pack.evidence_requirements[k],items=manifests.filter(function(e) { return e.category===r.category&&e.content_verified&&e.binding_valid; });
    if(r.required&&!items.length) { missing.push(k);issue('missing_evidence:'+k,'EVIDENCE_REQUIRED'); }
    if(new Set(items.map(function(e) { return e.content_hash; })).size>1) issue('contradictory_evidence:'+k,'HUMAN_REVIEW_REQUIRED');
  });
  var params=Object.create(null),usedParameters=new Set(pack.calculation_spec.parameters||[]),ruleResults=[];
  Object.values(pack.rules).forEach(function(r) { if(r.parameter&&matchesWhen(input,r.when)) usedParameters.add(r.parameter); });
  Object.keys(pack.parameters).sort().forEach(function(k) {
    var def=pack.parameters[k],override=input.parameter_overrides&&input.parameter_overrides[k];params[k]=override===undefined?def.value:override;
    if(usedParameters.has(k)&&override!==undefined&&canonicalize(override)!==canonicalize(def.value)) issue('material_parameter_override:'+k,'HUMAN_REVIEW_REQUIRED');
  });
  Object.keys(input.parameter_overrides||{}).forEach(function(k) { if(!Object.prototype.hasOwnProperty.call(pack.parameters,k)) issue('unknown_parameter:'+k,'UNSUPPORTED'); });
  Object.keys(pack.rules).sort().forEach(function(id) {
    var rule=pack.rules[id];if(!matchesWhen(input,rule.when)) return;
    if(rule.parameter) usedParameters.add(rule.parameter);
    var left=getPath(input,rule.input),right=rule.parameter?params[rule.parameter]:rule.value,ok=false,supported=['gte','gt','eq'].includes(rule.op);
    if(rule.op==='eq') ok=left!==undefined&&canonicalize(left)===canonicalize(right);
    else if(typeof left==='number'&&Number.isFinite(left)&&typeof right==='number'&&Number.isFinite(right)) ok=rule.op==='gte'?left>=right:rule.op==='gt'&&left>right;
    ruleResults.push({id:id,pass:ok,supported:supported,input:rule.input,value:left===undefined?null:left,threshold:right===undefined?null:right});
    if(!supported||!ok) issue('rule:'+id,'UNSUPPORTED',supported?'Deterministic rule failed; correction required':'Unsupported rule operation');
  });
  ['exceptions','unsupported_conditions'].forEach(function(group) {
    Object.keys(pack[group]).sort().forEach(function(id) { var e=pack[group][id];if(typeof e!=='object'||!e.input) { issue(group+':'+id,'UNSUPPORTED');return; }
      if(matchesWhen(input,e.when)&&canonicalize(getPath(input,e.input))===canonicalize(e.equals)) issue(group+':'+id,group==='exceptions'&&e.disposition==='HUMAN_REVIEW_REQUIRED'?'HUMAN_REVIEW_REQUIRED':'UNSUPPORTED');
    });
  });
  usedParameters.forEach(function(k) { if(typeof params[k]!=='number'||!Number.isFinite(params[k])||params[k]<0) issue('parameter_configuration:'+k,'UNSUPPORTED'); });
  var spec=pack.calculation_spec,values=(spec.inputs||[]).map(function(path) { return getPath(input,path); }).concat((spec.parameters||[]).map(function(k) { return params[k]; }));
  var calculationOK=spec.operation==='multiply'&&values.length>0&&values.every(function(v) { return typeof v==='number'&&Number.isFinite(v)&&v>=0; });
  var preview=calculationOK?values.reduce(function(x,y) { return x*y; },1):null;
  if(!calculationOK||!Number.isFinite(preview)) { preview=null;issue('calculation_configuration','UNSUPPORTED'); }
  var evaluation={checks:checks,rules:ruleResults,missing_evidence:missing,issues:stableSort(issues),status:'AUTO_REEVALUATED'};
  if(issues.some(function(e) { return e.status==='UNSUPPORTED'; })) evaluation.status='UNSUPPORTED';
  else if(issues.some(function(e) { return e.status==='EVIDENCE_REQUIRED'; })) evaluation.status='EVIDENCE_REQUIRED';
  else if(issues.length) evaluation.status='HUMAN_REVIEW_REQUIRED';
  var fingerprint=inputFingerprint(input),packHash=hashObject(pack),reviewDecisions=[];
  if(options.review) {
    reviewDecisions=Array.isArray(options.review)?options.review.slice():[options.review];
    var seenDecisionCodes=new Set();
    reviewDecisions.forEach(function(review) {
      if(!review||typeof review!=='object'||review.claim_id!==a.id||typeof review.run_id!=='string'||!review.run_id||review.input_fingerprint!==fingerprint||review.pack_hash!==packHash) throw new Error('STALE_REVIEW');
      if(typeof review.exception_code!=='string'||!review.exception_code||typeof review.reviewer!=='string'||!review.reviewer||typeof review.reason!=='string'||review.reason.trim().length<20) throw new Error('INVALID_HUMAN_DECISION');
      if(!['ACCEPT','REJECT','NEED_MORE_EVIDENCE','ABSTAIN'].includes(review.decision)) throw new Error('INVALID_HUMAN_DECISION');
      if(seenDecisionCodes.has(review.exception_code)) throw new Error('DUPLICATE_EXCEPTION_DECISION');seenDecisionCodes.add(review.exception_code);
      var target=issues.find(function(e) { return e.code===review.exception_code; });
      if(!target||target.status!=='HUMAN_REVIEW_REQUIRED') throw new Error('BLOCKING_EXCEPTION_NOT_OVERRIDABLE');
      var binding={claim_id:review.claim_id,run_id:review.run_id,exception_code:review.exception_code,input_fingerprint:review.input_fingerprint,pack_hash:review.pack_hash,reviewer:review.reviewer,reason:review.reason,decision:review.decision};
      if(review.decision_hash!==hashObject(binding)) throw new Error('DECISION_INTEGRITY_BLOCKED');
    });
  }
  evaluation.human_decisions=stableSort(reviewDecisions.map(function(d) { return clone(d); }));
  evaluation.resolved_by_human=reviewDecisions.filter(function(d) { return d.decision==='ACCEPT'; }).map(function(d) { return d.exception_code; }).sort();
  evaluation.outstanding_issues=evaluation.issues.filter(function(e) {
    if(e.status!=='HUMAN_REVIEW_REQUIRED') return true;
    var decision=reviewDecisions.find(function(d) { return d.exception_code===e.code; });
    return !decision||decision.decision!=='ACCEPT';
  });
  if(evaluation.outstanding_issues.some(function(e) { return e.status==='UNSUPPORTED'; })) evaluation.status='UNSUPPORTED';
  else if(evaluation.outstanding_issues.some(function(e) { return e.status==='EVIDENCE_REQUIRED'; })) evaluation.status='EVIDENCE_REQUIRED';
  else if(evaluation.outstanding_issues.some(function(e) { return e.status==='HUMAN_REVIEW_REQUIRED'; })) evaluation.status='HUMAN_REVIEW_REQUIRED';
  else evaluation.status='AUTO_REEVALUATED';

  var calculation={id:'calculation:'+a.id,input_fingerprint:fingerprint,inputs:{paths:spec.inputs||[],values:values.map(function(v) { return v===undefined?null:v; }),parameters:params},spec:clone(spec),status:evaluation.status==='AUTO_REEVALUATED'?'SYNTHETIC_PASS':evaluation.status,result:null,arithmetic_preview:preview,unit:spec.unit||'UNKNOWN'};
  var graph=buildProvenanceGraph(input,pack,manifests,evaluation,calculation,options);
  var document={schema:'naft-evidence-compiler-package-1',claim_id:a.id,methodology:{methodology_id:pack.methodology_id,methodology_version:pack.methodology_version,rule_pack_version:pack.rule_pack_version,pack_hash:packHash,source:{url:pack.source_url,hash:pack.source_hash,checked_at:pack.source_checked_at,status:pack.status}},field_identity:clone(f),activity_identity:clone(a),evidence_manifests:manifests,calculation_inputs:calculation.inputs,calculation:calculation,evaluation:evaluation,exceptions:evaluation.issues,human_decisions:evaluation.human_decisions,provenance_graph_reference:hashObject(graph),provenance_graph:graph,input_fingerprint:fingerprint,unresolved_items:stableSort(evaluation.outstanding_issues.concat([{code:'formal_external_verification',status:'NOT_PERFORMED',detail:'No formal certification or acceptance asserted'}])),status:'DRAFT',data_provenance:input.provenance||'UNKNOWN',formal_certification:false};
  return {package_hash:hashObject(document),document:document};
}
function buildProvenanceGraph(input,pack,manifests,evaluation,calculation,options) {
  var nodes=[],edges=[],a=input.activity;
  function node(type,id,payload) { var key=type+':'+id;nodes.push({id:key,type:type,hash:hashObject(payload)});return key; }
  function edge(from,to,type) { edges.push({from:from,to:to,type:type}); }
  // Edges point from dependency to dependent, including derived_from. This convention is explicit in schema.
  var activity=node('activity',a.id,a),field=node('field',input.field.id,input.field),method=node('methodology',compilerKey(pack),pack),calc=node('calculation',a.id,calculation),pkg=node('package',a.id,{input:inputFingerprint(input),pack:hashObject(pack)});
  edge(field,activity,'belongs_to');edge(method,activity,'evaluated_by');edge(activity,calc,'derived_from');edge(calc,pkg,'included_in');
  var evNodes=manifests.map(function(e) { var n=node('evidence',e.id,e);edge(n,activity,'derived_from');return n; });
  Object.keys(calculation.inputs.parameters).sort().forEach(function(k) { var n=node('parameter',compilerKey(pack)+':'+k,{definition:pack.parameters[k],value:calculation.inputs.parameters[k]});if((pack.calculation_spec.parameters||[]).includes(k)) edge(n,calc,'uses_parameter'); });
  evaluation.rules.forEach(function(r) { var id=node('rule',compilerKey(pack)+':'+r.id,pack.rules[r.id]);edge(method,id,'derived_from');edge(activity,id,'evaluated_by');evNodes.forEach(function(e) { edge(e,id,'derived_from'); });edge(id,calc,'derived_from');if(pack.rules[r.id].parameter) edge('parameter:'+compilerKey(pack)+':'+pack.rules[r.id].parameter,id,'uses_parameter'); });
  var reviewNodes=options.review?(Array.isArray(options.review)?options.review:[options.review]):[];
  reviewNodes.forEach(function(decision) { var rev=node('review',decision.exception_code+':'+decision.decision_hash,decision);edge(calc,rev,'reviewed_by');edge(rev,pkg,'included_in'); });
  if(options.supersedes) { var old=node('package',options.supersedes,{package_hash:options.supersedes});edge(old,pkg,'supersedes'); }
  return {schema:'naft-provenance-1',edge_direction:'dependency_to_dependent',nodes:stableSort(nodes),edges:stableSort(edges)};
}
function traceDependents(graph,seeds) {
  var known=new Set(graph.nodes.map(function(n) { return n.id; }));if(seeds.some(function(id) { return !known.has(id); })) throw new Error('UNKNOWN_GRAPH_NODE');
  var found=new Set(seeds),queue=seeds.slice();while(queue.length) { var current=queue.shift();graph.edges.forEach(function(e) { if(e.from===current&&!found.has(e.to)) { found.add(e.to);queue.push(e.to); } }); }
  return Array.from(found).sort();
}
function packageCurrent(pkg,input,pack,options) {
  return !!pkg&&hashObject(pkg.document)===pkg.package_hash&&pkg.package_hash===compileEvidence(input,pack,options).package_hash;
}
function exportCompilerPackage(pkg,input,pack,options) { if(!packageCurrent(pkg,input,pack,options)) throw new Error('STALE_PACKAGE');return canonicalize(pkg); }
function validateChangePatch(patch) {
  if(!patch||typeof patch!=='object'||Array.isArray(patch)) throw new Error('INVALID_CHANGE_PATCH');
  if(Object.keys(patch).some(function(k) { return ['__proto__','prototype','constructor'].includes(k); })) throw new Error('UNSAFE_CHANGE_PATCH_KEY');
  return patch;
}
function analyzeImpact(claims,change,registry) {
  registry=registry||COMPILER_REGISTRY;
  if(!['methodology','evidence','parameter','field','activity'].includes(change.type)) throw new Error('UNSUPPORTED_CHANGE_TYPE');
  if(['field','activity'].includes(change.type)) validateChangePatch(change.patch);
  if(change.type==='activity'&&Object.keys(change.patch).some(function(k) { return ['id','field_id','farmer_id','program_id','methodology_id','methodology_version'].includes(k); })) throw new Error('ACTIVITY_IDENTITY_CHANGE_UNSUPPORTED');
  var ids=new Set();claims.forEach(function(c) { if(ids.has(c.activity.id)) throw new Error('DUPLICATE_CLAIM_ID');ids.add(c.activity.id); });
  var rows=claims.slice().sort(function(a,b) { return a.activity.id<b.activity.id?-1:1; }).map(function(original) {
    var input=canonicalCompilerInput(original),oldPack=registry[compilerKey(input.activity)];if(!oldPack) throw new Error('UNKNOWN_ORIGINAL_PACK');
    var nextPack=oldPack,candidate=false,reason=[],seeds=[],oldPackage=compileEvidence(input,oldPack),before=clone(input);
    if(change.type==='methodology'&&compilerKey(input.activity)===change.old_key) {
      nextPack=registry[change.new_key];if(!nextPack) throw new Error('UNKNOWN_TARGET_PACK');compareMethodologyVersions(oldPack,nextPack);
      candidate=hashObject(oldPack)!==hashObject(nextPack);reason.push('methodology_version');seeds.push('methodology:'+compilerKey(oldPack));
      input.activity.methodology_version=nextPack.methodology_version;
      // Rebind in a NEW derived manifest only: original claim/manifests remain unchanged.
      input.evidence=input.evidence.map(function(e) { return e.methodology_version===oldPack.methodology_version?Object.assign({},e,{methodology_version:nextPack.methodology_version}):e; });
    } else if(change.type==='field'&&input.field.id===change.field_id) {
      input.field=Object.assign({},input.field,clone(change.patch));candidate=hashObject(input.field)!==hashObject(before.field);reason.push('field_metadata');seeds.push('field:'+before.field.id);
    } else if(change.type==='activity'&&input.activity.id===change.activity_id) {
      input.activity=Object.assign({},input.activity,clone(change.patch));candidate=hashObject(input.activity)!==hashObject(before.activity);reason.push('activity_metadata');seeds.push('activity:'+before.activity.id);
    } else if(change.type==='evidence'&&input.activity.id===change.activity_id) {
      var found=input.evidence.some(function(e) { return e.id===change.evidence_id; });if(!found) throw new Error('EVIDENCE_NOT_FOUND');
      input.evidence=input.evidence.map(function(e) { return e.id===change.evidence_id?clone(change.replacement):e; });candidate=inputFingerprint(input)!==inputFingerprint(before);reason.push('evidence');seeds.push('evidence:'+change.evidence_id);
    } else if(change.type==='parameter'&&compilerKey(input.activity)===change.pack_key) {
      if(!Object.prototype.hasOwnProperty.call(oldPack.parameters,change.parameter)) throw new Error('UNKNOWN_PARAMETER');
      input.parameter_overrides=Object.assign({},input.parameter_overrides||{});input.parameter_overrides[change.parameter]=change.value;candidate=inputFingerprint(input)!==inputFingerprint(before);reason.push('parameter');seeds.push('parameter:'+compilerKey(oldPack)+':'+change.parameter);
    }
    var semanticChange=hashObject(activeProjection(oldPack,before))!==hashObject(activeProjection(nextPack,input));
    var requires=candidate&&(change.type==='methodology'?semanticChange:change.type==='parameter'?Object.prototype.hasOwnProperty.call(activeProjection(oldPack,before).parameters,change.parameter)&&canonicalize((before.parameter_overrides||{})[change.parameter]===undefined?oldPack.parameters[change.parameter].value:before.parameter_overrides[change.parameter])!==canonicalize(change.value):inputFingerprint(input)!==inputFingerprint(before));
    var affected=candidate?traceDependents(oldPackage.document.provenance_graph,seeds):[];
    var next=requires?compileEvidence(input,nextPack,{supersedes:oldPackage.package_hash}):null;
    return {claim_id:input.activity.id,potentially_affected:candidate,requires_reverification:requires,status:requires?next.document.evaluation.status:'UNAFFECTED',reasons:candidate?reason:[],affected_nodes:requires?affected:[],calculation_ids:requires?['calculation:'+input.activity.id]:[],package_ids:requires?['package:'+input.activity.id]:[],previous_package_hash:oldPackage.package_hash,previous_package_stale:candidate,next_input:candidate?input:null,next_pack:candidate?clone(nextPack):null,successor:next};
  });
  var counts={total:rows.length,potentially_affected:0,require_reverification:0,UNAFFECTED:0,AUTO_REEVALUATED:0,EVIDENCE_REQUIRED:0,HUMAN_REVIEW_REQUIRED:0,UNSUPPORTED:0};
  rows.forEach(function(r) { if(r.potentially_affected) counts.potentially_affected++;if(r.requires_reverification) counts.require_reverification++;counts[r.status]++; });
  return {change:clone(change),counts:counts,claims:rows};
}
