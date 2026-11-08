#!/usr/bin/env node
/**
 * Read-only IEEE-side importer for NaFT Core research interoperability receipts.
 *
 * Checks INTERNAL consistency only. Does not fetch private evidence, certify
 * real-world carbon, prove observation authenticity, or post to a blockchain.
 */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const IEEE_CORE_RECEIPT_SCHEMA='naft-ieee-core-research-bridge-1';
const HASH=/^[0-9a-f]{64}$/;
const REQUIRED_FAIR=['F1','F2','F3','F4','A1','A1.1','A1.2','A2','I1','I2','I3','R1','R1.1','R1.2','R1.3'];

function fail(code) {throw new Error('IEEE_CORE_RESEARCH_BLOCKED:'+code);}
function test(ok,code) {if(!ok)fail(code);}
function object(v) {return !!v&&typeof v==='object'&&!Array.isArray(v);}
function canonical(v) {
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(object(v))return '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined)
    .map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  return JSON.stringify(v===undefined?null:v);
}
function digest(v) {return createHash('sha256').update(canonical(v)).digest('hex');}
function safeJson(v,depth=0) {
  test(depth<=32,'DEPTH_LIMIT');
  if(Array.isArray(v)) {
    test(v.length<=3000,'ARRAY_LIMIT');v.forEach(x=>safeJson(x,depth+1));
  } else if(object(v)) {
    const keys=Object.keys(v);test(keys.length<=400,'OBJECT_LIMIT');
    for(const k of keys) {
      test(!['__proto__','constructor','prototype'].includes(k),'OBJECT_POLLUTION');
      safeJson(v[k],depth+1);
    }
  } else test(v===null||typeof v==='boolean'||
    (typeof v==='string'&&v.length<=6000)||
    (typeof v==='number'&&Number.isFinite(v)),'INVALID_JSON');
}
function validateOpm(opm,sourceHash) {
  test(object(opm)&&opm.schema==='naft-opm-v1.1-research-crosswalk-1'&&
    opm.source_package_hash===sourceHash&&
    opm.edge_direction==='effect_to_cause'&&
    opm.source_edge_direction==='dependency_to_dependent'&&
    opm.semantics==='OPM_V1_1_INSPIRED_COARSE_GRAINED_PAST_EXECUTION_SUBSET'&&
    HASH.test(opm.source_graph_hash||'')&&
    opm.full_opm_conformance_asserted===false&&
    opm.external_regulator_certification===false&&
    opm.certified_tco2e===null&&HASH.test(opm.crosswalk_hash||''),
    'OPM_BOUNDARY');
  const body={...opm};delete body.crosswalk_hash;
  test(digest(body)===opm.crosswalk_hash,'OPM_HASH_MISMATCH');
  test(Array.isArray(opm.nodes)&&opm.nodes.length<=3000&&
    Array.isArray(opm.edges)&&opm.edges.length<=10000,'OPM_SIZE');
  const nodes=new Map();
  for(const n of opm.nodes) {
    test(object(n)&&typeof n.id==='string'&&n.id.length>0&&
      ['artifact','process','agent'].includes(n.kind)&&!nodes.has(n.id),
      'OPM_NODE');
    nodes.set(n.id,n.kind);
  }
  const typ={
    used:['process','artifact',true],
    wasGeneratedBy:['artifact','process',true],
    wasControlledBy:['process','agent',true],
    wasDerivedFrom:['artifact','artifact',false],
    wasTriggeredBy:['process','process',false]
  };
  const graph=new Map([...nodes.keys()].map(id=>[id,[]]));
  const edgeKeys=new Set();
  for(const e of opm.edges) {
    const rule=object(e)?typ[e.relation]:null;
    test(rule&&nodes.get(e.from)===rule[0]&&nodes.get(e.to)===rule[1]&&
      e.from!==e.to,'OPM_EDGE_DIRECTION');
    test(rule[2]?(typeof e.role==='string'&&e.role.length>0):e.role===undefined,
      'OPM_EDGE_ROLE');
    const key=canonical(e);test(!edgeKeys.has(key),'OPM_DUPLICATE_EDGE');edgeKeys.add(key);
    graph.get(e.from).push(e.to);
  }
  const visiting=new Set(),seen=new Set();
  function visit(id) {
    test(!visiting.has(id),'OPM_GRAPH_CYCLE');
    if(seen.has(id))return;
    visiting.add(id);for(const child of graph.get(id))visit(child);
    visiting.delete(id);seen.add(id);
  }
  for(const id of graph.keys())visit(id);
}
function validateFair(fair,metadata,sourceHash) {
  test(object(fair)&&fair.schema==='naft-fair-metadata-self-check-1'&&
    fair.fair_certified===false&&fair.completeness_score_claimed===false&&
    fair.external_endpoints_checked===false,'FAIR_NOT_CERTIFIED');
  test(object(metadata)&&metadata.schema==='naft-research-package-metadata-1'&&
    metadata.provenance?.package_sha256===sourceHash&&
    metadata.data_identifier==='urn:naft:package:sha256:'+sourceHash&&
    metadata.describes===metadata.data_identifier&&
    metadata.formal_certification===false&&metadata.certified_tco2e===null&&
    fair.resource_id===metadata.data_identifier,'FAIR_BINDING');
  test(Array.isArray(fair.checks)&&fair.checks.length===15,'FAIR_CHECK_COUNT');
  const names=new Set();
  let declared=0;
  for(const x of fair.checks){
    test(object(x)&&REQUIRED_FAIR.includes(x.principle)&&
      !names.has(x.principle)&&
      ['DECLARED_UNVERIFIED','MISSING_OR_UNESTABLISHED'].includes(x.status),
      'FAIR_CHECK_INVALID');
    names.add(x.principle);
    if(x.status==='DECLARED_UNVERIFIED')declared++;
  }
  test(names.size===REQUIRED_FAIR.length&&declared===fair.declared_count&&
    15-declared===fair.missing_or_unestablished_count&&
    ['NOT_ESTABLISHED','REQUIRES_MANUAL_CONFIRMATION'].includes(fair.redistribution_authorized),
    'FAIR_COUNTS_OR_RIGHTS');
  return {declared,missing:15-declared};
}
export function verifyCoreInteropReceipt(receipt) {
  safeJson(receipt);
  test(object(receipt)&&Buffer.byteLength(JSON.stringify(receipt),'utf8')<=4*1024*1024,
    'RECEIPT_TOO_LARGE');
  test(receipt.schema==='naft-research-interop-receipt-1'&&
    HASH.test(receipt.source_package_hash||'')&&
    receipt.certification==='NOT_PERFORMED'&&
    receipt.on_chain_status==='NOT_SUBMITTED','CORE_RESEARCH_ONLY');
  validateOpm(receipt.opm,receipt.source_package_hash);
  const counts=validateFair(receipt.fair,receipt.metadata,receipt.source_package_hash);
  const body={
    schema:IEEE_CORE_RECEIPT_SCHEMA,source_edition:'NaFT_CORE',
    target_edition:'IEEE_CLIMATECHAIN',
    source_package_hash:receipt.source_package_hash,
    source_opm_crosswalk_hash:receipt.opm.crosswalk_hash,
    source_provenance_graph_hash:receipt.opm.source_graph_hash,
    fair_metadata_declared_unverified:counts.declared,
    fair_metadata_missing_or_unestablished:counts.missing,
    checked_scope:'READ_ONLY_INTERNAL_RECEIPT_CONSISTENCY',
    source_authenticity_verified:false,source_evidence_truth_verified:false,
    independent_scientific_validation:false,formal_certification:false,
    certified_tco2e:null,issued_credits:null,
    transaction_submitted:false,
    warning:'A self-consistent receipt can be fabricated. No proof of source authorship, field validity, OPM/FAIR certification or real credit issuance.'
  };
  return {...body,receipt_hash:digest(body)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if(process.argv.length!==3)fail('USAGE_ONE_JSON_FILE');
    const data=await readFile(process.argv[2]);
    test(data.length<=4*1024*1024,'RECEIPT_TOO_LARGE');
    process.stdout.write(JSON.stringify(verifyCoreInteropReceipt(JSON.parse(data.toString('utf8'))),null,2)+'\n');
  } catch(e) {
    const msg=String(e?.message||'').match(/^IEEE_CORE_RESEARCH_BLOCKED:[A-Z_]+$/)
      ?e.message:'IEEE_CORE_RESEARCH_BLOCKED:INPUT_FAILED';
    console.error(msg);process.exitCode=1;
  }
}
