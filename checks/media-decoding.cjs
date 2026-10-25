// Optional real-browser asset decoding; read-only and independent of animation.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const origin=process.env.AUDIT_URL||'http://localhost:3000';
const output=path.resolve(process.env.AUDIT_OUTPUT||'output/render-repair-2026-10-25/media-decoding');
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true}),results=[];
 try{
  for(const [width,height,touch]of [[390,844,true],[768,1024,true],[1440,900,false]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?2:1});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/qa-media.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Read-only media decoding check</title>'}));
   await page.goto(origin+'/qa-media.html');
   const result=await page.evaluate(async()=>{
    const [{photographyPhotos},{travelImages},{gamingImages},{musicCards},mobile,{applyMediaEdits},{photographyHeroSources}]=await Promise.all([
     import('./photography-data.js'),import('./travel-data.js'),import('./gaming-data.js'),import('./music-overlay-data.js'),
     import('./mobile-media.js'),import('./media-library.js'),import('./photography-hero-data.js'),
    ]);
    // This check waits for the optional mapping to test every prepared mobile
    // asset. The application itself intentionally never waits for this metadata.
    await mobile.mobileMediaReady;
    const images=new Set(),videos=new Set();
    const add=value=>{if(!value)return;const url=mobile.mobileMediaSource(value);(/\.(?:mp4|webm|mov)(?:$|\?)/i.test(url)?videos:images).add(url);};
    for(const item of [...applyMediaEdits('photography',photographyPhotos),...applyMediaEdits('travel',travelImages),...gamingImages,...musicCards]){
     for(const field of ['src','preview','poster','gallerySrc','fullSrc','overlayImage'])add(item[field]);
     for(const part of (item.srcset||item.srcSet||'').split(',').filter(Boolean))add(part.trim().split(/\s+/)[0]);
     for(const source of item.sources||item.overlaySources||[])add(source.src);
    }
    for(const sources of Object.values(photographyHeroSources))for(const source of sources)add(source.src);
    const decoded=[];
    for(const url of images){
     const image=new Image();image.src=url;
     try{await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw Error('Empty image');decoded.push({url,width:image.naturalWidth,height:image.naturalHeight});}
     catch(error){throw Error('Image decode failed: '+url+' — '+error.message);}
     finally{image.src='';}
    }
    const playable=[];
    for(const url of videos){
     const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
     try{
      await new Promise((resolve,reject)=>{
       const timer=setTimeout(()=>reject(Error('Video ready timeout: '+url)),20000);
       video.addEventListener('canplay',()=>{clearTimeout(timer);resolve();},{once:true});
       video.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Video decode failed: '+url));},{once:true});video.src=url;
      });
      if(!video.videoWidth||!video.videoHeight)throw Error('Empty video: '+url);
      playable.push({url,width:video.videoWidth,height:video.videoHeight,duration:video.duration});
     }finally{video.pause();video.removeAttribute('src');video.load();}
    }
    return {viewport:[innerWidth,innerHeight],decoded,playable};
   });
   assert.deepEqual(errors,[]);results.push(result);await page.close();
   console.log(JSON.stringify({viewport:result.viewport,images:result.decoded.length,videos:result.playable.length,errors}));
   await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
