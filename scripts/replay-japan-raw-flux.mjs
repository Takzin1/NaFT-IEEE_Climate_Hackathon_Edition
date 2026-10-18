#!/usr/bin/env node
import {readFileSync,statSync} from 'node:fs';
import {replayFlux} from './lib/japan-raw-flux.mjs';
try{
 const a=process.argv.slice(2);
 if(a.length!==4||a[0]!=='--manifest'||a[2]!=='--csv')
  throw Error('USAGE: node scripts/replay-japan-raw-flux.mjs --manifest path.json --csv path.csv');
 const m=statSync(a[1]),c=statSync(a[3]);
 if(!m.isFile()||!c.isFile()||m.size>50000||c.size>2000000)throw Error('INPUT_FILE_TOO_LARGE_OR_NOT_REGULAR');
 const manifest=JSON.parse(readFileSync(a[1],'utf8'));
 console.log(JSON.stringify(replayFlux(readFileSync(a[3]),manifest),null,2));
}catch(e){console.error('RAW_REPLAY_BLOCKED:'+e.message);process.exitCode=1;}
