// Inspect a complete native CSS wave cycle without the app's load timer.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('sharp'),output=path.resolve('output/intro-gooey-preview/cycle');
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const html=await fs.readFile('index.html','utf8');
 const markup=/<!-- INTRO-LOADER:START -->([\s\S]*?)<!-- INTRO-LOADER:END -->/.exec(html)[1];
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:440,height:240}});
  await page.route('**/qa-wave-cycle.html',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#02070a;display:grid;place-items:center;height:100vh}*{box-sizing:border-box}</style>${markup}`}));
  await page.goto('http://localhost:3000/qa-wave-cycle.html');
  const surface=page.locator('.gooey-loader');
  assert.equal(await surface.evaluate(e=>getComputedStyle(e).filter),'none');
  assert.equal(await surface.evaluate(e=>getComputedStyle(e).borderBottomWidth),'0px');
  assert.notEqual(await page.locator('.gooey-loader-waves').evaluate(e=>getComputedStyle(e).filter),'none');
  assert.equal(await page.locator('feComposite').count(),0,'no hard SourceGraphic composite can introduce an inner rectangle');
  const count=await surface.evaluate(e=>{const a=e.getAnimations({subtree:true});a.forEach(a=>a.pause());return a.length;});
  assert.equal(count,4,'two continuously rotating and swaying waves');
  async function at(time){return surface.evaluate((e,time)=>{
   e.getAnimations({subtree:true}).forEach(a=>a.currentTime=time);
   return ['::before','::after'].map(pseudo=>{
    const s=getComputedStyle(e.querySelector('.gooey-loader-waves'),pseudo);
    const [x,y]=s.translate.split(' ').map(parseFloat),m=new DOMMatrix().translate(x,y||0).rotate(parseFloat(s.rotate));
    return [m.a,m.b,m.c,m.d,m.e,m.f];
   });
  },time);}
  const frames=[];
  for(const time of [0,500,1000,1500,2000,2500,3000,3500,3999,4001]){
   const pose=await at(time),file=path.join(output,`wave-${time}.png`);
   await page.screenshot({path:file});frames.push({time,pose});
  }
  const a=frames.at(-2).pose.flat(),b=frames.at(-1).pose.flat();
  await fs.writeFile(path.join(output,'poses.json'),JSON.stringify(frames,null,2));
  assert.ok(a.every((v,i)=>Math.abs(v-b[i])<.2),'no position or orientation jump at the loop boundary');
  const decode=async file=>(await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true})).data;
  const left=await decode(path.join(output,'wave-3999.png')),right=await decode(path.join(output,'wave-4001.png'));
  let total=0;for(let i=0;i<left.length;i++)total+=Math.abs(left[i]-right[i]);
  const meanPixelDelta=total/left.length;
  assert.ok(meanPixelDelta<.1,'rendered wave pixels remain continuous across the loop');
  const result={waveAnimations:count,filterOnWavesOnly:true,noBorderComposite:true,seamlessLoop:true,meanPixelDelta};
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
