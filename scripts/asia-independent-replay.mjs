#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {ipccStageReplay} from '../src/ipcc-stage-reference.mjs';
import {phPrepareExplicitScope,phSyntheticMassConversion} from '../src/ph-jcm-explicit-boundary.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{
 if(process.argv.length!==2)throw Error('USAGE: node scripts/asia-independent-replay.mjs');
 const file=path.join(root,'research/asia-mrv-2026-10-18/ipcc-jcm-independent-cases.json');
 if(fs.statSync(file).size>100000)throw Error('FIXTURE_TOO_LARGE');
 const f=JSON.parse(fs.readFileSync(file,'utf8'));
 if(f.sources?.PH_AM004_1_0!=='https://www.jcm.go.jp/jc/wp-content/uploads/sites/3/JCM_PH_AM004_ver01.0.pdf')
   throw Error('PH_ORIGINAL_URL_UNVERIFIED');
 vm.runInThisContext(fs.readFileSync(path.join(root,'src/asia-mrv-compat.js'),'utf8'),{filename:'src/asia-mrv-compat.js'});
 const ph=f.ph.schedules.map(s=>{
   const checked=phPrepareExplicitScope({...f.ph.base,...s});
   const r=globalThis.naftAsiaPhAm004(checked.normalized_input);
   if(r.approved_jcm_credits!==null||r.approved_jcredit_credits!==null)throw Error('UNEXPECTED_CERTIFICATION');
   return {approach:s.approach,interval_years:s.measurement_interval_years,
      after_deduction_tco2e:r.research_net_after_tco2e.toFixed(9),ud:r.uncertainty_deduction.toFixed(2),official_output:null};
 });
 const opt=phPrepareExplicitScope({...f.ph.base,...f.ph.optional_reference,
    approach:'DIRECT_MEASUREMENT',measurement_interval_years:3});
 const optR=globalThis.naftAsiaPhAm004(opt.normalized_input);
 const converted=phSyntheticMassConversion(f.ph.mass_conversion);
 console.log(JSON.stringify({ipcc:ipccStageReplay(f),ph_synthetic:ph,
   optional_reference:{omitted:opt.reference_pump_optional_omitted,
     after_deduction_tco2e:optR.research_net_after_tco2e.toFixed(9),official_output:null},
   ph_mass_conversion:{ch4_tco2e:converted.ch4_tco2e.toFixed(9),
      n2o_tco2e:converted.n2o_tco2e.toFixed(9),pump_tco2:converted.pump_tco2.toFixed(9),
      total_tco2e:converted.total_tco2e.toFixed(9),official_output:null}},null,2));
}catch(e){console.error('ASIA_REPLAY_BLOCKED:'+e.message);process.exitCode=1;}
