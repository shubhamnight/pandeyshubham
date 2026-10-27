// Count actual desktop particle paints and delivered RAF callbacks. The old
// compiled entry is a test-only reference; no production code is modified.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const fs=require('node:fs/promises'),path=require('node:path'),cp=require('node:child_process');
const origin=process.env.AUDIT_URL||'http://localhost:3013',output=path.resolve(process.env.AUDIT_OUTPUT||'output/desktop-2026-10-27/cadence');
(async()=>{await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{for(const mode of ['before','after']){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.route('**/assets/ui/connect-page.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:mode==='before'?cp.execFileSync('git',['show','05244ef:assets/ui/connect-page.js'],{encoding:'utf8'}):await r.text()});});
 await page.addInitScript(()=>{window.qaPaints=[];window.qaCount=false;const original=CanvasRenderingContext2D.prototype.fillRect;CanvasRenderingContext2D.prototype.fillRect=function(...args){if(window.qaCount&&this.canvas.parentElement?.classList.contains('connect-aether-background'))window.qaPaints.push(performance.now());return original.apply(this,args);};});
 await page.goto(origin);await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});await page.locator('.portfolio-intro').waitFor({state:'detached'});await page.locator('#contact').scrollIntoViewIfNeeded();await page.locator('.connect-aether-background canvas').waitFor({state:'visible'});await page.waitForTimeout(2500);
 const sample=await page.evaluate(()=>new Promise(resolve=>{let delivered=0;const start=performance.now();window.qaPaints=[];window.qaCount=true;function tick(){delivered++;if(performance.now()-start<4000)requestAnimationFrame(tick);else{window.qaCount=false;resolve({elapsed:performance.now()-start,delivered,paintTimes:window.qaPaints});}}requestAnimationFrame(tick);}));
 results.push({mode,...sample,paints:sample.paintTimes.length,paintsPerSecond:sample.paintTimes.length*1000/sample.elapsed});await page.close();
}await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({paintTimes,...rest})=>rest)));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
