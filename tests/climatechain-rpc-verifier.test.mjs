#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

function strip0x(v){return String(v).replace(/^0x/,'').toLowerCase();}
function command(cmd,args,options={}){
  const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024,...options});
  if(r.status!==0) throw new Error(String(r.stderr||r.stdout||''));
  return r.stdout;
}
function compileHead(){
  const source=fs.readFileSync('contracts/NaFTMRVAnchor.sol','utf8').trim();
  const input={
    language:'Solidity',
    sources:{'NaFTMRVAnchor.sol':{content:source}},
    settings:{optimizer:{enabled:false,runs:200},outputSelection:{'*':{'*':['evm.bytecode.object','evm.deployedBytecode.object']}}}
  };
  const raw=command('npx',['--yes','solc@0.8.24','--standard-json'],{input:JSON.stringify(input)});
  const out=JSON.parse(raw.slice(raw.indexOf('{')));
  const a=out.contracts['NaFTMRVAnchor.sol'].NaFTMRVAnchor;
  return {creation:'0x'+a.evm.bytecode.object.toLowerCase(),runtime:'0x'+a.evm.deployedBytecode.object.toLowerCase()};
}

const compiled=compileHead();
const headCommit=command('git',['rev-parse','HEAD']).trim();

const ctx={console,TextEncoder,TextDecoder,crypto:globalThis.crypto,setTimeout,clearTimeout};
vm.createContext(ctx);
for(const file of [
  'src/mrv-core.js','src/methodology-packs.js','src/mrv-compiler.js','src/compiler-demo.js',
  'src/climatechain-testnet-record.js','src/climatechain-demo.js'
]){
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
}
const plan=vm.runInContext('buildClimateChainAnchorPlan(runClimateChainImpact())',ctx);

const writer='0x'+'a'.repeat(40);
const contract='0x'+'1'.repeat(40);
const deployHash='0x'+'1'.repeat(64);
const genesisHash='0x'+'2'.repeat(64);
const successorHash='0x'+'3'.repeat(64);
const timestamp='0x69000000';
const hashes={
  anchor:'0xdeadbeef'+'0'.repeat(56),
  event:'0x'+'9'.repeat(64),
  writer:'0xaaaaaaaa'+'0'.repeat(56),
  head:'0xbbbbbbbb'+'0'.repeat(56)
};
const selectors={
  anchor:strip0x(hashes.anchor).slice(0,8),
  writer:strip0x(hashes.writer).slice(0,8),
  head:strip0x(hashes.head).slice(0,8)
};

const record={
  schema:'naft-climatechain-testnet-record-1',
  status:'VERIFIED_TESTNET',
  network:'Mock Sepolia-compatible testnet',
  chain_id:11155111,
  contract_address:contract,
  deploy_tx_hash:deployHash,
  genesis_tx_hash:genesisHash,
  successor_tx_hash:successorHash,
  explorer_base_url:'https://example.test',
  source_commit:headCommit,
  compiler:'solc 0.8.24',
  verified_at:'2026-10-06T00:00:00Z',
  boundary:'test fixture'
};

function padAddress(address){return address.slice(2).padStart(64,'0');}
function uintWord(hex){return BigInt(hex).toString(16).padStart(64,'0');}
function calldata(entry){
  return '0x'+selectors.anchor+[
    entry.claim_id_hash,entry.package_hash,entry.methodology_hash,entry.previous_package_hash
  ].map(strip0x).join('');
}
function eventData(entry){
  return '0x'+strip0x(entry.methodology_hash)+padAddress(writer)+uintWord(timestamp);
}

let corruptSuccessor=false;
function txFor(hash){
  if(hash===deployHash) return {hash,from:writer,to:null,input:compiled.creation};
  if(hash===genesisHash) return {hash,from:writer,to:contract,input:calldata(plan.genesis)};
  if(hash===successorHash){
    let input=calldata(plan.successor);
    if(corruptSuccessor) input=input.slice(0,-1)+(input.endsWith('0')?'1':'0');
    return {hash,from:writer,to:contract,input};
  }
  return null;
}
function receiptFor(hash){
  if(hash===deployHash) return {status:'0x1',contractAddress:contract,blockNumber:'0x10',logs:[]};
  const entry=hash===genesisHash?plan.genesis:hash===successorHash?plan.successor:null;
  if(!entry) return null;
  return {
    status:'0x1',contractAddress:null,blockNumber:'0x10',
    logs:[{address:contract,topics:[hashes.event,entry.claim_id_hash,entry.package_hash,entry.previous_package_hash],data:eventData(entry)}]
  };
}
function hashForInput(data){
  const text=Buffer.from(strip0x(data),'hex').toString('utf8');
  if(text==='anchorPackage(bytes32,bytes32,bytes32,bytes32)') return hashes.anchor;
  if(text==='MRVPackageAnchored(bytes32,bytes32,bytes32,bytes32,address,uint64)') return hashes.event;
  if(text==='anchorWriter()') return hashes.writer;
  if(text==='headByClaim(bytes32)') return hashes.head;
  throw new Error('unexpected web3_sha3 input '+text);
}
function rpcResult(method,params){
  if(method==='eth_chainId') return '0xaa36a7';
  if(method==='web3_sha3') return hashForInput(params[0]);
  if(method==='eth_getCode') return compiled.runtime;
  if(method==='eth_getTransactionByHash') return txFor(params[0]);
  if(method==='eth_getTransactionReceipt') return receiptFor(params[0]);
  if(method==='eth_getBlockByNumber') return {timestamp};
  if(method==='eth_call'){
    const data=strip0x(params[0].data);
    if(data.startsWith(selectors.writer)) return '0x'+padAddress(writer);
    if(data.startsWith(selectors.head)) return plan.successor.package_hash;
    throw new Error('unexpected eth_call');
  }
  throw new Error('unexpected RPC method '+method);
}

function runVerifier(url){
  return new Promise((resolve)=>{
    const child=spawn(process.execPath,['scripts/verify-climatechain-testnet.mjs'],{
      env:{...process.env,RPC_URL:url,TESTNET_RECORD_JSON:JSON.stringify(record)},
      stdio:['ignore','pipe','pipe']
    });
    let stdout='',stderr='';
    child.stdout.on('data',d=>stdout+=d);
    child.stderr.on('data',d=>stderr+=d);
    child.on('close',code=>resolve({code,stdout,stderr}));
  });
}

(async()=>{
  const server=http.createServer((req,res)=>{
    let body='';
    req.on('data',d=>body+=d);
    req.on('end',()=>{
      try{
        const input=JSON.parse(body);
        const result=rpcResult(input.method,input.params||[]);
        res.writeHead(200,{'content-type':'application/json'});
        res.end(JSON.stringify({jsonrpc:'2.0',id:input.id,result}));
      }catch(e){
        res.writeHead(200,{'content-type':'application/json'});
        res.end(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32000,message:e.message}}));
      }
    });
  });

  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  try{
    const good=await runVerifier(url);
    assert.equal(good.code,0,good.stderr);
    assert.match(good.stdout,/runtime bytecode matches recorded source commit/);
    assert.match(good.stdout,/final headByClaim equals successor package/);

    corruptSuccessor=true;
    const bad=await runVerifier(url);
    assert.notEqual(bad.code,0);
    assert.match(bad.stderr,/successor calldata arguments do not match deterministic NaFT anchor plan/);
    console.log('CLIMATECHAIN RPC VERIFIER: PASS');
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exit(1);});
