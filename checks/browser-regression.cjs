// Optional browser QA. Set PLAYWRIGHT_MODULE to an installed playwright-core
// module; the website itself has no new runtime or development dependency.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const output=path.resolve(process.env.AUDIT_OUTPUT||'output/performance/2026-10-24/regression');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function settled(page){try{await page.waitForFunction(()=>!document.querySelector('#projects').inert&&[...document.querySelectorAll('.hobby-orbit-center')].every(e=>e.style.translate.split(' ').every(v=>Math.abs(parseFloat(v))<.01)),undefined,{timeout:25000});}catch(e){console.log(await page.evaluate(()=>({y:scrollY,body:document.body.className,inert:document.querySelector('#projects').inert,models:[...document.querySelectorAll('.hobby-orbit-center')].map(e=>({translate:e.style.translate,visible:e.className,ready:e.querySelector('button').dataset}))})));await page.screenshot({path:path.join(output,'failure.png')});throw e;}}
async function nav(page,name){await page.getByRole('link',{name,exact:true}).click();await sleep(1800);}
async function open(page,id){await nav(page,'Hobbies');await settled(page);const b=await page.locator('#'+id).boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);}
async function scenePoint(page){return page.evaluate(()=>{const s=document.querySelector('.skills-hobbies-scene'),v=s.querySelector('.skills-hobbies-viewport');return (scrollY-s.getBoundingClientRect().top-scrollY)/v.offsetHeight;});}
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true}),results=[];
 try{for(const [name,width,height,touch]of [['phone',390,844,true],['tablet',768,1024,true],['desktop',1440,900,false]]){
  if(process.env.BROWSER_PROFILE&&process.env.BROWSER_PROFILE!==name)continue;
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?2:1});
  const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(origin+'/?photo-quality=4k#projects',{waitUntil:'load'});
  await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});
  await page.locator('.portfolio-intro').waitFor({state:'detached'});
  await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
  assert.ok(await page.evaluate(()=>scrollY<2));checks.push('PLAY resets saved hash to hero');
  const badge=page.locator('.badge'),b=await badge.boundingBox();
  if(touch){
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2+45,y:b.y+b.height/2+20,id:1}]});
   await sleep(150);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+60,b.y+b.height/2+25,{steps:12});await page.mouse.up();await page.mouse.move(1,1);}
  await page.waitForFunction(()=>!document.querySelector('.badge').classList.contains('dragging')&&!document.querySelector('.badge-rig').classList.contains('is-moving'));
  assert.ok(await page.locator('.badge-rig').evaluate(e=>!e.style.transform.includes('NaN')));checks.push('ID drag, release, finite settling');
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('#home').offsetHeight+4));await sleep(700);await nav(page,'Skills');await sleep(5500);
  assert.equal(await page.locator('.skill-shiny-button').count(),14);
  assert.equal(await page.locator('.skills-orbit-symbol>img').count(),0);
  assert.equal(await page.locator('.skill-logo').evaluateAll(es=>es.filter(e=>e.complete&&e.naturalWidth).length),14);
  const skill=page.locator('.skill-shiny-button').first();await skill.focus();assert.ok(await skill.evaluate(e=>e===document.activeElement));
  checks.push('14 skill buttons, loaded logos, focus');
  await nav(page,'Hobbies');await settled(page);assert.equal(await page.locator('.hobby-orbit-center button.camera-ready').count(),4);
  const before=await scenePoint(page);
  if(touch){await page.setViewportSize({width:height,height:width});await sleep(700);const after=await scenePoint(page);assert.ok(Math.abs(before-after)<.01);await page.setViewportSize({width,height});await sleep(700);}
  checks.push('hobby model handoff and rotation');
  for(const [button,id,root]of [['photography-camera','photography','.photo-carousel'],['travel-plane','travel','.zoom-slider'],['music-walkman','music','.dcc-root'],['gaming-controller','gaming','.gaming-scroll-viewport']]){
   await open(page,button);const dialog=page.locator('#'+id+'-gallery');await dialog.locator(root).waitFor({state:'visible',timeout:30000});await sleep(900);
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
   if(id==='gaming'){await dialog.locator(root).evaluate(e=>{e.scrollTop=600;});await sleep(500);assert.ok(await dialog.locator('.tilted-tile').count());}
   const box=await dialog.boundingBox();assert.ok(box.x>=-.5&&box.x+box.width<=width+1,'dialog fits viewport');
   if(touch&&id==='travel'){
    for(let cycle=0;cycle<3;cycle++){
     if(cycle){await open(page,button);await dialog.locator(root).waitFor({state:'visible'});}
     const old=await scenePoint(page);await page.setViewportSize({width:height,height:width});await sleep(500);
     // Keep these adjacent: an extra browser roundtrip can hide the close/resize race.
     await dialog.locator('header button').click();await page.setViewportSize({width,height});await sleep(900);
     const restored=await scenePoint(page);assert.ok(Math.abs(old-restored)<.015,`${name} rotation ${cycle}: ${old} -> ${restored}`);
    }
   }else{await dialog.locator('header button').click();}
   await dialog.waitFor({state:'hidden'});assert.equal(await page.locator('dialog[open]').count(),0);
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'');checks.push(id+' controls, keyboard, fitting and close');
  }
  await nav(page,'Projects');
  for(const key of ['type','interface','motion']){const study=page.locator('[data-study="'+key+'"]');if(!await study.isVisible())continue;await study.click();await page.locator('#study-dialog').waitFor({state:'visible'});await page.locator('.dialog-done').click();await page.locator('#study-dialog').waitFor({state:'hidden'});}
  for(const button of await page.locator('[data-color]').all()){await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');}
  checks.push('visible project controls (hidden legacy study/mood controls excluded)');
  await page.locator('#contact').scrollIntoViewIfNeeded();await sleep(1900);
  const hrefs=await page.locator('#contact a[href]').evaluateAll(es=>es.map(e=>e.getAttribute('href')));assert.ok(hrefs.length>0);
  await page.screenshot({path:path.join(output,name+'-contact.png')});
  // Repeated dialog use releases all React gallery nodes instead of accumulating.
  const cdp=await context.newCDPSession(page),counts=[];
  for(let i=0;i<6;i++){await open(page,'music-walkman');await page.locator('#music-gallery .dcc-root').waitFor({state:'visible'});await sleep(150);await page.locator('#music-gallery header button').click();await sleep(100);await cdp.send('HeapProfiler.collectGarbage');counts.push(await cdp.send('Memory.getDOMCounters'));}
  assert.ok(counts.at(-1).nodes-counts[1].nodes<150,'no growing detached gallery trees');checks.push('six gallery mount/unmount cycles');
  await page.evaluate(()=>window.scrollTo(0,0));await sleep(900);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);results.push({name,viewport:[width,height],checks,errors,domCounts:counts});console.log(name,checks.join('; '));await context.close();
 }
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
