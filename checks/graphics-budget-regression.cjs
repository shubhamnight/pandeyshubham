// Real backing-store measurements; this does not claim physical-device FPS.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('output/graphics-budget'),baseline=process.env.GRAPHICS_BASELINE==='1';
const origin=process.env.AUDIT_URL||'http://localhost:3000';
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const [name,width,height,touch,dpr]of [['desktop',1440,900,false,2],['phone',390,844,true,3],['tablet',768,1024,true,2]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:touch,isMobile:touch});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'load'});
  await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});
  await page.locator('.portfolio-intro').waitFor({state:'detached'});
  await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('#home').offsetHeight+4));
  await page.waitForTimeout(700);
  await page.getByRole('link',{name:'Skills',exact:true}).click();
  await page.waitForTimeout(1800);
  await page.waitForFunction(()=>document.querySelectorAll('.skill-logo').length===14&&[...document.querySelectorAll('.skill-logo')].every(i=>i.complete&&i.naturalWidth));
  await page.getByRole('link',{name:'Hobbies',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#projects').inert&&document.querySelector('#projects').hobbyEntranceProgress===1&&[...document.querySelectorAll('.hobby-orbit-center')].every(e=>e.style.translate.split(' ').every(v=>Math.abs(parseFloat(v))<.01)),undefined,{timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('.hobby-orbit-center button.camera-ready canvas').length===4&&[...document.querySelectorAll('.hobby-orbit-center button')].every(b=>b.dataset.hobbyCompiling==='false'),undefined,{timeout:30000});
  await page.waitForTimeout(2000);
  async function models(){return page.locator('.hobby-orbit-center button').evaluateAll(buttons=>buttons.map(b=>{
   const c=b.querySelector('canvas'),gl=c.getContext('webgl2');
   return {id:b.id,cssWidth:b.clientWidth,cssHeight:b.clientHeight,width:c.width,height:c.height,draws:+b.dataset.modelDraws,pieces:+b.dataset.modelPieces,antialias:gl.getContextAttributes().antialias,contextLost:gl.isContextLost()};
  }));}
  const modelBuffers=await models();
  assert.equal(modelBuffers.length,4);assert.ok(modelBuffers.every(m=>!m.contextLost&&m.antialias&&m.draws>0));
  const previews=await page.locator('.hobby-video-canvas').evaluateAll(cs=>cs.map(c=>({width:c.width,height:c.height,slot:c.closest('.hobby-image-placeholder').offsetWidth})));
  await page.screenshot({path:path.join(output,`${name}-${baseline?'before':'after'}-hobbies.png`)});
  await page.setViewportSize({width:height,height:width});await page.waitForTimeout(350);
  const rotated=await models();
  await page.setViewportSize({width,height});
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.locator('#contact canvas').waitFor({state:'visible',timeout:15000});
  const backgrounds=await page.locator('#contact canvas').evaluateAll(cs=>cs.map(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight})));
  assert.ok(backgrounds.length);assert.deepEqual(errors,[]);
  if(!baseline){
   for(const m of [...modelBuffers,...rotated])assert.ok(m.width<=Math.floor(m.cssWidth*(touch?1.25:1.5))+1&&m.height<=Math.floor(m.cssHeight*(touch?1.25:1.5))+1,'bounded model buffer after resize');
   for(const c of backgrounds)assert.ok(c.width<=Math.round(c.cssWidth*(touch?1.25:1.35))+1,'bounded background buffer');
  }
  results.push({name,modelBuffers,previews,backgrounds,rotated,errors});
  console.log(name+' graphics measured');
  await context.close();
 }}finally{await browser.close();}
 await fs.writeFile(path.join(output,baseline?'before.json':'after.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
