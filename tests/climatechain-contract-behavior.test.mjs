#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const PORT=8547;
const RPC='http://127.0.0.1:'+PORT;

function command(cmd,args,options={}){
  const result=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024,...options});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error(String(result.stderr||result.stdout||''));
  return result.stdout;
}

function compileContract(){
  const source=fs.readFileSync('contracts/NaFTMRVAnchor.sol','utf8');
  const input={
    language:'Solidity',
    sources:{'NaFTMRVAnchor.sol':{content:source}},
    settings:{
      optimizer:{enabled:false,runs:200},
      outputSelection:{'*':{'*':['evm.bytecode.object']}}
    }
  };
  const raw=command('npx',['--yes','solc@0.8.24','--standard-json'],{input:JSON.stringify(input)});
  const start=raw.indexOf('{');
  if(start<0) throw new Error('solc output missing JSON');
  const output=JSON.parse(raw.slice(start));
  const errors=(output.errors||[]).filter(x=>x.severity==='error');
  if(errors.length) throw new Error(errors.map(x=>x.formattedMessage||x.message).join('\n'));
  return '0x'+output.contracts['NaFTMRVAnchor.sol'].NaFTMRVAnchor.evm.bytecode.object;
}

let rpcId=0;
async function rpcRaw(method,params=[]){
  const res=await fetch(RPC,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:++rpcId,method,params})
  });
  if(!res.ok) throw new Error(method+' HTTP '+res.status);
  return res.json();
}

async function rpc(method,params=[]){
  const body=await rpcRaw(method,params);
  if(body.error) throw new Error(method+': '+JSON.stringify(body.error));
  return body.result;
}

async function waitRpc(){
  for(let i=0;i<120;i++){
    try{
      const body=await rpcRaw('eth_chainId',[]);
      if(body.result) return;
    }catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('Ganache RPC did not become ready');
}

async function waitReceipt(hash){
  for(let i=0;i<120;i++){
    const receipt=await rpc('eth_getTransactionReceipt',[hash]);
    if(receipt) return receipt;
    await new Promise(r=>setTimeout(r,50));
  }
  throw new Error('receipt timeout '+hash);
}

async function signatureSelector(signature){
  const hex='0x'+Buffer.from(signature,'utf8').toString('hex');
  const hash=await rpc('web3_sha3',[hex]);
  return hash.slice(2,10);
}

function b32(ch){return '0x'+ch.repeat(64);}
function strip0x(v){return String(v).replace(/^0x/,'');}
function anchorData(selector,claim,pkg,methodology,previous){
  return '0x'+selector+[claim,pkg,methodology,previous].map(strip0x).join('');
}
function decodeAddress(word){
  const raw=strip0x(word);
  return '0x'+raw.slice(-40);
}

async function sendSuccess(tx,label){
  const hash=await rpc('eth_sendTransaction',[tx]);
  const receipt=await waitReceipt(hash);
  assert.equal(receipt.status,'0x1',label+' should succeed');
  return {hash,receipt};
}

async function sendRevert(tx,label){
  const body=await rpcRaw('eth_sendTransaction',[tx]);
  if(body.error) return;
  assert.ok(body.result,label+' should return tx hash or RPC error');
  const receipt=await waitReceipt(body.result);
  assert.notEqual(receipt.status,'0x1',label+' should revert');
}

const bytecode=compileContract();
const ganache=spawn('npx',[
  '--yes','ganache@7.9.2',
  '--server.host','127.0.0.1',
  '--server.port',String(PORT),
  '--wallet.deterministic',
  '--wallet.totalAccounts','3',
  '--logging.quiet'
],{
  stdio:'ignore',
  detached:true
});

try{
  await waitRpc();

  const accounts=await rpc('eth_accounts',[]);
  assert.ok(accounts.length>=2,'Ganache needs two accounts');
  const writer=accounts[0],attacker=accounts[1];

  const deploy=await sendSuccess({
    from:writer,
    data:bytecode,
    gas:'0x7a1200'
  },'deployment');
  const contract=deploy.receipt.contractAddress;
  assert.ok(/^0x[a-f0-9]{40}$/i.test(contract),'contract address expected');

  const anchorSelector=await signatureSelector('anchorPackage(bytes32,bytes32,bytes32,bytes32)');
  const writerSelector=await signatureSelector('anchorWriter()');
  const headSelector=await signatureSelector('headByClaim(bytes32)');

  const writerWord=await rpc('eth_call',[{to:contract,data:'0x'+writerSelector},'latest']);
  assert.equal(decodeAddress(writerWord).toLowerCase(),writer.toLowerCase(),'deployer must become anchorWriter');

  const claimA=b32('1');
  const p1=b32('2');
  const m1=b32('3');
  const p2=b32('4');
  const m2=b32('5');
  const p3=b32('8');
  const zero='0x'+'0'.repeat(64);

  await sendSuccess({
    from:writer,to:contract,gas:'0x2dc6c0',
    data:anchorData(anchorSelector,claimA,p1,m1,zero)
  },'authorized genesis');

  await sendRevert({
    from:attacker,to:contract,gas:'0x2dc6c0',
    data:anchorData(anchorSelector,claimA,p2,m2,p1)
  },'unauthorized successor');

  await sendSuccess({
    from:writer,to:contract,gas:'0x2dc6c0',
    data:anchorData(anchorSelector,claimA,p2,m2,p1)
  },'authorized successor');

  await sendRevert({
    from:writer,to:contract,gas:'0x2dc6c0',
    data:anchorData(anchorSelector,claimA,p2,m2,p2)
  },'duplicate package');

  await sendRevert({
    from:writer,to:contract,gas:'0x2dc6c0',
    data:anchorData(anchorSelector,claimA,p3,m2,p1)
  },'lineage fork');

  const claimB=b32('6');
  const b1=b32('7');
  const b2=b32('9');
  await sendSuccess({
    from:writer,to:contract,gas:'0x2dc6c0',
    data:anchorData(anchorSelector,claimB,b1,m1,zero)
  },'second claim genesis');

  await sendRevert({
    from:writer,to:contract,gas:'0x2dc6c0',
    data:anchorData(anchorSelector,claimB,b2,m2,p2)
  },'cross-claim parent');

  const headRaw=await rpc('eth_call',[{
    to:contract,
    data:'0x'+headSelector+strip0x(claimA)
  },'latest']);
  assert.equal(headRaw.toLowerCase(),p2.toLowerCase(),'claim A head must remain authorized successor');

  console.log('CLIMATECHAIN CONTRACT BEHAVIOR: PASS');
}finally{
  try{
    process.kill(-ganache.pid,'SIGTERM');
  }catch{
    try{ganache.kill('SIGTERM');}catch{}
  }
  await Promise.race([
    new Promise(resolve=>ganache.once('exit',resolve)),
    new Promise(resolve=>setTimeout(resolve,1500))
  ]);
}
