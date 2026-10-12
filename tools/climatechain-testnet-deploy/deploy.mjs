#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import solc from 'solc';
import {ethers} from 'ethers';

function fail(message){
  console.error('CLIMATECHAIN_DEPLOY_FAIL: '+message);
  process.exit(1);
}
function run(cmd,args,options={}){
  const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024,...options});
  if(r.error) fail(cmd+' failed: '+r.error.message);
  if(r.status!==0) fail(cmd+' failed: '+String(r.stderr||r.stdout||'').trim());
  return r.stdout.trim();
}
function sourceAt(commit,file){
  return run('git',['show',commit+':'+file]);
}
function env(name){
  const value=process.env[name];
  if(!value) fail(name+' is required');
  return value;
}
function assertHex32(label,value){
  if(!/^0x[a-fA-F0-9]{64}$/.test(value||'')) fail(label+' must be bytes32');
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

const rpcUrl=env('RPC_URL');
const privateKey=env('PRIVATE_KEY');
const networkName=env('NETWORK_NAME');
const explorerBase=env('EXPLORER_BASE_URL').replace(/\/$/,'');
const expectedChainId=process.env.EXPECTED_CHAIN_ID ? Number(process.env.EXPECTED_CHAIN_ID) : null;

if(!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) fail('PRIVATE_KEY must be a 32-byte 0x-prefixed hex key');

const repoRoot=run('git',['rev-parse','--show-toplevel']);
process.chdir(repoRoot);
const sourceCommit=run('git',['rev-parse','HEAD']);

const dirty=run('git',['status','--porcelain']);
if(dirty) fail('working tree must be clean before deployment');

const contractSource=sourceAt(sourceCommit,'contracts/NaFTMRVAnchor.sol');
const compilerInput={
  language:'Solidity',
  sources:{'NaFTMRVAnchor.sol':{content:contractSource}},
  settings:{
    optimizer:{enabled:false,runs:200},
    outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}
  }
};
const output=JSON.parse(solc.compile(JSON.stringify(compilerInput)));
const compileErrors=(output.errors||[]).filter(x=>x.severity==='error');
if(compileErrors.length) fail('solc errors: '+compileErrors.map(x=>x.formattedMessage||x.message).join('\n'));
const artifact=output.contracts?.['NaFTMRVAnchor.sol']?.NaFTMRVAnchor;
if(!artifact) fail('NaFTMRVAnchor artifact missing');
const abi=artifact.abi;
const bytecode='0x'+artifact.evm.bytecode.object;
if(!/^0x[a-fA-F0-9]+$/.test(bytecode)||bytecode==='0x') fail('compiled bytecode missing');

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
  vm.runInContext(sourceAt(sourceCommit,file),planContext,{filename:file});
}
const plan=vm.runInContext('buildClimateChainAnchorPlan(runClimateChainImpact())',planContext);
for(const [label,entry] of [['genesis',plan.genesis],['successor',plan.successor]]){
  assertHex32(label+'.claim_id_hash',entry.claim_id_hash);
  assertHex32(label+'.package_hash',entry.package_hash);
  assertHex32(label+'.methodology_hash',entry.methodology_hash);
  assertHex32(label+'.previous_package_hash',entry.previous_package_hash);
}
if(plan.successor.previous_package_hash.toLowerCase()!==plan.genesis.package_hash.toLowerCase()) {
  fail('successor does not point to genesis');
}

const provider=new ethers.JsonRpcProvider(rpcUrl);
const network=await provider.getNetwork();
const chainId=Number(network.chainId);
if(expectedChainId!==null && chainId!==expectedChainId){
  fail('chain id mismatch: expected '+expectedChainId+' got '+chainId);
}

const wallet=new ethers.Wallet(privateKey,provider);
console.log('source_commit:',sourceCommit);
console.log('network:',networkName);
console.log('chain_id:',chainId);
console.log('signer:',wallet.address);
console.log('P1:',plan.genesis.package_hash);
console.log('P2:',plan.successor.package_hash);

