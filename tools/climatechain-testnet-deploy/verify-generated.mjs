#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function fail(message){
  console.error('CLIMATECHAIN_VERIFY_GENERATED_FAIL: '+message);
  process.exit(1);
}
function run(cmd,args,options={}){
  const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:16*1024*1024,...options});
  if(r.error) fail(cmd+' failed: '+r.error.message);
  if(r.status!==0) fail(cmd+' failed: '+String(r.stderr||r.stdout||'').trim());
  return r.stdout.trim();
}

const root=run('git',['rev-parse','--show-toplevel']);
process.chdir(root);

const recordPath=path.join(root,'.climatechain-output','verified-testnet-record.json');
if(!fs.existsSync(recordPath)) fail('missing '+recordPath+'; the prior deploy must have produced this file');

let record;
try{ record=JSON.parse(fs.readFileSync(recordPath,'utf8')); }
catch(e){ fail('invalid generated record JSON: '+e.message); }

if(record.status!=='VERIFIED_TESTNET') fail('generated record status is not VERIFIED_TESTNET');
if(record.chain_id!==11155111) fail('generated record is not Ethereum Sepolia');

const rpc=process.env.CLIMATECHAIN_VERIFY_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
console.log('record_source_commit:',record.source_commit);
console.log('record_contract:',record.contract_address);
console.log('record_deploy_tx:',record.deploy_tx_hash);
console.log('record_P1_tx:',record.genesis_tx_hash);
console.log('record_P2_tx:',record.successor_tx_hash);
console.log('verification_rpc:',rpc);

const child=spawnSync(process.execPath,['scripts/verify-climatechain-testnet.mjs'],{
  cwd:root,
  env:{...process.env,RPC_URL:rpc,TESTNET_RECORD_JSON:JSON.stringify(record)},
  encoding:'utf8',
  maxBuffer:16*1024*1024
});
process.stdout.write(child.stdout||'');
process.stderr.write(child.stderr||'');
if(child.status!==0) fail('generated record verification failed');

console.log('CLIMATECHAIN_VERIFY_GENERATED: PASS');
console.log('generated_record_json:');
console.log(JSON.stringify(record,null,2));
