const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.AUDIT_URL||'http://localhost:3013',output=path.resolve(process.env.AUDIT_OUTPUT||'output/desktop-2026-10-27/hover-after');
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const [width,height]of [[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/skills.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())+'\nwindow.qaSkill=()=>({mode,pointerInside,focusInside,entranceTime,orbitTime,visible:slots.filter(e=>getComputedStyle(e).visibility===\"visible\").length});'});});
  await page.goto(origin);await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});await page.locator('.portfolio-intro').waitFor({state:'detached'});await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
  const hero=await page.locator('#home').evaluate(e=>e.offsetHeight);await page.evaluate(y=>scrollTo(0,y),hero*.72);await page.waitForTimeout(1000);
  const button=page.locator('.skill-shiny-button').nth(1),b=await button.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
  await page.waitForFunction(()=>window.qaSkill().mode==='orbit'&&window.qaSkill().visible===14,undefined,{timeout:15000});
  await page.evaluate(()=>document.querySelector('.floating-nav a[href="#about"]').click());await page.waitForTimeout(1800);
  const ringButton=await button.boundingBox();await page.mouse.move(ringButton.x+ringButton.width/2,ringButton.y+ringButton.height/2);await page.waitForFunction(()=>window.qaSkill().pointerInside);
  const a=await page.evaluate(()=>window.qaSkill());await page.waitForTimeout(500);const paused=await page.evaluate(()=>window.qaSkill());assert.equal(paused.orbitTime,a.orbitTime,'settled hover pause preserved');
  await page.mouse.move(1,1);await page.waitForTimeout(500);assert.ok((await page.evaluate(()=>window.qaSkill())).orbitTime>a.orbitTime,'pointer leave resumes');
  await page.screenshot({path:path.join(output,width+'-skills.png')});assert.deepEqual(errors,[]);results.push({viewport:[width,height],entryComplete:true,visible:14,hoverPause:true,hoverResume:true,errors});
  console.log(JSON.stringify(results.at(-1)));await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));await page.close();
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
