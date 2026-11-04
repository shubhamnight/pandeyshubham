let styles;
function loadStyles() {
  return styles ||= new Promise((resolve,reject)=>{
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=new URL('./intro.css',import.meta.url);
    const deadline=setTimeout(()=>fail(),8000);
    function fail(){
      clearTimeout(deadline);link.remove();styles=null;
      reject(new Error('Intro stylesheet unavailable'));
    }
    link.addEventListener('load',()=>{clearTimeout(deadline);resolve();},{once:true});
    link.addEventListener('error',fail,{once:true});
    document.head.append(link);
  });
}

export async function replayIntro(){
  await loadStyles();
  const intro=document.querySelector('#intro-template').content.firstElementChild.cloneNode(true);
  const dismiss=intro.querySelector('.intro-dismiss');
  intro.insertAdjacentHTML('beforeend','<div class="intro-play" hidden><button class="flow-play" type="button" aria-label="Enter Shubham Pandey’s portfolio"><svg class="flow-arrow flow-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg><span class="flow-label play-flicker-label" aria-hidden="true"><span>P</span><span>L</span><span>A</span><span>Y</span></span><span class="flow-fill" aria-hidden="true"></span><svg class="flow-arrow flow-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg></button></div>');
  const button=intro.querySelector('.flow-play');
  const badgeRig = document.querySelector('#home .badge-rig');
  const label = button.querySelector('.play-flicker-label');
  const letters=[...label.children];
  const glows=letters.map(letter=>{
    const glow=document.createElement('span');
    glow.className='play-letter-glow';glow.textContent=letter.textContent;
    glow.setAttribute('aria-hidden','true');letter.append(glow);return glow;
  });
  const flickerReduced=matchMedia('(prefers-reduced-motion: reduce)');
  let activeLoader, stopCrowd, closed=false, timer;
  const listeners=new AbortController();
  const {signal}=listeners;
  let flickerEnabled=false,flickerElapsed=0,flickerAnimations=[];
  function randomAt(lane,step){
    let hash=(Math.imul(lane,374761393)^Math.imul(step,668265263))>>>0;
    hash=Math.imul(hash^(hash>>>13),1274126177)>>>0;
    return hash/4294967295*2-1;
  }
  function noiseAt(lane,time){
    const step=Math.floor(time),t=time-step,ease=t*t*t*(t*(t*6-15)+10);
    // Wrapping the noise joins the cycle with matching brightness and velocity.
    const from=randomAt(lane,step%32),to=randomAt(lane,(step+1)%32);
    return from+(to-from)*ease;
  }
  // Build a seamless 16-second cycle once during loading. Only opacity changes
  // during playback; the three blur radii are rasterized as fixed glow layers.
  const flickerTracks=letters.map((letter,index)=>{
    const brightness=[],glow=[];
    for(let sample=0;sample<=384;sample++){
      const offset=sample/384,time=offset*32;
      const noise=(noiseAt(index+1,time)*.5+noiseAt(0,time)*.5)/Math.SQRT1_2;
      const strength=Math.min(1,Math.min(time,32-time)/1.6);
      const envelope=strength*strength*strength*(strength*(strength*6-15)+10);
      // Start at the brightness used by the reveal, then ease into flicker.
      // Matching both ends also keeps the repeating cycle free of a flash.
      const opacity=1+(Math.max(.3,Math.min(1,1-noise))-1)*envelope;
      brightness.push({offset,opacity});
      glow.push({offset,opacity:Math.max(0,Math.min(1,(opacity-.6)/.4))*envelope});
    }
    return {letter,light:glows[index],brightness,glow};
  });
  function syncFlicker(){
    const running=flickerEnabled&&!document.hidden&&!flickerReduced.matches;
    label.classList.toggle('is-flickering',running);
    if(!flickerEnabled||flickerReduced.matches){
      flickerAnimations.forEach(animation=>animation.cancel());
      flickerAnimations=[];flickerElapsed=0;return;
    }
    if(!running){
      flickerElapsed=Number(flickerAnimations[0]?.currentTime)||0;
      flickerAnimations.forEach(animation=>animation.pause());return;
    }
    if(!flickerAnimations.length&&label.animate){
      const timing={duration:16000,iterations:Infinity,easing:'linear'};
      for(const track of flickerTracks){
        flickerAnimations.push(track.letter.animate(track.brightness,timing),track.light.animate(track.glow,timing));
      }
    }
    // One timeline for every letter and glow, including after a tab resumes.
    const start=Number(document.timeline.currentTime)-flickerElapsed;
    flickerAnimations.forEach(animation=>{animation.play();animation.startTime=start;});
  }
  document.body.append(intro);
  intro.showModal();
  document.body.classList.add('intro-active');
  document.addEventListener('visibilitychange',syncFlicker,{signal});
  flickerReduced.addEventListener('change',syncFlicker,{signal});
  const dismissed=new Promise(resolve=>{
    intro.addEventListener('close',()=>{
      closed=true;listeners.abort();clearTimeout(timer);
      flickerEnabled=false;syncFlicker();
      activeLoader?.dispose();stopCrowd?.();
      document.body.classList.remove('intro-active');
      intro.remove();
      resolve();
    },{once:true});
  });
  dismiss.addEventListener('click',()=>intro.close(),{signal});
  import('./intro-crowd.js').then(()=>{
    if(intro.open)stopCrowd=window.startIntroCrowd?.(intro);
  }).catch(()=>{});
  const waitForLoader=import('./intro-loader.js').catch(()=>null);
  async function showPlay(){
    // A slow or unavailable optional module cannot block PLAY.
    const module=await Promise.race([waitForLoader,new Promise(resolve=>{
      timer=setTimeout(()=>resolve(null),3500);
      signal.addEventListener('abort',()=>resolve(null),{once:true});
    })]);
    clearTimeout(timer);
    if(closed||!intro.open)return;
    try {
      if(module){
        activeLoader=module.createMessageLoader(intro);
        await activeLoader.finish();
      }
    } catch {
      activeLoader?.dispose();
    }
    if(closed||!intro.open)return;
    intro.querySelector('.intro-loading').hidden=true;
    intro.querySelector('.message-loading-mount').replaceChildren();
    intro.querySelector('.intro-play').hidden=false;
    intro.classList.add('show-play','play-css-surface','crowd-ready');
    // A stationary pointer over the center must not trigger the new hover pose.
    intro.addEventListener('pointermove',()=>intro.classList.add('play-hover-ready'),{once:true,passive:true,signal});
    flickerEnabled=true;
    syncFlicker();
    button.focus({preventScroll:true});
  }
  void showPlay();
  // Browser input modality may carry over from the link that opened this
  // page. Show PLAY's focus ring only after keyboard navigation here.
  intro.addEventListener('pointerdown',()=>intro.classList.remove('keyboard-navigation'),{passive:true,signal});
  intro.addEventListener('keydown',event=>{
    if(event.key!=='Tab') return;
    intro.classList.add('keyboard-navigation');
  },{signal});
  button.addEventListener('click',async()=>{
    flickerEnabled=false;
    syncFlicker();
    stopCrowd?.();stopCrowd=null;
    button.disabled=true;
    intro.classList.add('is-zooming');
    // Restore the page's final layout while it is still covered, avoiding a
    // scrollbar/layout jump at the end of the fade. Content remains inert.
    document.body.classList.remove('intro-active');
    window.scrollTo({top:0,behavior:'instant'});
    const hero = document.querySelector('#home');
    if(!intro.animate){
      intro.close();hero.tabIndex=-1;hero.focus({preventScroll:true});return;
    }
    const duration=flickerReduced.matches?180:1100;
    const bounds=button.getBoundingClientRect();
    const targetScale=Math.max(innerWidth/bounds.width,innerHeight/bounds.height)*1.25;
    const animations=[intro.animate([
      {opacity:1,offset:0},
      {opacity:1,offset:flickerReduced.matches?0:0.32},
      {opacity:0,offset:1}
    ],{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'})];
    if(!flickerReduced.matches){
      animations.push(button.animate([
        {transform:'scale(1)'},
        {transform:`scale(${targetScale})`}
      ],{duration,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'}));
      // Let the solid button lead the zoom, with its details resolving early.
      for(const detail of button.querySelectorAll('.flow-label,.flow-arrow')){
        animations.push(detail.animate([{opacity:1},{opacity:0}],{
          delay:180,duration:360,easing:'ease-in-out',fill:'forwards'
        }));
      }
      const crowd=intro.querySelector('.intro-crowd');
      if(crowd)animations.push(crowd.animate([{opacity:1},{opacity:0}],{
        duration:400,easing:'ease-in-out',fill:'forwards'
      }));
    }
    // The native modal keeps the underlying page inert during the zoom.
    await Promise.allSettled(animations.map(animation=>animation.finished));
    if(!intro.open)return;
    intro.close();
    hero.tabIndex=-1;
    hero.focus({preventScroll:true});
    if(badgeRig){
      if(!flickerReduced.matches){
        badgeRig.inert=true;
        document.body.classList.add('badge-entering');
        const fallDistance=Math.max(badgeRig.offsetHeight, badgeRig.scrollHeight)+40;
        // Independent descent and pendulum curves avoid a sudden impact or bounce.
        const descent=badgeRig.animate([
          {translate:`0 -${fallDistance}px`,opacity:0,offset:0},
          {translate:`0 -${fallDistance*.7}px`,opacity:1,offset:.2},
          {translate:'0 0',opacity:1,offset:1}
        ],{duration:1800,easing:'cubic-bezier(.22,.55,.25,1)',fill:'both'});
        const sway=badgeRig.animate([
          {rotate:'-2.5deg',offset:0,easing:'ease-in-out'},
          {rotate:'1.4deg',offset:.46,easing:'ease-in-out'},
          {rotate:'-.55deg',offset:.72,easing:'ease-in-out'},
          {rotate:'.15deg',offset:.88,easing:'ease-out'},
          {rotate:'0deg',offset:1}
        ],{duration:2200,fill:'both'});
        try{await Promise.all([descent.finished,sway.finished]);}catch{}finally{
          descent.cancel();sway.cancel();
          badgeRig.inert=false;
          document.body.classList.remove('badge-entering');
          badgeRig.dispatchEvent(new Event('badge-entrance-complete'));
        }
      }
    }
  },{once:true,signal});
  return dismissed;
}
