const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000',out=path.resolve(process.env.AUDIT_OUTPUT||'output/cursor-follower');
async function entered(page){await page.goto(origin);await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});await page.locator('.portfolio-intro').waitFor({state:'detached'});await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));}
async function move(page,x,y){await page.mouse.move(x,y);await page.waitForTimeout(1400);return page.locator('.batman-follower').boundingBox();}
(async()=>{await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});const rows=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/cursor-follower.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/function tick\(time\)\s*\{/,'function tick(time) { window.qaFollowerFrames=(window.qaFollowerFrames||0)+1;')});});
 await entered(page);let box=await move(page,850,350);assert.ok(Math.abs(box.x-868)<.2&&Math.abs(box.y-368)<.2,'logo trails the native pointer at an offset');
 await page.waitForTimeout(200);const idle=await page.evaluate(()=>window.qaFollowerFrames);assert.equal(typeof idle,'number','frame diagnostic was injected');await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.qaFollowerFrames),idle,'no idle follower RAF loop');
 assert.equal(await page.locator('.batman-follower').getAttribute('aria-hidden'),'true');assert.equal(await page.locator('.batman-follower').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 assert.ok(await page.locator('.batman-follower img').evaluate(e=>e.complete&&e.naturalWidth>0&&e.src.endsWith('/batman/follower.svg')),'dedicated beveled model loads');
 assert.ok(await page.evaluate(()=>!getComputedStyle(document.body).cursor.includes('url(')));
 assert.equal(await page.locator('.badge').evaluate(e=>getComputedStyle(e).cursor),'grab');
 const old=box;await page.mouse.move(1100,550);await page.waitForTimeout(25);box=await page.locator('.batman-follower').boundingBox();assert.ok(box.x>old.x&&box.x<1118,'mouse has a smooth follower, not a cursor replacement');
 assert.ok(await page.locator('.batman-follower img').evaluate(e=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return Math.max(Math.abs(m.m12),Math.abs(m.m13),Math.abs(m.m23))>.0001||Math.abs(m.m11-m.m22)>.01;}),'model stretches or turns while following');await page.waitForTimeout(600);
 await page.mouse.move(1438,898);await page.waitForTimeout(600);box=await page.locator('.batman-follower').boundingBox();assert.ok(box.x+box.width<=1440&&box.y+box.height<=900,'decoration stays in viewport');
 await page.evaluate(()=>document.querySelector('.floating-nav a[href="#projects"]').click());await page.waitForFunction(()=>!document.querySelector('#projects').inert&&document.querySelector('#projects').hobbyEntranceProgress===1&&[...document.querySelectorAll('.hobby-orbit-center button')].every(e=>e.dataset.hobbyCompiling==='false'));
 for(const [button,id,root]of [['gaming-controller','gaming','.gaming-marquee-column'],['travel-plane','travel','.zoom-slider'],['music-walkman','music','.dcc-root'],['photography-camera','photography','.photo-carousel']]){
  const b=await page.locator('#'+button).boundingBox();await page.mouse.click(Math.max(4,Math.min(1436,b.x+b.width/2)),Math.max(4,Math.min(896,b.y+b.height/2)));const dialog=page.locator('#'+id+'-gallery');await dialog.locator(root).first().waitFor({state:'visible'});
  await move(page,720,450);assert.equal(await page.locator('.batman-follower').evaluate(e=>e.parentElement.id),id+'-gallery','logo follows above native top-layer dialog');
  if(id==='travel')assert.equal(await dialog.locator('.zoom-slider').evaluate(e=>getComputedStyle(e).cursor),'grab');
  if(id==='music')assert.equal(await dialog.getByRole('button',{name:'Next song',exact:true}).evaluate(e=>getComputedStyle(e).cursor),'pointer');
  const close=dialog.locator('header button'),r=await close.boundingBox();assert.equal(await close.evaluate(e=>getComputedStyle(e).cursor),'pointer');
  await move(page,r.x+r.width/2,r.y+r.height/2);await close.click();await page.waitForFunction(()=>document.body.style.overflow===''&&!document.body.classList.contains('photography-gallery-open'));assert.equal(await page.locator('.batman-follower').evaluate(e=>e.parentElement.tagName),'BODY');
 }
 // Even the decoration's own painted centre must hit the underlying page.
 box=await move(page,720,450);assert.ok(await page.evaluate(({x,y})=>!document.elementFromPoint(x,y)?.closest('.batman-follower'),{x:box.x+20,y:box.y+12}));
 await page.evaluate(()=>dispatchEvent(new Event('blur')));assert.equal(await page.locator('.batman-follower').isVisible(),false);await move(page,740,450);assert.equal(await page.locator('.batman-follower').count(),1);
 await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(900,400);await page.waitForTimeout(40);box=await page.locator('.batman-follower').boundingBox();assert.ok(Math.abs(box.x-918)<.2,'reduced motion snaps without trailing animation');
 await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));assert.equal(await page.locator('.batman-follower').count(),0);await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await move(page,920,410);assert.equal(await page.locator('.batman-follower').count(),1);
 await page.screenshot({path:path.join(out,'desktop.png')});assert.deepEqual(errors,[]);rows.push({profile:'desktop',nativeCursors:true,allOverlays:true,clickThrough:true,idleStops:true,reducedMotion:true,bfcache:true,errors});await context.close();
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await entered(phone);await phone.mouse.move(200,300);await phone.touchscreen.tap(100,200);assert.equal(await phone.locator('.batman-follower').count(),0,'no decorative mouse loop on touch-only devices');rows.push({profile:'phone',noMouseFollower:true});await phone.close();
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
