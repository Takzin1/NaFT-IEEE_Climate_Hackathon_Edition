import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenizationResearchPreview,TOKEN_PREVIEW_SCHEMA}
  from '../scripts/ieee-tokenization-research-preview.mjs';

const SHA='a'.repeat(64);
const clone=x=>JSON.parse(JSON.stringify(x));
const research=(estimate='125.42')=>({
  schema:'naft-tokenization-preview-input/1',mode:'RESEARCH_ESTIMATE',
  source_package_hash:SHA,formal_certification:false,certified_tco2e:null,
  research_estimate_tco2e:estimate
});
const serial=(id,props={})=>({
  serial:'SYN-'+id,registry_state:'MOCK_ISSUED',custody:'MOCK_LOCKED',
  duplicate_claim_flag:false,denomination_tco2e:'1',
  evidence_digest:'c'.repeat(64),...props
});
const synthetic=()=>({
  schema:'naft-tokenization-preview-input/1',mode:'SYNTHETIC_REGISTRY',
  source_package_hash:SHA,formal_certification:false,certified_tco2e:null,
  registry_id:'NAFT-SYNTHETIC-REGISTRY',
  registry_permission:'SIMULATION_ONLY_NOT_LEGAL_CONSENT',
  items:[
    serial('A'),
    serial('B',{denomination_tco2e:'1.5'}),
    serial('C',{registry_state:'MOCK_RETIRED'}),
    serial('D',{custody:'MOCK_UNLOCKED'}),
    serial('E',{duplicate_claim_flag:true})
  ],
  quote:{price_per_unit_jpy:'3001',fee_bps:250}
});
const deny=(v,code)=>assert.throws(()=>tokenizationResearchPreview(v),
  new RegExp('NAFT_TOKEN_PREVIEW_BLOCKED:'+code));

