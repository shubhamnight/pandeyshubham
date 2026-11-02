const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const [width,height,touch]of [[390,844,true],[768,1024,true],[1440,900,false]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});
  let requests=0,release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/qa-mobile-recovery.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width"><img id="kept" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E" alt="Loaded content">'}));
  await page.route('**/mobile-media-data.json',async r=>{
    requests++;if(requests===1)return r.fulfill({status:503,body:'Injected optional manifest outage'});
    await gate;await r.fulfill({json:{files:{'image.webp':'mobile-image.webp'},previews:{}}});
  });
  await page.goto(origin+'/qa-mobile-recovery.html');
  await page.evaluate(async()=>{window.qaMedia=await import('/mobile-media.js');await window.qaMedia.mobileMediaReady;window.qaKept=document.querySelector('#kept');});
  assert.equal(requests,touch?1:0);
  if(touch){
   assert.equal(await page.evaluate(()=>window.qaMedia.mobileMediaSource('image.webp')),'image.webp');
   await page.evaluate(()=>{for(let i=0;i<3;i++)dispatchEvent(new Event('online'));});
   for(let i=0;i<30&&requests<2;i++)await page.waitForTimeout(30);
   assert.equal(requests,2,'connection events share a single pending retry');release();
   await page.waitForFunction(()=>window.qaMedia.mobileMediaSource('image.webp')==='mobile-image.webp');
   await page.evaluate(async()=>{await import('/mobile-media.js?second-island=1');dispatchEvent(new Event('online'));});
   await page.waitForTimeout(50);assert.equal(requests,2,'a second island reuses the recovered map and listener');
   assert.ok(await page.evaluate(()=>document.querySelector('#kept')===window.qaKept),'displayed content is not replaced');
  }else release();
  await page.close();
 }}finally{await browser.close();}
 console.log('Mobile manifest: failed fetch recovery, shared retries, displayed content retention and no desktop fetch passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
