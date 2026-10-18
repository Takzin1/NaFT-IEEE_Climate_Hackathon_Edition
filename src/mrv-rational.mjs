// Exact base-10 rational arithmetic for unapproved MRV research formula fixtures.
// String decimal inputs ONLY: no floating-point rounding or implicit conversion.
const ERR=(code)=>{throw new Error(code);};
const abs=n=>n<0n?-n:n;
function gcd(a,b){a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b];}return a||1n;}
export function rational(n,d=1n){
  n=BigInt(n);d=BigInt(d);
  if(d===0n)ERR('DIVIDE_BY_ZERO');
  if(d<0n){n=-n;d=-d;}
  const g=gcd(n,d);
  return Object.freeze({n:n/g,d:d/g});
}
export function dec(value,unit='DECIMAL'){
  if(typeof value!=='string'||! /^-?(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,12})?$/.test(value))
    ERR('DECIMAL_STRING_REQUIRED:'+unit);
  const neg=value.startsWith('-'),v=neg?value.slice(1):value;
  const [whole,frac='']=v.split('.');
  const d=10n**BigInt(frac.length);
  return rational((neg?-1n:1n)*BigInt(whole+frac),d);
}
export const add=(a,b)=>rational(a.n*b.d+b.n*a.d,a.d*b.d);
export const sub=(a,b)=>rational(a.n*b.d-b.n*a.d,a.d*b.d);
export const mul=(a,b)=>rational(a.n*b.n,a.d*b.d);
export const div=(a,b)=>rational(a.n*b.d,a.d*b.n);
export const cmp=(a,b)=>a.n*b.d<b.n*a.d?-1:a.n*b.d>b.n*a.d?1:0;
export const min=(a,b)=>cmp(a,b)<=0?a:b;
export const max=(a,b)=>cmp(a,b)>=0?a:b;
export const ceil=a=>a.n>=0n?(a.n+a.d-1n)/a.d:-((-a.n)/a.d);
export function exactDecimal(x){
  let t=x.d,p2=0,p5=0;
  while(t%2n===0n){t/=2n;p2++;}
  while(t%5n===0n){t/=5n;p5++;}
  if(t!==1n)return null;
  const places=Math.max(p2,p5);
  if(places>48)return null;
  const digits=abs(x.n)*(10n**BigInt(places))/x.d;
  const v=digits.toString().padStart(places+1,'0');
  const raw=places?(v.slice(0,-places)+'.'+v.slice(-places)) : v;
  return (x.n<0n?'-':'')+raw.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
}
export const repr=x=>Object.freeze({numerator:x.n.toString(),denominator:x.d.toString(),
  decimal_exact:exactDecimal(x)});
export function guardedValue(value,lo,hi,name){
  const v=dec(value,name);
  if(cmp(v,dec(lo))<0||cmp(v,dec(hi))>0)ERR('DECIMAL_OUT_OF_RANGE:'+name);
  return v;
}
