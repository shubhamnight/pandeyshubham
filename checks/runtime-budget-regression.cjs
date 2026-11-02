const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const {profiles,enter,hobbies,save}=require('./helpers/site.cjs');
(async()=>{const browser=await chromium.launch({headless:true}),results=[];
 try{for(const [name,width,height,touch]of profiles){
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch}),errors=[];page.on('pageerror',e=>errors.push(e.message));await enter(page);
  for(const scene of ['skills','hobbies']){
   if(scene==='skills'){await page.locator('.floating-nav a[href="#about"]').evaluate(e=>e.click());await page.waitForFunction(()=>[...document.querySelectorAll('.skills-orbit-slot')].every(e=>getComputedStyle(e).visibility==='visible'));await page.waitForTimeout(3500);}
   else{await hobbies(page);await page.waitForFunction(()=>[...document.querySelectorAll('.hobby-orbit')].every(e=>e.querySelectorAll('.hobby-image-surface:not(:empty)').length===3));await page.waitForTimeout(1000);}
   const sample=await page.evaluate(selector=>new Promise(resolve=>{const nodes=[...document.querySelectorAll(selector)];const pose=()=>nodes.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y];});const before=pose(),frames=[],start=performance.now();let last=0;function tick(time){if(last)frames.push(time-last);last=time;if(time-start<2200)requestAnimationFrame(tick);else resolve({frames,before,after:pose()});}requestAnimationFrame(tick);}),scene==='skills'?'.skills-orbit-slot':'.hobby-image-placeholder:not([hidden])');
   const sorted=sample.frames.toSorted((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)],max=Math.max(...sorted);assert.ok(sorted.length>30,'measurement received enough painted frames');assert.ok(p95<34,`${name}/${scene}: sustained frame gaps exceed the local 30fps regression floor (${p95.toFixed(1)}ms)`);assert.ok(max<250,`${name}/${scene}: quarter-second visible stall (${max.toFixed(1)}ms)`);assert.ok(sample.before.some((p,i)=>Math.hypot(p[0]-sample.after[i][0],p[1]-sample.after[i][1])>1),'animation advances; an accidentally frozen scene cannot pass a frame budget');results.push({profile:name,scene,frames:sorted.length,p95,max});
  }assert.deepEqual(errors,[]);await page.close();console.log(name+' steady animation budgets passed');
 }}finally{await browser.close();}await save('runtime-budget',results);
})().catch(error=>{console.error(error);process.exitCode=1;});
