// Optional browser QA. Set PLAYWRIGHT_MODULE to an installed playwright-core
// module; the website itself has no new runtime or development dependency.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const output=path.resolve(process.env.AUDIT_OUTPUT||'output/performance/2026-10-24/regression');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const { enter, navigation } = require('./helpers/site.cjs');
async function nav(page,name){ await navigation(page); await page.getByRole('link',{name,exact:true}).click(); }
async function open(page,id){ await nav(page,'Hobbies'); await page.locator('#'+id).click(); }
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:process.env.BROWSER_CHANNEL||'chrome'}),headless:true}),results=[];
 const profiles=[['phone',390,844,true],['tablet',768,1024,true],['desktop',Number(process.env.DESKTOP_WIDTH||1440),Number(process.env.DESKTOP_HEIGHT||900),false]];
 try{for(const [name,width,height,touch]of profiles){
  if(process.env.BROWSER_PROFILE&&process.env.BROWSER_PROFILE!==name)continue;
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?2:1});
  const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await enter(page,'?photo-quality=4k#projects');
  await page.waitForFunction(()=>location.hash==='#projects'&&document.querySelector('#projects').getBoundingClientRect().top<140);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>location.hash==='#projects'&&document.querySelector('#projects').getBoundingClientRect().top<140);
  await page.locator('.mini-brand').click();
  await page.waitForFunction(()=>scrollY<2);checks.push('direct anchor and reload preserve Hobbies, home restores hero');
  const badge=page.locator('.badge'),b=await badge.boundingBox();
  if(touch){
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2+45,y:b.y+b.height/2+20,id:1}]});
   await sleep(150);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+60,b.y+b.height/2+25,{steps:12});await page.mouse.up();await page.mouse.move(1,1);}
  await page.waitForFunction(()=>!document.querySelector('.badge').classList.contains('dragging')&&!document.querySelector('.badge-rig').classList.contains('is-moving'));
  assert.ok(await page.locator('.badge-rig').evaluate(e=>!e.style.transform.includes('NaN')));checks.push('ID drag, release, finite settling');
  await nav(page,'Skills');
  assert.equal(await page.locator('[data-skills-primary] .skills-orbit-symbol>svg').count(),14);
  const skill=page.locator('[data-skills-primary] .skills-orbit-disc').first();await skill.focus();assert.ok(await skill.evaluate(e=>e===document.activeElement));
  checks.push('14 inline icons and keyboard focus');
  await nav(page,'Hobbies');assert.equal(await page.locator('.hobby-card').count(),4);
  assert.equal(await page.locator('.hobby-orbit-center canvas').count(),0);
  if(touch){await page.setViewportSize({width:height,height:width});await nav(page,'Hobbies');assert.equal(await page.locator('.hobby-card button').count(),8);await page.setViewportSize({width,height});}
  checks.push('static Hobbies controls and rotation');
  for(const [button,id,root]of [['photography-camera','photography','.photo-carousel'],['travel-plane','travel','.zoom-slider'],['music-walkman','music','.dcc-root'],['gaming-controller','gaming','.gaming-scroll-viewport']]){
   await open(page,button);const dialog=page.locator('#'+id+'-gallery');
   try { await dialog.locator(root).waitFor({state:'visible',timeout:30000}); }
   catch(error){
    await page.screenshot({path:path.join(output,id+'-open-failure.png')});
    await fs.writeFile(path.join(output,id+'-open-failure.json'),JSON.stringify(await page.evaluate(({button,id})=>({
      y:scrollY,errors:[],button:document.getElementById(button)?.outerHTML,
      dialogs:[...document.querySelectorAll('dialog')].map(d=>({id:d.id,open:d.open,html:d.id===id+'-gallery'?d.innerHTML:null})),
      body:document.body.className,active:document.activeElement?.tagName,
    }),{button,id}),null,2));
    throw error;
   }
   await sleep(900);
   if(id==='photography'){await dialog.locator(root).press('Home');await dialog.locator(root).press('ArrowRight');await dialog.locator(root).press('End');await sleep(800);assert.ok(await dialog.locator('.photo-full-image').count());}
   if(id==='travel'){
    const first=await dialog.locator('.sr-only').innerText();await dialog.locator(root).press('ArrowRight');await sleep(3000);const next=await dialog.locator('.sr-only').innerText();assert.notEqual(next,first);
    const cards=await dialog.locator('[data-travel-index]:not([inert])').all();assert.ok(cards.length);await cards.at(-1).click();await sleep(1800);
    assert.equal(await dialog.locator('video[controls]').count(),0);
    assert.ok(await dialog.locator('video').evaluateAll(es=>es.every(v=>v.loop&&v.muted&&v.playsInline)));
    await dialog.locator(root).press('Home');await sleep(1500);
   }
   if(id==='music'){
    const title=await dialog.locator('.music-title').innerText();await dialog.getByRole('button',{name:'Next song',exact:true}).click();assert.notEqual(await dialog.locator('.music-title').innerText(),title);
    await dialog.getByRole('button',{name:'Previous song',exact:true}).click();assert.equal(await dialog.locator('.music-title').innerText(),title);
    await dialog.getByRole('button',{name:'Songs',exact:true}).click();assert.equal(await dialog.locator('.dcc-opt').count(),28);await dialog.locator('.dcc-opt').nth(4).click();
    await dialog.locator(root).press('ArrowLeft');
   }
   if(id==='gaming'){
    const column=dialog.locator('.gaming-marquee-column').first();
    await column.press('ArrowDown');
    assert.equal(await dialog.locator('.marquee-track:not([aria-hidden]) .gaming-marquee-card').count(),
      Number(await dialog.locator(root).getAttribute('data-game-count')));
   }
   const box=await dialog.boundingBox();assert.ok(box.x>=-.5&&box.x+box.width<=width+1,'dialog fits viewport');
   if(touch&&id==='travel'){
    for(let cycle=0;cycle<3;cycle++){
     if(cycle){await open(page,button);await dialog.locator(root).waitFor({state:'visible'});}
     await page.setViewportSize({width:height,height:width});await sleep(500);
     // Keep these adjacent: an extra browser roundtrip can hide the close/resize race.
     await dialog.locator('header button').click();await page.setViewportSize({width,height});await sleep(900);
     assert.equal(await page.locator('#'+button).evaluate(e=>document.activeElement===e),true,'focus restored after rotation');
    }
   }else{await dialog.locator('header button').click();}
   await dialog.waitFor({state:'hidden'});assert.equal(await page.locator('dialog[open]').count(),0);
   // close() hides the dialog synchronously; its native close event (which
   // releases scrolling) is queued. Await that lifecycle condition, not just
   // the disappearance of the open attribute.
   const cleanupPending=await page.evaluate(()=>document.body.style.overflow==='hidden');
   await page.waitForFunction(()=>document.body.style.overflow===''&&!document.body.classList.contains('photography-gallery-open'),undefined,{timeout:3000});
   if(cleanupPending)console.log(`${name} ${id}: native close cleanup completed after dialog became hidden`);
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'');checks.push(id+' controls, keyboard, fitting and close');
  }
  await nav(page,'Projects');
  assert.ok(await page.locator('#playground .play-stage').isVisible(),'the approved project placeholder remains');
  assert.equal(await page.locator('#contact .connect-secondary [aria-disabled="true"]').count(),1,'the resume placeholder remains');
  assert.equal(await page.locator('[data-study],#study-dialog').count(),0,'retired hidden study demos are absent');
  checks.push('project and resume placeholders preserved');
  await page.locator('#contact').scrollIntoViewIfNeeded();await sleep(1900);
  const hrefs=await page.locator('#contact a[href]').evaluateAll(es=>es.map(e=>e.getAttribute('href')));assert.ok(hrefs.length>0);
  await page.screenshot({path:path.join(output,name+'-contact.png')});
  // Repeated dialog use releases all React gallery nodes instead of accumulating.
  const cdp=await context.newCDPSession(page),counts=[];
  for(let i=0;i<6;i++){await open(page,'music-walkman');await page.locator('#music-gallery .dcc-root').waitFor({state:'visible'});await sleep(150);await page.locator('#music-gallery header button').click();await sleep(100);await cdp.send('HeapProfiler.collectGarbage');counts.push(await cdp.send('Memory.getDOMCounters'));}
  assert.ok(counts.at(-1).nodes-counts[1].nodes<150,'no growing detached gallery trees');checks.push('six gallery mount/unmount cycles');
  await page.evaluate(()=>window.scrollTo(0,0));await sleep(900);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('-recovery.js')).length),0,'normal browsing does not download recovery bundles');
  assert.deepEqual(errors,[]);results.push({name,viewport:[width,height],checks,errors,domCounts:counts});console.log(name,checks.join('; '));await context.close();
 }
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
