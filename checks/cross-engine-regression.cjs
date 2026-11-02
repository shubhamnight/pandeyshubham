const assert=require('node:assert/strict'),pw=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const fs=require('node:fs'),path=require('node:path');
const {profiles,galleries,enter,hobbies,open,close,save}=require('./helpers/site.cjs');
(async()=>{const results=[],failures=[];
 const apps=[['chrome','chromium',process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'],['edge','chromium',process.env.EDGE_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],['opera','chromium',process.env.OPERA_EXECUTABLE||path.join(process.env.LOCALAPPDATA||'C:/Users/Hp/AppData/Local','Programs/Opera GX/opera.exe')],['firefox','firefox'],['webkit','webkit']];
 for(const [app,engine,executablePath]of apps){
  if(process.env.REGRESSION_BROWSERS&&!process.env.REGRESSION_BROWSERS.split(',').includes(app))continue;
  if(engine==='chromium'&&(!executablePath||!fs.existsSync(executablePath))){failures.push({app,error:'Browser executable not installed: '+executablePath});continue;}
  let browser,currentPage,currentProfile;
  // Opera GX stalls its idle preparation in automated headless mode. Exercise
  // the real visible app instead; keep the same journey and assertions.
  const headed=app==='opera'||app==='firefox';
  try{browser=engine==='firefox'?await require('./helpers/firefox.cjs')(pw.firefox,{headless:false}):await pw[engine].launch({headless:!headed,...(executablePath?{executablePath}:{})});
  for(const [name,width,height,touch]of profiles){
   const page=await browser.newPage({viewport:{width,height},hasTouch:touch,...(engine==='firefox'?{}:{isMobile:touch})}),errors=[],consoleErrors=[];currentPage=page;currentProfile=name;await page.bringToFront();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
   if(process.env.HISTORY_MUTATE_IMPORTMAP==='1')await page.route('**/',async route=>{const response=await route.fetch(),html=await response.text(),map=html.match(/<script type="importmap">.*?<\/script>/)[0];await route.fulfill({response,body:html.replace(map,'').replace('</body>',map+'</body>')});});
   if(process.env.HISTORY_MUTATE_FONT==='1'){const body=require('node:child_process').execFileSync('git',['show','2b6022d1513d53115ee078745b2832ecc29a4a03:assets/fonts/batman-forever-alternate.woff2']);await page.route('**/assets/fonts/batman-forever-alternate.woff2',route=>route.fulfill({contentType:'font/woff2',body}));}
   await enter(page,'#projects');assert.ok(await page.evaluate(()=>scrollY<2));
   await page.locator('.floating-nav a[href="#about"]').evaluate(e=>e.click());await page.waitForFunction(()=>document.querySelectorAll('.skill-shiny-button').length===14&&[...document.querySelectorAll('.skill-logo')].every(e=>e.complete&&e.naturalWidth));
   await hobbies(page);await page.waitForFunction(()=>[...document.querySelectorAll('.hobby-orbit')].every(e=>e.querySelectorAll('.hobby-image-surface:not(:empty)').length===3));
   const models=await page.locator('.hobby-orbit-center button').evaluateAll(es=>es.map(e=>({id:e.id,ready:e.dataset.hobbyCompiling==='false',fallback:e.dataset.hobbyModelFailed==='true'})));assert.ok(models.every(model=>model.ready&&!model.fallback),'normal browser journeys must render all four 3D models; fallback behavior is tested by the fault-injection suite');
   for(const entry of galleries){const dialog=await open(page,entry);const b=await dialog.boundingBox();assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=width+1&&b.y+b.height<=height+1);await close(page,dialog);}
   await page.locator('#contact').scrollIntoViewIfNeeded();await page.locator('#contact .social-link').first().waitFor();assert.equal(await page.locator('#contact .social-link').count(),5);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.evaluate(async()=>(await document.fonts.load('14px "Batman Forever"','BATMAN')).length),1,'the original Batman typeface decodes');assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[],'normal browser journeys must not hide caught runtime or font errors');
   results.push({app,engine,mode:headed?'headed':'headless',version:browser.version(),profile:name,skills:14,galleries:4,models,errors,consoleErrors});await save('browser-engines',{results,failures});console.log(app+' '+name+' core journey passed');await page.close();
  }}catch(error){const state=currentPage&&!currentPage.isClosed()?await currentPage.evaluate(()=>({url:location.href,hidden:document.hidden,body:document.body.className,scroll:scrollY,hobbies:document.querySelector('#projects')?.hobbyEntranceProgress,models:[...document.querySelectorAll('.hobby-orbit-center button')].map(e=>({id:e.id,data:{...e.dataset}}))})).catch(()=>null):null;failures.push({app,profile:currentProfile,error:error.stack||error.message,state});console.error(app+': '+error.message);console.log(JSON.stringify(state));}finally{await browser?.close();}
 }
 await save('browser-engines',{results,failures});assert.deepEqual(failures,[],'Every requested browser must complete its journey; failures are not skipped');
})().catch(error=>{console.error(error);process.exitCode=1;});
