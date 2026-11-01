const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const output=path.resolve(process.env.AUDIT_OUTPUT||'output/intro-message-preview');
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  const results=[];
  try{for(const [name,width,height,touch,reduce,fallback]of [
    ['desktop',1440,900,false,false,false],['phone',390,844,true,false,false],
    ['tablet',768,1024,true,false,false],['reduced',390,844,true,true,false],
    ['fallback',1440,900,false,false,true],
  ]){
    const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:reduce?'reduce':'no-preference'});
    const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    if(fallback)await page.route('**/assets/ui/message-loading.js',r=>r.fulfill({status:503,body:'deliberate QA failure'}));
    await page.addInitScript(()=>{
      window.qaWebGL=0;const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/.test(type))window.qaWebGL++;return get.call(this,type,...args);};
    });
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    const svg=page.locator('.message-loading-mount svg');
    await svg.waitFor({state:'visible'});
    assert.equal(await svg.locator('circle').count(),3);
    assert.equal(await svg.locator('animate').count(),3);
    assert.equal(await page.locator('.batman-loader-stage').count(),0);
    await page.screenshot({path:path.join(output,name+'-loading.png')});
    const samples=[];
    for(let i=0;i<5;i++){samples.push(await svg.evaluate(e=>[...e.querySelectorAll('circle')].map(c=>c.cy.animVal.value)));await page.waitForTimeout(70);}
    if(reduce){assert.ok(samples.every(s=>s.every(v=>v===12)),'reduced motion keeps all three dots still');}
    else assert.ok(samples.some(s=>s.some((v,i)=>Math.abs(v-samples[0][i])>.1)),'the provided SMIL bounce runs');
    if(fallback){
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      const time=await svg.evaluate(e=>e.getCurrentTime());await page.waitForTimeout(100);
      assert.equal(await svg.evaluate(e=>e.getCurrentTime()),time,'hidden-tab SVG clock pauses');
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await page.waitForTimeout(100);assert.ok(await svg.evaluate((e,t)=>e.getCurrentTime()>t,time));
    }
    const play=page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true});
    await page.waitForFunction(()=>document.querySelector('.portfolio-intro')?.classList.contains('show-play'));
    assert.equal(await page.evaluate(()=>window.qaWebGL),0,'no opening WebGL context');
    assert.equal(requests.some(url=>url.includes('/batman-loader.js')),false);
    assert.equal(await page.locator('.intro-crowd').count(),1,'the existing crowd remains');
    await page.waitForTimeout(180);await page.screenshot({path:path.join(output,name+'-play.png')});
    await play.press('Enter');await page.locator('.portfolio-intro').waitFor({state:'detached'});
    await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
    assert.equal(await page.locator('#main-content').evaluate(e=>e.inert),false);
    assert.equal(await page.locator('.badge-rig').evaluate(e=>e.classList.contains('awaiting-entrance')),false);
    assert.ok(await page.evaluate(()=>scrollY<2),'PLAY still enters at the hero');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(output,name+'-hero.png')});
    results.push({profile:name,svgDots:true,reducedMotion:reduce,nativeFallback:fallback,noOpeningWebGL:true,playAndHeroPreserved:true,errors});
    await context.close();
  }}finally{await browser.close();}
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
