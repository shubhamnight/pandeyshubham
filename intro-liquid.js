// Expand the actual gooey loader into the exact HTML button bounds. The two
// wave animations keep their phase throughout; no replacement model.
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
const number=value=>Number(value.toFixed(3));
export const introLiquidTiming={merge:560,expand:760,handoff:360};
function rgb(value,fallback){
  const channels=value.match(/[\d.]+/g)?.map(Number);
  return channels?.length>=3?channels.slice(0,3):fallback;
}
function color(from,to,progress,alpha=1){
  return `rgba(${from.map((v,i)=>number(v+(to[i]-v)*progress)).join(',')},${number(alpha)})`;
}

export async function morphLoadingIntoPlay(intro,preference,signal){
  const loading=intro.querySelector('.intro-loading');
  const mount=intro.querySelector('.message-loading-mount'),surface=mount.querySelector('.gooey-loader');
  const play=intro.querySelector('.intro-play'),button=play.querySelector('button');
  if(!surface)throw new Error('Gooey loading surface unavailable');
  const originalOpacity=button.style.opacity,originalStyle=surface.getAttribute('style');
  const initial=surface.getBoundingClientRect(),initialRadius=parseFloat(getComputedStyle(surface).borderTopLeftRadius)||0;
  const waves=surface.querySelector('.gooey-loader-waves');
  const primary=rgb(getComputedStyle(waves,'::before').backgroundColor,[2,151,222]);
  const secondary=rgb(getComputedStyle(waves,'::after').backgroundColor,[102,200,245]);
  button.inert=true;button.style.opacity='0';play.hidden=false;
  intro.classList.add('play-morphing','message-loader-transition');
  const bloom=document.createElement('div');bloom.className='intro-blue-bloom';
  bloom.setAttribute('aria-hidden','true');bloom.style.left=bloom.style.top='50%';intro.prepend(bloom);
  let frame=0,last=0,elapsed=0,suspended=false,dirty=true,phase='',finish;
  let width=0,height=0,bloomScale=1,toColor=[36,36,36],edge=[98,98,98],endBorder={};
  const {merge,expand,handoff}=introLiquidTiming,handoffAt=merge+expand,total=handoffAt+handoff;
  function measure(){
    const bounds=button.getBoundingClientRect(),style=getComputedStyle(button);
    width=bounds.width;height=bounds.height;
    for(const side of ['top','right','bottom','left'])endBorder[side]=parseFloat(style[`border${side[0].toUpperCase()+side.slice(1)}Width`])||0;
    toColor=rgb(style.backgroundColor,[36,36,36]);edge=rgb(style.borderTopColor,[98,98,98]);
    bloomScale=Math.hypot(innerWidth,innerHeight)/(64*.72)*1.04;dirty=false;
  }
  function paint(){
    if(dirty)measure();
    const next=elapsed<merge?'merge':elapsed<handoffAt?'expand':'handoff';
    if(next!==phase){phase=next;intro.dataset.loadingPhase=phase;}
    const progress=clamp(elapsed/handoffAt),growth=smooth(progress),shade=smooth((progress-.35)/.65);
    surface.style.width=`${number(initial.width+(width-initial.width)*growth)}px`;
    surface.style.height=`${number(initial.height+(height-initial.height)*growth)}px`;
    // The outer capsule clips AFTER the wave filter. Its outline is introduced
    // only once the liquid has become a solid surface, never around the waves.
    surface.style.borderRadius=`${number(initialRadius+(Math.min(width,height)/2-initialRadius)*growth)}px`;
    const borderProgress=smooth((progress-.9)/.1);
    for(const side of ['top','right','bottom','left'])surface.style[`border${side[0].toUpperCase()+side.slice(1)}Width`]=`${number(endBorder[side]*borderProgress)}px`;
    surface.style.borderColor=color(edge,edge,1,borderProgress);
    surface.style.backgroundColor=color(toColor,toColor,1,smooth((progress-.45)/.35));
    surface.style.setProperty('--gooey-primary-color',color(primary,toColor,shade));
    surface.style.setProperty('--gooey-secondary-color',color(secondary,toColor,shade));
    surface.style.setProperty('--gooey-wave-rise',`${number(height*1.2*smooth((progress-.05)/.85))}px`);
    surface.style.setProperty('--gooey-base-opacity',String(1-smooth(progress/.45)));
    surface.style.setProperty('--gooey-wave-opacity',String(1-smooth((progress-.72)/.28)));
    // Keep the small wave filter constant; fading its isolated layer avoids
    // per-frame blur-kernel changes and leaves a clean opaque PLAY capsule.
    button.style.opacity=String(smooth((elapsed-handoffAt)/handoff));
    const reveal=smooth((elapsed-500)/1000);
    bloom.style.transform=`translate(-50%,-50%) scale(${reveal*bloomScale})`;
    bloom.style.opacity=String(smooth(reveal/.3));
  }
  function complete(){cancelAnimationFrame(frame);frame=0;finish?.();}
  function tick(time){
    frame=0;if(document.hidden||suspended)return;
    elapsed=Math.min(total,elapsed+(last?Math.max(0,Math.min(50,time-last)):0));last=time;
    try{paint();if(elapsed===total)complete();else frame=requestAnimationFrame(tick);}
    catch(error){console.warn('Liquid handoff unavailable; showing PLAY.',error);complete();}
  }
  function sync(){
    if(document.hidden||suspended){cancelAnimationFrame(frame);frame=0;last=0;}
    else if(!frame&&elapsed<total){last=0;frame=requestAnimationFrame(tick);}
  }
  const suspend=()=>{suspended=true;sync();},resume=()=>{suspended=false;sync();};
  const resize=()=>{dirty=true;sync();};
  const reduce=()=>{if(preference.matches){elapsed=total;paint();complete();}};
  const observer=new ResizeObserver(resize);
  try{
    measure();paint();
    if(!preference.matches&&!signal.aborted){
      await new Promise(resolve=>{
        finish=resolve;
        document.addEventListener('visibilitychange',sync);
        window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',resume);
        window.addEventListener('resize',resize,{passive:true});
        preference.addEventListener('change',reduce);signal.addEventListener('abort',complete,{once:true});
        observer.observe(button);observer.observe(mount);sync();
      });
    }
  }finally{
    cancelAnimationFrame(frame);observer.disconnect();
    document.removeEventListener('visibilitychange',sync);
    window.removeEventListener('pagehide',suspend);window.removeEventListener('pageshow',resume);window.removeEventListener('resize',resize);
    preference.removeEventListener('change',reduce);signal.removeEventListener('abort',complete);
    if(!signal.aborted){
      loading.hidden=true;intro.classList.add('show-play','play-morphed');
      intro.classList.remove('play-morphing','message-loader-transition');intro.dataset.loadingPhase='ready';button.inert=false;
    }
    button.style.opacity=originalOpacity;
    if(originalStyle===null)surface.removeAttribute('style');else surface.setAttribute('style',originalStyle);
    bloom.remove();
  }
}
