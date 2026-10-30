// Optional browser QA: use the existing external Playwright installation.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const output=path.resolve(process.env.AUDIT_OUTPUT||'output/visibility-compression/offscreen');
async function nav(page,id){await page.evaluate(id=>document.querySelector(`.floating-nav a[href="#${id}"]`).click(),id);}
async function hobbies(page){
  await nav(page,'projects');
  await page.waitForFunction(()=>!document.querySelector('#projects').inert&&document.querySelector('#projects').hobbyEntranceProgress===1&&
    [...document.querySelectorAll('.hobby-orbit-center button')].every(e=>e.dataset.hobbyCompiling==='false'),null,{timeout:45000});
}
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  const results=[];
  try{for(const [name,width,height,touch]of [['phone',390,844,true],['tablet',768,1024,true],['desktop',1440,900,false]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?2:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.qaFrames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(time=>{window.qaFrames++;cb(time);});});
    const cdp=await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:touch?Number(process.env.AUDIT_CPU||4):1});
    await page.goto(origin);
    await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});
    await page.locator('.portfolio-intro').waitFor({state:'detached'});
    await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
    await hobbies(page);
    await page.waitForFunction(()=>[...document.querySelectorAll('.hobby-orbit')].every(e=>e.querySelectorAll('.hobby-image-surface:not(:empty)').length===3));
    await nav(page,'playground');await page.waitForTimeout(2200);
    assert.equal(await page.locator('#projects').evaluate(e=>e.classList.contains('orbits-running')),false,'rounded anchor sliver cannot run Hobbies');
    await page.evaluate(()=>window.qaFrames=0);await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>window.qaFrames),0,'no hidden Hobbies/model frame loop at Projects');
    const spins=page.locator('.kinetic-object span');
    await page.waitForFunction(()=>!document.querySelector('.kinetic-object').classList.contains('ambient-paused'));
    const visibleTime=await spins.first().evaluate(e=>e.getAnimations()[0].currentTime);
    await page.waitForTimeout(160);
    assert.ok(await spins.first().evaluate((e,t)=>e.getAnimations()[0].currentTime>t,visibleTime),'existing spin plays in view');
    await page.locator('#profile').evaluate(e=>e.scrollIntoView());await page.waitForTimeout(1500);
    await page.waitForFunction(()=>document.querySelector('.kinetic-object').classList.contains('ambient-paused'));
    const pausedTime=await spins.first().evaluate(e=>e.getAnimations()[0].currentTime);
    await page.waitForTimeout(160);
    assert.equal(await spins.first().evaluate(e=>e.getAnimations()[0].currentTime),pausedTime,'offscreen CSS time is frozen');
    await nav(page,'playground');await page.waitForTimeout(1600);
    await page.waitForFunction(()=>!document.querySelector('.kinetic-object').classList.contains('ambient-paused'));
    const resumed=await spins.first().evaluate(e=>e.getAnimations()[0].currentTime);
    assert.ok(resumed>=pausedTime,'CSS resumes without restarting');
    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
    assert.equal(await page.locator('.kinetic-object').evaluate(e=>e.classList.contains('ambient-paused')),true);
    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
    await page.waitForFunction(()=>!document.querySelector('.kinetic-object').classList.contains('ambient-paused'));
    await hobbies(page);await page.locator('#gaming-controller').evaluate(e=>e.click());
    const gaming=page.locator('#gaming-gallery .gaming-scroll-viewport');
    await gaming.waitFor();await page.waitForFunction(()=>{
      const e=document.querySelector('#gaming-gallery .gaming-tilted-mount')?.shadowRoot?.querySelector('.gaming-scroll-viewport');
      return e&&!e.hasAttribute('data-paused');
    });
    await gaming.evaluate(e=>{e.style.transform='translateY(200vh)';});
    await page.waitForFunction(()=>document.querySelector('#gaming-gallery .gaming-tilted-mount').shadowRoot.querySelector('.gaming-scroll-viewport').hasAttribute('data-paused'));
    assert.ok(await gaming.locator('.marquee-track').evaluateAll(es=>es.every(e=>getComputedStyle(e).animationPlayState==='paused')),'shadow-root marquee pauses outside view');
    await gaming.evaluate(e=>{e.style.transform='';});
    await page.waitForFunction(()=>!document.querySelector('#gaming-gallery .gaming-tilted-mount').shadowRoot.querySelector('.gaming-scroll-viewport').hasAttribute('data-paused'));
    await page.locator('#gaming-gallery header button').evaluate(e=>e.click());
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(output,name+'.png')});
    results.push({profile:name,cpuThrottle:touch?Number(process.env.AUDIT_CPU||4):1,completeHobbies:true,idleOffscreenFrames:0,cssTimePreserved:true,persistedLifecycle:true,shadowVisibility:true,errors});
    await context.close();
  }}finally{await browser.close();}
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