test('research estimates, even positive, cannot become carbon credit tokens',()=>{
  const p=tokenizationResearchPreview(research('125.42'));
  assert.equal(p.schema,TOKEN_PREVIEW_SCHEMA);
  assert.equal(p.simulated_token_reference_count,0);
  assert.equal(p.simulated_eligible_tco2e,'0');
  assert.equal(p.tokenization_status,'BLOCKED_RESEARCH_NOT_REGISTRY_CREDIT');
  assert.deepEqual(p.assets,[]);
  assert.equal(p.production_mint_authorized,false);
  assert.equal(p.transaction_submitted,false);
  assert.equal(p.certified_tco2e,null);
  assert.match(p.receipt_hash,/^[0-9a-f]{64}$/);
  assert.equal(tokenizationResearchPreview(research('0')).simulated_token_reference_count,0);
});
test('synthetic serials, microtonnes and exact integer JPY fees',()=>{
  const x=synthetic(), p=tokenizationResearchPreview(x);
  assert.equal(p.tokenization_status,'SIMULATED_REFERENCE_ONLY');
  assert.equal(p.scenario_registry_units_input,5);
  assert.equal(p.simulated_token_reference_count,2);
  assert.equal(p.simulated_eligible_tco2e,'2.5');
  assert.equal(p.scenario_quote.gross_jpy,'6002');
  assert.equal(p.scenario_quote.fee_jpy,'151');
  assert.equal(p.scenario_quote.net_jpy,'5851');
  assert.equal(p.assets.filter(y=>y.hypothetical_supply===1).length,2);
  assert.ok(p.assets.every(y=>y.actual_minted_supply===0));
  assert.equal(p.issued_credits,null);
  assert.equal(p.registry_rights_verified,false);
  assert.equal(p.transaction_submitted,false);
  assert.equal(p.production_mint_authorized,false);
  assert.deepEqual(p,tokenizationResearchPreview(clone(x)));
  assert.notEqual(p.assets[0].hypothetical_erc1155_token_id,
    p.assets[1].hypothetical_erc1155_token_id);
});
test('retired, unlocked, and duplicate-claim serials never make candidate assets',()=>{
  const p=tokenizationResearchPreview(synthetic());
  const status=new Map(p.assets.map(x=>[x.source_serial,x]));
  assert.ok(status.get('SYN-C').block_reasons.includes('NOT_ACTIVE_MOCK_ISSUED'));
  assert.ok(status.get('SYN-D').block_reasons.includes('NOT_MOCK_LOCKED'));
  assert.ok(status.get('SYN-E').block_reasons.includes('DECLARED_DOUBLE_CLAIM'));
  for(const id of ['SYN-C','SYN-D','SYN-E']){
    assert.equal(status.get(id).hypothetical_supply,0);
    assert.equal(status.get(id).hypothetical_erc1155_token_id,null);
    assert.equal(status.get(id).eligibility,'BLOCKED');
  }
});
test('duplicate synthetic serial IDs fail closed rather than summing quantities',()=>{
  const v=synthetic();v.items.push({...v.items[0]});
  deny(v,'DUPLICATE_REGISTRY_SERIAL');
});
test('real registry IDs and claimed legal permissions cannot pass the research API',()=>{
  const v=synthetic();v.registry_id='VERRA';
  deny(v,'NON_SYNTHETIC_REGISTRY_FORBIDDEN');
  const w=synthetic();w.registry_permission='GRANTED';
  deny(w,'NON_SYNTHETIC_REGISTRY_FORBIDDEN');
  const z=synthetic();z.items[0].serial='VCS-123';
  deny(z,'SYNTHETIC_SERIAL_REQUIRED');
});
test('unknown carbon certification fields and a positive credited amount fail closed',()=>{
  const v=research();v.certified_tco2e=125.42;
  deny(v,'NO_PRODUCTION_CARBON_CERTIFICATION_ALLOWED');
  const w=synthetic();w.production_mint_authorized=true;
  deny(w,'SYNTHETIC_FIELDS');
  const x=synthetic();x.formal_certification=true;
  deny(x,'NO_PRODUCTION_CARBON_CERTIFICATION_ALLOWED');
});
test('must reject numeric floats, exponent forms, negative amounts and excess precision',()=>{
  for(const invalid of [1.2,'1e2','-1','0.0000001','01','NaN']){
    const v=synthetic();v.items[0].denomination_tco2e=invalid;
    deny(v,typeof invalid==='number'?'UNSAFE_JSON_VALUE':'INVALID_EXACT_DECIMAL');
  }
  const v=synthetic();v.items[0].denomination_tco2e='0';
  deny(v,'NONPOSITIVE_UNIT');
  const p=synthetic();p.quote.price_per_unit_jpy=1.1;
  deny(p,'UNSAFE_JSON_VALUE');
  const q=synthetic();q.quote.fee_bps=10001;
  deny(q,'FEE_BPS_RANGE');
});
test('zero or very large price has no floating-point drift',()=>{
  const v=synthetic();v.quote.price_per_unit_jpy='999999999999999999';v.quote.fee_bps=1;
  const p=tokenizationResearchPreview(v);
  assert.equal(p.scenario_quote.gross_jpy,'1999999999999999998');
  assert.equal(p.scenario_quote.fee_jpy,'200000000000000');
  assert.equal(p.scenario_quote.net_jpy,'1999799999999999998');
  const n=synthetic();n.quote.price_per_unit_jpy='0';n.quote.fee_bps=0;
  const zero=tokenizationResearchPreview(n);
  assert.equal(zero.scenario_quote.gross_jpy,'0');
});
test('unsafe JSON keys and malformed hashes are blocked',()=>{
  const polluted=JSON.parse(JSON.stringify(research()).replace(
    '"schema":','"__proto__":{"is_admin":true},"schema":'));
  deny(polluted,'UNSAFE_JSON_KEY');
  const v=research();v.source_package_hash='fake';
  deny(v,'SOURCE_PACKAGE_HASH_REQUIRED');
});
test('amount changes change local preview receipt hash but not mint status',()=>{
  const a=synthetic(),b=synthetic();b.items[0].denomination_tco2e='0.5';
  const first=tokenizationResearchPreview(a),second=tokenizationResearchPreview(b);
  assert.notEqual(first.receipt_hash,second.receipt_hash);
  assert.equal(second.simulated_eligible_tco2e,'2');
  assert.equal(second.production_mint_authorized,false);
});
