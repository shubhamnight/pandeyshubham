const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:320,height:480},hasTouch:true,isMobile:true}),page=await context.newPage();
  await require('./helpers/site.cjs').enter(page,'#projects');
  await page.locator('.portfolio-intro').waitFor({state:'detached'});await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
  await page.locator('.floating-nav a[href="#projects"]').evaluate(e=>e.click());
  await page.locator('#music-walkman').click();await page.locator('#music-gallery .music-song-copy').waitFor();
  const gallery=page.locator('#music-gallery'),copy=gallery.locator('.music-song-copy'),cdp=await context.newCDPSession(page);
  async function select(index){await gallery.getByRole('button',{name:'Songs',exact:true}).click();await gallery.locator('.dcc-opt').nth(index).click();}
  await select(3);
  const b=await copy.boundingBox(),x=b.x+b.width/2,start=b.y+b.height-15,end=b.y+16;
  const title=await copy.locator('h3').innerText();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,id:1}]});
  for(let i=1;i<=10;i++){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*i/10,id:1}]});await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);
  const scrolled=await copy.evaluate(e=>e.scrollTop);
  assert.ok(scrolled>0,'native touch can read the clipped end of a longer card');
  assert.equal(await copy.locator('h3').innerText(),title,'reading does not navigate the discs');
  await select(13);
  assert.equal(await copy.evaluate(e=>e.scrollTop),0,'a new song starts at the top of its copy');
  await copy.evaluate(e=>e.scrollTop=e.scrollHeight);await select(20);
  assert.equal(await copy.evaluate(e=>e.scrollTop),0,'direct menu changes also reset long-copy scrolling');
  await context.close();console.log(JSON.stringify({viewport:[320,480],nativeTextScroll:true,noAccidentalSongChange:true,newSongStartsAtTop:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
