import { requestHobbyFrame, cancelHobbyFrame } from './hobby-motion-clock.js';

(() => {
  const host = document.querySelector('#home');
  if (!host) return;
  const stars = document.createElement('div');
  stars.className = 'hero-stars';
  stars.setAttribute('aria-hidden','true');
  // Fixed distribution keeps the subtle background stable across reloads.
  let starSeed = 1707;
  const starRandom = () => {
    starSeed = (Math.imul(starSeed,1664525)+1013904223) >>> 0;
    return starSeed / 4294967296;
  };
  // Six cached layers vary independently without per-star DOM or frame callbacks.
  const starGroups=Array.from({length:6},()=>[]);
  for(let index=0;index<220;index++){
    const starShapes=starGroups[index%starGroups.length];
    const x=(16+starRandom()*1568).toFixed(1);
    const y=(16+starRandom()*820).toFixed(1);
    const bright=index%29===0;
    const radius=bright?1.35:(.45+starRandom()*.55);
    const opacity=(bright?.62:.16+starRandom()*.29).toFixed(2);
    const color=index%4===0?'#5685c1':'#e7ebf0';
    if(bright){
      starShapes.push(`<circle cx="${x}" cy="${y}" r="4" fill="${color}" opacity=".035"/>`);
      starShapes.push(`<path d="M${Number(x)-3.5} ${y}h7M${x} ${Number(y)-3.5}v7" stroke="${color}" stroke-width=".55" opacity=".2"/>`);
    }
    starShapes.push(`<circle cx="${x}" cy="${y}" r="${radius.toFixed(2)}" fill="${color}" opacity="${opacity}"/>`);
  }
  starGroups.forEach(shapes=>{
    const layer=document.createElement('div');
    layer.className='hero-star-layer';
    const starSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">${shapes.join('')}</svg>`;
    layer.style.backgroundImage=`url("data:image/svg+xml,${encodeURIComponent(starSvg)}")`;
    layer.style.animationDuration=(6+starRandom()*7).toFixed(2)+'s';
    layer.style.animationDelay=(-starRandom()*16).toFixed(2)+'s';
    stars.append(layer);
  });
  host.prepend(stars);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const retro = document.createElement('div');
  retro.className = 'hero-retro-grid';
  retro.setAttribute('aria-hidden','true');
  retro.innerHTML = '<div class="hero-retro-plane"><div class="hero-retro-lines"></div></div><div class="hero-retro-hover"><div class="hero-retro-plane"><div class="hero-retro-lines"></div></div></div>';
  host.prepend(retro);
  host.classList.add('kinetic-grid-ready');
  let frame=0, visible=true, x=0, y=0, hoverVisible=false, paused=null, bounds=null;
  function clearHover() {
    if(!frame&&!hoverVisible)return;
    cancelHobbyFrame(paintHover); frame=0;
    hoverVisible=false;
    retro.style.setProperty('--retro-hover','0');
  }
  function updateState() {
    const next = !visible || document.hidden || reduce.matches || host.classList.contains('hero-covered') ||
      document.body.classList.contains('intro-active') || document.body.classList.contains('motion-paused') ||
      document.body.classList.contains('photography-gallery-open');
    if (next === paused) return;
    paused = next;
    retro.classList.toggle('is-paused', paused);
    stars.classList.toggle('is-paused', paused);
    host.classList.toggle('hero-idle', paused);
    clearHover();
  }
  function paintHover() {
    cancelHobbyFrame(paintHover); frame=0;
    if (paused) return;
    if (!bounds) {
      const rect=host.getBoundingClientRect();
      bounds={left:rect.left,top:rect.top,width:rect.width,height:rect.height,
        layoutWidth:host.clientWidth,layoutHeight:host.clientHeight};
    }
    if(!bounds.width || !bounds.height) return;
    retro.style.setProperty('--retro-x',((x-bounds.left)*bounds.layoutWidth/bounds.width)+'px');
    retro.style.setProperty('--retro-y',((y-bounds.top)*bounds.layoutHeight/bounds.height)+'px');
    if (!hoverVisible) retro.style.setProperty('--retro-hover','1');
    hoverVisible=true;
  }
  function invalidateBounds() { bounds=null; clearHover(); }
  host.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch' || paused) return;
    x=event.clientX; y=event.clientY;
    if(frame) return;
    frame=requestHobbyFrame(paintHover,18);
  },{passive:true});
  host.addEventListener('pointerleave',clearHover);
  window.addEventListener('scroll',invalidateBounds,{passive:true});
  window.addEventListener('resize',invalidateBounds,{passive:true});
  new ResizeObserver(invalidateBounds).observe(host);
  const stateObserver=new MutationObserver(updateState);
  stateObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  stateObserver.observe(host,{attributes:true,attributeFilter:['class']});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;updateState();}).observe(host);
  document.addEventListener('visibilitychange',updateState);
  reduce.addEventListener('change',updateState);
  window.addEventListener('pagehide',clearHover);
  window.addEventListener('pageshow',()=>{invalidateBounds();updateState();});
  updateState();
})();
