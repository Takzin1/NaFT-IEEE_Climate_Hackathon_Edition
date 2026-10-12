'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const name of ['mrv-core','methodology-packs','mrv-compiler','compiler-demo','climatechain-testnet-record','climatechain-demo']) {
  vm.runInThisContext(fs.readFileSync('src/'+name+'.js','utf8'));
}
let passed=0,failed=0;
function check(value,label){try{assert.ok(value,label);passed++;}catch(e){failed++;console.error('FAIL: '+label);process.exitCode=1;}}
function eq(a,b,label){check(canonicalize(a)===canonicalize(b),label);}

const testnet=climateChainTestnetRecord();
eq(testnet.status,'VERIFIED_TESTNET','testnet record is independently verified');
check(validateClimateChainTestnetRecord(testnet).ok===true,'verified testnet record validates');
check(testnet.chain_id===11155111&&/^0x[a-fA-F0-9]{40}$/.test(testnet.contract_address),'verified testnet record carries Sepolia chain evidence');
check(testnet.source_commit==='fb9016c6c3041ec0e77098e631d62138fbae582e','record pins the actual deploy source commit');
check(testnet.contract_address.toLowerCase()==='0x1b7a3d1217ffe5ddd7d80e9734ceb6e32d4293b0','record pins the actual verified Sepolia contract');
const notSubmittedFixture={
  schema:'naft-climatechain-testnet-record-1',status:'NOT_SUBMITTED',network:null,chain_id:null,
  contract_address:null,deploy_tx_hash:null,genesis_tx_hash:null,successor_tx_hash:null,
  explorer_base_url:null,source_commit:null,compiler:'solc 0.8.24',verified_at:null,boundary:'test fixture'
};
let invalidCaught=false;
try {
  validateClimateChainTestnetRecord(Object.assign({},notSubmittedFixture,{network:'Sepolia'}));
} catch(e) { invalidCaught=e.message.includes('UNVERIFIED_TESTNET_FIELDS_POPULATED'); }
check(invalidCaught,'partial unverified testnet evidence fails closed');
invalidCaught=false;
try {
  validateClimateChainTestnetRecord(Object.assign({},notSubmittedFixture,{status:'VERIFIED_TESTNET'}));
} catch(e) { invalidCaught=e.message.includes('TESTNET_NETWORK_REQUIRED'); }
check(invalidCaught,'verified status requires complete chain evidence');

const validTestnetRecord={
  schema:'naft-climatechain-testnet-record-1',
  status:'VERIFIED_TESTNET',
  network:'Example Public Testnet',
  chain_id:11155111,
  contract_address:'0x1111111111111111111111111111111111111111',
  deploy_tx_hash:'0x'+'1'.repeat(64),
  genesis_tx_hash:'0x'+'2'.repeat(64),
  successor_tx_hash:'0x'+'3'.repeat(64),
  explorer_base_url:'https://example.test',
  source_commit:'1'.repeat(40),
  compiler:'solc 0.8.24',
  verified_at:'2026-10-05T00:00:00Z',
  boundary:testnet.boundary
};
check(validateClimateChainTestnetRecord(validTestnetRecord).ok===true,'complete verified testnet record validates');
const explorerLinks=climateChainExplorerLinks(validTestnetRecord);
check(explorerLinks.contract===validTestnetRecord.explorer_base_url+'/address/'+validTestnetRecord.contract_address,'contract explorer link derived from verified record');
check(explorerLinks.deployment===validTestnetRecord.explorer_base_url+'/tx/'+validTestnetRecord.deploy_tx_hash,'deployment explorer link derived from verified record');
check(explorerLinks.genesis.endsWith(validTestnetRecord.genesis_tx_hash),'genesis explorer link derived from verified record');
check(explorerLinks.successor.endsWith(validTestnetRecord.successor_tx_hash),'successor explorer link derived from verified record');
invalidCaught=false;
try { validateClimateChainTestnetRecord(Object.assign({},validTestnetRecord,{contract_address:'0x'+'0'.repeat(40)})); }
catch(e) { invalidCaught=e.message==='TESTNET_CONTRACT_ADDRESS_ZERO'; }
check(invalidCaught,'zero contract address rejected');
invalidCaught=false;
try { validateClimateChainTestnetRecord(Object.assign({},validTestnetRecord,{source_commit:'0'.repeat(40)})); }
catch(e) { invalidCaught=e.message==='TESTNET_SOURCE_COMMIT_ZERO'; }
check(invalidCaught,'zero source commit rejected');
invalidCaught=false;
try { validateClimateChainTestnetRecord(Object.assign({},validTestnetRecord,{successor_tx_hash:validTestnetRecord.genesis_tx_hash})); }
catch(e) { invalidCaught=e.message==='TESTNET_TX_HASHES_MUST_BE_DISTINCT'; }
check(invalidCaught,'duplicate deployment/lineage transaction hashes rejected');

const reference=climateReferenceScenario();
eq(reference.domain,'Japanese rice-paddy methane MRV','real-world reference domain is explicit');
check(reference.evidence_examples.length>=6,'real-world reference lists heterogeneous evidence');
check(reference.source_status.includes('not asserted'),'institutional version boundary remains explicit');
check(reference.experiment_boundary.includes('NAFT-SYNTHETIC@1 -> @2'),'real-world context is separated from synthetic experiment');

const roles=climateAdoptionRoles();
eq(roles.length,3,'three practical adoption roles');
check(roles.some(x=>x.role==='Project aggregator'),'aggregator adoption role present');
check(roles.some(x=>x.role==='Registry / carbon program'),'registry adoption role present');

