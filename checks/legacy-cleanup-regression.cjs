// Capture before cleanup, then compare the rendered public surfaces afterwards.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const fs=require('node:fs/promises'),assert=require('node:assert/strict'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000',out=path.resolve('output/legacy-cleanup');
const properties=['display','position','width','height','padding','margin','gap','fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','textAlign','color','backgroundColor','backgroundImage','border','borderRadius','boxShadow','filter','backdropFilter','overflow','objectFit','objectPosition','transformOrigin','animationName','animationDuration','animationTimingFunction','animationIterationCount','animationDirection','animationFillMode','transition'];
const selectors=['.floating-nav','.floating-nav a','.badge-rig','.badge','.badge-face','.badge-title','.badge-title small','.badge-name','.badge-bottom','.strap','.strap-segment','.name-track','#about','.skills-heading','.skills-heading h2','.skills-heading em','.skills-heading>p','.skills-orbit-slot','.skills-orbit-symbol','.skill-shiny-button','.skill-logo','#projects','.project-heading','.project-heading h2','.project-heading em','.project-heading>p','.hobby-orbit-center button','.hobby-image-placeholder','.hobby-image-surface','#playground','.play-heading h2','.play-stage','.play-grid','.kinetic-object','.kinetic-object span','.stage-label','#profile','.polaroid','.polaroid img','.polaroid figcaption','.personal-copy h2','.personal-copy p','.signature-name','#contact','#connect-heading','.connect-heading-static','.footer-rotator','.footer-socials','.connect-secondary','.connect-person strong','.connect-person p','.social-link','.social-icon','dialog[open]','dialog[open]>header','dialog[open] h2','dialog[open]>header>button','.photo-carousel','.photo-full-image','.photo-nav','.photo-filmstrip','.zoom-slider','.dcc-root','.music-title','.music-song-singer','.music-song-lyric','.dcc-btn','.gaming-scroll-viewport','.gaming-marquee-card'];
(async()=>{await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results={};
 try{for(const [name,width,height,touch] of [['phone',390,844,true],['tablet',768,1024,true],['desktop',1440,900,false]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.env.LEGACY_REPLAY_BEFORE){
   const backup=path.join(out,'source-before');
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url()),relative=decodeURIComponent(url.pathname==='/'?'index.html':url.pathname.slice(1));
    const file=path.resolve(backup,relative);
    if(url.origin===new URL(origin).origin&&file.startsWith(backup+path.sep)){
     try{const body=await fs.readFile(file);return route.fulfill({body,contentType:file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'text/javascript'});}catch(error){if(error.code!=='ENOENT')throw error;}
    }
    return route.continue();
   });
  }
  const sample=async stage=>{
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
   results[name+':'+stage]=await page.evaluate(({selectors,properties,stage})=>{
    const query=(selector,root=document)=>{const list=[...root.querySelectorAll(selector)];for(const e of root.querySelectorAll('*'))if(e.shadowRoot)list.push(...query(selector,e.shadowRoot));return list;};
    const values={};for(const selector of selectors){
     if(selector==='.music-title'&&stage!=='music')continue;
     if((selector==='.hobby-image-placeholder'||selector==='.hobby-image-surface')&&stage!=='hobbies')continue;
     const allCards=['.hobby-image-placeholder','.hobby-image-surface','.gaming-marquee-card'].includes(selector);
     const elements=query(selector).filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&(allCards||r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth);});
     if(!elements.length)continue;
     // Repeated holders share the same stylesheet; compare each distinct style.
     values[selector]=[...new Set(elements.map(e=>JSON.stringify(Object.fromEntries(properties.map(p=>[p,getComputedStyle(e)[p]])))))].map(JSON.parse).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }return values;
   },{selectors,properties,stage});
  };
  const nav=async hash=>{await page.evaluate(hash=>document.querySelector('.floating-nav a[href="'+hash+'"]').click(),hash);await page.waitForTimeout(1400);};
  const hobbies=async()=>{await nav('#projects');await page.waitForFunction(()=>!document.querySelector('#projects').inert&&document.querySelector('#projects').hobbyEntranceProgress===1&&[...document.querySelectorAll('.hobby-orbit-center button')].every(e=>e.dataset.hobbyCompiling==='false')&&[...document.querySelectorAll('.hobby-arc-stream')].every(e=>e.querySelectorAll('.hobby-image-placeholder:not([hidden]) .hobby-image-surface').length===3&&[...e.querySelectorAll('.hobby-image-placeholder:not([hidden]) .hobby-image-surface')].every(s=>s.children.length)),undefined,{timeout:45000});};
  await page.goto(origin);await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});await page.locator('.portfolio-intro').waitFor({state:'detached'});await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));await sample('hero');
  await nav('#about');await page.waitForFunction(()=>[...document.querySelectorAll('.skills-orbit-slot')].every(e=>getComputedStyle(e).visibility==='visible'));await sample('skills');
  await hobbies();await sample('hobbies');
  for(const [button,id,root] of [['photography-camera','photography','.photo-carousel'],['travel-plane','travel','.zoom-slider'],['music-walkman','music','.dcc-root'],['gaming-controller','gaming','.gaming-scroll-viewport']]){
   await page.locator('#'+button).evaluate(e=>e.click());await page.locator('#'+id+'-gallery').locator(root).waitFor({state:'visible',timeout:30000});await page.waitForTimeout(1100);await sample(id);
   await page.screenshot({path:path.join(out,(process.env.LEGACY_BASELINE?'before-':'after-')+name+'-'+id+'.png')});await page.locator('#'+id+'-gallery header button').click();await page.waitForFunction(()=>document.body.style.overflow==='');
  }
  await nav('#playground');await page.waitForTimeout(600);await sample('projects');
  await page.locator('#profile').scrollIntoViewIfNeeded();await page.waitForTimeout(700);await sample('profile');
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(2500);await sample('contact');
  assert.deepEqual(errors,[]);await page.close();console.log(name+' rendered styles and galleries captured');
 }}finally{await browser.close();}
 const file=path.join(out,process.env.LEGACY_BASELINE?'baseline.json':'after.json');await fs.writeFile(file,JSON.stringify(results,null,2));
 if(!process.env.LEGACY_BASELINE){const before=JSON.parse(await fs.readFile(path.join(out,'baseline.json'))),differences=[];
  for(const key of Object.keys(before))for(const selector of new Set([...Object.keys(before[key]),...Object.keys(results[key]||{})])){
   if(JSON.stringify(before[key][selector])!==JSON.stringify(results[key]?.[selector]))differences.push({stage:key,selector,before:before[key][selector],after:results[key]?.[selector]});
  }
  await fs.writeFile(path.join(out,'differences.json'),JSON.stringify(differences,null,2));assert.equal(differences.length,0,'Rendered style differences: '+differences.map(e=>e.stage+' '+e.selector).join('; '));console.log('All '+Object.keys(results).length+' rendered-state snapshots match the pre-cleanup baseline.');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
