#!/usr/bin/env node
import {readFileSync,statSync} from 'node:fs';
import {replayObservationSeries} from './lib/japan-observation-adapters.mjs';
const BASE='research/japan-observation-adapters-2026-10-19/';
try {
 const args=process.argv.slice(2);
 if(args.length!==1||!['daily','eddy','interval','umol','carbon'].includes(args[0]))
  throw Error('USAGE: node scripts/replay-japan-observation-adapters.mjs daily|eddy|interval');
 const key=args[0];
 const manifestFile=BASE+key+'.manifest.json',dataFile=BASE+key+'.csv';
 if(statSync(manifestFile).size>50000||statSync(dataFile).size>2000000)throw Error('FILE_SIZE_LIMIT');
 const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
 console.log(JSON.stringify(replayObservationSeries(readFileSync(dataFile),manifest),null,2));
} catch(error){console.error('OBSERVATION_REPLAY_BLOCKED:'+error.message);process.exitCode=1;}
