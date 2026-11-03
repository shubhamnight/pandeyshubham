// Verify decoded images survive enhancement, plus actual failed-request recovery.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const [profile,width,height,touch]of [['phone',425,887,true],['tablet',768,1024,true],['laptop',1440,900,false]]){
  if(process.env.BROWSER_PROFILE&&process.env.BROWSER_PROFILE!==profile)continue;
  const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch});
  let release,failures=0;const gate=new Promise(r=>release=r),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/ui/skills-icons.js',async route=>{await gate;await route.continue();});
  if(touch)await page.route('**/assets/skills/figma.svg*',r=>failures++===0?r.fulfill({status:503,body:'deliberate temporary icon outage'}):r.continue());
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('#about .skill-logo').length===14&&[...document.querySelectorAll('#about .skill-logo')].every(e=>e.complete&&e.naturalWidth));
  await page.evaluate(()=>{window.qaNativeIcons=[...document.querySelectorAll('#about .skill-logo')];});
  release();await page.waitForFunction(()=>document.querySelectorAll('.skill-shiny-button').length===14);
  assert.ok(await page.evaluate(()=>window.qaNativeIcons.every(e=>e.isConnected&&e.closest('.skill-shiny-button')&&e.complete&&e.naturalWidth)),'the original decoded images are reused inside every enhanced button');
  if(touch)assert.equal(failures,2,'only the failed SVG was retried once');
  await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click();
  await page.locator('.portfolio-intro').waitFor({state:'detached'});
  await page.evaluate(()=>document.querySelector('.floating-nav a[href="#about"]').click());
  await page.waitForFunction(()=>[...document.querySelectorAll('.skills-orbit-slot')].every(e=>getComputedStyle(e).visibility==='visible'));
  assert.ok(await page.evaluate(()=>window.qaNativeIcons.every(e=>e.isConnected&&e.complete&&e.naturalWidth)));
  let exhaustedRecovery='desktop bypass',outageRequests=0;
  if(touch){
   let outage=true;
   await page.route('**/assets/skills/html5.svg*',route=>{
    outageRequests++;
    return outage?route.fulfill({status:503,body:'deliberate extended icon outage'}):route.continue();
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.evaluate(()=>{window.qaOutageIcon=document.querySelector('.skill-logo[src*="html5.svg"]');});
   await page.waitForFunction(()=>window.qaOutageIcon.complete&&!window.qaOutageIcon.naturalWidth&&new URL(window.qaOutageIcon.src).searchParams.get('skill-retry')==='2');
   assert.equal(outageRequests,3,'extended outage exhausts exactly two automatic retries');
   await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   await page.waitForTimeout(2000);
   assert.equal(outageRequests,3,'visibility and time cannot turn exhausted recovery into polling');
   outage=false;await page.context().setOffline(true);await page.context().setOffline(false);
   try{
    await page.waitForFunction(()=>window.qaOutageIcon.isConnected&&window.qaOutageIcon.complete&&window.qaOutageIcon.naturalWidth>0,null,{timeout:5000});
    assert.equal(outageRequests,4,'a real online event renews the failed icon budget once');
    assert.ok(await page.evaluate(()=>document.querySelector('.skill-logo[src*="html5.svg"]')===window.qaOutageIcon),'reconnection repairs the same original image');
    exhaustedRecovery=true;
   }catch(error){exhaustedRecovery=false;console.error(profile+' exhausted Skills retry budget never recovered: '+error.message);}
  }
  assert.deepEqual(errors,[]);results.push({profile,touch,decodedImageIdentity:true,icons:14,failedRequestRecovered:touch,exhaustedRecovery,outageRequests,errors});await page.close();
 }}finally{await browser.close();}
 const out=process.env.AUDIT_OUTPUT||'output/oneplus-12r';await fs.mkdir(out,{recursive:true});await fs.writeFile(require('node:path').join(out,'icon-continuity.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 assert.ok(results.length&&results.every(result=>result.exhaustedRecovery!==false),'exhausted Skills recovery regressions failed');
})().catch(e=>{console.error(e);process.exitCode=1;});
