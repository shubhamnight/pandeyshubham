const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000',output=path.resolve(process.env.AUDIT_OUTPUT||'output/final-audit/connection');
const {enter,hobbies,galleries,open}=require('./helpers/site.cjs');
async function contactReady(page){
 await page.locator('#contact canvas').waitFor({state:'visible',timeout:30000});
 await page.waitForFunction(()=>document.querySelector('.footer-socials-fallback').hidden);
 assert.equal(await page.locator('#contact .social-link').count(),5);
}
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const [name,width,height,touch]of [['phone',390,844,true],['tablet',768,1024,true],['desktop',1440,900,false]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch}),page=await context.newPage(),errors=[];
  await page.addInitScript(()=>{
   window.qaLoadTime=null;window.qaWorkerTime=null;
   addEventListener('load',()=>window.qaLoadTime=performance.now(),{once:true});
   const register=navigator.serviceWorker.register.bind(navigator.serviceWorker);
   navigator.serviceWorker.register=(...args)=>{window.qaWorkerTime=performance.now();return register(...args);};
  });
  page.on('pageerror',e=>errors.push(e.message));await enter(page);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));window.qaDocument=document;});
  assert.ok(await page.evaluate(()=>window.qaLoadTime!==null&&window.qaWorkerTime>=window.qaLoadTime),'offline backup preparation starts after the critical document load');
  await hobbies(page);
  await open(page,galleries.find(([,id])=>id==='music'));
  await page.locator('#music-gallery .music-title').waitFor();
  const title=await page.locator('#music-gallery .music-title').innerText(),url=page.url();
  await page.locator('#music-gallery .music-title').evaluate(e=>window.qaTitle=e);
  await context.setOffline(true);await page.waitForTimeout(1100);
  assert.equal(page.url(),url,'a connection drop must not navigate away');
  assert.equal(await page.locator('#music-gallery').evaluate(e=>e.open),true);
  assert.equal(await page.locator('#music-gallery .music-title').innerText(),title);
  assert.ok(await page.locator('#music-gallery .music-title').evaluate(e=>e===window.qaTitle),'loaded gallery nodes remain intact');
  assert.ok(await page.evaluate(()=>document===window.qaDocument));
  await page.screenshot({path:path.join(output,name+'-offline-gallery.png')});
  await page.locator('#music-gallery header button').click();
  await page.waitForFunction(()=>!document.body.classList.contains('photography-gallery-open'));
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  const fallback=page.locator('.footer-socials-fallback');
  assert.ok(await page.locator('#contact .connect-email').isVisible(),'the email action remains available offline');
  if(await fallback.evaluate(e=>e.hidden)){
   const enhanced=page.locator('#contact .social-link:visible');
   assert.equal(await enhanced.count(),5,'an enhancement loaded near the last hobby card remains usable offline');
  }else{
   assert.equal(await fallback.locator('a:visible').count(),4,'native links remain available when the enhancement has not loaded');
  }
  await context.setOffline(false);await contactReady(page);
  assert.ok(await page.evaluate(()=>document===window.qaDocument),'reconnection enhances the same document');
  const social=await page.locator('#contact .social-link').count();
  await context.setOffline(true);await page.waitForTimeout(250);await context.setOffline(false);await page.waitForTimeout(200);
  assert.equal(await page.locator('#contact .social-link').count(),social,'no duplicate mounts after repeated connection events');
  assert.deepEqual(errors,[]);
  // A genuinely failed NEW document still gets the existing cached offline UI.
  await context.setOffline(true);const cold=await context.newPage();
  await cold.goto(origin+'/?offline-navigation-check=1',{waitUntil:'domcontentloaded'});
  await cold.locator('#offline-root .offline-page').waitFor({state:'visible'});
  await cold.close();await context.setOffline(false);
  const cached=await page.evaluate(async()=>{const names=await caches.keys();const keys=await Promise.all(names.filter(n=>n.startsWith('shub-offline-')).map(async n=>(await(await caches.open(n)).keys()).map(r=>new URL(r.url).pathname)));return keys.flat();});
  assert.ok(cached.every(p=>!p.startsWith('/PHOTOGRAPHY/')&&!p.startsWith('/TRAVEL/')&&!/\.(mp4|webm)$/.test(p)),'no large media caching added');
  results.push({profile:name,keepsDocument:true,keepsOpenGallery:true,reconnectsContact:true,noDuplicateMounts:true,coldNavigationFallback:true,errors});await context.close();
 }
 // Exercise a poisoned shared/entry module map, not only navigator.offline.
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();
 let failing=true,failures=0;
 await page.route('**/assets/ui/connect-page*.js*',r=>{if(failing){failures++;return r.fulfill({status:503,body:'Injected contact outage'});}return r.continue();});
 await enter(page);await page.locator('#contact').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.footer-socials-fallback')&&!document.querySelector('.footer-socials-fallback').hidden);
 for(let i=0;i<60&&failures<3;i++)await page.waitForTimeout(100);
 assert.ok(failures>=3,'entry and standalone recovery were unavailable');
 assert.equal(await page.locator('.footer-socials-fallback a:visible').count(),4,'a failed enhancement leaves all native social links visible');
 await page.waitForTimeout(200);failing=false;await page.evaluate(()=>dispatchEvent(new Event('online')));
 await contactReady(page);results.push({profile:'contact-network-fault',failures,recovered:true});await context.close();
 }finally{await browser.close();}
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