let balance=0n;
const balanceAttempts=12;
for(let attempt=1; attempt<=balanceAttempts; attempt++){
  balance=await provider.getBalance(wallet.address);
  if(balance>0n) break;
  if(attempt<balanceAttempts){
    console.log('balance_wait_attempt:',attempt+'/'+balanceAttempts,'(still zero; retrying in 5s)');
    await sleep(5000);
  }
}
if(balance===0n){
  console.log('balance_diagnostics: checking multiple Sepolia RPCs');
  const diagnosticRpcs=[
    rpcUrl,
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://rpc.sepolia.org'
  ];
  const seen=new Set();
  for(const url of diagnosticRpcs){
    if(seen.has(url)) continue;
    seen.add(url);
    try{
      const p=new ethers.JsonRpcProvider(url);
      const [b,block]=await Promise.all([p.getBalance(wallet.address),p.getBlockNumber()]);
      console.log('balance_rpc:',url,'balance_wei:',b.toString(),'block:',block);
    }catch(err){
      console.log('balance_rpc:',url,'error:',String(err?.message||err));
    }
  }
  fail('signer has zero native testnet balance after waiting 55s across Sepolia checks; the faucet did not fund this exact Sepolia address yet');
}
console.log('balance_wei:',balance.toString());

const factory=new ethers.ContractFactory(abi,bytecode,wallet);
console.log('deploying NaFTMRVAnchor...');
const contract=await factory.deploy();
const deployTx=contract.deploymentTransaction();
if(!deployTx) fail('deployment transaction missing');
await contract.waitForDeployment();
const contractAddress=await contract.getAddress();
const deployReceipt=await deployTx.wait();
if(!deployReceipt||deployReceipt.status!==1) fail('deployment reverted');
console.log('contract:',contractAddress);
console.log('deploy_tx:',deployTx.hash);

const writer=await contract.anchorWriter();
if(writer.toLowerCase()!==wallet.address.toLowerCase()) fail('anchorWriter is not deployer');

async function anchor(label,entry){
  console.log('submitting '+label+'...');
  const tx=await contract.anchorPackage(
    entry.claim_id_hash,
    entry.package_hash,
    entry.methodology_hash,
    entry.previous_package_hash
  );
  const receipt=await tx.wait();
  if(!receipt||receipt.status!==1) fail(label+' transaction reverted');
  console.log(label+'_tx:',tx.hash);
  return tx.hash;
}

const genesisTx=await anchor('genesis',plan.genesis);
const successorTx=await anchor('successor',plan.successor);

const head=await contract.headByClaim(plan.successor.claim_id_hash);
if(head.toLowerCase()!==plan.successor.package_hash.toLowerCase()) fail('final headByClaim != P2');

const record={
  schema:'naft-climatechain-testnet-record-1',
  status:'VERIFIED_TESTNET',
  network:networkName,
  chain_id:chainId,
  contract_address:contractAddress,
  deploy_tx_hash:deployTx.hash,
  genesis_tx_hash:genesisTx,
  successor_tx_hash:successorTx,
  explorer_base_url:explorerBase,
  source_commit:sourceCommit,
  compiler:'solc 0.8.24',
  verified_at:new Date().toISOString(),
  boundary:'Blockchain witnesses package lineage only; it does not certify climate truth, methodology eligibility, registry acceptance, or carbon-credit issuance.'
};

const outDir=path.join(repoRoot,'.climatechain-output');
fs.mkdirSync(outDir,{recursive:true});
const recordPath=path.join(outDir,'verified-testnet-record.json');
fs.writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n',{mode:0o600});

console.log('waiting briefly before read-only verification...');
await sleep(1500);
const verify=spawnSync(process.execPath,['scripts/verify-climatechain-testnet.mjs'],{
  cwd:repoRoot,
  env:{
    ...process.env,
    RPC_URL:rpcUrl,
    TESTNET_RECORD_JSON:JSON.stringify(record)
  },
  encoding:'utf8',
  maxBuffer:16*1024*1024
});
if(verify.status!==0){
  console.error(verify.stdout||'');
  console.error(verify.stderr||'');
  fail('read-only verifier rejected the deployed lineage');
}
process.stdout.write(verify.stdout||'');

console.log('VERIFIED_TESTNET record written to: '+recordPath);
console.log('contract_explorer:',explorerBase+'/address/'+contractAddress);
console.log('deploy_explorer:',explorerBase+'/tx/'+deployTx.hash);
console.log('P1_explorer:',explorerBase+'/tx/'+genesisTx);
console.log('P2_explorer:',explorerBase+'/tx/'+successorTx);
console.log('Next: copy the generated record into src/climatechain-testnet-record.js and commit it only after reviewing these explorer links.');
