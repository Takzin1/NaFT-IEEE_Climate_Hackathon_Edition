// Real post-deploy GitHub Pages judge-smoke. HTTPS, assets, Chrome DOM, hash router.
// Runs ONLY after the independent repository's Public Pages deploy has succeeded.
// Does not sign, make blockchain transactions, read secrets, or assert climate truth.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const site='https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/';
const delay=ms=>new Promise(done=>setTimeout(done,ms));
const requirements=[
  ['', '<html lang="en">'],
  ['naft-app.html','src/climatechain-demo.js'],
  ['src/climatechain-demo.js','climateChainHeader'],
  ['src/climatechain-theme.css','.climate-hero'],
  ['src/climatechain-testnet-record.js','VERIFIED_TESTNET'],
  ['src/mrv-ui.js','CLIMATECHAIN_ROUTE'],
  ['docs/assets/naft-climatechain-architecture.svg','OFF-CHAIN'],
  ['favicon.svg','<svg']
];
async function checkFiles(){
  for(const [path,marker] of requirements){
    const response=await fetch(new URL(path,site),{redirect:'follow',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('PUBLIC_ASSET_HTTP_'+response.status+':'+path);
    const content=await response.text();
    if(!content.includes(marker))throw Error('PUBLIC_ASSET_MISSING_MARKER:'+path+':'+marker);
  }
}
async function awaitDeployment(){
  let last;
  for(let i=0;i<20;i++){
    try {await checkFiles();console.log('PUBLIC_ASSETS: PASS (8/8)');return;}
    catch(e){last=e;console.log('Pages propagation pending '+(i+1)+'/20: '+e.message);if(i<19)await delay(5000);}
  }
  throw last;
}
const chromeNames=['google-chrome-stable','google-chrome','chromium','chromium-browser'];
const chrome=chromeNames.find(cmd=>spawnSync('which',[cmd],{stdio:'ignore'}).status===0);
if(!chrome)throw Error('CHROME_NOT_INSTALLED');
await awaitDeployment();

const dir=mkdtempSync(join(tmpdir(),'naft-ieee-public-'));
const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1','--remote-debugging-port=9234',
  '--user-data-dir='+dir,site+'#/climatechain'];
const child=spawn(chrome,args,{stdio:'ignore'});
let ws;
try{
  let page;
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw Error('PUBLIC_CHROME_EXITED:'+child.exitCode);
    try{
      const response=await fetch('http://127.0.0.1:9234/json/list',{signal:AbortSignal.timeout(2500)});
      const pages=await response.json();
      page=pages.find(p=>p.type==='page'&&p.url.includes('naft-app.html'));
      if(page)break;
    }catch(e){}
    await delay(300);
  }
  if(!page)throw Error('PUBLIC_BROWSER_NOT_RENDERED_AFTER_REDIRECT');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  let id=1;const pending=new Map(),errors=[];
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(event.data);
    if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params?.exceptionDetails?.text||'runtime exception');
    if(msg.method==='Log.entryAdded'&&msg.params?.entry?.level==='error')errors.push(msg.params.entry.text);
    if(!msg.id)return;
    const p=pending.get(msg.id);if(!p)return;
    pending.delete(msg.id);
    if(msg.error)p.reject(Error(msg.error.message||'CDP error'));else p.resolve(msg.result);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const request=id++;pending.set(request,{resolve,reject});ws.send(JSON.stringify({id:request,method,params}));
  });
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw Error('PUBLIC_BROWSER_EVALUATION_FAILED:'+result.exceptionDetails.text);
    return result.result?.value;
  };
  const until=async(expression,label)=>{
    for(let i=0;i<80;i++){if(await evaluate(expression))return;await delay(250);}
    throw Error('PUBLIC_BROWSER_TIMEOUT:'+label);
  };
  await send('Runtime.enable');await send('Log.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  await send('Page.reload',{ignoreCache:true});
  await until("document.body && document.querySelector('[data-action=\"climatechain-run\"]')!==null",'public direct ClimateChain route');
  const before=await evaluate("({lang:document.documentElement.lang,route:location.hash,bodyPage:document.body.dataset.page,scroll:document.documentElement.scrollWidth,width:innerWidth,badge:document.body.innerText.includes('VERIFIED TESTNET'),button:document.querySelector('[data-action=\"climatechain-run\"]')!==null})");
  if(before.lang!=='en'||before.route!=='#/climatechain'||before.bodyPage!=='climatechain'||before.scroll>before.width||!before.badge||!before.button)throw Error('PUBLIC_MOBILE_JUDGE_ROUTE:'+JSON.stringify(before));
  await evaluate("document.querySelector('[data-action=\"climatechain-run\"]').click();true");
  await until("document.querySelectorAll('.climate-impact .metric').length===5",'public computed impact');
  // The architecture diagram is intentionally lazy-loaded below the first viewport.
  // Reproduce a real judge scrolling to it instead of falsely treating unloaded
  // offscreen media as a missing asset.
  await evaluate("document.querySelector('.climate-architecture img').scrollIntoView({block:'center'});true");
  await until("(()=>{const img=document.querySelector('.climate-architecture img');return !!img&&img.complete&&img.naturalWidth===1600&&img.naturalHeight===760})()",'lazy architecture SVG loaded after scrolling');
  const data=await evaluate("({metrics:Array.from(document.querySelectorAll('.climate-impact .metric')).map(e=>e.querySelector('strong').textContent.trim()),scenario:Array.from(document.querySelectorAll('.climate-scenario-result strong')).map(e=>e.textContent.trim()),diagram:document.querySelector('.climate-architecture img')?.complete&&document.querySelector('.climate-architecture img')?.naturalWidth===1600,scroll:document.documentElement.scrollWidth,width:innerWidth,txLinks:Array.from(document.querySelectorAll('.climate-chain-links a')).filter(e=>e.href.includes('sepolia.etherscan.io/tx/')).length})");
  if(JSON.stringify(data.metrics)!==JSON.stringify(['100','30','70','15','15'])||
    JSON.stringify(data.scenario)!==JSON.stringify(['100','30','70'])||!data.diagram||
    data.scroll>data.width||data.txLinks<2)throw Error('PUBLIC_COMPUTED_DEMO_MISMATCH:'+JSON.stringify(data));
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  const desktop=await evaluate("({scroll:document.documentElement.scrollWidth,width:innerWidth})");
  if(desktop.scroll>desktop.width)throw Error('PUBLIC_DESKTOP_HORIZONTAL_OVERFLOW:'+JSON.stringify(desktop));
  if(errors.length)throw Error('PUBLIC_BROWSER_ERRORS:'+JSON.stringify(errors));
  console.log('PUBLIC_BROWSER: PASS (direct route, 375px/1440px, live 100/30/70/15/15, P1/P2 links, SVG, no exceptions)');
}finally{
  if(ws&&ws.readyState===WebSocket.OPEN)ws.close();
  child.kill();
  rmSync(dir,{recursive:true,force:true});
}
