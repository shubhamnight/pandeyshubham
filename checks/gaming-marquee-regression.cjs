// Optional browser QA: PLAYWRIGHT_MODULE points to an external playwright-core.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000',out=path.resolve(process.env.AUDIT_OUTPUT||'output/gaming-marquee');
async function open(page){
 await page.evaluate(()=>document.querySelector('.floating-nav a[href="#projects"]').click());
 await page.waitForFunction(()=>!document.querySelector('#projects').inert&&document.querySelector('#projects').hobbyEntranceProgress===1&&document.querySelector('#gaming-controller').dataset.hobbyCompiling==='false');
 const b=await page.locator('#gaming-controller').boundingBox(),v=page.viewportSize();
 await page.mouse.click((Math.max(0,b.x)+Math.min(v.width,b.x+b.width))/2,(Math.max(0,b.y)+Math.min(v.height,b.y+b.height))/2);
 await page.locator('#gaming-gallery .gaming-marquee-column').first().waitFor({state:'visible'});
}
async function point(column){return column.evaluate(e=>{const host=e.getRootNode().host,r=host.getBoundingClientRect(),root=e.getRootNode();
 for(let y=r.y+r.height*.3;y<r.y+r.height*.8;y+=12)for(let x=r.x+8;x<r.right-8;x+=12)if(root.elementFromPoint(x,y)?.closest('.marquee')===e)return {x,y};throw Error('No visible marquee input surface');});}