const trust=climateTrustModel();
check(!trust.on_chain.some(x=>x.includes('raw evidence')),'raw evidence is not placed on-chain');
check(trust.never_claimed.includes('formal certification'),'formal certification remains outside trust claim');
check(trust.design_rule.includes('does not decide climate truth'),'blockchain trust boundary is explicit');

const diagram=fs.readFileSync('docs/assets/naft-climatechain-architecture.svg','utf8');
check(diagram.includes('OFF-CHAIN / DETERMINISTIC EVALUATION + HUMAN REVIEW'),'diagram separates off-chain MRV judgment');
check(diagram.includes('ON-CHAIN / ETHEREUM SEPOLIA'),'diagram isolates public on-chain witness');
check(diagram.includes('package hashes + parentage only'),'diagram limits chain proof to hashes and lineage');
check(diagram.includes('synthetic workload')&&!diagram.includes('measured field benefit'),'diagram marks experimental boundary');
const scenarioSource=fs.readFileSync('src/climatechain-demo.js','utf8');
check(scenarioSource.includes('FICTIONAL AGGREGATOR / SYNTHETIC CLAIMS'),'scenario explicitly fictional');
check(scenarioSource.includes('display(c&&c.require_reverification)')&&scenarioSource.includes('display(c&&c.UNAFFECTED)'),'scenario results are computed, not hardcoded');
check(scenarioSource.includes('c.AUTO_REEVALUATED')&&scenarioSource.includes('c.EVIDENCE_REQUIRED'),'scenario subgroups use real analyzer counts');
check(scenarioSource.includes('No participating farms, measured emissions reduction, labor savings'),'scenario disclaims unmeasured impacts');

const impact=runClimateChainImpact();
eq(impact.counts.total,100,'100 synthetic claims evaluated');
eq(impact.counts.require_reverification,30,'30 claims require re-verification');
eq(impact.counts.UNAFFECTED,70,'70 claims unaffected by intensive-only change');
eq(impact.counts.AUTO_REEVALUATED,15,'15 claims auto re-evaluated');
eq(impact.counts.EVIDENCE_REQUIRED,15,'15 claims fail closed for new evidence');

const row=climateChainRepresentative(impact);
check(!!row,'representative successor exists');
eq(row.status,'AUTO_REEVALUATED','representative is deterministic successor');
check(row.requires_reverification===true,'representative requires re-verification');
check(!!row.successor&&typeof row.successor.package_hash==='string','representative has successor package');

const plan=buildClimateChainAnchorPlan(impact);
eq(plan.chain_status,'NOT_SUBMITTED','browser never claims blockchain submission');
eq(plan.claim_id,'CLIMATE-086','the demo selects the witnessed example claim');
eq(plan.genesis.package_hash,'0xe69e7df04f5f3640d94de510308e71a3229fe7c71fe8cb437bfc084623b25477','browser P1 package matches anchored package');
eq(plan.successor.package_hash,'0xe5ee259abdc624bd6fd8cdf72fa72eef11397ba54556c01f2ce294824d70f71e','browser P2 package matches anchored successor');
check(plan.formal_certification===false,'anchor is not formal certification');
check(plan.carbon_credit_issued===false,'anchor does not issue a carbon credit');
eq(plan.genesis.previous_package_hash,ZERO_BYTES32,'genesis has zero parent');
eq(plan.successor.previous_package_hash,plan.genesis.package_hash,'successor binds exact prior package');
check(plan.successor.package_hash!==plan.genesis.package_hash,'successor hash differs from prior package');
eq(plan.successor.claim_id_hash,plan.genesis.claim_id_hash,'lineage binds same claim');
check(plan.lineage_checks.successor_supersedes_previous===true,'compiler provenance contains supersedes edge');
check(plan.lineage_checks.previous_package_stale===true,'prior package marked stale after semantic change');
check(plan.lineage_checks.requires_reverification===true,'anchor plan comes from impacted claim');

const hashes=[
  plan.genesis.claim_id_hash,plan.genesis.package_hash,plan.genesis.methodology_hash,
  plan.successor.claim_id_hash,plan.successor.package_hash,plan.successor.methodology_hash,
  plan.successor.previous_package_hash
];
check(hashes.every(h=>/^0x[a-f0-9]{64}$/.test(h)),'all contract arguments are bytes32 hex');
eq(plan,buildClimateChainAnchorPlan(runClimateChainImpact()),'anchor plan deterministic for deterministic fixture');

const contract=fs.readFileSync('contracts/NaFTMRVAnchor.sol','utf8');
check(contract.includes('address public anchorWriter'),'anchor writer state present');
check(contract.includes('error UnauthorizedWriter(address caller)'),'unauthorized writer guard declared');
check(contract.includes('anchorWriter = msg.sender'),'deployer becomes anchor writer');
check(contract.includes('msg.sender != anchorWriter'),'anchor writes require authorized writer');
check(contract.includes('function anchorPackage('),'anchorPackage contract entrypoint present');
check(contract.includes('PackageAlreadyAnchored(packageHash)'),'duplicate package guard present');
check(contract.includes('PreviousPackageMissing(previousPackageHash)'),'missing-parent guard present');
check(contract.includes('PreviousClaimMismatch(claimIdHash, previous.claimIdHash)'),'cross-claim parent guard present');
check(contract.includes('LineageHeadMismatch(currentHead, previousPackageHash)'),'lineage fork guard present');
check(!contract.includes(' payable'),'contract has no payable path');
check(!/function\s+mint\s*\(/.test(contract),'contract does not mint tokens');
check(!/function\s+transfer\s*\(/.test(contract),'contract does not implement token transfer');

console.log('CLIMATECHAIN RESULT: '+passed+' passed, '+failed+' failed');
if(failed) process.exitCode=1;
