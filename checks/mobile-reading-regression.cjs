const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000',output=path.resolve(process.env.AUDIT_OUTPUT||'output/final-audit/reading');
const profiles=[[320,568],[320,480],[341,640],[350,780],[360,800],[390,844],[430,932],[768,1024],[820,1180],[1024,1366],[844,390],[1440,900],[2560,1440]];
const titleStyles=Object.fromEntries(require('../music-typography.json').map(song=>[song.title,song.typography]));
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const [width,height]of profiles){
  if(process.env.READING_WIDTH&&width!==Number(process.env.READING_WIDTH))continue;
  const touch=width<=1100,context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
  await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});
  await page.locator('.portfolio-intro').waitFor({state:'detached'});
  await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
  await page.locator('.floating-nav a[href="#about"]').evaluate(e=>e.click());
  await page.waitForFunction(()=>document.querySelectorAll('.skill-logo').length===14&&[...document.querySelectorAll('.skills-orbit-slot')].every(e=>getComputedStyle(e).visibility==='visible'),null,{timeout:30000});
  await page.waitForFunction(()=>{
   const section=document.querySelector('#about'),stage=section.querySelector('.skills-orbit-stage').getBoundingClientRect(),radius=parseFloat(getComputedStyle(section).getPropertyValue('--skills-ring-radius'));
   return [...section.querySelectorAll('.skills-orbit-slot')].every(e=>{const r=e.getBoundingClientRect();return Math.abs(Math.hypot(r.x+r.width/2-stage.x-stage.width/2,r.y+r.height/2-stage.y-stage.height/2)-radius)<1;});
  },null,{timeout:30000});
  const body=await page.evaluate(()=>{
   const selectors=['.floating-nav a[href="#about"]','#about .skills-heading h2','#about .skills-heading>p','#projects .project-heading h2','#projects .project-heading p','#profile .personal-copy>p','.connect-person p'];
   const result=Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s),c=getComputedStyle(e);return[s,{font:+parseFloat(c.fontSize),family:c.fontFamily,overflow:e.scrollWidth>e.clientWidth+1}];}));
   const section=document.querySelector('#about'),stage=section.querySelector('.skills-orbit-stage').getBoundingClientRect(),style=getComputedStyle(section),radius=parseFloat(style.getPropertyValue('--skills-ring-radius'));
   const disc=section.querySelector('.skills-orbit-slot').getBoundingClientRect().width;
   let farthest=0;
   for(const selector of ['.skills-heading h2','.skills-heading>p']){
    const walker=document.createTreeWalker(section.querySelector(selector),NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const r of range.getClientRects())for(const x of [r.left,r.right])for(const y of [r.top,r.bottom])farthest=Math.max(farthest,Math.hypot(x-stage.x-stage.width/2,y-stage.y-stage.height/2));}
   }
   result.lineClearance=radius-disc/2-farthest;return result;
  });
  if(touch){assert.ok(body['#about .skills-heading>p'].font>=12.5);assert.equal(body['#profile .personal-copy>p'].font,16);assert.equal(body['.connect-person p'].font,14);}
  assert.ok(body.lineClearance>=1,`${width}: reading text clears every position of the Skills ring (${body.lineClearance.toFixed(2)}px)`);
  await page.screenshot({path:path.join(output,width+'-skills.png')});
  await page.locator('.floating-nav a[href="#projects"]').evaluate(e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#projects').inert&&document.querySelector('#projects').hobbyEntranceProgress===1);
  await page.waitForFunction(()=>document.querySelectorAll('.music-record-caption').length===3);
  for(const caption of await page.locator('.music-record-caption').evaluateAll(elements=>elements.map(e=>({title:e.querySelector('strong').textContent,style:e.querySelector('strong').dataset.titleStyle,singer:getComputedStyle(e.querySelector('span')).fontFamily})))){
   assert.equal(caption.style,titleStyles[caption.title]);assert.match(caption.singer,/Acme/);
  }
  await page.locator('#music-walkman').click();await page.locator('#music-gallery .music-song-copy').waitFor();
  const copy=page.locator('#music-gallery .music-song-copy');
  const songMetrics=[];
  for(let i=0;i<28;i++){
   const metrics=await copy.evaluate(e=>{
    const b=e.getBoundingClientRect(),stage=e.parentElement.getBoundingClientRect();
    const title=e.querySelector('h3'),singer=e.querySelector('.music-song-singer'),lyric=e.querySelector('.music-song-lyric');
    return {title:title.textContent,titleStyle:title.dataset.titleStyle,singerFamily:getComputedStyle(singer).fontFamily,lyricFamily:getComputedStyle(lyric).fontFamily,width:b.width,height:b.height,stageHeight:stage.height,copyBottom:(b.bottom-stage.top)/stage.height,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollable:getComputedStyle(e).overflowY==='auto',fits:b.left>=stage.left-.5&&b.right<=stage.right+.5&&b.top>=stage.top-.5&&b.bottom<=stage.bottom+.5,horizontalOverflow:e.scrollWidth>e.clientWidth+1,titleFont:parseFloat(getComputedStyle(title).fontSize),singerFont:parseFloat(getComputedStyle(singer).fontSize),lyricFont:parseFloat(getComputedStyle(lyric).fontSize)};
   });
   assert.ok(metrics.fits&&!metrics.horizontalOverflow,`${width}: ${metrics.title} text fits the existing copy area`);
   assert.equal(metrics.titleStyle,titleStyles[metrics.title]);assert.match(metrics.singerFamily,/Acme/);assert.match(metrics.lyricFamily,/Righteous/);
   assert.ok(metrics.scrollHeight<=metrics.clientHeight+1||metrics.scrollable,'long copy remains reachable');
   if(width<=640&&metrics.stageHeight>360)assert.ok(metrics.copyBottom<=.451,'copy stays inside its original region above the discs');
   if(touch){assert.ok(metrics.singerFont>=12.5);assert.ok(metrics.lyricFont>=13);assert.ok(metrics.titleFont>=16);}
   else{assert.equal(metrics.singerFont,12);assert.equal(metrics.lyricFont,14.25,'desktop type size remains unchanged');}
   songMetrics.push(metrics);
   await page.locator('#music-gallery').getByRole('button',{name:'Next song',exact:true}).click();
  }
  await page.screenshot({path:path.join(output,width+'-music.png')});
  const menu=page.locator('#music-gallery').getByRole('button',{name:'Songs',exact:true});await menu.click();
  assert.equal(await page.locator('#music-gallery .dcc-opt').count(),28);
  const option=await page.locator('#music-gallery .dcc-opt').first().evaluate(e=>({font:parseFloat(getComputedStyle(e).fontSize),width:e.clientWidth,scroll:e.scrollWidth}));
  if(touch)assert.ok(option.font>=12);assert.ok(option.scroll<=option.width+1);
  await page.locator('#music-gallery header button').click();
  await page.waitForFunction(()=>document.body.style.overflow===''&&!document.body.classList.contains('photography-gallery-open'));
  await page.locator('#profile .personal-copy').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>+getComputedStyle(document.querySelector('#profile .personal-copy')).opacity>.99);
  await page.screenshot({path:path.join(output,width+'-profile.png')});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
  assert.deepEqual(errors,[]);results.push({viewport:[width,height],body,songs:28,music:songMetrics,errors});
  console.log(`${width}x${height}: text and all 28 songs fit`);await context.close();
  await fs.writeFile(path.join(output,process.env.READING_WIDTH?'results-'+process.env.READING_WIDTH+'.json':'results.json'),JSON.stringify(results,null,2));
 }}finally{await browser.close();}
 assert.ok(results.length,'requested viewport exists in the audit matrix');
})().catch(e=>{console.error(e);process.exitCode=1;});