const time=column=>column.evaluate(e=>Number(e.firstElementChild.getAnimations()[0]?.currentTime));
const playState=column=>column.evaluate(e=>getComputedStyle(e.firstElementChild).animationPlayState);
(async()=>{await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true}),rows=[];
try{for(const [width,height,touch]of [[1440,900,false],[320,568,true],[390,844,true],[768,1024,true],[844,390,true]]){
 if(process.env.GAMING_WIDTH&&width!==Number(process.env.GAMING_WIDTH))continue;
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(origin);await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});await page.locator('.portfolio-intro').waitFor({state:'detached'});await open(page);await page.mouse.move(1,1);await page.waitForTimeout(1000);
  const gallery=page.locator('#gaming-gallery'),viewport=gallery.locator('.gaming-scroll-viewport'),columns=gallery.locator('.gaming-marquee-column'),column=columns.first(),box=await viewport.boundingBox(),expectedColumns=box.width<600?2:box.width<900?3:4;
  assert.equal(await columns.count(),expectedColumns);
  const titles=await gallery.locator('.marquee-track:not([aria-hidden]) .gaming-marquee-card').evaluateAll(es=>es.map(e=>e.dataset.gameTitle));assert.equal(titles.length,33);assert.equal(new Set(titles).size,33);
  assert.ok(await gallery.locator('.marquee-track[aria-hidden]').evaluateAll(es=>es.every(e=>e.inert)));
  assert.equal(await gallery.locator('a').count(),0);
  assert.ok(await gallery.locator('.gaming-marquee-artwork').evaluateAll(es=>es.every(e=>e.width&&e.height&&e.getAttribute('alt')&&e.getAttribute('srcset'))));
  assert.ok((await gallery.locator('.gaming-marquee-artwork').evaluateAll(es=>es.filter(e=>e.complete&&e.naturalWidth).length))>=4,'visible artwork decodes');
  assert.equal(await playState(column),'running');const moving=await time(column);await page.waitForTimeout(350);assert.ok(await time(column)>moving);
  const directions=await columns.evaluateAll(es=>es.map(e=>getComputedStyle(e.firstElementChild).animationDirection));assert.deepEqual(directions,Array.from({length:expectedColumns},(_,i)=>i%2?'reverse':'normal'));
  await page.screenshot({path:path.join(out,width+'-gaming.png')});
  const hit=await point(column);
  if(touch){
   const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...hit,id:1}]});await page.waitForFunction(()=>document.querySelector('.gaming-tilted-mount').shadowRoot.querySelector('.marquee').hasAttribute('data-held'));
   assert.equal(await playState(column),'paused');const start=await time(column);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:hit.x,y:hit.y-65,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.ok(Math.abs(await time(column)-start)>500,'swipe advances the artwork');assert.equal(await column.getAttribute('data-held'),null);assert.equal(await playState(column),'running');
  }else{
   await page.mouse.move(hit.x,hit.y);assert.equal(await playState(column),'paused');await page.waitForTimeout(80);const stopped=await time(column);await page.waitForTimeout(300);assert.ok(Math.abs(await time(column)-stopped)<2,'hover really pauses');
   await page.mouse.wheel(0,120);assert.ok(Math.abs(await time(column)-stopped)>500,'wheel advances the hovered column');await page.mouse.move(1,1);assert.equal(await playState(column),'running');
  }
  await page.mouse.move(1,1);await column.evaluate(e=>{for(const t of e.children)for(const a of t.getAnimations())a.currentTime=2000;});await column.press('ArrowDown');assert.ok(await time(column)>2000,'keyboard advances artwork');
  await column.press('Space');assert.equal(await playState(column),'running','Space resumes keyboard-paused movement');await column.press('Space');assert.equal(await playState(column),'paused','Space pauses');await column.evaluate(e=>e.blur());
  const seams=await columns.evaluateAll(es=>es.map(e=>{
   const tracks=[...e.children],reverse=e.hasAttribute('data-reverse');
   for(const t of tracks)for(const a of t.getAnimations()){a.pause();a.currentTime=0;}
   const start=tracks[reverse?1:0].firstElementChild.getBoundingClientRect();
   for(const t of tracks)for(const a of t.getAnimations())a.currentTime=Number(a.effect.getTiming().duration)-.001;
   const end=tracks[reverse?0:1].firstElementChild.getBoundingClientRect();
   return Math.max(...['x','y','width','height'].map(k=>Math.abs(start[k]-end[k])));
  }));assert.ok(seams.every(delta=>delta<.5),'duplicate groups join without a geometry jump');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal(await gallery.locator('.marquee-track').evaluateAll(es=>es.reduce((n,e)=>n+e.getAnimations().length,0)),0);
  const reduced=await viewport.evaluate(e=>({overflow:getComputedStyle(e).overflowY,height:e.clientHeight,scroll:e.scrollHeight}));assert.equal(reduced.overflow,'auto');assert.ok(reduced.scroll>reduced.height);
  await gallery.locator('.marquee-track:not([aria-hidden]) .gaming-marquee-card').last().scrollIntoViewIfNeeded();assert.ok(await viewport.evaluate(e=>e.scrollTop)>0);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.keyboard.press('Escape');await gallery.waitFor({state:'hidden'});await page.waitForFunction(()=>document.body.style.overflow===''&&!document.body.classList.contains('photography-gallery-open'));
  assert.equal(await page.locator('.gaming-marquee-card').count(),0,'native close unmounts every animated card');
  const counts=[];
  if(!touch){const cdp=await context.newCDPSession(page);for(let i=0;i<4;i++){await open(page);await gallery.locator('header button').click();await page.waitForFunction(()=>document.body.style.overflow===''&&!document.body.classList.contains('photography-gallery-open'));await cdp.send('HeapProfiler.collectGarbage');counts.push(await cdp.send('Memory.getDOMCounters'));}assert.ok(counts.at(-1).nodes-counts[1].nodes<30);assert.ok(counts.at(-1).jsEventListeners-counts[1].jsEventListeners<10);}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  rows.push({viewport:[width,height],columns:expectedColumns,uniqueGames:titles.length,animation:true,input:touch?'native touch swipe':'hover and wheel',keyboard:true,seams,reducedMotion:true,closedAndUnmounted:true,counts,errors});console.log(JSON.stringify(rows.at(-1)));await fs.writeFile(path.join(out,'results.json'),JSON.stringify(rows,null,2));
 }catch(error){await page.screenshot({path:path.join(out,width+'-failure.png')});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({viewport:[width,height],error:error.stack,errors,rows},null,2));throw error;}finally{await context.close();}
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
