// Run against a local server with PLAYWRIGHT_MODULE pointing to playwright-core.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const output=path.resolve(process.env.REPAIR_OUTPUT||'output/render-repair-2026-10-25/regression');
const profiles=[[320,568],[360,800],[390,844],[430,932],[768,1024],[820,1180],[1024,1366],[1440,900]];
async function state(page){return page.evaluate(async()=>{
 const {sceneMotion:s}=await import('/skills-hobbies-scene.js');
 const shown=e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.visibility!=='hidden'&&+c.opacity>.99&&r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight;};
 const slots=[...document.querySelectorAll('.skills-orbit-slot')];
 return {scroll:scrollY,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
  scene:{exit:s.skillExit,arrival:s.modelArrival,spread:s.modelSpread,advance:s.advance},
  skills:{count:slots.length,visible:slots.filter(shown).length,ready:document.querySelectorAll('.skill-shiny-button').length,
    logos:[...document.querySelectorAll('#about .skill-logo')].filter(e=>e.complete&&e.naturalWidth).length},
  models:[...document.querySelectorAll('.hobby-orbit-center')].map(e=>({visible:shown(e.querySelector('button'))&&+getComputedStyle(e).opacity>.99,ready:e.querySelector('button').dataset.hobbyCompiling==='false',failed:e.querySelector('button').dataset.hobbyModelFailed==='true',translate:e.style.translate,opacity:getComputedStyle(e).opacity,rect:e.querySelector('button').getBoundingClientRect().toJSON(),css:getComputedStyle(e.querySelector('button')).cssText})),
  media:document.querySelector('#projects').hobbyEntranceProgress,
  previews:[...document.querySelectorAll('.hobby-orbit')].map(e=>({count:e.querySelectorAll('.hobby-image-placeholder:not([hidden])').length,
    filled:[...e.querySelectorAll('.hobby-image-placeholder:not([hidden]) .hobby-image-surface')].filter(e=>e.children.length).length,
    loaded:[...e.querySelectorAll('.hobby-image-surface img')].every(i=>i.complete&&i.naturalWidth>0)})),
 };
});}
async function enter(page,hash='',reload=false){
 const url=origin+'/?photo-quality=4k'+hash;
 if(reload){await page.evaluate(url=>history.replaceState(history.state,'',url),url);await page.reload({waitUntil:'domcontentloaded'});}
 else await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});
 await page.locator('.portfolio-intro').waitFor({state:'detached',timeout:45000});
 await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'),undefined,{timeout:25000});
 assert.ok(await page.evaluate(()=>scrollY<2),'PLAY retains the established hero reset');
}
const nav=(page,name)=>page.evaluate(name=>document.querySelector('.floating-nav a[href="'+({Home:'#home',Skills:'#about',Hobbies:'#projects'}[name])+'"]').click(),name);
async function settled(page,name,{fallback=false}={}){
 await page.evaluate(async()=>{window.qaSceneMotion=(await import('/skills-hobbies-scene.js')).sceneMotion;});
 try{await page.waitForFunction(({name,fallback})=>{
  const s=window.qaSceneMotion;
  if(name==='Home')return scrollY<2;
  if(name==='Skills'){
   const section=document.querySelector('#about'),stage=section.querySelector('.skills-orbit-stage').getBoundingClientRect();
   const radius=parseFloat(getComputedStyle(section).getPropertyValue('--skills-ring-radius'));
   return s.skillExit===0&&document.querySelectorAll('.skill-shiny-button').length===14&&
    [...document.querySelectorAll('#about .skill-logo')].every(i=>i.complete&&i.naturalWidth>0)&&
    [...document.querySelectorAll('.skills-orbit-slot')].every(e=>{
      const r=e.getBoundingClientRect();return getComputedStyle(e).visibility==='visible'&&
       Math.abs(Math.hypot(r.x+r.width/2-stage.x-stage.width/2,r.y+r.height/2-stage.y-stage.height/2)-radius)<1;
    });
  }
  return s.modelSpread===1&&document.querySelector('#projects').hobbyEntranceProgress===1&&[...document.querySelectorAll('.hobby-orbit-center button')].every(e=>e.dataset.hobbyCompiling==='false'||fallback&&e.dataset.hobbyModelFailed==='true');
 },{name,fallback},{timeout:30000,polling:100});}
 catch(error){
  const snapshot=await state(page);console.log(JSON.stringify({failedDestination:name,state:snapshot}));
  await fs.writeFile(path.join(output,'failed-state.json'),JSON.stringify({name,state:snapshot},null,2));
  await page.screenshot({path:path.join(output,'failed-state.png')});throw error;
 }
 const s=await state(page);assert.equal(s.overflow,false,'no document overflow');
 if(name==='Skills'){assert.equal(s.skills.visible,14);assert.equal(s.skills.logos,14);}
 if(name==='Hobbies'){
  if(s.models.filter(m=>m.visible).length!==4){console.log(JSON.stringify({name,state:s}));await page.screenshot({path:path.join(output,'model-visibility-failure.png')});}
  assert.equal(s.models.filter(m=>m.visible).length,4,'all four model holders are visible');
  await page.waitForFunction(()=>[...document.querySelectorAll('.hobby-orbit')].every(e=>[...e.querySelectorAll('.hobby-image-placeholder:not([hidden]) .hobby-image-surface')].filter(e=>e.children.length).length===3),undefined,{timeout:15000});
 }
 return state(page);
}
async function normal(browser,w,h){
 const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:w!==1440,isMobile:w!==1440,deviceScaleFactor:w===1440?1:2});
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)requests.push({url:r.url(),status:r.status()});});
 await page.addInitScript(()=>{
   const request=requestAnimationFrame,cancel=cancelAnimationFrame,pending=new Set();window.qaRAF={pending};
   window.requestAnimationFrame=callback=>{const id=request(time=>{pending.delete(id);callback(time);});pending.add(id);return id;};
   window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
 });
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:w===390||w===768?4:1});
 const checks=[],counts=[];await enter(page,'#projects');
 const thorough=[390,768,1440].includes(w);
 // Each final destination is tested after rapid reversal as well as normal travel.
 for(const name of thorough?['Hobbies','Skills','Hobbies','Home','Hobbies','Skills','Home','Skills']:['Hobbies','Skills']){
  await nav(page,name);await settled(page,name);checks.push('navigate '+name);
 }
 for(let cycle=0;cycle<(thorough?3:1);cycle++)for(const name of ['Hobbies','Skills','Home']){await nav(page,name);await page.waitForTimeout(90);}
 for(const name of ['Hobbies','Skills']){await nav(page,name);await settled(page,name);}
 checks.push('rapid switching recovers both sections');
 console.log(JSON.stringify({viewport:[w,h],stage:'navigation passed'}));
 await page.evaluate(()=>history.back());await page.waitForTimeout(500);await page.evaluate(()=>history.forward());await settled(page,'Skills');checks.push('back/forward');
 if(w!==1440){
  await page.setViewportSize({width:h,height:w});await settled(page,'Skills');
  await nav(page,'Hobbies');await settled(page,'Hobbies');
  await page.setViewportSize({width:w,height:h});await settled(page,'Hobbies');checks.push('portrait/landscape');
 }
 // Real scroll both ways, with the final endpoints matching the existing anchors.
 await page.evaluate(async()=>{const {sceneAnchorPosition}=await import('/skills-hobbies-scene.js');window.qaEndpoints=[sceneAnchorPosition('#about'),sceneAnchorPosition('#projects')];});
 for(const direction of [1,-1]){
  await page.evaluate(async direction=>{const [a,b]=window.qaEndpoints,start=direction>0?a:b,end=direction>0?b:a;for(let i=0;i<=24;i++){scrollTo(0,start+(end-start)*i/24);await new Promise(requestAnimationFrame);}},direction);
  await settled(page,direction>0?'Hobbies':'Skills');
 }
 checks.push('fast native forward/reverse scroll');
 console.log(JSON.stringify({viewport:[w,h],stage:'rotation and native scroll passed'}));
 // Hidden-tab and bfcache lifecycle events preserve controllers without duplication.
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await nav(page,'Hobbies');await settled(page,'Hobbies');checks.push('persisted lifecycle');
 for(let cycle=0;cycle<Number(process.env.REPAIR_MEMORY_CYCLES||(thorough?5:2));cycle++){
  await nav(page,'Skills');await settled(page,'Skills');await nav(page,'Hobbies');await settled(page,'Hobbies');
  await cdp.send('HeapProfiler.collectGarbage');counts.push({...await cdp.send('Memory.getDOMCounters'),
    heap:await cdp.send('Runtime.getHeapUsage'),pendingRAF:await page.evaluate(()=>window.qaRAF.pending.size)});
 }
 assert.ok(counts.at(-1).nodes-counts[1].nodes<180,'DOM stays bounded after collection');
 assert.ok(counts.at(-1).heap.usedSize-counts[1].heap.usedSize<5*1024*1024,'collected JS heap stays bounded');
 assert.ok(counts.at(-1).pendingRAF-counts[1].pendingRAF<3,'navigation does not duplicate RAF loops');
 assert.ok(counts.at(-1).jsEventListeners-counts[1].jsEventListeners<30,'listeners stay bounded');checks.push(counts.length+' repeated round trips / GC');
 await page.screenshot({path:path.join(output,`${w}-hobbies.png`)});
 // Direct hash refresh keeps the site’s intentional PLAY-to-hero behavior,
 // then both sections must still initialize and render normally.
 for(const [hash,name]of [['#projects','Hobbies'],['#about','Skills']]){await enter(page,hash,true);await nav(page,name);await settled(page,name);}
 checks.push('refresh Skills/Hobbies and re-enter');
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 const result={viewport:[w,h],checks,counts,errors,requests};await context.close();console.log(JSON.stringify({viewport:[w,h],checks}));return result;
}
async function faults(browser){
 const rows=[];
 for(const fault of ['model-once','skills-once','shared-once','manifest-stall','locations-stall','model-unavailable','context-loss']){
  if(process.env.REPAIR_FAULT&&process.env.REPAIR_FAULT!==fault)continue;
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});let failures=0,release,unavailable=fault==='model-unavailable';const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.qaContexts=[];const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(...args){const c=get.apply(this,args);if(c&&/webgl/.test(args[0])&&!window.qaContexts.includes(c))window.qaContexts.push(c);return c;};
  });
  if(fault==='model-unavailable')await page.route('**/gaming-controller.js*',r=>{if(unavailable){failures++;return r.fulfill({status:503,contentType:'text/plain',body:'Injected model outage'});}return r.continue();});
  else if(fault.endsWith('-once')){
   let pattern=fault==='model-once'?'**/gaming-controller.js':'**/assets/ui/skills-icons.js';
   if(fault==='shared-once'){
    const code=await fs.readFile(path.resolve('assets/ui/skills-icons.js'),'utf8');
    const imports=[...code.matchAll(/from"\.\/chunks\/([^"]+)"/g)].map(m=>m[1]);
    const sizes=await Promise.all(imports.map(async name=>({name,size:(await fs.stat(path.resolve('assets/ui/chunks',name))).size})));
    pattern='**/assets/ui/chunks/'+sizes.sort((a,b)=>b.size-a.size)[0].name;
   }
   await page.route(pattern,r=>{failures++;return failures===1?r.fulfill({status:503,contentType:'text/plain',body:'Injected transient failure'}):r.continue();});
  }else if(fault.endsWith('-stall')){
   const gate=new Promise(resolve=>{release=resolve;});await page.route(fault==='manifest-stall'?'**/mobile-media-data.json':'**/api/travel-locations',async r=>{await gate;await r.continue().catch(()=>{});});
  }
  try{
   await enter(page);await nav(page,'Hobbies');const s=await settled(page,'Hobbies',{fallback:unavailable});
   if(fault==='context-loss'){
     await page.evaluate(()=>new Promise(resolve=>{
       const canvas=document.querySelector('#photography-camera canvas'),gl=canvas.getContext('webgl2'),extension=gl.getExtension('WEBGL_lose_context');
       if(!extension)throw Error('Context-loss extension unavailable');window.qaLost={gl,extension};
       canvas.addEventListener('webglcontextlost',()=>resolve(),{once:true});extension.loseContext();
     }));
     await page.evaluate(()=>window.qaLost.extension.restoreContext());
     await page.waitForFunction(()=>!window.qaLost.gl.isContextLost());await settled(page,'Hobbies');
   }
   await nav(page,'Skills');await settled(page,'Skills');
   assert.equal(s.previews.every(e=>e.count===3&&e.filled===3),true);assert.deepEqual(errors,[]);
   if(fault==='shared-once'||fault==='model-unavailable'||fault==='locations-stall'){
     await nav(page,'Hobbies');await settled(page,'Hobbies',{fallback:unavailable});
     const galleries=fault==='shared-once'?[
       ['photography-camera','photography','.photo-full-image'],['travel-plane','travel','.zoom-slider'],
       ['music-walkman','music','.dcc-root'],['gaming-controller','gaming','.tilted-artwork'],
     ]:fault==='locations-stall'?[['travel-plane','travel','.zoom-slider']]:[['gaming-controller','gaming','.tilted-artwork']];
     for(const [button,id,root]of galleries){await page.locator('#'+button).click();const dialog=page.locator('#'+id+'-gallery');await dialog.locator(root).first().waitFor({state:'visible',timeout:30000});await dialog.locator('header button').click();}
     if(unavailable){unavailable=false;await page.evaluate(()=>dispatchEvent(new Event('online')));await page.waitForFunction(()=>document.querySelector('#gaming-controller').dataset.hobbyCompiling==='false');await settled(page,'Hobbies');}
   }
   const contexts=await page.evaluate(()=>({total:window.qaContexts.length,lost:window.qaContexts.filter(c=>c.isContextLost()).length}));
   assert.ok(contexts.lost>=1,'the disposed intro releases its GPU context');
   await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
   assert.ok(await page.evaluate(()=>window.qaContexts.every(c=>c.isContextLost())),'permanent disposal releases every model GPU context');
   assert.deepEqual(errors,[]);
   rows.push({fault,recovered:true,injectedFailures:failures,contexts});console.log(JSON.stringify(rows.at(-1)));
  }finally{release?.();await page.close();}
 }
 return rows;
}
(async()=>{await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});const results={profiles:[],faults:[]};
 try{
  for(const [w,h]of profiles){if(process.env.REPAIR_WIDTH&&w!==Number(process.env.REPAIR_WIDTH))continue;if(process.env.REPAIR_FAULTS_ONLY)break;results.profiles.push(await normal(browser,w,h));await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));}
  if(!process.env.REPAIR_SKIP_FAULTS)results.faults=await faults(browser);
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
 }catch(error){await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:error.stack,results},null,2));throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
