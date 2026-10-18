#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {verifyAsianIEEEDock} from './ieee-asia-source-dock.mjs';
const dir='research/asia-source-dock-2026-10-19/';
const index=JSON.parse(readFileSync(dir+'source-index.json','utf8'));
const proof=JSON.parse(readFileSync(dir+'verified-ephemeral-acquisition.json','utf8'));
console.log(JSON.stringify(verifyAsianIEEEDock(index,proof),null,2));
