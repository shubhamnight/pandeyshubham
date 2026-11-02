// Isolate the shared stylesheet lifecycle from deliberate module/media failures.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {buildSync}=require('esbuild');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const script=buildSync({entryPoints:['lib/overlay-host.ts'],bundle:true,format:'iife',globalName:'OverlayStyleQA',write:false}).outputFiles[0].text;
(async()=>{
 const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'}),headless:true});
 const page=await browser.newPage(),errors=[],held=[];let mode='success';
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.route('**/__overlay-style-qa.html',route=>route.fulfill({contentType:'text/html',body:'<div id="host"></div>'}));
  await page.route('**/__overlay-style-qa.css*',route=>{
   if(mode==='hold'){held.push(route);return;}
   return route.fulfill({status:mode==='fail'?404:200,contentType:'text/css',body:'.qa-content{color:rgb(11,22,33)}'});
  });
  await page.goto(origin+'/__overlay-style-qa.html');await page.addScriptTag({content:script});
  await page.evaluate(()=>{
   window.qaRun=(name,signal)=>OverlayStyleQA.prepareOverlayHost(document.querySelector('#host'),{
    stylesheet:new URL('/__overlay-style-qa.css?'+name,location.href),containerClass:'qa-content',label:'QA',
   },signal);
  });
  assert.equal(await page.evaluate(async()=>{const {container}=await window.qaRun('success');return getComputedStyle(container).color;}),'rgb(11, 22, 33)');
  assert.equal(await page.evaluate(async()=>{const c=new AbortController();c.abort();try{await window.qaRun('pre-abort',c.signal);}catch(error){return error.name;}}),'AbortError');
  mode='hold';
  await page.evaluate(()=>{window.qaController=new AbortController();window.qaPending=window.qaRun('pending',window.qaController.signal).catch(error=>error.name);});
  await page.locator('#host link').waitFor({state:'attached'});
  assert.equal(await page.evaluate(async()=>{window.qaController.abort();return await window.qaPending;}),'AbortError');
  assert.equal(await page.locator('#host link').count(),0);
  for(const route of held.splice(0))await route.abort().catch(()=>{});
  mode='fail';
  assert.equal(await page.evaluate(async()=>{try{await window.qaRun('failed');}catch(error){return error.message;}}),'QA styles could not load.');
  mode='hold';
  assert.equal(await page.evaluate(async()=>{const original=setTimeout;window.setTimeout=(fn,ms)=>original(fn,Math.min(ms,25));try{await window.qaRun('timeout');}catch(error){return error.message;}finally{window.setTimeout=original;}}),'QA styles took too long to load.');
  assert.ok(await page.locator('#host link').evaluate(e=>e.onload===null&&e.onerror===null));
  for(const route of held.splice(0))await route.abort().catch(()=>{});
  mode='success';
  await page.evaluate(async()=>{window.qaShadow=document.querySelector('#host').shadowRoot;for(let i=0;i<8;i++)await window.qaRun('retry-'+i);});
  assert.equal(await page.locator('#host .qa-content').count(),1);
  assert.ok(await page.evaluate(()=>window.qaShadow===document.querySelector('#host').shadowRoot));
  assert.deepEqual(errors,[]);
  const results={stylesheetApplied:true,preAborted:true,abortDuringLoad:true,loadFailure:true,timeout:true,successfulRetries:8,reusedShadowRoot:true,errors};
  const out=path.resolve(process.env.AUDIT_OUTPUT||'output/overlay-style-lifecycle');await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'stylesheet-lifecycle.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
