'use strict';
// Physical LOC is intentionally reported separately from assertions and fixture size.
const fs=require('fs'),vm=require('vm'),cp=require('child_process');
const files=cp.execFileSync('git',['ls-files','*.js','*.html','*.sh','*.py'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const lines=paths=>paths.reduce((n,p)=>n+fs.readFileSync(p,'utf8').split('\n').length-1,0);
const context=vm.createContext({TextEncoder});
vm.runInContext(fs.readFileSync('src/mrv-core.js','utf8')+'\n'+fs.readFileSync('src/mrv-ui.js','utf8'),context);
const data=vm.runInContext('seedDB()',context);
const after={baseline_commit:JSON.parse(fs.readFileSync('reports/baseline.json','utf8')).commit,loc_definition:'physical lines including blank/comments; tracked JS/HTML/shell/Python; excludes docs and JSON fixtures',runtime_loc:lines(files.filter(p=>p.startsWith('src/')||p.endsWith('.html'))),code_test_tooling_loc:lines(files),executable_routes:Array.from(context.ROUTES),domain_collections:Object.keys(data).filter(k=>Array.isArray(data[k])),roles:Array.from(new Set(data.users.map(u=>u.role)))};
fs.writeFileSync('reports/size-after.json',JSON.stringify(after,null,2)+'\n');console.log(JSON.stringify(after));
