const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {profiles,galleries,enter,hobbies,open,close,save}=require('./helpers/site.cjs');
const namedPlaces=new Set(Object.values(require('../travel-locations.json')).filter(Boolean));
(async()=>{const browser=await chromium.launch({headless:true}),results=[];
 try{for(const [name,width,height,touch]of profiles){
  if(process.env.BROWSER_PROFILE&&process.env.BROWSER_PROFILE!==name)continue;
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch}),errors=[],warnings=[];
  if(process.env.HISTORY_MUTATE_PRELOAD==='1')await page.route('**/',async route=>{
    const response=await route.fetch(),body=await response.text();
    await route.fulfill({response,body:body.replace('</head>','<link rel="preload" href="/assets/ui/travel-overlay.css" as="style"></head>')});
  });
  page.on('pageerror',error=>errors.push(error.message));const cdp=await page.context().newCDPSession(page);await cdp.send('Log.enable');cdp.on('Log.entryAdded',({entry})=>{if(/preload/i.test(entry.text)&&/\/(photography-carousel|travel-overlay|gaming-overlay|music-overlay)\.css/.test(entry.text))warnings.push(entry.text);});
  await enter(page,'#projects');assert.equal(await page.evaluate(()=>location.hash),'#projects');
  assert.deepEqual(await page.locator('.floating-nav a:not(.mini-brand)').allTextContents(),['Projects','Skills','Hobbies']);
  assert.match(await page.locator('.floating-nav a[href="#about"]').evaluate(e=>getComputedStyle(e).fontFamily),/Imbue/i);
  assert.equal((await page.locator('#home .badge').textContent()).trim(),'');
  await hobbies(page);
  assert.equal(await page.locator('.hobby-travel .travel-location-label').count(),0);
  assert.equal(await page.locator('#hobbies-heading').innerText(),'Beyond the screen\nThings I enjoy');
  assert.equal(await page.locator('#projects .project-heading>p').innerText(),'Open a gallery or view a 3D model.');
  assert.equal(await page.locator('head link[rel="preload"][as="style"]').count(),0,'closed gallery styles are not preloaded');
  assert.deepEqual(warnings,[]);
  const buttonPositions=[];
  for(const entry of galleries){const dialog=await open(page,entry);
   await page.mouse.move(1,1);await page.waitForTimeout(200);
   const closeStyle=await dialog.locator('header button').evaluate(e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect(),d=e.closest('dialog').getBoundingClientRect(),f=getComputedStyle(e.closest('dialog')),backdrop=getComputedStyle(e.closest('dialog'),'::backdrop');return {width:b.width,height:b.height,right:d.right-b.right,top:b.top-d.top,shadow:s.boxShadow,frameShadow:f.boxShadow,outline:f.outlineStyle,backdrop:backdrop.backgroundColor,blur:backdrop.backdropFilter};});
   assert.ok(Math.abs(closeStyle.width-closeStyle.height)<.1&&closeStyle.width>=36,'close control remains circular and usable');assert.notEqual(closeStyle.shadow,'none');assert.notEqual(closeStyle.frameShadow,'none');assert.equal(closeStyle.outline,'none');assert.match(closeStyle.backdrop,/rgba/);buttonPositions.push(closeStyle);
   if(entry[1]==='photography'){assert.ok((await dialog.locator('.photo-active-caption').allTextContents()).every(text=>!/^Photograph\s+\d+$/i.test(text.trim())));await dialog.locator('.photo-full-image').evaluate(async e=>{if(!e.complete)await e.decode();});assert.ok(await dialog.locator('.photo-full-image').evaluate(e=>e.naturalWidth>=e.clientWidth&&getComputedStyle(e).objectFit==='cover'),'photography uses a decoded, sufficiently sized full background');}
   if(entry[1]==='travel'){
    assert.ok(await dialog.locator('a').evaluateAll(links=>links.every(link=>link.target==='_blank'&&!link.closest('[data-travel-index]'))));const captions=await dialog.locator('.zoom-caption [data-title]').allTextContents();assert.ok(captions.length>0&&captions.every(text=>namedPlaces.has(text.trim())),'explicitly named places remain; unnamed images have no invented titles');
    assert.ok(captions.every(text=>!/^\d+$|Travel photograph\s*\d*/i.test(text.trim())));
    const point=await dialog.locator('.zoom-slider').evaluate(root=>{const shadow=root.getRootNode();for(let y=20;y<innerHeight-20;y+=12)for(let x=20;x<innerWidth-20;x+=12){const card=shadow.elementFromPoint(x,y)?.closest('button[data-travel-index]');if(card&&!card.inert&&card.getBoundingClientRect().width<root.clientWidth*.4)return {x,y,index:Number(card.dataset.travelIndex)};}return null;});
    assert.ok(point,'another Travel image can be clicked');await page.mouse.click(point.x,point.y);
    // The live region announces the strip's starting index, not its large featured
    // card. Verify the actual user-visible click result rather than that index.
    await dialog.locator('.zoom-slider').evaluate((root,index)=>new Promise((resolve,reject)=>{const started=performance.now();function sample(){const target=root.querySelector(`[data-travel-index="${index}"]`),b=target.getBoundingClientRect(),v=root.getBoundingClientRect();const visible=[...root.querySelectorAll('button[data-travel-index]')].map(e=>e.getBoundingClientRect()).filter(r=>r.left>=v.left-1&&r.right<=v.right+1);if(b.left>=v.left-1&&b.right<=v.right+1&&b.width>=Math.max(...visible.map(r=>r.width))-1)return resolve();if(performance.now()-started>10000)return reject(Error('Clicked Travel image did not reach the large featured position'));requestAnimationFrame(sample);}sample();}),point.index);
    assert.equal(await dialog.locator('video[controls]').count(),0);const videos=await dialog.locator('video').evaluateAll(es=>es.map(v=>{const s=getComputedStyle(v.closest('.zoom-image-wrap'));return {loop:v.loop,muted:v.muted,inline:v.playsInline,ratio:parseFloat(s.width)/parseFloat(s.height),exception:v.width===368&&v.height===496};}));assert.equal(videos.length,4);for(const v of videos){assert.ok(v.loop&&v.muted&&v.inline);assert.ok(Math.abs(v.ratio-(v.exception?4/3:9/16))<.02,'Travel video frames keep their intended orientation');}
   }
   if(entry[1]==='music'){
    assert.ok(await dialog.locator('a').evaluateAll(links=>links.every(link=>link.target==='_blank'&&!link.closest('[data-travel-index]'))));assert.equal(await dialog.locator('.music-song-number,.music-stack-intro').count(),0);assert.equal(await dialog.locator('header .eyebrow').count(),0);assert.equal((await dialog.locator('header h2').innerText()).trim(),'Music');
    const type=await dialog.locator('.music-song-copy').evaluate(e=>({singer:getComputedStyle(e.querySelector('.music-song-singer')).fontFamily,lyrics:getComputedStyle(e.querySelector('.music-song-lyric')).fontFamily}));assert.match(type.singer,/Imbue/);assert.match(type.lyrics,/Imbue/);
   }
   await close(page,dialog);
  }
  assert.ok(buttonPositions.every(p=>Math.abs(p.right+p.width/2-buttonPositions[0].right-buttonPositions[0].width/2)<=1.01&&Math.abs(p.top+p.height/2-buttonPositions[0].top-buttonPositions[0].height/2)<=1.01),'all overlay close crosses share their optical center placement within one CSS pixel: '+JSON.stringify(buttonPositions.map(({right,top,width,height})=>({right,top,width,height}))));
  assert.equal(await page.locator('#profile .signature-name').innerText(),'Shubham');assert.equal(await page.locator('#profile .eyebrow').count(),0);
  assert.equal(await page.locator('#playground .play-stage').count(),1);assert.equal(await page.locator('.connect-secondary [aria-disabled="true"]').count(),1);
  assert.deepEqual(errors,[]);results.push({profile:name,labels:true,fonts:true,queueClick:true,noExternalMediaNavigation:true,videoRules:true,overlayControls:true,preloadWarnings:warnings,errors});await page.close();console.log(name+' historical contracts passed');
 }}finally{await browser.close();}await save('historical-contracts',results);
})().catch(error=>{console.error(error);process.exitCode=1;});
