#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

function die(message){console.error('CLIMATECHAIN_TESTNET_VERIFY_FAIL: '+message);process.exit(1);}
function ok(label,detail){console.log('ok: '+label+(detail?' ['+detail+']':''));}
function strip0x(value){return String(value||'').replace(/^0x/i,'').toLowerCase();}
function sameAddress(a,b){return String(a||'').toLowerCase()===String(b||'').toLowerCase();}
function hexUtf8(value){return '0x'+Buffer.from(value,'utf8').toString('hex');}

const rpc=process.env.RPC_URL;
if(!rpc) die('RPC_URL is required');

const recordSource=fs.readFileSync('src/climatechain-testnet-record.js','utf8');
const recordSandbox={Set,console};
vm.createContext(recordSandbox);
vm.runInContext(recordSource,recordSandbox,{filename:'src/climatechain-testnet-record.js'});
const record=process.env.TESTNET_RECORD_JSON
  ? JSON.parse(process.env.TESTNET_RECORD_JSON)
  : recordSandbox.climateChainTestnetRecord();

if(record.status!=='VERIFIED_TESTNET') die('record status must be VERIFIED_TESTNET');
try{recordSandbox.validateClimateChainTestnetRecord(record);}catch(e){die(e.message);}
if(record.compiler!=='solc 0.8.24') die('unsupported compiler record '+record.compiler);

function command(cmd,args,options={}){
  const result=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024,...options});
  if(result.error) die(cmd+' failed: '+result.error.message);
  if(result.status!==0) die(cmd+' failed: '+String(result.stderr||result.stdout||'').trim());
  return result.stdout;
}

function sourceAtRecordedCommit(path){
  // Must match deploy.mjs sourceAt(), whose git helper trims stdout.
  // Trailing whitespace changes Solidity metadata hash even when runtime semantics are identical.
  return command('git',['show',record.source_commit+':'+path]).trim();
}

function compileRecordedSource(){
  command('git',['cat-file','-e',record.source_commit+'^{commit}']);
  const source=sourceAtRecordedCommit('contracts/NaFTMRVAnchor.sol');
  const input={
    language:'Solidity',
    sources:{'NaFTMRVAnchor.sol':{content:source}},
    settings:{
      optimizer:{enabled:false,runs:200},
      outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}
    }
  };
  const raw=command('npx',['--yes','solc@0.8.24','--standard-json'],{input:JSON.stringify(input)});
  const jsonStart=raw.indexOf('{');
  if(jsonStart<0) die('solc standard-json output missing JSON');
  let output;
  try{output=JSON.parse(raw.slice(jsonStart));}catch(e){die('solc JSON parse failed: '+e.message);}
  const errors=(output.errors||[]).filter(x=>x.severity==='error');
  if(errors.length) die('solc compile errors: '+errors.map(x=>x.formattedMessage||x.message).join('\n'));
  const artifact=output.contracts&&output.contracts['NaFTMRVAnchor.sol']&&output.contracts['NaFTMRVAnchor.sol'].NaFTMRVAnchor;
  if(!artifact) die('compiled NaFTMRVAnchor artifact missing');
  return {
    creation:'0x'+artifact.evm.bytecode.object.toLowerCase(),
    runtime:'0x'+artifact.evm.deployedBytecode.object.toLowerCase()
  };
}

const compiled=compileRecordedSource();
ok('recorded source commit exists',record.source_commit);

const planContext={
  console,
  TextEncoder,
  TextDecoder,
  crypto:globalThis.crypto,
  setTimeout,
  clearTimeout
};
vm.createContext(planContext);
for(const file of [
  'src/mrv-core.js',
  'src/methodology-packs.js',
  'src/mrv-compiler.js',
  'src/compiler-demo.js',
  'src/climatechain-testnet-record.js',
  'src/climatechain-demo.js'
]){
  vm.runInContext(sourceAtRecordedCommit(file),planContext,{filename:file});
}
const plan=vm.runInContext('buildClimateChainAnchorPlan(runClimateChainImpact())',planContext);
ok('anchor plan reconstructed from recorded source commit',record.source_commit);

let id=0;
async function rpcCall(method,params){
  const res=await fetch(rpc,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params})
  });
  if(!res.ok) die(method+' HTTP '+res.status);
  const body=await res.json();
  if(body.error) die(method+' '+JSON.stringify(body.error));
  return body.result;
}

function hexInt(value){
  if(typeof value!=='string'||!/^0x[0-9a-f]+$/i.test(value)) die('invalid hex integer '+value);
  return Number(BigInt(value));
}

async function signatureHash(signature){
  const hash=await rpcCall('web3_sha3',[hexUtf8(signature)]);
  if(!/^0x[a-f0-9]{64}$/i.test(hash||'')) die('invalid web3_sha3 result for '+signature);
  return hash.toLowerCase();
}

function expectedAnchorPayload(entry){
  return [
    entry.claim_id_hash,
    entry.package_hash,
    entry.methodology_hash,
    entry.previous_package_hash
  ].map(strip0x).join('');
}

function decodeAddressWord(word){
  const raw=strip0x(word);
  if(raw.length!==64) die('invalid address ABI word');
  return '0x'+raw.slice(24);
}

function wordAt(data,index){
  const raw=strip0x(data);
  const start=index*64;
  const word=raw.slice(start,start+64);
  if(word.length!==64) die('invalid ABI data word '+index);
  return word;
}

