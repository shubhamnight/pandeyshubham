const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const fs=require('node:fs/promises'),assert=require('node:assert/strict'),path=require('node:path');
const origin=process.env.AUDIT_URL||'http://localhost:3000',output=path.resolve(process.env.AUDIT_OUTPUT||'output/intro-liquid-preview');
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const before=JSON.parse(await fs.readFile(path.join(__dirname,'fixtures/intro-play-style.json'),'utf8'));
  const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
  try{for(const reference of before){
    const {width,height}=reference,name=width<600?'phone':width<1100?'tablet':'desktop';
    const page=await browser.newPage({viewport:{width,height},isMobile:width<1100,hasTouch:width<1100});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Replay intro'}).click();
    await page.waitForFunction(()=>document.querySelector('.portfolio-intro')?.dataset.loadingPhase==='merge');
    await page.waitForTimeout(230);
    assert.equal(await page.locator('.gooey-loader').evaluate(e=>getComputedStyle(e).borderTopWidth),'0px','no box outline around the moving waves');
    await page.screenshot({path:path.join(output,name+'-merge.png')});
    await page.waitForFunction(()=>document.querySelector('.portfolio-intro')?.dataset.loadingPhase==='expand');
    assert.equal(await page.locator('.flow-play').evaluate(e=>getComputedStyle(e).opacity),'0','real button stays hidden behind the morph');
    await page.waitForTimeout(150);
    await page.screenshot({path:path.join(output,name+'-rounded-blend.png')});
    if(name==='desktop'){
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      const shape=await page.locator('.gooey-loader').getAttribute('style');
      await page.waitForTimeout(150);assert.equal(await page.locator('.gooey-loader').getAttribute('style'),shape,'hidden-tab morph freezes');
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    }
    await page.waitForFunction(()=>document.querySelector('.portfolio-intro')?.dataset.loadingPhase==='expand');
    await page.waitForTimeout(350);await page.screenshot({path:path.join(output,name+'-expand.png')});
    await page.waitForFunction(()=>document.querySelector('.portfolio-intro')?.dataset.loadingPhase==='handoff');
    await page.waitForTimeout(100);
    const handoff=await page.locator('.gooey-loader').evaluate(e=>{
      const button=document.querySelector('.flow-play');
      const s=e.getBoundingClientRect(),b=button.getBoundingClientRect();
      return {surfaceOpacity:getComputedStyle(e).opacity,surfaceLayer:+getComputedStyle(e.closest('.intro-loading')).zIndex,buttonLayer:+getComputedStyle(button.parentElement).zIndex,buttonOpacity:+getComputedStyle(button).opacity,geometry:[s.x-b.x,s.y-b.y,s.width-b.width,s.height-b.height],filter:getComputedStyle(e).filter,waveOpacity:getComputedStyle(e.querySelector('.gooey-loader-waves')).opacity};
    });
    assert.equal(handoff.surfaceOpacity,'1','matched capsule stays opaque during the handoff');
    assert.ok(handoff.surfaceLayer<handoff.buttonLayer,'lettering and bevel blend above the capsule');
    assert.ok(handoff.buttonOpacity>0&&handoff.buttonOpacity<1,'button blends in progressively');
    assert.ok(handoff.geometry.every(v=>Math.abs(v)<.1),'loader matches the real button bounds before handing off');
    assert.equal(handoff.filter,'none','border and final capsule are never filtered');
    assert.equal(handoff.waveOpacity,'0','filtered waves are gone before PLAY hands off');
    await page.waitForFunction(()=>document.querySelector('.portfolio-intro')?.classList.contains('show-play'));
    const button=page.locator('.flow-play');
    const style=await button.evaluate(e=>{const s=getComputedStyle(e);return Object.fromEntries(['width','height','backgroundColor','color','fontFamily','fontSize','letterSpacing','borderRadius','borderColor','borderWidth','boxShadow','padding','transition'].map(k=>[k,s[k]]));});
    assert.deepEqual(style,reference.style,'the final button appearance and transitions remain identical');
    assert.equal(await page.locator('.gooey-loader').count(),0,'loading component unmounts after the handoff');
    assert.ok(await page.locator('.flow-label>span').first().evaluate(e=>e.getAnimations().some(a=>a.effect.getTiming().iterations===Infinity)),'existing letter flicker resumes');
    await page.screenshot({path:path.join(output,name+'-play.png')});
    await button.press('Enter');await page.locator('.portfolio-intro').waitFor({state:'detached'});
    await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
    assert.deepEqual(errors,[]);results.push({profile:name,merge:true,roundedBlend:true,expands:true,identicalButtonStyles:true,letterFlicker:true,heroEntry:true,errors});
    await page.close();
  }}finally{await browser.close();}
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
