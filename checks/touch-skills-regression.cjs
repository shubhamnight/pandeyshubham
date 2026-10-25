// Exercise native phone input in the middle of the hero/Skills transition.
// Debug reads are injected by the test route, never shipped in the website.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),cp=require('node:child_process'),sharp=require('sharp');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const output=path.resolve(process.env.AUDIT_OUTPUT||'output/phone-scroll-2026-10-25/regression');
const diagnostic=`\nwindow.qaSkillsState=()=>({mode,entranceTime,orbitTime,focusInside,pointerInside,retreat:retreat?.progress??null,scroll:getSmoothPosition(),visible:slots.filter(e=>getComputedStyle(e).visibility==='visible').length});`;
async function state(page){return page.evaluate(()=>window.qaSkillsState());}
async function orbit(page){await page.waitForFunction(()=>{const s=window.qaSkillsState();return s.mode==='orbit'&&s.visible===14;},undefined,{timeout:18000});}
async function pixels(page,name,{allowOffscreen=false}={}){
 const points=await page.locator('.skills-orbit-slot').evaluateAll(elements=>elements.map(e=>{
  const r=e.getBoundingClientRect();return {name:e.querySelector('.skills-orbit-disc').getAttribute('aria-label'),x:r.x+r.width/2,y:r.y+r.height/2};
 }));
 const viewport=page.viewportSize(),screenshot=await page.screenshot({path:path.join(output,name+'.png')});
 const {data,info}=await sharp(screenshot).ensureAlpha().raw().toBuffer({resolveWithObject:true}),ratio=info.width/viewport.width,counts=[];
 for(const point of points){
  // The incoming page is deliberately only partly in the screen during the
  // hero transition. Check its in-frame pixels here, then require every icon
  // in the later fully visible stage; scrolling has not changed the design.
  if(allowOffscreen&&(point.x<=5||point.x>=viewport.width-5||point.y<=5||point.y>=viewport.height-5)){
   counts.push({name:point.name,outsideViewport:true});continue;
  }
  assert.ok(point.x>5&&point.x<viewport.width-5&&point.y>5&&point.y<viewport.height-5,point.name+' is inside the viewport');
  const x=Math.round(point.x*ratio),y=Math.round(point.y*ratio);let painted=0,total=0;
  for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
   const i=((y+dy)*info.width+x+dx)*4;total++;if(data[i]+data[i+1]+data[i+2]>55)painted++;
  }
  assert.ok(painted/total>.7,point.name+' is painted, not merely present in the DOM');counts.push({name:point.name,painted,total});
 }
 return counts;
}
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true}),results=[];
 try{for(const [width,height]of [[393,873],[360,800],[768,1024]]){
  if(process.env.PHONE_CHECK_WIDTH&&Number(process.env.PHONE_CHECK_WIDTH)!==width)continue;
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/skills.js',async route=>{
   if(process.env.PHONE_REFERENCE){
    const source=cp.execFileSync('git',['show',process.env.PHONE_REFERENCE+':skills.js'],{encoding:'utf8'});
    return route.fulfill({contentType:'text/javascript',body:source+diagnostic});
   }
   const response=await route.fetch();return route.fulfill({response,body:(await response.text())+diagnostic});
  });
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  try{
   await page.goto(origin+'/?photo-quality=4k');await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).tap({timeout:45000});
   await page.locator('.portfolio-intro').waitFor({state:'detached'});await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
   await page.waitForFunction(()=>document.querySelectorAll('.skill-shiny-button').length===14);
   const hero=await page.locator('#home').evaluate(e=>e.offsetHeight);
   await page.evaluate(async y=>{for(let i=0;i<=32;i++){scrollTo(0,y*i/32);await new Promise(requestAnimationFrame);}},hero*.72);
   await page.waitForTimeout(1100);await page.evaluate(()=>scrollBy(0,-1));
   const button=page.locator('.skill-shiny-button').nth(1),box=await button.boundingBox();
   await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
   await button.dispatchEvent('pointerover',{pointerType:'mouse',bubbles:true});
   checks.push('one-pixel settling, touch focus and compatibility pointer during entrance');
   await orbit(page);const stopped=await state(page);assert.equal(stopped.focusInside,false);assert.equal(stopped.pointerInside,false);
   const painted=await pixels(page,width+'-mid-transition',{allowOffscreen:true});
   await page.waitForTimeout(1500);assert.ok((await state(page)).orbitTime>stopped.orbitTime,'orbit keeps running without further scrolling');checks.push('all 14 holders visible, in-frame icons painted and orbit running while idle');
   await page.evaluate(()=>scrollBy(0,-30));await page.waitForFunction(()=>window.qaSkillsState().mode==='retreat');checks.push('genuine reverse gesture keeps the existing retreat');
   await page.evaluate(y=>scrollTo(0,y),hero+2);await orbit(page);await pixels(page,width+'-complete-ring');checks.push('all 14 icons painted in the complete Skills viewport');
   await page.keyboard.press('Tab');await button.focus();await page.waitForFunction(()=>window.qaSkillsState().focusInside);
   const focused=await state(page);await page.waitForTimeout(500);assert.equal((await state(page)).orbitTime,focused.orbitTime,'keyboard focus still pauses the orbit');
   await button.evaluate(e=>e.blur());await page.waitForFunction(()=>!window.qaSkillsState().focusInside);checks.push('keyboard pause and blur resume preserved');
   await page.evaluate(()=>document.querySelector('.floating-nav a[href="#home"]').click());await page.waitForFunction(()=>scrollY<2);await page.waitForTimeout(1200);
   for(let swipe=0;swipe<2;swipe++){
    const start=height*.86,end=height*.53;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:8,y:start,id:1}]});
    for(let i=1;i<=15;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:8,y:start+(end-start)*i/15,id:1}]});await page.waitForTimeout(20);}
    await page.waitForTimeout(80);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   await orbit(page);await pixels(page,width+'-native-swipes',{allowOffscreen:true});checks.push('native touch swipes settle without stranded icons');
   assert.deepEqual(errors,[]);results.push({viewport:[width,height],cpu:4,checks,stopped,painted,errors});
   console.log(JSON.stringify({viewport:[width,height],checks,errors}));await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
  }catch(error){const snapshot=await state(page);await page.screenshot({path:path.join(output,width+'-failure.png')});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({viewport:[width,height],error:error.stack,state:snapshot,results},null,2));console.log(JSON.stringify({viewport:[width,height],state:snapshot}));throw error;}
  finally{await page.close();}
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