(async()=>{
  const anchorHash=await signatureHash('anchorPackage(bytes32,bytes32,bytes32,bytes32)');
  const anchorSelector=strip0x(anchorHash).slice(0,8);
  const eventTopic0=await signatureHash('MRVPackageAnchored(bytes32,bytes32,bytes32,bytes32,address,uint64)');
  const writerSelector=strip0x(await signatureHash('anchorWriter()')).slice(0,8);
  const headSelector=strip0x(await signatureHash('headByClaim(bytes32)')).slice(0,8);

  const chainId=hexInt(await rpcCall('eth_chainId',[]));
  if(chainId!==record.chain_id) die('chain id mismatch expected '+record.chain_id+' got '+chainId);
  ok('chain id matches',String(chainId));

  const deployTx=await rpcCall('eth_getTransactionByHash',[record.deploy_tx_hash]);
  if(!deployTx) die('deploy transaction not found');
  const deployReceipt=await rpcCall('eth_getTransactionReceipt',[record.deploy_tx_hash]);
  if(!deployReceipt||deployReceipt.status!=='0x1') die('deployment transaction not confirmed');
  if(!sameAddress(deployReceipt.contractAddress,record.contract_address)) die('deployment contract address mismatch');
  if(('0x'+strip0x(deployTx.input))!==compiled.creation) die('deployment bytecode does not match recorded source commit');
  ok('deployment bytecode matches recorded source commit');

  const code=String(await rpcCall('eth_getCode',[record.contract_address,'latest'])||'').toLowerCase();
  if(code!==compiled.runtime) die('deployed runtime bytecode does not match recorded source commit');
  ok('runtime bytecode matches recorded source commit',record.contract_address);

  const writerRaw=await rpcCall('eth_call',[{to:record.contract_address,data:'0x'+writerSelector},'latest']);
  const writer=decodeAddressWord(writerRaw);
  if(!sameAddress(writer,deployTx.from)) die('anchorWriter does not match deployment sender');
  ok('anchorWriter matches deployer',writer);

  for(const [label,hash,entry] of [
    ['genesis',record.genesis_tx_hash,plan.genesis],
    ['successor',record.successor_tx_hash,plan.successor]
  ]){
    const tx=await rpcCall('eth_getTransactionByHash',[hash]);
    if(!tx) die(label+' transaction not found');
    const receipt=await rpcCall('eth_getTransactionReceipt',[hash]);
    if(!receipt) die(label+' receipt not found');
    if(receipt.status!=='0x1') die(label+' transaction reverted');
    if(!sameAddress(tx.to,record.contract_address)) die(label+' transaction target mismatch');
    if(!sameAddress(tx.from,writer)) die(label+' transaction not sent by anchorWriter');

    const input=strip0x(tx.input);
    if(input.length!==8+(64*4)) die(label+' calldata length mismatch');
    if(input.slice(0,8)!==anchorSelector) die(label+' function selector mismatch');
    if(input.slice(8)!==expectedAnchorPayload(entry)) die(label+' calldata arguments do not match deterministic NaFT anchor plan');
    ok(label+' selector and calldata match NaFT plan');

    const logs=Array.isArray(receipt.logs)?receipt.logs:[];
    const log=logs.find(item=>{
      if(!sameAddress(item.address,record.contract_address)) return false;
      const topics=Array.isArray(item.topics)?item.topics:[];
      return topics.length>=4 &&
        String(topics[0]||'').toLowerCase()===eventTopic0 &&
        strip0x(topics[1])===strip0x(entry.claim_id_hash) &&
        strip0x(topics[2])===strip0x(entry.package_hash) &&
        strip0x(topics[3])===strip0x(entry.previous_package_hash);
    });
    if(!log) die(label+' MRVPackageAnchored signature/topics do not match NaFT plan');

    const methodologyWord=wordAt(log.data,0);
    const submitterWord=wordAt(log.data,1);
    const timestampWord=wordAt(log.data,2);
    if(methodologyWord!==strip0x(entry.methodology_hash)) die(label+' event methodology hash mismatch');
    if(!sameAddress(decodeAddressWord(submitterWord),tx.from)) die(label+' event submitter mismatch');
    const block=await rpcCall('eth_getBlockByNumber',[receipt.blockNumber,false]);
    if(!block||!block.timestamp) die(label+' block timestamp missing');
    if(BigInt('0x'+timestampWord)!==BigInt(block.timestamp)) die(label+' event anchoredAt does not match block timestamp');
    ok(label+' event signature/data match NaFT plan');
  }

  if(strip0x(plan.successor.previous_package_hash)!==strip0x(plan.genesis.package_hash)) {
    die('deterministic plan lineage mismatch');
  }
  ok('successor points to genesis package');

  const headRaw=await rpcCall('eth_call',[{
    to:record.contract_address,
    data:'0x'+headSelector+strip0x(plan.successor.claim_id_hash)
  },'latest']);
  if(strip0x(headRaw)!==strip0x(plan.successor.package_hash)) die('final headByClaim does not equal successor package');
  ok('final headByClaim equals successor package');

  console.log(JSON.stringify({
    status:'VERIFIED_TESTNET_RPC',
    network:record.network,
    chain_id:record.chain_id,
    contract_address:record.contract_address,
    anchor_writer:writer,
    source_commit:record.source_commit,
    claim_id:plan.claim_id,
    genesis_package_hash:plan.genesis.package_hash,
    successor_package_hash:plan.successor.package_hash,
    deploy_tx_hash:record.deploy_tx_hash,
    genesis_tx_hash:record.genesis_tx_hash,
    successor_tx_hash:record.successor_tx_hash
  },null,2));
})().catch(e=>die(e&&e.stack?e.stack:String(e)));
