'use strict';

var CLIMATECHAIN_TESTNET_RECORD={
  schema:'naft-climatechain-testnet-record-1',
  status:'VERIFIED_TESTNET',
  network:'Ethereum Sepolia',
  chain_id:11155111,
  contract_address:'0x1B7a3d1217Ffe5Ddd7d80E9734CeB6E32d4293B0',
  deploy_tx_hash:'0x7695a040d1639ebf5b2fcc96ec6c879e5ccc28c46d95d9371f906769b8a12188',
  genesis_tx_hash:'0x85c25a7ee239d7178c7266bf50e22c41bd30debfc7e37e579d437f1730d8fc34',
  successor_tx_hash:'0xb5aef9810d6eb9c7516c0c9c6aadcf05fe952fb9170338fb915a5aa204579ac5',
  explorer_base_url:'https://sepolia.etherscan.io',
  source_commit:'fb9016c6c3041ec0e77098e631d62138fbae582e',
  compiler:'solc 0.8.24',
  verified_at:'2026-10-07T07:44:26.909Z',
  boundary:'Blockchain witnesses package lineage only; it does not certify climate truth, methodology eligibility, registry acceptance, or carbon-credit issuance.'
};

function climateChainTestnetRecord(){
  return JSON.parse(JSON.stringify(CLIMATECHAIN_TESTNET_RECORD));
}

function climateChainExplorerLinks(record){
  validateClimateChainTestnetRecord(record);
  if(record.status!=='VERIFIED_TESTNET') return null;
  var base=record.explorer_base_url.replace(/\/$/,'');
  return {
    contract:base+'/address/'+record.contract_address,
    deployment:base+'/tx/'+record.deploy_tx_hash,
    genesis:base+'/tx/'+record.genesis_tx_hash,
    successor:base+'/tx/'+record.successor_tx_hash
  };
}

function validateClimateChainTestnetRecord(record){
  if(!record||record.schema!=='naft-climatechain-testnet-record-1') throw new Error('INVALID_TESTNET_RECORD_SCHEMA');
  if(record.status!=='NOT_SUBMITTED'&&record.status!=='VERIFIED_TESTNET') throw new Error('INVALID_TESTNET_RECORD_STATUS');

  var fields=['network','chain_id','contract_address','deploy_tx_hash','genesis_tx_hash','successor_tx_hash','explorer_base_url','source_commit','verified_at'];
  if(record.status==='NOT_SUBMITTED'){
    var populated=fields.filter(function(k){return record[k]!==null;});
    if(populated.length) throw new Error('UNVERIFIED_TESTNET_FIELDS_POPULATED:'+populated.join(','));
    return {ok:true,status:record.status};
  }

  if(typeof record.network!=='string'||!record.network.trim()) throw new Error('TESTNET_NETWORK_REQUIRED');
  if(!Number.isInteger(record.chain_id)||record.chain_id<=0) throw new Error('TESTNET_CHAIN_ID_REQUIRED');
  if(!/^0x[a-fA-F0-9]{40}$/.test(record.contract_address||'')) throw new Error('TESTNET_CONTRACT_ADDRESS_INVALID');
  if(/^0x0{40}$/i.test(record.contract_address)) throw new Error('TESTNET_CONTRACT_ADDRESS_ZERO');
  for(var i=0;i<3;i++){
    var key=['deploy_tx_hash','genesis_tx_hash','successor_tx_hash'][i];
    if(!/^0x[a-fA-F0-9]{64}$/.test(record[key]||'')) throw new Error('TESTNET_TX_HASH_INVALID:'+key);
  }
  if(new Set([record.deploy_tx_hash.toLowerCase(),record.genesis_tx_hash.toLowerCase(),record.successor_tx_hash.toLowerCase()]).size!==3) {
    throw new Error('TESTNET_TX_HASHES_MUST_BE_DISTINCT');
  }
  if(typeof record.explorer_base_url!=='string'||!/^https:\/\//.test(record.explorer_base_url)) throw new Error('TESTNET_EXPLORER_REQUIRED');
  if(!/^[a-f0-9]{40}$/.test(record.source_commit||'')) throw new Error('TESTNET_SOURCE_COMMIT_INVALID');
  if(/^0{40}$/.test(record.source_commit)) throw new Error('TESTNET_SOURCE_COMMIT_ZERO');
  if(typeof record.verified_at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(record.verified_at)) throw new Error('TESTNET_VERIFIED_AT_INVALID');
  return {ok:true,status:record.status};
}
