// Verify decoded images survive enhancement, plus actual failed-request recovery.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const touch of [true,false]){
  const page=await browser.newPage({viewport:touch?{width:425,height:887}:{width:1440,height:900},isMobile:touch,hasTouch:touch});
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
  assert.deepEqual(errors,[]);results.push({touch,decodedImageIdentity:true,icons:14,failedRequestRecovered:touch,errors});await page.close();
 }}finally{await browser.close();}
 await fs.mkdir('output/oneplus-12r',{recursive:true});await fs.writeFile('output/oneplus-12r/icon-continuity.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
