const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {profiles,origin,navigation,save}=require('./helpers/site.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--disable-back-forward-cache']}),results=[];
 try{
  for(const [profile,width,height,touch]of profiles){
   for(const javaScriptEnabled of [true,false]){
    const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,javaScriptEnabled});
    if(javaScriptEnabled)await page.addInitScript(()=>{
     window.navRestored=false;
     addEventListener('pageshow',e=>{if(e.persisted)window.navRestored=true;});
     const showModal=HTMLDialogElement.prototype.showModal;
     HTMLDialogElement.prototype.showModal=function(){
      showModal.call(this);
      if(this.id!=='page-loading')return;
      const shownAt=performance.now();
      const observer=new MutationObserver(()=>{
       if(!this.classList.contains('intro-loader-paused'))return;
       window.waveLoadingMs=performance.now()-shownAt;
       observer.disconnect();
      });
      observer.observe(this,{attributes:true,attributeFilter:['class']});
     };
    });
    const requests=[],errors=[];
    page.on('request',request=>requests.push(new URL(request.url()).pathname));
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin,{waitUntil:'load'});
    const loader=page.locator('#page-loading');
    if(javaScriptEnabled){
     await loader.waitFor({state:'detached'});
     assert.ok(await page.evaluate(()=>window.waveLoadingMs>=2490),'the waves run for at least 2.5 seconds before zooming');
    }
    else assert.equal(await loader.isVisible(),false,'no JavaScript leaves the loader closed');
    assert.equal(await page.locator('.portfolio-intro,.intro-replay,#intro-template').count(),0);
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
     if(javaScriptEnabled)assert.equal(await loader.count(),0,'direct section entry skips loading waves');
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
  const loader=page.locator('#page-loading');
  let release;const held=new Promise(resolve=>release=resolve);
  await page.route('**/skills-marquee.js',async route=>{await held;await route.continue().catch(()=>{});});
  try{
   await page.goto(origin,{waitUntil:'commit'});
   await page.waitForFunction(()=>document.querySelector('#home .badge img')?.naturalWidth>0);
   assert.ok(await loader.evaluate(element=>element.matches(':modal')&&!!element.querySelector('.gooey-loader-waves')));
   assert.equal(await loader.evaluate(element=>getComputedStyle(element,'::backdrop').backdropFilter),'none','the hero stays sharp during the dissolve');
   await page.locator('.badge').evaluate(element=>element.focus());
   assert.equal(await page.locator('.badge').evaluate(element=>element===document.activeElement),false,'the loading cover keeps focus out of the hero');
   await page.waitForTimeout(2800);
   assert.notEqual(await page.evaluate(()=>document.readyState),'complete');
   assert.ok(await loader.evaluate(element=>element.open&&!element.classList.contains('intro-loader-paused')),'the waves keep moving after the hero loads while a page script is still pending');
   release();
   await page.waitForFunction(()=>{
    const loader=document.querySelector('#page-loading');
    const waves=loader?.querySelector('.loading-zoom');
    return waves?.getAnimations().some(animation=>animation.effect.getKeyframes().some(frame=>frame.transform==='scale(9)'))&&
      loader.getAnimations().some(animation=>animation.effect.getKeyframes().at(-1).opacity==='0');
   },undefined,{timeout:4000});
   assert.equal(await page.evaluate(()=>document.readyState),'complete','the zoom starts after the page finishes loading');
   await loader.waitFor({state:'detached'});
   assert.ok(await page.locator('.badge').isVisible(),'the zoom reveals the hero');
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await loader.count(),0,'refresh in the same tab bypasses the completed loader');
   await navigation(page);
   await page.getByRole('link',{name:'Skills',exact:true}).click();
   assert.equal(new URL(page.url()).hash,'#about','the hero and navigation work after loading');
   results.push({waitsForPageLoad:true,waveZoom:true,sameTabBypass:true,navigationAvailable:true});
  }finally{release();await page.close();}
  const reduced=await browser.newPage({reducedMotion:'reduce'});
  try{
   await reduced.goto(origin,{waitUntil:'domcontentloaded'});
   assert.equal(await reduced.locator('#page-loading').count(),0,'reduced motion skips the zoom');
  }finally{await reduced.close();}
  const failed=await browser.newPage();
  let releaseStall;const stalled=new Promise(resolve=>releaseStall=resolve);
  try{
   await failed.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new Error('Storage disabled');}}));
   await failed.goto(origin+'/#about',{waitUntil:'domcontentloaded'});
   assert.equal(await failed.locator('#page-loading').count(),0,'a fresh section link bypasses the loader with storage disabled');
   await failed.route(/\/assets\/profile\/shubham-pandey-hero-(?:480|640|960)\.webp/,route=>route.abort());
   await failed.route('**/skills-marquee.js',async route=>{await stalled;await route.abort().catch(()=>{});});
   await failed.goto(origin,{waitUntil:'commit'});
   await failed.locator('#page-loading[open]').waitFor();
   await failed.locator('#page-loading').waitFor({state:'detached',timeout:15000});
   assert.ok(await failed.locator('.badge').isVisible(),'a stalled page script and disabled storage still reveal the hero after the deadline');
   assert.notEqual(await failed.evaluate(()=>document.readyState),'complete','the fallback reveals before the stalled request returns');
  }finally{releaseStall();await failed.close();}
 }finally{await browser.close();}
 await save('loading',results);console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
