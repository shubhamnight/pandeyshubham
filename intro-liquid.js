// A small SVG surface is used only during the handoff. The existing HTML
// button supplies the exact final bevel, lettering and interaction animations.
const SVG='http://www.w3.org/2000/svg';
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
const number=value=>Number(value.toFixed(3));
export const introLiquidTiming={merge:560,overlap:180,expand:1040,handoff:360};

function line(points,x,y){
  const fromX=points.at(-2),fromY=points.at(-1);
  points.push(fromX+(x-fromX)/3,fromY+(y-fromY)/3,fromX+(x-fromX)*2/3,fromY+(y-fromY)*2/3,x,y);
}
export function capsuleContour(width,height){
  const x=width/2,y=height/2,r=Math.min(x,y),k=r*.5522847498307936;
  const points=[-x+r,-y];
  line(points,x-r,-y);points.push(x-r+k,-y,x,-y+r-k,x,-y+r);
  line(points,x,y-r);points.push(x,y-r+k,x-r+k,y,x-r,y);
  line(points,-x+r,y);points.push(-x+r-k,y,-x,y-r+k,-x,y-r);
  line(points,-x,-y+r);points.push(-x,-y+r-k,-x+r-k,-y,-x+r,-y);
  return points;
}
export function interpolateContour(from,to,progress){
  const values=from.map((value,index)=>number(value+(to[index]-value)*progress));
  return `M${values[0]} ${values[1]}C${values.slice(2).join(' ')}Z`;
}
function element(name,attributes={}){
  const node=document.createElementNS(SVG,name);
  for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));
  return node;
}
function rgb(color,fallback){
  const values=color.match(/[\d.]+/g)?.map(Number);
  return values?.length>=3&&values[3]!==0?values.slice(0,3):fallback;
}
function colorBetween(from,to,progress){return `rgb(${from.map((v,i)=>Math.round(v+(to[i]-v)*progress)).join(',')})`;}

