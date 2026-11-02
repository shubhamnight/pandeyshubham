const assert=require('node:assert/strict'),sharp=require('sharp');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {profiles,enter,save}=require('./helpers/site.cjs');
(async()=>{const browser=await chromium.launch({headless:true}),results=[];
 try{for(const [name,width,height,touch]of profiles){
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.qaBadgeFrames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(time=>{if(callback.name==='animateBadge')window.qaBadgeFrames++;callback(time);});});
  await enter(page);const card=page.locator('.badge'),rig=page.locator('.badge-rig'),cdp=await page.context().newCDPSession(page);
  async function settled(){await page.waitForFunction(()=>!document.querySelector('.badge').classList.contains('dragging')&&!document.querySelector('.badge-rig').classList.contains('is-moving'),null,{timeout:20000});assert.ok(await rig.evaluate(e=>!/(NaN|Infinity)/.test(e.getAttribute('style')||'')));}
  async function startDrag(){const b=await card.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
   if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+50,y:y+25,id:1}]});}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+50,y+25,{steps:8});}
   await page.waitForFunction(()=>document.querySelector('.badge').classList.contains('dragging'));
  }
  await settled();await startDrag();
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else{await page.mouse.up();await page.mouse.move(1,1);}
  await settled();await startDrag();
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await card.dispatchEvent('pointercancel',{pointerId:1,isPrimary:true});await page.mouse.up();await page.mouse.move(1,1);}
  await settled();await startDrag();await page.evaluate(()=>dispatchEvent(new Event('blur')));
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else{await page.mouse.up();await page.mouse.move(1,1);}
  await settled();await card.focus();await page.keyboard.press('ArrowRight');await card.evaluate(e=>e.blur());await settled();
  const frames=await page.evaluate(()=>window.qaBadgeFrames);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.qaBadgeFrames),frames,'a settled card does not run an idle spring loop');
  const paint=[];
  for(const [w,h]of [[width,height],[height,width],[width,height]]){
   await page.setViewportSize({width:w,height:h});await settled();await page.waitForTimeout(150);
   const b=await card.boundingBox();assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=w+1&&b.y+b.height<=h+1,'the resting card fits the viewport after resize');
   for(let frame=0;frame<3;frame++){
    const image=await page.screenshot(),clip={left:Math.max(0,Math.ceil(b.x)),top:Math.max(0,Math.ceil(b.y)),width:Math.floor(b.width)-2,height:Math.floor(b.height)-2};
    const {data,info}=await sharp(image).extract(clip).removeAlpha().raw().toBuffer({resolveWithObject:true});let bright=0;
    for(let i=0;i<data.length;i+=info.channels)if(data[i]>150&&data[i+1]>150&&data[i+2]>150)bright++;
    assert.ok(bright/(info.width*info.height)>.001,'settled card samples contain the portrait/name paint');paint.push({viewport:[w,h],brightPixels:bright});
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});await settled();assert.deepEqual(errors,[]);
  results.push({profile:name,nativeDrag:true,cancellation:true,blurRelease:true,keyboard:true,idleStops:true,rotation:true,settledPaintSamples:paint,errors});console.log(name+' ID input, viewport and settled-paint checks passed');await page.close();
 }}finally{await browser.close();}await save('id-card',results);
})().catch(error=>{console.error(error);process.exitCode=1;});
