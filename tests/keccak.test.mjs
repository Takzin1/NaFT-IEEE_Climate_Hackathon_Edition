#!/usr/bin/env node
'use strict';
import assert from 'node:assert/strict';
import {keccak256Utf8} from '../scripts/keccak256.mjs';
const cases=[
  ['', 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'],
  ['abc','4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45'],
  ['transfer(address,uint256)','a9059cbb2ab09eb219583f4a59a5d0623ade346d962bcd4e46b11da047c9049b']
];
for(const [input,expected] of cases){
  assert.equal(keccak256Utf8(input),'0x'+expected,'Ethereum Keccak-256 vector '+JSON.stringify(input));
}
assert.notEqual(keccak256Utf8(''), '0xa7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a',
                'must not confuse Ethereum Keccak with FIPS SHA3');
console.log('KECCAK RESULT: 4 passed, 0 failed');
