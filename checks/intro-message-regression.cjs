const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const output=path.resolve(process.env.AUDIT_OUTPUT||'output/intro-gooey-preview');
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
    page.on('console',m=>{if(m.type()==='error'&&/hydration|Minified React/i.test(m.text()))errors.push(m.text());});
    if(reduce)await page.route('**/intro-loader.js',async route=>{
      await new Promise(resolve=>setTimeout(resolve,1200));await route.continue();
    });
    await page.addInitScript(()=>{
      window.qaWebGL=0;const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/.test(type))window.qaWebGL++;return get.call(this,type,...args);};
    });
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.locator('.badge img').waitFor({state:'visible'});
    const replay=page.getByRole('button',{name:'Replay intro'});
    await replay.waitFor({state:'visible'});
    assert.equal(await page.locator('.portfolio-intro').count(),0,'the hero renders without a gate');
    assert.equal(requests.some(url=>/intro-(?:loader|crowd|liquid)|\/intro\.(?:js|css)/.test(url)),false,'intro assets are not requested on entry');
    if(fallback){
      await page.route('**/intro.css',r=>r.fulfill({status:503,body:'deliberate CSS failure'}),{times:1});
      await replay.click();
      await page.getByRole('status').filter({hasText:'Intro unavailable. Try again.'}).waitFor();
      assert.equal(await page.locator('.portfolio-intro').count(),0,'a failed replay leaves the hero usable');
    }
    await replay.click();
    const wave=page.locator('.message-loading-mount .gooey-loader');
    const pose=()=>wave.evaluate(e=>{const s=getComputedStyle(e.querySelector('.gooey-loader-waves'),'::before');return `${s.rotate}|${s.translate}`;});
    await wave.waitFor({state:'visible'});
    assert.equal(await page.locator('.message-loading-mount circle').count(),0);
    assert.equal(await page.locator('.message-loading-mount filter').count(),1);
    assert.equal(await page.locator('.batman-loader-stage').count(),0);
    await page.screenshot({path:path.join(output,name+'-first-paint.png')});
    const samples=[];
    for(let i=0;i<5;i++){samples.push(await pose());await page.waitForTimeout(70);}
    if(reduce){assert.ok(samples.every(s=>s===samples[0]),'reduced motion keeps the waves still');}
    else assert.ok(samples.some(s=>s!==samples[0]),'the supplied rotating wave animation runs');
    await page.screenshot({path:path.join(output,name+'-loading.png')});
    if(fallback){
      await page.waitForFunction(()=>document.querySelector('.portfolio-intro')?.classList.contains('play-css-surface'));
      await page.evaluate(async()=>{
        Object.defineProperty(document,'hidden',{configurable:true,value:true});
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      });
      const transform=await pose();await page.waitForTimeout(100);
      assert.equal(await pose(),transform,'hidden-tab wave clock pauses');
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await page.waitForTimeout(100);assert.notEqual(await pose(),transform);
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
    await replay.click();
    await page.getByRole('button',{name:'Skip intro'}).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.portfolio-intro').waitFor({state:'detached'});
    assert.equal(await replay.evaluate(button=>button===document.activeElement),true,'Escape returns focus to Replay intro');
    results.push({profile:name,gooeyWaves:true,reducedMotion:reduce,nativeFallback:fallback,noOpeningWebGL:true,playAndHeroPreserved:true,errors});
    await context.close();
  }
    const page=await browser.newPage({javaScriptEnabled:false});
    await page.goto(origin+'/#about');
    assert.equal(new URL(page.url()).hash,'#about');
    assert.equal(await page.locator('#skills-heading').isVisible(),true);
    await page.getByRole('link',{name:'Back to hero'}).click();
    assert.equal(new URL(page.url()).hash,'#home');
    await page.locator('.badge img').waitFor({state:'visible'});
    assert.equal(await page.locator('.hero-retro-grid').isVisible(),true);
    assert.equal(await page.getByRole('button',{name:'Replay intro'}).count(),0);
    await page.close();
  }finally{await browser.close();}
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
