import { requestHobbyFrame, cancelHobbyFrame } from './hobby-motion-clock.js';
import { createMagnetism, magneticTarget, pointerPath, magneticDefaults as config } from './cursor-magnetism.js';
import { stepCursorSpring, cursorSpringSettled } from './cursor-physics.js';

const mouse=matchMedia('(any-hover: hover) and (any-pointer: fine)');
const lifecycle=new AbortController();
let activated=document.body.classList.contains('batman-follower-active'),dispose=null;
function createFollower(){
  const events=new AbortController(),passive={capture:true,passive:true,signal:events.signal};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),magnets=createMagnetism();
  const dialogs=[...document.querySelectorAll('dialog')],layers=dialogs.filter(dialog=>dialog.open),roots=new Set();
  const axis=(value=0)=>({value,velocity:0});
  const x=axis(),y=axis(),pitch=axis(),yaw=axis(),bank=axis(),scaleX=axis(1),scaleY=axis(1),opacity=axis(1);
  const axes=[x,y,pitch,yaw,bank,scaleX,scaleY,opacity];
  let logo=null,model=null,running=false,known=false,last=0,pressed=false,releaseTimer=0,retarget=false;
  let pointerX=0,pointerY=0,text=false,width=innerWidth,height=innerHeight;
  function layer(){if(logo){const parent=layers.at(-1)||document.body;if(logo.parentElement!==parent)parent.append(logo);}}
  const observer=new MutationObserver(records=>{for(const {target:dialog}of records){const index=layers.indexOf(dialog);if(index>=0)layers.splice(index,1);if(dialog.open)layers.push(dialog);}layer();refreshTarget();});
  dialogs.forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
  function ensureLogo(){
    if(logo)return;
    logo=document.createElement('div');logo.className='batman-follower';logo.setAttribute('aria-hidden','true');
    model=document.createElement('img');model.src=new URL('./assets/batman/follower.svg',import.meta.url).href;
    model.alt='';model.width=40;model.height=24;model.draggable=false;
    logo.append(model);layer();
  }
  function select(path){
    const element=pressed||reduced.matches?null:magneticTarget(path);
    magnets.select(element);
    if(logo)logo.classList.toggle('is-magnetic',!!element);
    text=!element&&path.some(e=>e instanceof HTMLElement&&e.matches('p,span,h1,h2,h3,h4,h5,h6,input,textarea,[contenteditable=true]')&&(e.textContent?.trim()||e.matches('input,textarea')));
    const root=element?.getRootNode();
    if(root instanceof ShadowRoot&&!roots.has(root)){roots.add(root);root.addEventListener('scroll',refreshTarget,passive);}
  }
  function refreshTarget(){if(known){select(pointerPath(pointerX,pointerY));wake();}}
  function stop(){cancelHobbyFrame(tick);running=false;last=0;for(const state of axes)state.velocity=0;}
  function hide(){
    stop();known=false;clearTimeout(releaseTimer);releaseTimer=0;pressed=false;retarget=false;magnets.clear();
    pitch.value=yaw.value=bank.value=0;scaleX.value=scaleY.value=opacity.value=1;
    if(logo){logo.hidden=true;logo.classList.remove('is-magnetic');}
  }
  function tick(time){
    if(!known||document.hidden){hide();return;}
    const dt=Math.max(0,Math.min((time-last)/1000,.05));last=time;
    if(retarget){retarget=false;select(pointerPath(pointerX,pointerY));}
    let magnet=magnets.advance(dt,pointerX,pointerY),rect=magnet.rect;
    if(rect&&!pressed&&(pointerX<rect.left||pointerX>rect.right||pointerY<rect.top||pointerY>rect.bottom)){
      select(pointerPath(pointerX,pointerY));magnet=magnets.advance(0,pointerX,pointerY);rect=magnet.rect;
    }
    const hovered=!!rect&&!pressed&&!reduced.matches;
    if(logo.classList.contains('is-magnetic')!==hovered)logo.classList.toggle('is-magnetic',hovered);
    let tx=Math.max(0,Math.min(pointerX+18,width-46)),ty=Math.max(0,Math.min(pointerY+18,height-30));
    if(hovered){tx=Math.max(0,Math.min(rect.x+rect.width/2-20,width-46));ty=Math.max(0,Math.min(rect.y+rect.height/2-12,height-30));}
    // One position spring preserves momentum when capture/release changes the
    // destination. There is no mode-dependent velocity reset or full-angle flip.
    if(reduced.matches){x.value=tx;y.value=ty;x.velocity=y.velocity=0;}
    else{stepCursorSpring(x,tx,dt);stepCursorSpring(y,ty,dt);}
    const speed=Math.hypot(x.velocity,y.velocity),deform=speed/60*config.speedMultiplier;
    const moving=!reduced.matches&&!hovered&&!pressed;
    const desiredPitch=moving&&!text?-Math.tanh(y.velocity/1100)*5:0;
    const desiredYaw=moving&&!text?Math.tanh(x.velocity/1100)*7:0;
    const desiredBank=moving&&!text?Math.tanh(x.velocity/1400)*9:0;
    const desiredScaleX=!moving?1:text ? .85 : 1+Math.min(deform,config.maxScaleX);
    const desiredScaleY=!moving?1:text ? 1.12 : 1-Math.min(deform,config.maxScaleY);
    const desiredOpacity=hovered&&rect.width<110 ? .65 : 1;
    if(reduced.matches){pitch.value=yaw.value=bank.value=0;scaleX.value=scaleY.value=opacity.value=1;for(const state of axes)state.velocity=0;}
    else{
      stepCursorSpring(pitch,desiredPitch,dt,26);stepCursorSpring(yaw,desiredYaw,dt,26);stepCursorSpring(bank,desiredBank,dt,26);
      stepCursorSpring(scaleX,desiredScaleX,dt,28);stepCursorSpring(scaleY,desiredScaleY,dt,28);stepCursorSpring(opacity,desiredOpacity,dt,28);
    }
    const settled=cursorSpringSettled(x,tx)&&cursorSpringSettled(y,ty)&&
      cursorSpringSettled(pitch,desiredPitch,.015,.15)&&cursorSpringSettled(yaw,desiredYaw,.015,.15)&&cursorSpringSettled(bank,desiredBank,.015,.15)&&
      cursorSpringSettled(scaleX,desiredScaleX,.001,.01)&&cursorSpringSettled(scaleY,desiredScaleY,.001,.01)&&cursorSpringSettled(opacity,desiredOpacity,.001,.01)&&!magnet.moving;
    if(settled){x.value=tx;y.value=ty;pitch.value=desiredPitch;yaw.value=desiredYaw;bank.value=desiredBank;scaleX.value=desiredScaleX;scaleY.value=desiredScaleY;opacity.value=desiredOpacity;}
    logo.style.transform=`translate3d(${x.value.toFixed(3)}px,${y.value.toFixed(3)}px,0)`;
    model.style.transform=`rotateX(${pitch.value.toFixed(3)}deg) rotateY(${yaw.value.toFixed(3)}deg) rotateZ(${bank.value.toFixed(3)}deg) scale(${scaleX.value.toFixed(3)},${scaleY.value.toFixed(3)})`;
    model.style.opacity=opacity.value.toFixed(3);
    if(settled)stop();
  }
  function wake(){if(!running&&known&&!document.hidden){running=true;last=performance.now();requestHobbyFrame(tick,90);}}
  window.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||document.hidden)return;
    pointerX=event.clientX;pointerY=event.clientY;ensureLogo();
    if(!known){known=true;x.value=Math.max(0,Math.min(pointerX+18,width-46));y.value=Math.max(0,Math.min(pointerY+18,height-30));logo.style.transform=`translate3d(${x.value}px,${y.value}px,0)`;model.style.transform='none';model.style.opacity='1';logo.hidden=false;}
    select(event.composedPath());wake();
  },passive);
  window.addEventListener('pointerover',event=>{if(event.pointerType==='mouse'&&known){select(event.composedPath());wake();}},passive);
  window.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'){clearTimeout(releaseTimer);pressed=true;magnets.hold();if(known){select([]);wake();}}},passive);
  window.addEventListener('pointerup',event=>{if(event.pointerType==='mouse'){releaseTimer=setTimeout(()=>{releaseTimer=0;pressed=false;magnets.release();refreshTarget();},0);}},passive);
  window.addEventListener('pointercancel',()=>{clearTimeout(releaseTimer);releaseTimer=0;pressed=false;magnets.release();refreshTarget();},passive);
  window.addEventListener('pointerout',event=>{if(!event.relatedTarget)hide();},passive);
  window.addEventListener('blur',()=>{pressed=false;hide();},{signal:events.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();},{signal:events.signal});
  window.addEventListener('scroll',refreshTarget,passive);
  window.addEventListener('wheel',()=>{retarget=true;wake();},passive);
  window.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End','PageDown','PageUp'].includes(event.key)){retarget=true;wake();}}, {signal:events.signal});
  window.addEventListener('resize',()=>{width=innerWidth;height=innerHeight;refreshTarget();},passive);
  function preferenceChanged(){if(reduced.matches)magnets.clear();refreshTarget();}
  reduced.addEventListener('change',preferenceChanged);
  return()=>{hide();events.abort();observer.disconnect();reduced.removeEventListener('change',preferenceChanged);logo?.remove();};
}
function sync(){if(activated&&mouse.matches)dispose??=createFollower();else{dispose?.();dispose=null;}}
window.addEventListener('portfolio-pointer-ready',()=>{activated=true;sync();},{signal:lifecycle.signal});
mouse.addEventListener('change',sync);
window.addEventListener('pageshow',sync,{signal:lifecycle.signal});
window.addEventListener('pagehide',event=>{dispose?.();dispose=null;if(!event.persisted){lifecycle.abort();mouse.removeEventListener('change',sync);}},{signal:lifecycle.signal});
sync();