export async function morphLoadingIntoPlay(intro,preference,signal){
  const loading=intro.querySelector('.intro-loading');
  const mount=intro.querySelector('.message-loading-mount'),source=mount.querySelector('svg');
  const play=intro.querySelector('.intro-play'),button=play.querySelector('button');
  const originalOpacity=button.style.opacity,originalVisibility=mount.style.visibility;
  const dots=[...source.querySelectorAll('circle')].map(circle=>({x:circle.cx.animVal.value-12,y:circle.cy.animVal.value-12,velocity:0}));
  source.pauseAnimations?.();
  // Sample native bounce velocity once so a dot moving upward doesn't suddenly
  // stop when loading completes. Restore its original pose before the handoff.
  try{
    const time=source.getCurrentTime(),step=1/120;
    source.setCurrentTime(time+step);
    [...source.querySelectorAll('circle')].forEach((circle,i)=>{dots[i].velocity=Math.max(-60,Math.min(60,(circle.cy.animVal.value-12-dots[i].y)/step));});
    source.setCurrentTime(time);
  }catch{/* A static fallback has zero starting velocity. */}
  button.inert=true;play.hidden=false;
  intro.classList.add('play-morphing','message-loader-transition');
  const surface=element('svg',{'aria-hidden':'true',class:'intro-liquid-morph'});
  const defs=element('defs'),filter=element('filter',{id:'intro-liquid-goo',filterUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'});
  const blur=element('feGaussianBlur',{in:'SourceGraphic',stdDeviation:0,result:'blur'});
  const matrix=element('feColorMatrix',{in:'blur',type:'matrix'});
  filter.append(blur,matrix);defs.append(filter);
  const group=element('g',{filter:'url(#intro-liquid-goo)'});
  const circles=dots.map(()=>element('circle'));
  group.append(...circles);
  const shape=element('path',{'stroke-linejoin':'round'});shape.style.display='none';
  surface.append(defs,group,shape);
  const bloom=document.createElement('div');bloom.className='intro-blue-bloom';
  bloom.setAttribute('aria-hidden','true');bloom.style.left=bloom.style.top='50%';
  intro.prepend(bloom);intro.append(surface);
  const fromColor=rgb(getComputedStyle(source).color,[2,151,222]);
  let frame=0,last=0,elapsed=0,suspended=false,dirty=true,phase='',finish;
  let unit=1,offsetX=0,offsetY=0,radius=0,circle=[],target=[],stroke=1.5,bloomScale=1,toColor=[36,36,36],edge=[98,98,98];
  const {merge,overlap,expand,handoff}=introLiquidTiming;
  const expandAt=merge-overlap,handoffAt=expandAt+expand,total=handoffAt+handoff;
  function measure(){
    const bounds=button.getBoundingClientRect(),start=source.getBoundingClientRect(),style=getComputedStyle(button);
    unit=start.width/24;radius=2*unit*Math.sqrt(3);
    offsetX=start.left+start.width/2-bounds.left-bounds.width/2;
    offsetY=start.top+start.height/2-bounds.top-bounds.height/2;
    stroke=parseFloat(style.borderTopWidth)||1.5;
    circle=capsuleContour(radius*2,radius*2);
    target=capsuleContour(bounds.width-stroke,bounds.height-stroke);
    toColor=rgb(style.backgroundColor,[36,36,36]);edge=rgb(style.borderTopColor,[98,98,98]);
    bloomScale=Math.hypot(innerWidth,innerHeight)/(64*.72)*1.04;
    const w=bounds.width+80,h=Math.max(bounds.height+80,start.height*2+16);
    surface.setAttribute('viewBox',`${-w/2} ${-h/2} ${w} ${h}`);
    Object.assign(surface.style,{left:`${bounds.left+bounds.width/2}px`,top:`${bounds.top+bounds.height/2}px`,width:`${w}px`,height:`${h}px`});
    for(const [key,value]of Object.entries({x:-start.width,y:-start.height,width:start.width*2,height:start.height*2}))filter.setAttribute(key,String(value));
    dirty=false;
  }
  function paint(){
    if(dirty)measure();
    const next=elapsed<merge?'merge':elapsed<handoffAt?'expand':'handoff';
    if(next!==phase){phase=next;intro.dataset.loadingPhase=phase;}
    if(elapsed<merge){
      const p=clamp(elapsed/merge),ease=smooth(p),p2=p*p,p3=p2*p,p4=p3*p,p5=p4*p;
      const goo=Math.sin(Math.PI*ease),contrast=1+19*goo;
      group.style.display='';group.style.opacity=String(1-smooth((elapsed-expandAt)/overlap));
      group.setAttribute('fill',colorBetween(fromColor,fromColor,0));
      blur.setAttribute('stdDeviation',String(unit*.9*goo));
      matrix.setAttribute('values',`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${contrast} ${-(contrast-1)*.44}`);
      dots.forEach((dot,index)=>{
        // Retain the bounce's starting velocity and settle both velocity and
        // acceleration to zero, avoiding a kink as the dots join.
        const y=(1-ease)*(dot.y*unit+offsetY)+(p-6*p3+8*p4-3*p5)*(merge/1000)*dot.velocity*unit;
        circles[index].setAttribute('cx',String(number((dot.x*unit+offsetX)*(1-ease))));
        circles[index].setAttribute('cy',String(number(y)));
        circles[index].setAttribute('r',String(number(2*unit+(radius-2*unit)*smooth((p-.35)/.65))));
      });
    }else group.style.display='none';
    if(elapsed>=expandAt){
      shape.style.display='';
      shape.style.opacity=String(smooth((elapsed-expandAt)/overlap));
      const growth=smooth((elapsed-expandAt)/expand);
      // Keep a rounded liquid silhouette throughout: the merged dot grows
      // into the capsule before the merge settles, without a stop between stages.
      shape.setAttribute('d',interpolateContour(circle,target,growth));
      shape.setAttribute('fill',colorBetween(fromColor,toColor,growth));
      shape.setAttribute('stroke',colorBetween(edge,edge,0));shape.setAttribute('stroke-width',String(stroke));
      shape.setAttribute('stroke-opacity',String(smooth((growth-.15)/.65)));
    }else shape.style.display='none';
    const transfer=smooth((elapsed-handoffAt)/handoff);
    // Keep the matched capsule opaque beneath the real button so its surface
    // doesn't dim halfway through the handoff as lettering and bevel appear.
    button.style.opacity=String(transfer);
    const reveal=clamp((elapsed-(handoffAt-420))/700);
    bloom.style.transform=`translate(-50%,-50%) scale(${smooth(reveal)*bloomScale})`;
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
    measure();paint();mount.style.visibility='hidden';
    if(!preference.matches&&!signal.aborted){
      await new Promise(resolve=>{
        finish=resolve;
        document.addEventListener('visibilitychange',sync);
        window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',resume);
        window.addEventListener('resize',resize,{passive:true});
        preference.addEventListener('change',reduce);signal.addEventListener('abort',complete,{once:true});
        observer.observe(button);observer.observe(source);sync();
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
    button.style.opacity=originalOpacity;mount.style.visibility=originalVisibility;
    surface.remove();bloom.remove();
  }
}
