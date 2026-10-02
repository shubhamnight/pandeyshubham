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
    const color=index%4===0?'#a9cbff':'#e6edf7';
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
  let frame=0, visible=true, x=0, y=0, hoverVisible=false;
  function clearHover() {
    if(!frame&&!hoverVisible)return;
    cancelAnimationFrame(frame); frame=0;
    hoverVisible=false;
    retro.style.setProperty('--retro-hover','0');
  }
  function updateState() {
    retro.classList.toggle('is-paused', !visible || document.hidden || reduce.matches);
    stars.classList.toggle('is-paused', !visible || document.hidden || reduce.matches);
    clearHover();
  }
  host.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch' || reduce.matches || !visible || document.hidden) return;
    x=event.clientX; y=event.clientY;
    if(frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      const rect=host.getBoundingClientRect();
      if(!rect.width || !rect.height) return;
      retro.style.setProperty('--retro-x',((x-rect.left)*host.clientWidth/rect.width)+'px');
      retro.style.setProperty('--retro-y',((y-rect.top)*host.clientHeight/rect.height)+'px');
      retro.style.setProperty('--retro-hover','1');
      hoverVisible=true;
    });
  },{passive:true});
  host.addEventListener('pointerleave',clearHover);
  window.addEventListener('scroll',clearHover,{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;updateState();}).observe(host);
  document.addEventListener('visibilitychange',updateState);
  reduce.addEventListener('change',updateState);
  updateState();
})();
