(() => {
  const intro = document.querySelector('.portfolio-intro') || document.createElement('div');
  intro.className = 'portfolio-intro';
  intro.setAttribute('role','dialog');
  intro.setAttribute('aria-modal','true');
  intro.setAttribute('aria-label','Enter Shubham’s portfolio');
  if(!intro.querySelector('.intro-loading'))intro.innerHTML='<div class="intro-loading"><div class="batman-loader-stage" aria-hidden="true"></div></div>';
  intro.insertAdjacentHTML('beforeend','<div class="intro-play" hidden><button class="flow-play" type="button" aria-label="Play"><svg class="flow-arrow flow-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg><span class="flow-label play-flicker-label" aria-hidden="true"><span>P</span><span>L</span><span>A</span><span>Y</span></span><span class="flow-fill" aria-hidden="true"></span><svg class="flow-arrow flow-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg></button></div>');
  const content = [...document.querySelectorAll('body > main, body > nav, body > .skip')];
  content.forEach(element=>element.inert=true);
  document.body.classList.add('intro-active');
  document.body.append(intro);
  const button = intro.querySelector('button');
  const badgeRig = document.querySelector('#home .badge-rig');
  if(badgeRig)badgeRig.classList.add('awaiting-entrance');
  button.setAttribute('aria-label','Enter Shubham Pandey’s portfolio');
  const label = button.querySelector('.play-flicker-label');
  const letters=[...label.children];
  const glows=letters.map(letter=>{
    const glow=document.createElement('span');
    glow.className='play-letter-glow';glow.textContent=letter.textContent;
    glow.setAttribute('aria-hidden','true');letter.append(glow);return glow;
  });
  const flickerReduced=matchMedia('(prefers-reduced-motion: reduce)');
  let activeLoader=null;
  const loaderReady=import('./batman-loader.js').then(module=>{
    activeLoader=module.createBatmanLoader(intro);return activeLoader;
  }).catch(error=>{
    console.warn('3D loader unavailable; opening PLAY without WebGL.',error);
    return {finish:async()=>{intro.querySelector('.intro-loading').hidden=true;}};
  });
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
    if(!flickerAnimations.length){
      const timing={duration:16000,iterations:Infinity,easing:'linear'};
      for(const track of flickerTracks){
        flickerAnimations.push(track.letter.animate(track.brightness,timing),track.light.animate(track.glow,timing));
      }
    }
    // One timeline for every letter and glow, including after a tab resumes.
    const start=Number(document.timeline.currentTime)-flickerElapsed;
    flickerAnimations.forEach(animation=>{animation.play();animation.startTime=start;});
  }
  document.addEventListener('visibilitychange',syncFlicker);
  flickerReduced.addEventListener('change',syncFlicker);
  const started = performance.now();
  let ready = false;
  // Decode and clean the sprites during loading instead of the PLAY entrance.
  let stopCrowd = window.startIntroCrowd?.(intro)||(()=>{});
  function showPlay() {
    if (ready) return;
    ready = true;
    setTimeout(async()=>{
      const loader=await loaderReady;
      await loader.finish();
      intro.querySelector('.intro-loading').hidden=!intro.classList.contains('play-webgl');
      intro.querySelector('.intro-play').hidden=false;
      intro.classList.add('show-play');
      document.body.classList.add('batman-cursor-active');
      // A stationary pointer over the center must not pull the new button
      // into its hover pose at the exact instant the morph finishes.
      intro.addEventListener('pointermove',()=>intro.classList.add('play-hover-ready'),{once:true,passive:true});
      // Begin the people only after the button and blue expansion have landed.
      requestAnimationFrame(()=>intro.classList.add('crowd-ready'));
      flickerEnabled=true;
      syncFlicker();
      button.focus({preventScroll:true});
    },Math.max(0,2000-(performance.now()-started)));
  }
  if(document.readyState==='complete') showPlay();
  else window.addEventListener('load',showPlay,{once:true});
  // Browser input modality may carry over from the link that opened this
  // page. Show PLAY's focus ring only after keyboard navigation here.
  intro.addEventListener('pointerdown',()=>intro.classList.remove('keyboard-navigation'),{passive:true});
  intro.addEventListener('keydown',event=>{
    if(event.key!=='Tab') return;
    intro.classList.add('keyboard-navigation');
    const items=[...intro.querySelectorAll('button,a')].filter(el=>!el.inert&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
    if(!items.length){event.preventDefault();return;}
    if(event.shiftKey && document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
    else if(!event.shiftKey && document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
  });
  button.addEventListener('click',async()=>{
    flickerEnabled=false;
    syncFlicker();
    document.removeEventListener('visibilitychange',syncFlicker);
    flickerReduced.removeEventListener('change',syncFlicker);
    stopCrowd();
    button.disabled=true;
    intro.classList.add('is-zooming');
    // Restore the page's final layout while it is still covered, avoiding a
    // scrollbar/layout jump at the end of the fade. Content remains inert.
    document.body.classList.remove('intro-active');
    window.scrollTo({top:0,behavior:'instant'});
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
      const surface=intro.querySelector('.batman-loader-stage>canvas');
      if(surface&&intro.classList.contains('play-webgl')){
        const surfaceBounds=surface.getBoundingClientRect();
        surface.style.transformOrigin=`${bounds.left+bounds.width/2-surfaceBounds.left}px ${bounds.top+bounds.height/2-surfaceBounds.top}px`;
        animations.push(surface.animate([{transform:'scale(1)'},{transform:`scale(${targetScale})`}],{
          duration,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'
        }));
      }
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
    // Keep the underlying page inert until the visual transition has completed.
    await Promise.allSettled(animations.map(animation=>animation.finished));
    activeLoader?.dispose?.();
    content.forEach(element=>element.inert=false);
    document.body.classList.remove('intro-active');
    intro.remove();
    window.dispatchEvent(new Event('portfolio-ready'));
    const hero = document.querySelector('#home');
    hero.tabIndex=-1;
    hero.focus({preventScroll:true});
    if(badgeRig){
      badgeRig.classList.remove('awaiting-entrance');
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
  },{once:true});
})();
