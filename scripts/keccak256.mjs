#!/usr/bin/env node
'use strict';
// Dependency-free Ethereum Keccak-256, NOT NIST SHA3-256.
// Verified with published Keccak vectors; see tests/keccak.test.mjs.
// This module never sends RPC requests and has no signing capabilities.
const MASK=(1n<<64n)-1n;
const ROUND_CONSTANTS=[
  0x0000000000000001n,0x0000000000008082n,0x800000000000808an,0x8000000080008000n,
  0x000000000000808bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,
  0x000000000000008an,0x0000000000000088n,0x0000000080008009n,0x000000008000000an,
  0x000000008000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,
  0x8000000000008002n,0x8000000000000080n,0x000000000000800an,0x800000008000000an,
  0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n
];
const ROTATION=[
  0,1,62,28,27,
  36,44,6,55,20,
  3,10,43,25,39,
  41,45,15,21,8,
  18,2,61,56,14
];
function rotateLeft(word,n){
  if(n===0)return word;
  const b=BigInt(n);
  return ((word<<b)|(word>>(64n-b)))&MASK;
}
function permute1600(state){
  for(const rc of ROUND_CONSTANTS){
    const column=new Array(5),delta=new Array(5),rotated=new Array(25).fill(0n);
    for(let x=0;x<5;x++)
      column[x]=state[x]^state[x+5]^state[x+10]^state[x+15]^state[x+20];
    for(let x=0;x<5;x++)
      delta[x]=column[(x+4)%5]^rotateLeft(column[(x+1)%5],1);
    for(let x=0;x<5;x++)for(let y=0;y<5;y++)
      state[x+5*y]^=delta[x];
    for(let x=0;x<5;x++)for(let y=0;y<5;y++)
      rotated[y+5*((2*x+3*y)%5)]=rotateLeft(state[x+5*y],ROTATION[x+5*y]);
    for(let x=0;x<5;x++)for(let y=0;y<5;y++)
      state[x+5*y]=rotated[x+5*y]^((~rotated[(x+1)%5+5*y])&rotated[(x+2)%5+5*y]);
    state[0]^=rc;
  }
}
export function keccak256Bytes(bytes){
  const data=bytes instanceof Uint8Array?bytes:Uint8Array.from(bytes);
  const rate=136;
  const padded=new Uint8Array(Math.ceil((data.length+2)/rate)*rate);
  padded.set(data);
  padded[data.length]^=0x01; // Ethereum legacy Keccak domain separator
  padded[padded.length-1]^=0x80;
  const state=new Array(25).fill(0n);
  for(let start=0;start<padded.length;start+=rate){
    for(let i=0;i<rate;i++)
      state[i>>3]^=BigInt(padded[start+i])<<BigInt(8*(i%8));
    permute1600(state);
  }
  const out=new Uint8Array(32);
  for(let i=0;i<32;i++)
    out[i]=Number((state[i>>3]>>BigInt(8*(i%8)))&0xffn);
  return out;
}
export function keccak256Utf8(value){
  if(typeof value!=='string')throw new TypeError('keccak256Utf8 expects a string');
  return '0x'+Buffer.from(keccak256Bytes(Buffer.from(value,'utf8'))).toString('hex');
}
