#!/usr/bin/env node
/**
 * NaFT Web3 Carbon Token *Preview* v1 — offline, synthetic registry fixtures only.
 *
 * This module NEVER mints/transfers/burns real credits, signs transactions,
 * calls RPC, validates registry custody, or creates rights to offsets.
 * It is a deterministic research calculation with a fail-closed trust boundary.
 *
 * Registry-backed production tokenization requires a separately audited
 * registry-specific legal agreement, entitlement and live custody/retirement
 * synchronization. A JSON declaration cannot provide any of those.
 */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const TOKEN_PREVIEW_SCHEMA='naft-tokenization-research-preview/1';
const HEX=/^[0-9a-f]{64}$/;
const SYN_SERIAL=/^SYN-[A-Z0-9-]{1,72}$/;
const DECIMAL=/^(?:0|[1-9]\d{0,14})(?:\.\d{1,6})?$/;
const IS_INT=/^(?:0|[1-9]\d{0,17})$/;
const STATUSES=['MOCK_ISSUED','MOCK_RETIRED','MOCK_CANCELLED','MOCK_REVOKED'];
const CUSTODY=['MOCK_LOCKED','MOCK_UNLOCKED'];

function block(reason){throw new Error('NAFT_TOKEN_PREVIEW_BLOCKED:'+reason);}
function check(test,reason){if(!test)block(reason);}
function obj(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function strictKeys(x,allowed,reason){
  check(obj(x)&&Object.keys(x).every(k=>allowed.includes(k))&&
    Object.keys(x).every(k=>!['__proto__','prototype','constructor'].includes(k)),reason);
}
function canonical(x){
  if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
  if(obj(x))return '{'+Object.keys(x).sort()
    .map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
  return JSON.stringify(x);
}
function sha(x){return createHash('sha256').update(canonical(x)).digest('hex');}
function parseMicroTonnes(value,allowZero=false){
  check(typeof value==='string'&&DECIMAL.test(value),'INVALID_EXACT_DECIMAL');
  const [whole,part='']=value.split('.');
  const number=BigInt(whole)*1000000n+BigInt((part+'000000').slice(0,6));
  check(number>=0n&&(allowZero||number>0n),'NONPOSITIVE_UNIT');
  return number;
}
function formatMicroTonnes(num){
  const whole=num/1000000n;
  const fractional=(num%1000000n).toString().padStart(6,'0').replace(/0+$/,'');
  return whole.toString()+(fractional?'.'+fractional:'');
}
function parseJPY(x){
  check(typeof x==='string'&&IS_INT.test(x),'INVALID_PRICE_JPY');
  return BigInt(x);
}
function safeTree(x,depth=0){
  check(depth<=20,'JSON_DEPTH');
  if(Array.isArray(x)){check(x.length<=512,'JSON_ARRAY');x.forEach(y=>safeTree(y,depth+1));}
  else if(obj(x)){
    const keys=Object.keys(x);
    check(keys.length<=40,'JSON_KEYS');
    for(const key of keys){
      check(!['__proto__','prototype','constructor'].includes(key),'UNSAFE_JSON_KEY');
      safeTree(x[key],depth+1);
    }
  } else check(x===null||typeof x==='boolean'||
      (typeof x==='string'&&x.length<=2000)||
      (typeof x==='number'&&Number.isSafeInteger(x)),'UNSAFE_JSON_VALUE');
}
function commonInput(input){
  check(obj(input),'INPUT_REQUIRED');
  safeTree(input);
  check(Buffer.byteLength(JSON.stringify(input))<=65536,'INPUT_SIZE');
  check(input.schema==='naft-tokenization-preview-input/1','INPUT_SCHEMA');
  check(HEX.test(input.source_package_hash||''),'SOURCE_PACKAGE_HASH_REQUIRED');
  check(input.formal_certification===false&&input.certified_tco2e===null,
    'NO_PRODUCTION_CARBON_CERTIFICATION_ALLOWED');
}
function wrapReceipt(body){
  const warnings=[
    'NO_MINT_NO_TRANSFER_NO_BURN_NO_RPC',
    'INTERNAL_HASHES_DO_NOT_AUTHENTICATE_REGISTRY_OR_LEGAL_RIGHTS',
    'UNREGISTERED_SYNTHETIC_SCENARIO_IS_NOT_A_CARBON_CREDIT'
  ];
  return {...body, warnings, receipt_hash:sha({...body,warnings})};
}
function researchPreview(input){
  strictKeys(input,['schema','mode','source_package_hash','formal_certification',
    'certified_tco2e','research_estimate_tco2e'],'RESEARCH_FIELDS');
  const micro=parseMicroTonnes(input.research_estimate_tco2e,true);
  return wrapReceipt({
    schema:TOKEN_PREVIEW_SCHEMA,mode:'RESEARCH_ESTIMATE',
    source_package_hash:input.source_package_hash,
    research_estimate_tco2e:formatMicroTonnes(micro),
    tokenization_status:'BLOCKED_RESEARCH_NOT_REGISTRY_CREDIT',
    blocked_reasons:['RESEARCH_ONLY_NO_ISSUED_SERIALS','NO_REGISTRY_PERMISSION_OR_CUSTODY'],
    simulated_token_reference_count:0,simulated_eligible_tco2e:'0',
    scenario_quote:null,assets:[],erc_candidate:'NONE',
    registry_status_verified:false,registry_rights_verified:false,
    production_mint_authorized:false,formal_certification:false,
    certified_tco2e:null,issued_credits:null,transaction_submitted:false
  });
}
function mockRegistryPreview(input){
  strictKeys(input,['schema','mode','source_package_hash','formal_certification',
    'certified_tco2e','registry_id','registry_permission','items','quote'],
    'SYNTHETIC_FIELDS');
  check(input.registry_id==='NAFT-SYNTHETIC-REGISTRY'&&
    input.registry_permission==='SIMULATION_ONLY_NOT_LEGAL_CONSENT',
    'NON_SYNTHETIC_REGISTRY_FORBIDDEN');
  check(Array.isArray(input.items)&&input.items.length>0&&input.items.length<=256,
    'REGISTRY_ITEMS_LIMIT');
  strictKeys(input.quote,['price_per_unit_jpy','fee_bps'],'QUOTE_FIELDS');
  const price=parseJPY(input.quote.price_per_unit_jpy);
  const feeBps=input.quote.fee_bps;
  check(Number.isInteger(feeBps)&&feeBps>=0&&feeBps<=10000,'FEE_BPS_RANGE');
  const existing=new Set();
  let eligibleCount=0,eligibleMicro=0n;
  const assets=[];
  input.items.forEach((item,index)=>{
    strictKeys(item,['serial','registry_state','custody','duplicate_claim_flag',
      'denomination_tco2e','evidence_digest'],'REGISTRY_ITEM_FIELDS');
    check(SYN_SERIAL.test(item.serial||''),'SYNTHETIC_SERIAL_REQUIRED');
    check(!existing.has(item.serial),'DUPLICATE_REGISTRY_SERIAL');
    existing.add(item.serial);
    check(STATUSES.includes(item.registry_state),'INVALID_REGISTRY_STATE');
    check(CUSTODY.includes(item.custody),'INVALID_CUSTODY_STATE');
    check(typeof item.duplicate_claim_flag==='boolean','DUPLICATE_CLAIM_FLAG_REQUIRED');
    check(HEX.test(item.evidence_digest||''),'EVIDENCE_DIGEST_REQUIRED');
    const micro=parseMicroTonnes(item.denomination_tco2e);
    const reasons=[];
    if(item.registry_state!=='MOCK_ISSUED')reasons.push('NOT_ACTIVE_MOCK_ISSUED');
    if(item.custody!=='MOCK_LOCKED')reasons.push('NOT_MOCK_LOCKED');
    if(item.duplicate_claim_flag)reasons.push('DECLARED_DOUBLE_CLAIM');
    const candidate=reasons.length===0;
    if(candidate){eligibleCount++;eligibleMicro+=micro;}
    assets.push({
      source_serial:item.serial,source_registry:'NAFT-SYNTHETIC-REGISTRY',
      input_order:index,source_evidence_digest:item.evidence_digest,
      denomination_tco2e:formatMicroTonnes(micro),
      eligibility:candidate?'SIMULATED_CANDIDATE_ONLY':'BLOCKED',
      scenario_candidate: candidate,
      block_reasons:reasons,
      hypothetical_erc1155_token_id: candidate?sha({
        namespace:'NAFT-DEMO-NONTRANSFERABLE-REFERENCE/1',
        registry_id:input.registry_id,serial:item.serial
      }):null,
      hypothetical_supply: candidate?1:0,actual_minted_supply:0,
      rights_attested_by_real_registry:false
    });
  });
  assets.sort((a,b)=>a.source_serial.localeCompare(b.source_serial));
  const gross=price*BigInt(eligibleCount);
  const fees=(gross*BigInt(feeBps)+9999n)/10000n; // ceil to whole JPY
  const quote={
    currency:'JPY',nature:'USER_ASSUMED_SCENARIO_NOT_MARKET_QUOTE',
    price_per_simulated_registry_unit_jpy:price.toString(),
    fee_bps:feeBps,
    gross_jpy:gross.toString(),
    fee_jpy:fees.toString(),
    net_jpy:(gross-fees).toString(),
    rounding:'INTEGER_YEN_FEE_CEIL'
  };
  return wrapReceipt({
    schema:TOKEN_PREVIEW_SCHEMA,mode:'SYNTHETIC_REGISTRY',
    source_package_hash:input.source_package_hash,
    tokenization_status:'SIMULATED_REFERENCE_ONLY',
    blocked_reasons:['REAL_REGISTRY_CONSENT_AND_LOCK_NOT_VERIFIED',
      'NO_LIVE_REGISTRY_OR_RETIREMENT_SYNC','NO_EXTERNAL_RIGHTS_OR_MARKET_VERIFICATION'],
    synthetic_registry_id:input.registry_id,
    scenario_registry_units_input:input.items.length,
    simulated_token_reference_count:eligibleCount,
    simulated_eligible_tco2e:formatMicroTonnes(eligibleMicro),
    scenario_quote:quote,assets,erc_candidate:'ERC1155_ID_PER_SYNTHETIC_SERIAL',
    registry_status_verified:false,registry_rights_verified:false,
    production_mint_authorized:false,formal_certification:false,
    certified_tco2e:null,issued_credits:null,transaction_submitted:false
  });
}
export function tokenizationResearchPreview(input){
  commonInput(input);
  if(input.mode==='RESEARCH_ESTIMATE')return researchPreview(input);
  if(input.mode==='SYNTHETIC_REGISTRY')return mockRegistryPreview(input);
  block('UNSUPPORTED_MODE');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    check(process.argv.length===3,'USAGE_ONE_INPUT_JSON');
    const bytes=await readFile(process.argv[2]);
    check(bytes.length<=65536,'INPUT_SIZE');
    const report=tokenizationResearchPreview(JSON.parse(bytes.toString('utf8')));
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
  }catch(error){
    const message=String(error?.message||'');
    console.error(/^NAFT_TOKEN_PREVIEW_BLOCKED:[A-Z_]+$/.test(message)?
      message:'NAFT_TOKEN_PREVIEW_BLOCKED:INPUT_INVALID');
    process.exitCode=1;
  }
}
