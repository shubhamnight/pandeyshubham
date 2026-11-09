const assert=require('node:assert/strict'),sharp=require('sharp');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {profiles,enter,save}=require('./helpers/site.cjs');
const files=require('node:fs/promises'),path=require('node:path');
const output=path.resolve(process.env.AUDIT_OUTPUT||'output/regressions/id-card');
(async()=>{await files.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true}),results=[];
 try{for(const [name,width,height,touch]of [...profiles,['narrow-phone',320,568,true],['short-landscape',844,390,true]]){
  if(process.env.BROWSER_PROFILE&&process.env.BROWSER_PROFILE!==name)continue;
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.qaBadgeFrames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(time=>{if(callback.name==='animateBadge')window.qaBadgeFrames++;callback(time);if(callback.name==='animateBadge'){window.qaInitialAngles ||= [];window.qaInitialAngles.push(Number(document.querySelector('.badge-rig')?.style.transform.match(/rotateZ\(([-\d.]+)deg\)/)?.[1]||0));}});});
  await enter(page);await page.bringToFront();const card=page.locator('.badge'),rig=page.locator('.badge-rig'),cdp=await page.context().newCDPSession(page);
  async function settled(){await page.waitForFunction(()=>!document.querySelector('.badge').classList.contains('dragging')&&!document.querySelector('.badge-rig').classList.contains('is-moving'),null,{timeout:20000});assert.ok(await rig.evaluate(e=>!/(NaN|Infinity)/.test(e.getAttribute('style')||'')));}
  async function startDrag(dx=50,dy=25,steps=5){const b=await card.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
   if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=steps;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/steps,y:y+dy*i/steps,id:1}]});await page.waitForTimeout(20);}}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});}
   await page.waitForFunction(()=>document.querySelector('.badge').classList.contains('dragging'));
  }
  async function endDrag(){
   if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else{await page.mouse.up();await page.mouse.move(1,1);}
  }
  async function releaseDrag(){await endDrag();await settled();}
  async function sampleMotion(duration){
   return page.evaluate(duration=>new Promise(resolve=>{
    const samples=[],start=performance.now(),angle=e=>Number(e.style.transform.match(/rotateZ\(([-\d.]+)deg\)/)?.[1]||0);
    function sample(now){samples.push({time:now-start,strap:angle(document.querySelector('.badge-rig')),body:angle(document.querySelector('.badge-hanger'))});if(now-start<duration)requestAnimationFrame(sample);else resolve(samples);}
    requestAnimationFrame(sample);
   }),duration);
  }
  async function connected(){
   assert.ok(await rig.evaluate(e=>{
    const reel=e.querySelector('.lanyard-reel').getBoundingClientRect(),cord=e.querySelector('.lanyard-cord').getBoundingClientRect(),clip=e.querySelector('.lanyard-clip').getBoundingClientRect(),slot=e.querySelector('.slot').getBoundingClientRect();
    return cord.top<=reel.bottom+4&&cord.bottom>=clip.top-4&&clip.bottom>=slot.top-5&&clip.top<=slot.bottom+5&&Math.abs(clip.x+clip.width/2-slot.x-slot.width/2)<slot.width/2+4;
   }),'reel, cord, metal clip and existing card slot remain connected');
  }
  await page.waitForFunction(()=>window.qaInitialAngles?.some(angle=>Math.abs(angle)>.05),undefined,{timeout:5000});
  await settled();
  assert.equal(await card.count(),1,'hero uses one original ID card');
  for(const selector of ['.lanyard-ring','.lanyard-reel','.lanyard-cord','.lanyard-clip']){
   assert.equal(await rig.locator(selector).count(),1,'one suspension part: '+selector);
   assert.ok(await rig.locator(selector).evaluate(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).visibility==='visible';}),'visible suspension part: '+selector);
  }
  assert.equal(await rig.locator('[data-rail],[data-face="back"],.badge-back').count(),0,'no team rail or flip face is introduced');
  const front=await card.evaluate(e=>({
   image:e.querySelector('img').getAttribute('src'),text:e.textContent.trim(),strip:!!e.querySelector('.badge-bottom'),
   color:getComputedStyle(e.querySelector('.badge-face')).backgroundColor,pattern:getComputedStyle(e.querySelector('.badge-face')).backgroundImage,
   patternSize:getComputedStyle(e.querySelector('.badge-face')).backgroundSize,
  }));
  assert.match(front.image,/assets\/profile\/shubham-pandey-hero-640\.webp$/);
  assert.equal(front.text,'','the ID card has no visible lettering');
  assert.equal(front.strip,false,'the ID card has no footer strip');
  assert.equal(front.color,'rgb(36, 36, 36)');assert.match(front.pattern,/radial-gradient/);assert.match(front.patternSize,/9px 9px/);
  await connected();
  const restingCard=await card.boundingBox(),restingCord=await rig.locator('.lanyard-cord').boundingBox();
  await startDrag(0,85);
  await page.waitForFunction(({cordHeight,cardY})=>document.querySelector('.lanyard-cord').getBoundingClientRect().height>cordHeight+6&&document.querySelector('.badge').getBoundingClientRect().y>cardY+8,{cordHeight:restingCord.height,cardY:restingCard.y});
  await connected();await releaseDrag();await connected();
  assert.ok(Math.abs((await card.boundingBox()).y-restingCard.y)<2,'released reel retracts to the original card position');
  assert.ok(Math.abs((await rig.locator('.lanyard-cord').boundingBox()).height-restingCord.height)<2,'released cord returns to its rest length');
  {
   const centerX=restingCard.x+restingCard.width/2, centerY=restingCard.y+restingCard.height/2;
   const dx=-Math.min(width/2-10,centerX-4), dy=Math.min(170,height-centerY-4);
   await startDrag(dx,dy,10);await page.waitForTimeout(500);
   const pulled=await card.boundingBox();
   assert.ok(pulled.x>=-1&&pulled.y>=-1&&pulled.x+pulled.width<=width+1&&pulled.y+pulled.height<=height+1,'diagonal pull keeps the complete card inside the '+width+'x'+height+' viewport: '+JSON.stringify(pulled));
   await releaseDrag();
  }
  await startDrag(70,0);
  await page.waitForFunction(x=>Math.abs(document.querySelector('.badge').getBoundingClientRect().x+document.querySelector('.badge').getBoundingClientRect().width/2-x)>8,restingCard.x+restingCard.width/2);
  const lagMotion=await sampleMotion(400);
  assert.ok(lagMotion.some(p=>Math.abs(p.body)>.05),'card body lags independently behind the strap instead of moving in lockstep');
  assert.ok(Math.max(...lagMotion.map(p=>p.body))-Math.min(...lagMotion.map(p=>p.body))>.02,'relative card rotation changes as the strap swings');
  await endDrag();
  const releaseMotion=await sampleMotion(4000);
  await files.writeFile(path.join(output,name+'-swing.json'),JSON.stringify({lagMotion,releaseMotion},null,2));
  assert.ok(releaseMotion.every(p=>Number.isFinite(p.strap)&&Number.isFinite(p.body)&&Math.abs(p.strap)<=18.01),'released strap angle is finite and bounded');
  assert.ok(releaseMotion.some(p=>p.strap>.02)&&releaseMotion.some(p=>p.strap<-.02),'released strap naturally overshoots both sides');
  const peak=points=>Math.max(...points.map(p=>Math.abs(p.strap)));
  assert.ok(peak(releaseMotion.filter(p=>p.time>3000))<peak(releaseMotion.filter(p=>p.time<1000)),'successive released swings lose energy');
  await settled();
  await startDrag(70,0);await endDrag();await sampleMotion(500);
  const regrabBox=await card.boundingBox(),grabX=regrabBox.x+regrabBox.width/2,grabY=regrabBox.y+regrabBox.height/2;
  if(!touch)await page.mouse.move(grabX,grabY);
  const beforeGrab=(await sampleMotion(0))[0];
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:grabX,y:grabY,id:1}]});else await page.mouse.down();
  const heldMotion=await sampleMotion(80),continuity=[beforeGrab,...heldMotion];
  assert.ok(heldMotion.every(p=>Math.abs(p.strap-beforeGrab.strap)<1),'stationary native regrab does not snap the swinging strap');
  for(let i=1;i<continuity.length;i++){
   const previous=continuity[i-1],current=continuity[i];
   assert.ok(Math.abs(current.strap+current.body-previous.strap-previous.body)<1,'regrab card-body angle remains continuous between frames');
  }
  await releaseDrag();await card.click();await page.mouse.move(1,1);await settled();
  assert.equal(await rig.locator('[data-face="back"],.badge-back').count(),0,'a click never creates a flipped back');
  assert.ok(await card.evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return m.m11>0&&m.m33>0;}),'the card continues facing front after a click');
  await startDrag();
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
   const b=await card.boundingBox();assert.ok(b.x>=-1&&b.y>=-1&&b.x+b.width<=w+1&&b.y+b.height<=h+1,'the resting card fits '+w+'x'+h+' after resize: '+JSON.stringify(b));
   const clip={left:Math.max(0,Math.ceil(b.x)),top:Math.max(0,Math.ceil(b.y)),width:Math.floor(b.width)-2,height:Math.floor(b.height)-2};
   const cardPixels=async()=>sharp(await page.screenshot()).extract(clip).removeAlpha().raw().toBuffer();
   const portrait=card.locator('img');
   await portrait.evaluate(image=>image.style.visibility='hidden');
   const faceOnly=await cardPixels();
   await portrait.evaluate(image=>image.style.removeProperty('visibility'));
   const bottomStart=Math.floor(clip.height*.87)*clip.width*3;
   for(let frame=0;frame<3;frame++){
    const data=await cardPixels();
    let portraitPixels=0,bottomPixels=0,warmPixels=0;
    for(let i=0;i<data.length;i+=3)if(Math.abs(data[i]-faceOnly[i])>8){
     portraitPixels++;
     if(i>=bottomStart)bottomPixels++;
     if(data[i]-data[i+1]>20&&data[i]-data[i+2]>25)warmPixels++;
    }
    assert.ok(portraitPixels*3/data.length>.2,'the portrait paints on the settled card');
    assert.ok(bottomPixels*3/(data.length-bottomStart)>.2,'the portrait fills the space at the bottom of the card');
    assert.ok(warmPixels*3/data.length>.01,'the portrait paints in its original colors');
    paint.push({viewport:[w,h],portraitPixels,bottomPixels});
   }
  }
  await page.screenshot({path:path.join(output,name+'-lanyard.png')});
  await page.emulateMedia({reducedMotion:'reduce'});await settled();assert.deepEqual(errors,[]);
  results.push({profile:name,nativeDrag:true,pullRetraction:true,independentBodyLag:true,releaseOvershootDecay:true,initialCue:true,regrabContinuity:true,diagonalContainment:true,connectedHardware:true,frontPreserved:front,cancellation:true,blurRelease:true,keyboard:true,idleStops:true,rotation:true,settledPaintSamples:paint,errors});console.log(name+' ID input, viewport and settled-paint checks passed');await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:393,height:873},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await reduced.addInitScript(()=>{window.qaBadgeFrames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(time=>{if(callback.name==='animateBadge')window.qaBadgeFrames++;callback(time);});});
 try{
  await enter(reduced);await reduced.waitForTimeout(250);
  assert.equal(await reduced.evaluate(()=>window.qaBadgeFrames),0,'fresh reduced-motion entry starts no introductory spring frames');
  assert.ok(await reduced.locator('.badge-rig').evaluate(e=>!e.classList.contains('is-moving')),'fresh reduced-motion entry remains still');
  results.push({reducedMotionStartup:true});
 }finally{await reduced.close();}
 }finally{await browser.close();}await save('id-card',results);
})().catch(error=>{console.error(error);process.exitCode=1;});
