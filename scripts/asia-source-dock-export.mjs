#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {exportIEEEDock} from './lib/asia-source-dock.mjs';
const index=JSON.parse(readFileSync('research/asia-source-dock-2026-10-19/source-index.json','utf8'));
console.log(JSON.stringify(exportIEEEDock(index),null,2));
