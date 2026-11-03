// Real keyboard input in browser emulation; physical-device evidence is separate.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {profiles,galleries,enter,hobbies,open,close,save}=require('./helpers/site.cjs');

async function settledBox(card){
 return card.evaluate(target=>new Promise((resolve,reject)=>{
  const started=performance.now(),samples=[];
  function sample(){
   const now=performance.now(),r=target.getBoundingClientRect(),box={x:r.x,y:r.y,width:r.width,height:r.height};
   samples.push({at:now,box});
   while(samples.length>1&&samples[1].at<=now-200)samples.shift();
   if(now-samples[0].at>=200&&Object.keys(box).every(key=>{
    const values=samples.map(sample=>sample.box[key]);return Math.max(...values)-Math.min(...values)<.1;
   }))return resolve(box);
   if(now-started>10000)return reject(Error('Travel video geometry did not settle'));
   requestAnimationFrame(sample);
  }
  sample();
 }));
}

(async()=>{
 const browser=await chromium.launch({headless:true}),results=[];
 try{for(const [profile,width,height,touch]of profiles){
  if(process.env.BROWSER_PROFILE&&process.env.BROWSER_PROFILE!==profile)continue;
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});
  const errors=[],checks=[],geometries=[];page.on('pageerror',error=>errors.push(error.message));
  async function check(name,run){try{await run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.message});}}
  try{
   await enter(page);await hobbies(page);
   const music=await open(page,galleries.find(entry=>entry[1]==='music'));
   await check('Songs Escape restores trigger focus without closing the dialog',async()=>{
    const trigger=music.getByRole('button',{name:'Songs',exact:false});
    assert.equal(await trigger.getAttribute('aria-haspopup'),null,'Songs is a disclosure, not a menu popup');
    await trigger.focus();await page.keyboard.press('Space');
    assert.equal(await trigger.getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Tab');
    assert.ok(await music.locator('.dcc-opt').first().evaluate(e=>e===e.getRootNode().activeElement),'Tab enters the first song option');
    await page.keyboard.press('Escape');
    assert.ok(await music.evaluate(e=>e.open),'Escape dismisses the list, not the native dialog');
    assert.equal(await trigger.getAttribute('aria-expanded'),'false');
    assert.ok(await trigger.evaluate(e=>e===e.getRootNode().activeElement),'Escape must return keyboard focus to Songs');
    await page.keyboard.press('Tab');
    assert.ok(await music.evaluate(dialog=>{let active=document.activeElement;while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;return !!active&&(dialog.contains(active)||dialog.contains(active.getRootNode().host));}),'next Tab stays inside the dialog');
   });
   await close(page,music);
   const travel=await open(page,galleries.find(entry=>entry[1]==='travel'));
   const slider=travel.locator('.zoom-slider');
   await check('Travel keyboard entry has a visible focus indicator',async()=>{
    await travel.locator('header button').focus();
    const unfocused=await slider.evaluate(e=>getComputedStyle(e).boxShadow);
    await page.keyboard.press('Tab');
    const focus=await slider.evaluate(e=>{const s=getComputedStyle(e);return {active:e===e.getRootNode().activeElement,visible:e.matches(':focus-visible'),outline:s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,shadow:s.boxShadow};});
    assert.ok(focus.active&&focus.visible,'native Tab reaches the carousel keyboard control');
    assert.ok(focus.outline||(focus.shadow!=='none'&&focus.shadow!==unfocused),'focused Travel carousel must not hide its focus indicator');
   });
   await check('Travel video selector has button semantics and keyboard activation',async()=>{
    await slider.focus();await page.keyboard.press('Home');
    const videos=travel.locator('.zoom-image-wrap:has(video):not([inert])');
    const count=await travel.locator('[data-travel-index]').count();
    for(let step=0;!await videos.count()&&step<count;step++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);}
    assert.ok(await videos.count(),'a video enters the visible interactive strip');
    const videoIndex=await videos.first().getAttribute('data-travel-index');
    const video=travel.locator(`[data-travel-index="${videoIndex}"]`);
    assert.equal(await video.getAttribute('role'),'button','video selection is an action, not a group');
    assert.match(await video.getAttribute('aria-label'),/^Show .+ in the featured position$/);
    // Portrait videos intentionally have narrower frames than photographs.
    // Compare keyboard selection against the same video's actual click result.
    await video.click();const selected=await settledBox(video);
    for(const key of ['Enter','Space']){
     await slider.focus();await page.keyboard.press('ArrowRight');const displaced=await settledBox(video);
     assert.ok(Math.abs(displaced.x-selected.x)>2||Math.abs(displaced.width-selected.width)>2,'each activation starts away from the featured position');
     assert.ok(await video.evaluate(e=>!e.inert),'nonfeatured video stays selectable');
     await video.focus();await page.keyboard.press(key);const restored=await settledBox(video);
     const geometry={profile,videoIndex,key,selected,displaced,restored};
     geometries.push(geometry);
     assert.ok(Object.keys(selected).every(key=>Math.abs(selected[key]-restored[key])<1),key+' restores the click-featured video geometry: '+JSON.stringify(geometry));
    }
    assert.equal(await travel.locator('video[controls]').count(),0,'selection preserves the approved control-free looping videos');
   });
   await close(page,travel);
   assert.deepEqual(errors,[]);
  }catch(error){checks.push({name:'setup, lifecycle and runtime',passed:false,error:error.message});}
  finally{await page.close();}
  results.push({profile,emulated:true,checks,geometries,errors});console.log(JSON.stringify(results.at(-1)));
 }}finally{await browser.close();}
 await save('overlay-accessibility',results);
 assert.ok(results.length&&results.every(row=>row.checks.length>=3&&row.checks.every(check=>check.passed)),'overlay keyboard regressions failed; see results.json');
})().catch(error=>{console.error(error);process.exitCode=1;});
