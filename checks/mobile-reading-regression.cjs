const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000',output=path.resolve(process.env.AUDIT_OUTPUT||'output/final-audit/reading');
const profiles=[[320,568],[320,480],[341,640],[350,780],[360,800],[390,844],[430,932],[768,1024],[820,1180],[1024,1366],[844,390],[1440,900],[2560,1440]];
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const [width,height]of profiles){
  if(process.env.READING_WIDTH&&width!==Number(process.env.READING_WIDTH))continue;
  const touch=width<=1100,context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await require('./helpers/site.cjs').enter(page,'#about');
  const body=await page.evaluate(()=>{
   const selectors=['.floating-nav a[href="#about"]','#about .skills-heading h2','#about .skills-heading>p','#projects .project-heading h2','#projects .project-heading p','#profile .personal-copy>p','.connect-person p'];
   const result=Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s),c=getComputedStyle(e);return[s,{font:+parseFloat(c.fontSize),family:c.fontFamily,overflow:e.scrollWidth>e.clientWidth+1}];}));
   const heading = document.querySelector('#about .skills-heading').getBoundingClientRect();
   const list = document.querySelector('.skills-marquee').getBoundingClientRect();
   result.lineClearance=list.top-heading.bottom;return result;
  });
  if(touch){assert.ok(body['#about .skills-heading>p'].font>=12.5);assert.equal(body['#profile .personal-copy>p'].font,16);assert.ok(body['.connect-person p'].font>=14);}
  const crowdedHeadings=await page.locator('main :is(h1,h2,h3)').evaluateAll(headings=>headings.flatMap(heading=>{
   const {fontFamily,letterSpacing,wordSpacing}=getComputedStyle(heading);
   return fontFamily.includes('Odibee Sans')&&!(parseFloat(letterSpacing)>0&&parseFloat(wordSpacing)>0)?[heading.textContent.trim()]:[];
  }));
  assert.deepEqual(crowdedHeadings,[],width+': Odibee Sans headings leave room between letters and words');
  assert.ok(body.lineClearance>=1,`${width}: reading text clears the Skills icons (${body.lineClearance.toFixed(2)}px)`);
  await page.screenshot({path:path.join(output,width+'-skills.png')});
  await page.locator('.floating-nav a[href="#projects"]').evaluate(e=>e.click());
  await page.locator('#music-walkman').click();await page.locator('#music-gallery .music-song-copy').waitFor();
  const copy=page.locator('#music-gallery .music-song-copy');
  const songMetrics=[];
  for(let i=0;i<28;i++){
   const metrics=await copy.evaluate(e=>{
    const b=e.getBoundingClientRect(),stage=e.parentElement.getBoundingClientRect();
    const title=e.querySelector('h3'),singer=e.querySelector('.music-song-singer'),lyric=e.querySelector('.music-song-lyric');
    return {title:title.textContent,titleFamily:getComputedStyle(title).fontFamily,singerFamily:getComputedStyle(singer).fontFamily,lyricFamily:getComputedStyle(lyric).fontFamily,width:b.width,height:b.height,stageHeight:stage.height,copyBottom:(b.bottom-stage.top)/stage.height,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollable:getComputedStyle(e).overflowY==='auto',fits:b.left>=stage.left-.5&&b.right<=stage.right+.5&&b.top>=stage.top-.5&&b.bottom<=stage.bottom+.5,horizontalOverflow:e.scrollWidth>e.clientWidth+1,titleFont:parseFloat(getComputedStyle(title).fontSize),singerFont:parseFloat(getComputedStyle(singer).fontSize),lyricFont:parseFloat(getComputedStyle(lyric).fontSize)};
   });
   assert.ok(metrics.fits&&!metrics.horizontalOverflow,`${width}: ${metrics.title} text fits the existing copy area`);
   assert.match(metrics.titleFamily,/Odibee Sans/);assert.match(metrics.singerFamily,/Imbue/);assert.match(metrics.lyricFamily,/Imbue/);
   assert.ok(metrics.scrollHeight<=metrics.clientHeight+1||metrics.scrollable,'long copy remains reachable');
   if(width<=640&&metrics.stageHeight>360)assert.ok(metrics.copyBottom<=.451,'copy stays inside its original region above the discs');
   if(touch){assert.ok(metrics.singerFont>=12.5);assert.ok(metrics.lyricFont>=13);assert.ok(metrics.titleFont>=16);}
   else{assert.ok(metrics.singerFont>=14);assert.ok(metrics.lyricFont>=15);}
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
