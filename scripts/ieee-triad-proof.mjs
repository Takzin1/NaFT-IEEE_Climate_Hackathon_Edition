#!/usr/bin/env node
/**
 * Offline, source-bound three-pillar verification for IEEE judges.
 * This validates synthetic claim behavior and the reference/testnet record's
 * structural linkage, NOT live RPC responses or environmental correctness.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scripts=['mrv-core','methodology-packs','mrv-compiler','compiler-demo',
  'climatechain-testnet-record','climatechain-demo'];
const canonical=value=>{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')
    return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined)
      .map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value===undefined?null:value);
};
const digest=value=>crypto.createHash('sha256').update(canonical(value),'utf8').digest('hex');
function freshProof(){
  for(const name of scripts){
    const file=path.join(root,'src',name+'.js');
    vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
  }
  const proof=globalThis.buildClimateChainTriadProof(globalThis.runClimateChainImpact());
  const {proof_sha256,...data}=proof;
  if(proof_sha256!==digest(data))throw Error('SOURCE_DIGEST_MISMATCH');
  return proof;
}
try{
  const [mode,target,...extra]=process.argv.slice(2);
  if(!['generate','verify'].includes(mode)||!target||extra.length)
    throw Error('USAGE: node scripts/ieee-triad-proof.mjs generate|verify PATH.json');
  const expected=freshProof();
  if(mode==='generate'){
    fs.writeFileSync(target,JSON.stringify(expected,null,2)+'\n',{flag:'w'});
    console.log('TRIAD_PROOF_GENERATED: '+expected.proof_sha256);
  }else{
    const stat=fs.statSync(target);
    if(!stat.isFile()||stat.size>1000000)throw Error('TRIAD_PROOF_SIZE_INVALID');
    const received=JSON.parse(fs.readFileSync(target,'utf8'));
    if(!received||received.schema!=='naft-ieee-triad-proof-1')
      throw Error('TRIAD_PROOF_SCHEMA_INVALID');
    const {proof_sha256,...body}=received;
    if(!/^[a-f0-9]{64}$/.test(proof_sha256||'')||digest(body)!==proof_sha256)
      throw Error('TRIAD_PROOF_DIGEST_MISMATCH');
    if(canonical(received)!==canonical(expected))
      throw Error('TRIAD_SOURCE_BOUND_REPLAY_MISMATCH');
    console.log('TRIAD_PROOF_VERIFIED: '+proof_sha256+
      ' | tamper blocked | 100 full recompiles | local P1/P2 lineage reference');
    console.log('On-chain state not checked by this command. Use bash scripts/verify-live-sepolia.sh.');
  }
}catch(error){console.error('TRIAD_PROOF_FAILED: '+error.message);process.exitCode=1;}
