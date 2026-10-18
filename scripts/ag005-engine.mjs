#!/usr/bin/env node
// AG-005 research-only command line runner. All numbers in "example" are invented.
import {referenceOrganicEF,referenceDrainageClass,referenceMidseasonEligibility,
  referenceAreaAllocation,referenceCarbonCalculation,referenceFactorSelector,
  ag005DependencyDiff} from '../src/ag005-v33-reference-math.mjs';
import {evaluateGxEtsFuel} from '../src/gxets-fuel-research.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  evaluateAg005Scenario,compareAg005Scenarios,verifyAg005Report
} from '../src/ag005-research-engine.mjs';

function load(p){
  const stat=fs.statSync(p);
  if(!stat.isFile()||stat.size<2||stat.size>500000)
    throw Error('AG005_FILE_SIZE_INVALID');
  return JSON.parse(fs.readFileSync(p,'utf8'));
}
function example(){
  const id='AG005-SYNTHETIC-F3-TRAINING',fieldId='SYNTHETIC-FIELD-F3';
  const evidence=['baseline_history','objective_start_end','field_area','production_record']
    .map((category,i)=>{
      const content='Synthetic training document '+(i+1)+' for '+category+
        '. NOT REAL FIELD OBSERVATION OR VERIFIED AG-005 COMPLIANCE.';
      return {id:'SYN-EV-'+(i+1),category,scenario_id:id,field_id:fieldId,
        content,sha256:crypto.createHash('sha256').update(content,'utf8').digest('hex')};
    });
  return {
    schema:'naft-ag005-scenario-1',scenario_id:id,origin:'SYNTHETIC_EXAMPLE',
    method:{id:'AG-005',version:'3.1-reference',confirmed_adopted:false,
      original_bytes_verified:false},
    field:{id:fieldId,area_ha:1.5},
    baseline:[{year:2023,start:'2023-07-01',end:'2023-07-14'},
      {year:2024,start:'2024-07-01',end:'2024-07-14'}],
    project:{year:2025,start:'2025-07-01',end:'2025-07-21'},
    factors:{mode:'ILLUSTRATIVE',official:false,
      baseline_ch4_kg_ha_season:180,project_ch4_kg_ha_season:120,
      gwp100_ch4:28,source:{status:'SYNTHETIC',reviewed_approved_version:false,
        citation:'urn:naft:synthetic:ag005-factor-demo:1'}},
    evidence,unsupported_special_conditions:[]
  };
}
try {
  const [command,...files]=process.argv.slice(2);
  let result;
  if(command==='example'&&files.length===0)result=example();
  else if(command==='evaluate'&&files.length===1)
    result=evaluateAg005Scenario(load(files[0]));
  else if(command==='compare'&&files.length===2)
    result=compareAg005Scenarios(load(files[0]),load(files[1]));
  else if(command==='verify'&&files.length===2)
    result=verifyAg005Report(load(files[0]),load(files[1]));
  else if(command==='v33-organic'&&files.length===1){
    const data=load(files[0]);result=referenceOrganicEF(data.factors,data.organic);
  }
  else if(command==='v33-drainage'&&files.length===1)
    result=referenceDrainageClass(load(files[0]));
  else if(command==='v33-days'&&files.length===1)
    result=referenceMidseasonEligibility(load(files[0]));
  else if(command==='v33-allocate'&&files.length===1)
    result=referenceAreaAllocation(load(files[0]));
  else if(command==='v33-factor'&&files.length===1){
    const data=load(files[0]);result=referenceFactorSelector(data.table,data.keys);
  }
  else if(command==='v33-calc'&&files.length===1)
    result=referenceCarbonCalculation(load(files[0]));
  else if(command==='v33-diff'&&files.length===2)
    result=ag005DependencyDiff(load(files[0]),load(files[1]));
  else if(command==='gxets-fuel'&&files.length===1)
    result=evaluateGxEtsFuel(load(files[0]));
  else throw Error('USAGE: node scripts/ag005-engine.mjs example | evaluate INPUT.json | compare BEFORE.json AFTER.json | verify INPUT.json REPORT.json | v33-organic|v33-drainage|v33-days|v33-allocate|v33-factor|v33-calc INPUT.json | v33-diff BEFORE.json AFTER.json | gxets-fuel INPUT.json');
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
} catch(e) {
  console.error('AG005_ENGINE_FAIL:'+e.message);
  process.exitCode=1;
}
