(() => {
  const intro = document.querySelector('.portfolio-intro') || document.createElement('div');
  intro.className = 'portfolio-intro';
  intro.setAttribute('role','dialog');
  intro.setAttribute('aria-modal','true');
  intro.setAttribute('aria-label','Enter Shubham’s portfolio');
  const dots = Array.from({length:12},(_,index)=>'<div class="pl__dot" aria-hidden="true" style="--dot:'+index+'"></div>').join('');
  intro.innerHTML = '<div class="intro-loading"><div class="pl">'+dots+'<div class="pl__text" role="status">Loading…</div></div></div><div class="intro-play" hidden><button class="flow-play" type="button" aria-label="Play"><svg class="flow-arrow flow-arrow-left" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg><span class="flow-label play-flicker-label" aria-hidden="true"><span>P</span><span>L</span><span>A</span><span>Y</span></span><span class="flow-fill" aria-hidden="true"></span><svg class="flow-arrow flow-arrow-right" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg></button></div>';
  const content = [...document.querySelectorAll('body > main, body > nav, body > .skip')];
  content.forEach(element=>element.inert=true);
  document.body.classList.add('intro-active');
  document.body.append(intro);
  const button = intro.querySelector('button');
  const badgeRig = document.querySelector('#home .badge-rig');
  if(badgeRig)badgeRig.classList.add('awaiting-entrance');
  button.setAttribute('aria-label','Play');
  const label = button.querySelector('.play-flicker-label');
  const letters=[...label.children];
  const flickerReduced=matchMedia('(prefers-reduced-motion: reduce)');
  let flickerFrame=0,flickerLast=0,flickerTime=0,flickerEnabled=false;
  const clamp=value=>Math.max(0,Math.min(1,value));
  function randomAt(lane,step){
    let hash=(Math.imul(lane,374761393)^Math.imul(step,668265263))>>>0;
    hash=Math.imul(hash^(hash>>>13),1274126177)>>>0;
    return hash/4294967295*2-1;
  }
  function noiseAt(lane,time){
    const step=Math.floor(time),t=time-step,ease=t*t*(3-2*t);
    return randomAt(lane,step)+(randomAt(lane,step+1)-randomAt(lane,step))*ease;
  }
  function animateFlicker(now){
    flickerFrame=0;
    if(!flickerEnabled||document.hidden||flickerReduced.matches)return;
    if(!flickerLast || now-flickerLast>=32){
      flickerTime+=flickerLast?Math.min(now-flickerLast,60)/1000:0;
      flickerLast=now;
      const time=flickerTime*2,shared=noiseAt(0,time);
      letters.forEach((letter,index)=>{
        const noise=(noiseAt(index+1,time)*.5+shared*.5)/Math.SQRT1_2;
        const opacity=Math.max(.3,Math.min(1,1-noise));
        const glow=clamp((opacity-.6)/.4);
        letter.style.opacity=opacity.toFixed(3);
        letter.style.textShadow=[[.08,.55],[.22,.35],[.5,.22]].map(([radius,alpha])=>`0 0 ${radius}em rgba(255,255,255,${(alpha*glow).toFixed(3)})`).join(',');
      });
    }
    flickerFrame=requestAnimationFrame(animateFlicker);
  }
  function syncFlicker(){
    cancelAnimationFrame(flickerFrame);flickerFrame=0;flickerLast=0;
    if(flickerReduced.matches) letters.forEach(letter=>{letter.style.opacity='1';letter.style.textShadow='none';});
    if(flickerEnabled&&!document.hidden&&!flickerReduced.matches)flickerFrame=requestAnimationFrame(animateFlicker);
  }
  document.addEventListener('visibilitychange',syncFlicker);
  flickerReduced.addEventListener('change',syncFlicker);
  const started = performance.now();
  let ready = false;
  // Decode and clean the sprites during loading instead of the PLAY entrance.
  let stopCrowd = window.startIntroCrowd(intro);
  function showPlay() {
    if (ready) return;
    ready = true;
    setTimeout(()=>{
      intro.querySelector('.intro-loading').hidden=true;
      intro.querySelector('.intro-play').hidden=false;
      intro.classList.add('show-play');
      flickerEnabled=true;
      syncFlicker();
      button.focus({preventScroll:true});
    },Math.max(0,2000-(performance.now()-started)));
  }
  if(document.readyState==='complete') showPlay();
  else window.addEventListener('load',showPlay,{once:true});
  const fallback = setTimeout(showPlay,6000);
  intro.addEventListener('keydown',event=>{
    if(event.key!=='Tab') return;
    const items=[...intro.querySelectorAll('button,a')].filter(el=>el.getClientRects().length);
    if(!items.length){event.preventDefault();return;}
    if(event.shiftKey && document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
    else if(!event.shiftKey && document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
  });
  button.addEventListener('click',async()=>{
    clearTimeout(fallback);
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
    content.forEach(element=>element.inert=false);
    document.body.classList.remove('intro-active');
    intro.remove();
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
