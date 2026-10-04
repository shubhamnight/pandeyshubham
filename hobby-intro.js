// Scroll positioning is shared by the four existing model canvases.
import { requestHobbyFrame, cancelHobbyFrame, getSmoothPosition, advanceProgress, clampMotionProgress as clamp } from './hobby-motion-clock.js';
import { sceneMotion, observeScene, setModelProgress } from './skills-hobbies-scene.js';
const section=document.querySelector('#projects');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const listeners=new Set();
export const hobbyIntro={strength:0,motion:new WeakMap()};
export function observeHobbyIntro(callback){listeners.add(callback);return()=>listeners.delete(callback);}
let centers=[],frame=0,last=0,progress=0,visible=false,measure=true;
let orbitAngle=0,centerX=0,centerY=0,radius=0;
let previousIntroState=null,previousReveal=-1,bounds=null,boundsDirty=true,modelsReady=false;
let sectionTop=0,sectionHeight=0;
let imagesStarted=false;
const arrivalMotion={value:0,velocity:0},spreadMotion={value:0,velocity:0};
let orbitTime=0;
let atHandoff=false;
const travelSpan=.10/(.65*.90);
const smooth=value=>value*value*value*(value*(value*6-15)+10);
function draw(dt,paused){
  const spread=smooth(progress);
  hobbyIntro.strength=reduced.matches?0:1-spread;
  const modelEntry=sceneMotion.enabled ? arrivalMotion.value : 1;
  const active=visible&&hobbyIntro.strength>.001&&(!sceneMotion.enabled||modelEntry>0);
  const stateChanged=active!==previousIntroState;
  let modelStateChanged=false;
  centers.forEach((center,index)=>{
    const {element,homeX,homeY,angle,motion}=center;
    const theta=angle+orbitAngle;
    const orbitX=centerX+Math.cos(theta)*radius,orbitY=centerY+Math.sin(theta)*radius;
    let x=orbitX-homeX,y=orbitY-homeY;
    if(sceneMotion.enabled){
      // All four models emerge from the skills' outlet, then join the moving orbit.
      const arrival=clamp(modelEntry*1.45-index*.15);
      const t=smooth(arrival),u=1-t;
      const startX=sceneMotion.outletX,startY=sceneMotion.outletY;
      const controlX=orbitX+Math.sin(theta)*radius*.35;
      const controlY=orbitY-Math.cos(theta)*radius*.35;
      x=u*u*u*startX+3*u*u*t*startX+3*u*t*t*controlX+t*t*t*orbitX-homeX;
      y=u*u*u*startY+3*u*u*t*(startY-sectionHeight*.35)+3*u*t*t*controlY+t*t*t*orbitY-homeY;
      const showing=arrival>0&&modelsReady;
      if(center.showing!==showing){
        center.showing=showing;modelStateChanged=true;element.classList.toggle('scene-model-visible',showing);
      }
      const opacity=clamp(arrival*8).toFixed(3);
      if(center.opacity!==opacity){center.opacity=opacity;element.style.setProperty('--scene-model-opacity',opacity);}
    }else if(center.showing!==true){
      center.showing=true;modelStateChanged=true;element.classList.remove('scene-model-visible');element.style.removeProperty('--scene-model-opacity');
    }
    const modelVisible=visible&&center.showing;
    if(motion.visible!==modelVisible){motion.visible=modelVisible;modelStateChanged=true;}
    const offsetX=x*hobbyIntro.strength,offsetY=y*hobbyIntro.strength;
    // Use the same positions as the orbit, without any extra layout reads.
    // The direction also follows the return journey when scrolling upward.
    if(active&&!paused&&center.tracking&&dt>0){
      const speed=Math.max(radius*.65,1);
      const dx=offsetX-center.lastX,dy=offsetY-center.lastY;
      const vx=Math.max(-1,Math.min(1,dx/(dt*speed)));
      const vy=Math.max(-1,Math.min(1,dy/(dt*speed)));
      motion.speed=Math.min(2,Math.hypot(dx,dy)/(dt*speed));
      // Preserve the last heading when stationary; screen Y points downward.
      if(dx*dx+dy*dy>.000001)motion.heading=Math.atan2(-dy,dx);
      motion.pitch=vy*.16*hobbyIntro.strength;
      motion.yaw=vx*.28*hobbyIntro.strength;
      motion.roll=-vx*.14*hobbyIntro.strength;
    }else if(active&&!paused){
      motion.heading=Math.atan2(-Math.cos(angle+orbitAngle),-Math.sin(angle+orbitAngle));
      motion.speed=hobbyIntro.strength*hobbyIntro.strength;
    }else if(!active){motion.pitch=motion.yaw=motion.roll=motion.speed=0;}
    center.lastX=offsetX;center.lastY=offsetY;center.tracking=active&&!paused;
    const translate=`${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px`;
    if(element.introTranslate!==translate){element.introTranslate=translate;element.style.translate=translate;}
    if(stateChanged)element.style.willChange=active?'translate':'';
  });
  if(document.body.classList.contains('hobbies-intro-active')!==active)document.body.classList.toggle('hobbies-intro-active',active);
  // Start the second animation only after the models arrive. Once started,
  // keep its existing reverse interval when scrolling back through the intro.
  if(progress>=1)imagesStarted=true;
  else if(progress<=.70)imagesStarted=false;
  const reveal=reduced.matches?1:imagesStarted?clamp((progress-.70)/.30):0;
  if(reveal!==previousReveal){
    previousReveal=reveal;section.hobbyEntranceProgress=reveal;
    section.dispatchEvent(new Event('hobby-intro-progress'));
  }
  if(!section.classList.contains('hobbies-intro-ready'))section.classList.add('hobbies-intro-ready');
  if(stateChanged||modelStateChanged){
    previousIntroState=active;
    listeners.forEach(callback=>callback());
  }
}
function tick(time){
  frame=0;
  if(document.hidden){cancelHobbyFrame(tick);last=0;return;}
  if(boundsDirty||!bounds){
    bounds=section.getBoundingClientRect();
    sectionTop=sceneMotion.enabled?sceneMotion.top:bounds.top+window.scrollY;
    sectionHeight=sceneMotion.enabled?section.clientHeight:bounds.height;
    boundsDirty=false;
  }
  // The section's document position is stable during scrolling. Reuse it
  // instead of forcing a layout read after each set of animation writes.
  const top=sectionTop-getSmoothPosition();
  visible=sceneMotion.enabled?sceneMotion.visible:top<innerHeight&&top+sectionHeight>0;
  // Widen the travel interval for the initial 35% speed reduction and
  // another 10%, while retaining the arrival point at 95% coverage.
  // Keep the original scroll landmarks. The rendered stages catch up in order
  // rather than jumping to those landmarks after a large input.
  const target=sceneMotion.enabled?sceneMotion.spread:clamp((innerHeight*(.05+travelSpan)-top)/(innerHeight*travelSpan));
  if(measure){
    const elements=[...section.querySelectorAll('.hobby-orbit-center')];
    // Clear all transforms first, then batch the measurements to avoid four
    // alternating layout writes and reads.
    elements.forEach(element=>{element.style.translate='none';element.introTranslate=null;});
    const width=section.clientWidth,height=section.clientHeight;
    centerX=width/2;centerY=height/2;
    radius=Math.min(width*.28,height*.28,250);
    centers=elements.map((element,index)=>{
      const rect=element.getBoundingClientRect();
      const button=element.querySelector('button');
      let motion=hobbyIntro.motion.get(button);
      if(!motion){motion={pitch:0,yaw:0,roll:0,heading:0,speed:0};hobbyIntro.motion.set(button,motion);}
      return {element,button,motion,tracking:false,
        homeX:(rect.left-bounds.left+rect.width/2)*width/Math.max(1,bounds.width),
        homeY:(rect.top-bounds.top+rect.height/2)*height/Math.max(1,bounds.height),
        angle:[-3,-1,3,1][index]*Math.PI/4};
    });
    measure=false;
  }
  const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;
  const paused=bodyIsPaused();
  if(reduced.matches){progress=spreadMotion.value=arrivalMotion.value=1;spreadMotion.velocity=arrivalMotion.velocity=0;}
  else if(!paused){
    if(!visible){
      // Skipped, invisible stages need no catch-up frames. Returning into the
      // stage still follows the same continuous path from its last endpoint.
      progress=spreadMotion.value=top<0?target:0;
      arrivalMotion.value=sceneMotion.enabled&&top<0?sceneMotion.modelEntry:0;
      spreadMotion.velocity=arrivalMotion.velocity=0;orbitTime=0;
    }else if(modelsReady){
      const arrivalTarget=sceneMotion.enabled?Math.min(sceneMotion.modelEntry,clamp((sceneMotion.skillExit-.78)/.22)):1;
      // Reverse the spread first, then leave the circle through the shared outlet.
      const entryTarget=progress>0?1:arrivalTarget;
      advanceProgress(arrivalMotion,entryTarget,dt,1.2,18);
      if(arrivalMotion.value===1)orbitTime+=dt;else orbitTime=0;
      const spreadTarget=arrivalMotion.value===1&&orbitTime>=.25?target:0;
      progress=advanceProgress(spreadMotion,spreadTarget,dt,.95,18);
      if(arrivalMotion.value>0)orbitAngle+=dt*.65*(1-smooth(progress));
    }
  }
  setModelProgress(sceneMotion.enabled?arrivalMotion.value:1,progress);
  draw(dt,paused);
  const entryRequested=!sceneMotion.enabled||
    (sceneMotion.modelEntry>0&&sceneMotion.skillExit>.78)||arrivalMotion.value>0||progress>0;
  const moving=arrivalMotion.velocity!==0||spreadMotion.velocity!==0||progress!==target||
    (arrivalMotion.value>0&&progress<1)||(!sceneMotion.enabled&&progress<1);
  if(visible&&entryRequested&&modelsReady&&moving&&!reduced.matches&&!paused)frame=requestHobbyFrame(tick,20);
  else{cancelHobbyFrame(tick);last=0;}
}
function wake(){if(!frame)frame=requestHobbyFrame(tick,20);}
function onScroll(){wake();}
function onResize(){measure=true;boundsDirty=true;previousIntroState=null;wake();}
function bodyIsPaused(){
  const classes=document.body.classList;
  return classes.contains('photography-gallery-open')||classes.contains('motion-paused')||classes.contains('intro-active');
}
if(section){
  const buttons=new Set(section.querySelectorAll('.hobby-orbit-center button'));
  function readyChanged(){
    const ready=buttons.size>0&&[...buttons].every(button=>
      (button.classList.contains('camera-ready')&&button.dataset.hobbyCompiling!=='true')||button.dataset.hobbyModelFailed==='true');
    if(ready!==modelsReady){modelsReady=ready;wake();}
  }
  // Shader compilation wakes the intro once; do not poll it in an idle RAF loop.
  const readiness=new MutationObserver(records=>{if(records.some(record=>buttons.has(record.target)))readyChanged();});
  readiness.observe(section,{subtree:true,attributes:true,attributeFilter:['class','data-hobby-compiling','data-hobby-model-failed']});
  readyChanged();
  const unobserveScene=observeScene(()=>{
    const next=sceneMotion.enabled&&sceneMotion.modelEntry>0;
    // The hero's entry scale/rotation has finished by this point. Measure the
    // resting positions once here, rather than retaining its early visual bounds.
    if(next&&!atHandoff){measure=true;boundsDirty=true;}
    atHandoff=next;wake();
  });
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onResize,{passive:true});
  const resize=new ResizeObserver(onResize);resize.observe(section);
  // Font and preceding section size changes can move the section without
  // changing its own dimensions. Refresh the cached position in those cases.
  const preceding=document.querySelector('#about');if(preceding)resize.observe(preceding);
  document.fonts?.ready.then(onResize);
  window.addEventListener('load',onResize,{once:true});
  reduced.addEventListener('change',()=>{measure=true;wake();});
  document.addEventListener('visibilitychange',wake);
  let bodyPaused=bodyIsPaused();
  const state=new MutationObserver(()=>{const next=bodyIsPaused();if(next!==bodyPaused){bodyPaused=next;wake();}});
  state.observe(document.body,{attributes:true,attributeFilter:['class']});
  wake();
  window.addEventListener('pageshow',onResize);
  window.addEventListener('pagehide',event=>{cancelHobbyFrame(tick);frame=0;last=0;if(event.persisted)return;resize.disconnect();state.disconnect();readiness.disconnect();unobserveScene();window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onResize);window.removeEventListener('pageshow',onResize);document.removeEventListener('visibilitychange',wake);listeners.clear();});
}
