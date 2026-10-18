#!/usr/bin/env node
/** Offline Asia research replay. No remote fetching, credit issuance or chain writes. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectAsiaReferences,inventoryIpcc2019Replay} from '../src/asia-mrv-research.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
  const args=process.argv.slice(2);
  if(args.length!==1 || !['inspect','ipcc'].includes(args[0]))
    throw Error('USAGE: node scripts/asia-mrv-research.mjs inspect|ipcc');
  if(args[0]==='ipcc'){
    process.stdout.write(JSON.stringify(inventoryIpcc2019Replay(),null,2)+'\n');
  }else{
    const p=path.join(root,'data/asia-mrv-research-2026-10-18/reference-cases.json');
    const data=fs.readFileSync(p,'utf8');
    if(Buffer.byteLength(data)>60000)throw Error('ASIA_FIXTURE_SIZE_INVALID');
    process.stdout.write(JSON.stringify(inspectAsiaReferences(JSON.parse(data)),null,2)+'\n');
  }
}catch(e){
  console.error('ASIA_MRV_RESEARCH_FAIL:'+e.message);
  process.exitCode=1;
}
