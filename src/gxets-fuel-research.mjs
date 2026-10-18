/**
 * GX-ETS fuel combustion RESEARCH reference calculator.
 * Isolated from AG-005 by types, source and result schema.
 * Formula Q * HV * CF * 44/12, from user-supplied METI manual excerpt.
 * NO nonfuel/process/reductant/allowance/purchased electricity calculation.
 */
import {createHash} from 'node:crypto';
const abort=c=>{throw Error(c)};
const parse=(v,c)=>{
 if(!['string','number'].includes(typeof v)||
    typeof v==='number'&&!Number.isFinite(v)||
    !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(String(v)))abort(c);
 const s=String(v),[a,b='']=s.split('.');
 return {n:BigInt(a+b),d:10n**BigInt(b.length)};
};
const mul=(a,b)=>({n:a.n*b.n,d:a.d*b.d});
const output=v=>{
 const scaled=(v.n*1000000000n*2n+v.d)/(2n*v.d);
 const integer=scaled/1000000000n,decimal=(scaled%1000000000n).toString().padStart(9,'0').replace(/0+$/,'');
 return integer.toString()+(decimal?'.'+decimal:'');
};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function evaluateGxEtsFuel(input){
 if(!input||input.domain!=='GX_ETS'||input.source_type!=='FUEL_COMBUSTION')
  abort('GX_ETS_UNSUPPORTED_EMISSION_DOMAIN');
 const f=input.fuel;
 if(!f||!f.fuel_name||!['t','kL','1000_m3'].includes(f.quantity_unit)||
    !f.fuel_name.match(/^[\w-]{2,80}$/))abort('GX_ETS_FUEL_IDENTITY_INVALID');
 if(!input.factors||input.factors.official!==false||
    input.factors.provenance!=='SYNTHETIC'||
    input.factors.hv_unit!=='GJ_per_'+f.quantity_unit||
    input.factors.cf_unit!=='tC_per_GJ')abort('GX_ETS_FACTOR_SOURCE_OR_UNIT_MISMATCH');
 if(!input.boundary||input.boundary.direct_emission!==true||
    input.boundary.purchased_electricity!==false||
    input.boundary.industrial_process!==false||
    input.boundary.organizational_boundary_reviewed!==true)
  abort('GX_ETS_SCOPE_BOUNDARY_REVIEW_REQUIRED');
 const q=parse(f.quantity,'GX_ETS_FUEL_QUANTITY_INVALID');
 const hv=parse(input.factors.hv,'GX_ETS_HEAT_VALUE_INVALID');
 const cf=parse(input.factors.cf,'GX_ETS_CARBON_FACTOR_INVALID');
 if(q.n<=0n||hv.n<=0n||cf.n<=0n)abort('GX_ETS_NONPOSITIVE_FACTOR');
 const net=mul(mul(mul(q,hv),cf),{n:44n,d:12n});
 const result={
  domain:'GX_ETS',source_type:'FUEL_COMBUSTION',value_kind:'METHOD_CALCULATION',
  status:'RESEARCH_ONLY',fuel_name:f.fuel_name,
  formula:'fuel_quantity * heating_value_GJ_per_unit * carbon_factor_tC_per_GJ * 44/12',
  indicative_tco2:output(net),
  exclusions:['PURCHASED_ELECTRICITY','REDUCTANT','INDUSTRIAL_PROCESS',
    'BYPRODUCT_FUEL','ALLOWANCE_BALANCE','J_CREDIT_AG005'],
  official_reportable_tco2:null,third_party_verified:false,certification_allowed:false
 };
 return {...result,result_sha256:digest(result)};
}
export function compareGxEtsBoundary(previous,current){
 if(previous?.domain!=='GX_ETS'||current?.domain!=='GX_ETS')abort('GX_ETS_DOMAIN_MISMATCH');
 const stable=JSON.stringify(previous.boundary)===JSON.stringify(current.boundary);
 return {domain:'GX_ETS',status:stable?'UNCHANGED':'HUMAN_REVIEW_REQUIRED',
   recalculation_required:!stable,official_reporting_impact:null};
}
