const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const localServer=require('./helpers/local-server.cjs');
const path=require('node:path');
const mode=process.argv[2]||'after';
assert.ok(['before','after'].includes(mode),'Choose before or after for the installed dist build.');
const output=path.resolve('output/regressions/portfolio-performance');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const server=await localServer({cwd:process.cwd(),logFile:path.join(output,mode+'-server.log')});
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge'});
  const cold=[],scroll=[];
  for(let i=0;i<5;i++){
   const page=await browser.newPage({viewport:{width:393,height:873},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
   const forbidden=[];
   page.on('request',request=>{
    const name=new URL(request.url()).pathname;
    if(/intro-crowd|three\.module|(?:photography-camera|gaming-controller|travel-plane|music-walkman)\.js|photography-carousel|gaming-overlay|music-overlay|travel-overlay|\/(PHOTOGRAPHY|TRAVEL)\//.test(name))forbidden.push(name);
   });
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Network.enable');
   await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.addInitScript(()=>new PerformanceObserver(list=>{window.latestLcp=list.getEntries().at(-1)?.startTime;}).observe({type:'largest-contentful-paint',buffered:true}));
   await page.goto(server.origin,{waitUntil:'commit'});
   if(mode==='before')await page.locator('.portfolio-intro.show-play button').first().waitFor({state:'visible',timeout:40000});
   else await page.waitForFunction(()=>{const badge=document.querySelector('#home .badge img');return badge?.complete&&badge.naturalWidth&&document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('#home');});
   const row=await page.evaluate(()=>({readyMs:Math.round(performance.now()),lcpMs:Math.round(window.latestLcp||0)}));
   await page.waitForTimeout(1000);
   Object.assign(row,await page.evaluate(()=>{
    const resources=performance.getEntriesByType('resource');
    const navigation=performance.getEntriesByType('navigation')[0];
    const lcp=window.latestLcp||0;
    const critical=[navigation,...resources.filter(r=>r.transferSize&&r.responseEnd<=lcp)];
    return {lcpMs:Math.round(lcp),bytesByLcp:critical.reduce((sum,r)=>sum+r.transferSize,0),requestsByLcp:critical.length};
   }));
   row.forbidden=forbidden;
   cold.push(row);console.log(mode+' cold '+JSON.stringify(row));await page.close();
  }
  for(const [profile,width,height,touch]of [['desktop',1366,768,false],['phone',393,873,true],['tablet',820,1180,true]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:touch?2:1,isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:touch?4:1});
   await page.goto(server.origin,{waitUntil:'commit'});
   if(mode==='before'){
    await page.locator('.portfolio-intro.show-play button').first().click({timeout:40000});
    await page.locator('.portfolio-intro').waitFor({state:'detached'});
    await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
   }
   await page.locator('#playground').waitFor({state:'attached'});
   const row=await page.evaluate(()=>new Promise(resolve=>{
    const target=document.querySelector('#playground').getBoundingClientRect().top+scrollY-innerHeight*.15;
    const frames=[];
    const started=performance.now();let previous=started;
    function frame(now){
     frames.push(now-previous);previous=now;
     scrollTo(0,target*Math.min(1,(now-started)/4000));
     if(now-started<4000)requestAnimationFrame(frame);
     else resolve({frames:frames.length,over33:frames.filter(value=>value>33).length,maxMs:Math.round(Math.max(...frames))});
    }
    requestAnimationFrame(frame);
   }));
   const modelRequests=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/three\.module|(?:photography-camera|gaming-controller|travel-plane|music-walkman)\.js/.test(r.name)).length);
   const result={profile,...row,modelRequests};scroll.push(result);console.log(mode+' scroll '+JSON.stringify(result));await page.close();
  }
  fs.writeFileSync(path.join(output,mode+'.json'),JSON.stringify({cold,scroll},null,2));
  if(mode==='after'){
   const median=key=>cold.map(row=>row[key]).toSorted((a,b)=>a-b)[2];
   assert.ok(cold.every(row=>row.forbidden.length===0),'Cold entry cannot request intro crowd, models, gallery code or originals.');
   assert.ok(scroll.every(row=>row.modelRequests===0),'Ordinary scroll cannot prepare a 3D model.');
   assert.ok(median('lcpMs')>0&&median('lcpMs')<=2500,'Median LCP exceeds 2.5 seconds.');
   assert.ok(median('bytesByLcp')<=300*1024&&median('requestsByLcp')<=30,'Median LCP payload exceeds the transfer budget.');
  }
 }finally{await browser?.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
