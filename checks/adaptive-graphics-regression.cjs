// Browser emulation with hardware overrides and synthetic frame-pressure input;
// this verifies real drawing buffers, not physical-device performance claims.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {enter,hobbies,save}=require('./helpers/site.cjs');
const cases=[['laptop',1366,768,false,2,8,8],['phone',393,873,true,3,8,8],
 ['unknown-safari-tablet',820,1180,true,2,null,null],['weak-laptop',1366,768,false,2,4,4],
 ['weak-phone',393,873,true,3,4,4],['weak-tablet',820,1180,true,2,4,4]];
const snapshot=page=>page.evaluate(()=>{
 const models=[...document.querySelectorAll('.hobby-orbit-center button canvas')].map(canvas=>{
  const gl=canvas.getContext('webgl2'),button=canvas.closest('button');
  return {id:button.id,width:canvas.width,height:canvas.height,cssWidth:button.clientWidth,cssHeight:button.clientHeight,
   bufferWidth:gl.drawingBufferWidth,bufferHeight:gl.drawingBufferHeight,antialias:gl.getContextAttributes().antialias};
 });
 const previews=[...document.querySelectorAll('.hobby-video-canvas')].map(canvas=>({width:canvas.width,height:canvas.height,
  cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight,smoothing:canvas.getContext('2d').imageSmoothingQuality}));
 const canvas=document.querySelector('#contact .connect-aether-mount')?.shadowRoot?.querySelector('canvas');
 const background=canvas?{width:canvas.width,height:canvas.height,cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight}:null;
 return {models,previews,background,fonts:[...document.querySelectorAll('.floating-nav a')].map(e=>getComputedStyle(e).fontFamily)};
});
async function footer(page){
 await page.locator('#contact').evaluate(e=>e.scrollIntoView());
 await page.locator('#contact canvas').waitFor({state:'visible',timeout:30000});
}
async function idle(page){
 await page.locator('.floating-nav a[href="#playground"]').evaluate(e=>e.click());
 await page.waitForFunction(()=>!document.querySelector('#projects').classList.contains('orbits-running'));
 await page.evaluate(()=>{window.qaIdleAt=performance.now();window.qaLastFrames=window.qaFrames;});
 await page.waitForFunction(()=>{
  if(window.qaLastFrames!==window.qaFrames){window.qaLastFrames=window.qaFrames;window.qaIdleAt=performance.now();}
  return performance.now()-window.qaIdleAt>=300;
 },null,{polling:100,timeout:15000});
 await page.evaluate(()=>window.qaFrames=0);await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>window.qaFrames),0,'offscreen graphics must have no animation-frame loop');
}
(async()=>{
 const browser=await chromium.launch({headless:true}),results=[];
 try{for(const [profile,width,height,touch,dpr,memory,cores]of cases){
  if(process.env.BROWSER_PROFILE&&process.env.BROWSER_PROFILE!==profile)continue;
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:dpr});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({memory,cores,safari})=>{
   Object.defineProperty(navigator,'deviceMemory',{get:()=>memory??undefined,configurable:true});
   Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>cores??undefined,configurable:true});
   if(safari){
    Object.defineProperty(navigator,'platform',{get:()=>'MacIntel',configurable:true});
    Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5,configurable:true});
    const query=matchMedia.bind(window);window.matchMedia=value=>{const result=query(value);if(value.replace(/\s/g,'')==='(pointer:coarse)')Object.defineProperty(result,'matches',{value:false});return result;};
   }
   window.qaFrames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(time=>{window.qaFrames++;callback(time);});
  },{memory,cores,safari:profile.startsWith('unknown')});
  await page.route('**/hobby-video-card.js',require('./helpers/instrument-source.cjs')('hobby-video-card.js',source=>
   source.replace("const video=document.createElement('video');","const video=document.createElement('video');(window.qaPreviewVideos??=[]).push(video);")));
  await page.route('**/graphics-quality.js',require('./helpers/instrument-source.cjs')('graphics-quality.js',source=>
   source.replace('export function reportGraphicsFrame(time,active=true){','export function reportGraphicsFrame(time,active=true){window.qaGraphicsReports=(window.qaGraphicsReports||0)+1;')));
  try{
   await enter(page);await hobbies(page);
   await page.waitForFunction(()=>document.querySelectorAll('.hobby-orbit-center button canvas').length===4&&document.querySelectorAll('.hobby-video-canvas').length>0);
   await footer(page);await idle(page);const before=await snapshot(page),weak=profile.startsWith('weak');
   const modelRatio=weak?1:touch?1.25:1.5,backgroundRatio=weak?1:touch?1.25:1.35;
   for(const model of before.models){
    assert.equal(model.width,Math.floor(model.cssWidth*modelRatio),profile+' initial model density');
    assert.equal(model.height,Math.floor(model.cssHeight*modelRatio));
    assert.equal(model.bufferWidth,model.width);assert.equal(model.bufferHeight,model.height);assert.equal(model.antialias,true);
   }
   assert.ok(before.background,'the bundled footer exposes its real canvas');
   assert.equal(before.background.width,Math.round(before.background.cssWidth*backgroundRatio));
   assert.ok(await page.evaluate(()=>window.qaGraphicsReports>0),'existing visible scene frames feed native quality evidence');
   assert.ok(await page.evaluate(async()=>{
    const clock=await import('/hobby-motion-clock.js'),before=window.qaGraphicsReports;
    await new Promise(resolve=>{function videoPaint(){clock.cancelHobbyFrame(videoPaint);resolve();}clock.requestHobbyFrame(videoPaint,40,false);});
    return window.qaGraphicsReports===before;
   }),'a video-only composite frame cannot be mistaken for slow display refresh');
   await page.evaluate(()=>window.qaFrames=0);
   const sources=await page.evaluate(()=>window.qaPreviewVideos.map(video=>video.getAttribute('src')));
   const latched=await page.evaluate(async()=>{
    const api=await import('/graphics-quality.js');let changed=false;
    const start=performance.now();for(let index=0;index<140;index++)changed=api.reportGraphicsFrame(start+index*60)||changed;
    return changed;
   });
   assert.equal(latched,!weak,'only capable/unknown hardware needs the synthetic pressure downshift');
   await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.qaFrames),0,'quality changes do not start offscreen frame loops');
   const lowered=await snapshot(page);
   assert.equal(lowered.background.width,Math.round(before.background.cssWidth),'native pressure reaches the separately bundled footer');
   if(!weak)assert.ok(lowered.previews.some((canvas,index)=>canvas.width<before.previews[index].width),'existing preview backing stores shrink in place');
   lowered.previews.forEach((canvas,index)=>{
    assert.equal(canvas.smoothing,'high');assert.equal(canvas.cssWidth,before.previews[index].cssWidth);assert.equal(canvas.cssHeight,before.previews[index].cssHeight);
   });
   assert.deepEqual(await page.evaluate(()=>window.qaPreviewVideos.map(video=>video.getAttribute('src'))),sources,'quality changes never replace video sources');
   await hobbies(page);const after=await snapshot(page);
   for(const model of after.models){
    assert.equal(model.width,model.cssWidth);assert.equal(model.height,model.cssHeight);assert.equal(model.antialias,true);
    const original=before.models.find(item=>item.id===model.id);assert.equal(model.cssWidth,original.cssWidth);assert.equal(model.cssHeight,original.cssHeight);
   }
   assert.deepEqual(after.fonts,before.fonts,'font rendering choices remain unchanged');
   await idle(page);
   await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
   // Restoration may schedule a one-off visibility check before settling.
   await page.waitForTimeout(300);await page.evaluate(()=>window.qaFrames=0);
   await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.qaFrames),0,'BFCache restoration of an offscreen scene stays idle');
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
   await page.waitForTimeout(300);
   assert.ok(await page.locator('.hobby-orbit-center button canvas').evaluateAll(canvases=>canvases.every(canvas=>canvas.getContext('webgl2').isContextLost())),'permanent disposal releases model contexts');
   assert.ok(await page.evaluate(()=>window.qaPreviewVideos.every(video=>!video.hasAttribute('src')&&video.paused)),'permanent disposal releases video decoders');
   assert.equal(await page.evaluate(()=>globalThis[Symbol.for('portfolio.graphics-quality')].listeners.size),0,'quality subscriptions are released');
   assert.deepEqual(errors,[]);results.push({profile,evidence:'emulated hints and synthetic pressure; real GPU/2D buffers',before,after,latched,offscreenFrames:0,disposed:true,errors});
  }catch(error){results.push({profile,error:error.message,errors});await save('adaptive-graphics',results);throw error;}
  finally{await context.close();}
 }}finally{await browser.close();}
 await save('adaptive-graphics',results);console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
