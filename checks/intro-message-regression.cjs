const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {profiles,origin,navigation,save}=require('./helpers/site.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--disable-back-forward-cache']}),results=[];
 try{
  for(const [profile,width,height,touch]of profiles){
   for(const javaScriptEnabled of [true,false]){
    const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,javaScriptEnabled});
    if(javaScriptEnabled)await page.addInitScript(()=>{window.navRestored=false;addEventListener('pageshow',e=>{if(e.persisted)window.navRestored=true;});});
    const requests=[],errors=[];
    page.on('request',request=>requests.push(new URL(request.url()).pathname));
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin,{waitUntil:'load'});
    assert.equal(await page.locator('#page-loading,.portfolio-intro,.intro-replay,#intro-template').count(),0);
    assert.equal(await page.locator('html').getAttribute('data-intro'),null);
    assert.equal(await page.locator('#main-content').evaluate(main=>main.inert),false);
    const nav=page.locator('.floating-nav');
    if(javaScriptEnabled){
     assert.equal(await nav.isVisible(),false,'navigation is hidden on the hero');
     assert.ok(await nav.evaluate(e=>e.inert),'hero navigation is inert and absent from keyboard focus');
    }else{
     assert.ok(await nav.evaluate(e=>{const hero=document.querySelector('#home');return !hero.contains(e)&&!!(hero.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING);}), 'no-JavaScript navigation follows the hero in document order');
     assert.ok(await nav.evaluate(e=>e.getBoundingClientRect().top>=innerHeight-1),'no-JavaScript navigation starts below the hero viewport');
    }
    await page.locator('.badge').focus();
    assert.ok(await page.locator('.badge').evaluate(element=>element===document.activeElement));
    if(javaScriptEnabled){
     await page.keyboard.press('Tab');
     assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('.floating-nav')),false,'Tab from hero card skips hidden navigation');
    }
    await navigation(page);
    await page.getByRole('link',{name:'Skills',exact:true}).click();
    await page.waitForFunction(()=>location.hash==='#about'&&Math.abs(document.querySelector('#about').getBoundingClientRect().top)<100);
    if(javaScriptEnabled){
     const heroEnd=await page.locator('#home').evaluate(e=>e.getBoundingClientRect().bottom+scrollY);
     for(const remaining of [60,71,72,73,height]){
      await page.evaluate(top=>scrollTo({top,behavior:'instant'}),Math.round(heroEnd-remaining));
      await page.waitForFunction(()=>{const n=document.querySelector('.floating-nav'),show=document.querySelector('#home').getBoundingClientRect().bottom<72;return n.inert===!show&&n.classList.contains('visible')===show;},undefined,{timeout:5000});
     }
     await navigation(page);
    }
    await page.reload({waitUntil:'load'});
    assert.equal(new URL(page.url()).hash,'#about');
    await page.getByRole('link',{name:'Back to hero'}).click();
    await page.waitForFunction(()=>location.hash==='#home'&&scrollY<2);
    assert.ok(await page.locator('.badge').isVisible());
    if(javaScriptEnabled){
     await nav.waitFor({state:'hidden'});
     assert.ok(await nav.evaluate(e=>e.inert),'returning home disables hidden navigation');
    }
    for(const hash of ['#about','#projects','#contact']){
     await page.goto(origin+'/'+hash,{waitUntil:'load'});
     await nav.waitFor({state:'visible'});
     assert.equal(await nav.evaluate(e=>e.inert),false,'direct section navigation stays usable: '+hash);
     await page.setViewportSize({width:height,height:width});
     if(javaScriptEnabled)await page.waitForFunction(()=>{const n=document.querySelector('.floating-nav'),show=document.querySelector('#home').getBoundingClientRect().bottom<72;return n.inert===!show&&n.classList.contains('visible')===show;});
     await page.setViewportSize({width,height});
    }
    if(javaScriptEnabled){
     await page.goto('about:blank');await page.goBack({waitUntil:'commit'});
     await nav.waitFor({state:'visible'});
     assert.equal(await page.evaluate(()=>window.navRestored),true,'section navigation survives an actual persisted history restoration');
     await page.getByRole('link',{name:'Back to hero'}).click();
     await page.waitForFunction(()=>scrollY<2);await nav.waitFor({state:'hidden'});
    }
    assert.ok(requests.every(url=>!/intro-(?:crowd|loader|liquid)|\/intro\.(?:js|css)/.test(url)));
    assert.deepEqual(errors,[]);
    results.push({profile,javaScriptEnabled,directEntry:true,nativeAnchors:true,sectionOnlyNavigation:true,directSections:true,rotation:true});
    await page.close();
   }
  }
  for(const blocked of ['blend.js','hobby-motion-clock.js']){
   const fallback=await browser.newPage({viewport:{width:393,height:873},isMobile:true,hasTouch:true});
   await fallback.route('**/'+blocked,route=>route.abort());
   try{
    await fallback.goto(origin,{waitUntil:'load'});
    const nav=fallback.locator('.floating-nav');
    assert.ok(await nav.evaluate(e=>e.getBoundingClientRect().top>=innerHeight-1),'failed module keeps baseline navigation below the hero: '+blocked);
    await navigation(fallback);
    await fallback.getByRole('link',{name:'Hobbies',exact:true}).click();
    await fallback.waitForFunction(()=>location.hash==='#projects'&&document.querySelector('#projects').getBoundingClientRect().top<140);
    assert.equal(await nav.evaluate(e=>e.inert),false,'failed module fallback keeps native links usable');
    results.push({blockedModule:blocked,nativeNavigationFallback:true});
   }finally{await fallback.close();}
  }
  const page=await browser.newPage();
  let release;const held=new Promise(resolve=>release=resolve);
  await page.route(/\/assets\/(?:mobile\/)?profile\/shubham-pandey-(?:hero|portrait)-(?:480|640|960)\.webp/,async route=>{await held;await route.continue().catch(()=>{});});
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#page-loading').count(),0);
   await navigation(page);
   await page.getByRole('link',{name:'Skills',exact:true}).click();
   assert.equal(new URL(page.url()).hash,'#about','Slow portrait downloads cannot gate navigation');
   results.push({slowPortrait:true,navigationAvailable:true});
  }finally{release();await page.close();}
 }finally{await browser.close();}
 await save('loading',results);console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
