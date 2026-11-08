import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyCoreInteropReceipt,IEEE_CORE_RECEIPT_SCHEMA}
  from '../scripts/ieee-core-receipt-intake.mjs';

const ids=['F1','F2','F3','F4','A1','A1.1','A1.2','A2','I1','I2','I3','R1','R1.1','R1.2','R1.3'];
const clone=x=>JSON.parse(JSON.stringify(x));
function canonical(v){
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort()
    .map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
function fixture(){
  const source='1'.repeat(64);
  const opm={
    schema:'naft-opm-v1.1-research-crosswalk-1',
    source_package_hash:source,source_graph_hash:'2'.repeat(64),
    source_edge_direction:'dependency_to_dependent',edge_direction:'effect_to_cause',
    semantics:'OPM_V1_1_INSPIRED_COARSE_GRAINED_PAST_EXECUTION_SUBSET',
    nodes:[{id:'process',kind:'process',attributes:{}},
           {id:'input',kind:'artifact',attributes:{}}],
    edges:[{from:'process',to:'input',relation:'used',role:'evidence'}],
    full_opm_conformance_asserted:false,external_regulator_certification:false,
    certified_tco2e:null
  };
  opm.crosswalk_hash=digest(opm);
  const urn='urn:naft:package:sha256:'+source;
  const metadata={
    schema:'naft-research-package-metadata-1',
    data_identifier:urn,describes:urn,
    provenance:{package_sha256:source},
    formal_certification:false,certified_tco2e:null
  };
  const fair={
    schema:'naft-fair-metadata-self-check-1',resource_id:urn,
    checks:ids.map(id=>({principle:id,status:id==='R1.2'?'DECLARED_UNVERIFIED':'MISSING_OR_UNESTABLISHED'})),
    declared_count:1,missing_or_unestablished_count:14,
    fair_certified:false,completeness_score_claimed:false,
    external_endpoints_checked:false,redistribution_authorized:'NOT_ESTABLISHED'
  };
  return {schema:'naft-research-interop-receipt-1',
    source_package_hash:source,opm,metadata,fair,
    certification:'NOT_PERFORMED',on_chain_status:'NOT_SUBMITTED'};
}
const rejects=(r,code)=>assert.throws(()=>verifyCoreInteropReceipt(r),
  new RegExp('IEEE_CORE_RESEARCH_BLOCKED:'+code));

test('accept a synthetic research-only Core receipt as a deterministic IEEE envelope',()=>{
  const r=fixture();
  const a=verifyCoreInteropReceipt(r),b=verifyCoreInteropReceipt(clone(r));
  assert.deepEqual(a,b);
  assert.equal(a.schema,IEEE_CORE_RECEIPT_SCHEMA);
  assert.equal(a.formal_certification,false);
  assert.equal(a.certified_tco2e,null);
  assert.equal(a.issued_credits,null);
  assert.equal(a.transaction_submitted,false);
  assert.equal(a.source_authenticity_verified,false);
  assert.equal(a.fair_metadata_missing_or_unestablished,14);
  assert.match(a.receipt_hash,/^[a-f0-9]{64}$/);
});
test('fail when core provenance graph digest changes',()=>{
  const r=fixture();r.opm.nodes[1].kind='process';
  rejects(r,'OPM_HASH_MISMATCH');
});
test('fail when source receipt contradicts provenance id',()=>{
  const r=fixture();r.metadata.provenance.package_sha256='f'.repeat(64);
  rejects(r,'FAIR_BINDING');
});
test('fail on fake certification or preexisting chain write',()=>{
  const a=fixture();a.certification='VERIFIED';rejects(a,'CORE_RESEARCH_ONLY');
  const b=fixture();b.on_chain_status='SUBMITTED';rejects(b,'CORE_RESEARCH_ONLY');
  const c=fixture();c.opm.certified_tco2e=1;rejects(c,'OPM_BOUNDARY');
});
test('fail on bogus FAIR maturity certificate or incomplete principles',()=>{
  const a=fixture();a.fair.fair_certified=true;rejects(a,'FAIR_NOT_CERTIFIED');
  const b=fixture();b.fair.checks.pop();rejects(b,'FAIR_CHECK_COUNT');
  const c=fixture();c.fair.checks[1].principle='F1';rejects(c,'FAIR_CHECK_INVALID');
  const d=fixture();d.fair.redistribution_authorized='AUTHORIZED';rejects(d,'FAIR_COUNTS_OR_RIGHTS');
});
test('block malicious object keys even in nested source metadata',()=>{
  const r=JSON.parse(JSON.stringify(fixture()).replace(
    '"metadata":{','"metadata":{"__proto__":{"admin":true},'));
  rejects(r,'OBJECT_POLLUTION');
});
test('research registry captures exactly six unique papers and seven local files',()=>{
  const r=JSON.parse(readFileSync('research/ieee-core-theory-2026-11-08/source-and-work-queue.json','utf8'));
  assert.equal(r.unique_paper_count,6);
  assert.equal(r.sources.length,6);
  assert.equal(r.local_file_count,7);
  assert.equal(Object.keys(r.duplicate_uploaded_local_sha256).length,2);
  assert.equal(new Set(Object.values(r.duplicate_uploaded_local_sha256)).size,1);
  assert.equal(new Set(r.sources.map(x=>x.doi)).size,6);
  assert.ok(r.sources.every(x=>/^[a-f0-9]{64}$/.test(x.uploaded_local_pdf_sha256)&&
    !x.paper_pdf_committed&&x.implementation_in_ieee==='RESEARCH_REFERENCE_AND_CONTRACT_CHECK_ONLY'));
  assert.equal(r.core.pinned_commit,'9d1b316b9599945fcd9c135d695b4f8899be7c62');
  assert.equal(r.core.module_refs.length,4);
  assert.equal(r.integration.automated_issuance,false);
  assert.equal(r.integration.certified_tco2e,null);
  assert.equal(r.integration.on_chain_write,false);
  assert.equal(r.work_queue[1].state,'OPEN');
});
