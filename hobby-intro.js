// Scroll positioning is shared by the four existing model canvases.
import { requestHobbyFrame, cancelHobbyFrame, getSmoothPosition } from './hobby-motion-clock.js';
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
const travelSpan=.10/(.65*.90);
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>value*value*value*(value*(value*6-15)+10);
function draw(dt,paused){
  const spread=smooth(progress);
  hobbyIntro.strength=reduced.matches?0:1-spread;
  const active=visible&&hobbyIntro.strength>.001;
  const stateChanged=active!==previousIntroState;
  centers.forEach(center=>{
    const {element,homeX,homeY,angle,motion}=center;
    const x=centerX+Math.cos(angle+orbitAngle)*radius-homeX;
    const y=centerY+Math.sin(angle+orbitAngle)*radius-homeY;
    const offsetX=x*hobbyIntro.strength,offsetY=y*hobbyIntro.strength;
    // Use the same positions as the orbit, without any extra layout reads.
    // The direction also follows the return journey when scrolling upward.
    if(active&&!paused&&center.tracking){
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
  if(stateChanged){
    previousIntroState=active;
    listeners.forEach(callback=>callback());
  }
}
function tick(time){
  frame=0;
  if(document.hidden){cancelHobbyFrame(tick);last=0;return;}
  if(boundsDirty||!bounds){
    bounds=section.getBoundingClientRect();
    sectionTop=bounds.top+window.scrollY;sectionHeight=bounds.height;
    boundsDirty=false;
  }
  // The section's document position is stable during scrolling. Reuse it
  // instead of forcing a layout read after each set of animation writes.
  const top=sectionTop-getSmoothPosition();
  visible=top<innerHeight&&top+sectionHeight>0;
  // Widen the travel interval for the initial 35% speed reduction and
  // another 10%, while retaining the arrival point at 95% coverage.
  // The quintic easing in draw keeps both ends gentle without a timed delay.
  const target=clamp((innerHeight*(.05+travelSpan)-top)/(innerHeight*travelSpan));
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
      return {element,button,motion,tracking:false,homeX:rect.left-bounds.left+rect.width/2,homeY:rect.top-top+rect.height/2,angle:[-3,-1,3,1][index]*Math.PI/4};
    });
    measure=false;
  }
  const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;
  const paused=document.body.classList.contains('photography-gallery-open')||document.body.classList.contains('motion-paused');
  if(reduced.matches)progress=1;
  else if(!paused&&(progress<1||target<1)){
    if(!modelsReady)modelsReady=centers.every(({button})=>(button?.classList.contains('camera-ready')&&button.dataset.hobbyCompiling!=='true')||button?.dataset.hobbyModelFailed==='true');
    if(modelsReady){
      // Follow the site's existing smooth scroll directly, so the models
      // are already home at 95% and reverse naturally when scrolling back.
      progress=target;
      if(visible)orbitAngle+=dt*.65*(1-smooth(progress));
    }
  }
  draw(dt,paused);
  if(visible&&(progress<1||progress!==target)&&!reduced.matches&&!paused)frame=requestHobbyFrame(tick,20);
  else{cancelHobbyFrame(tick);last=0;}
}
function wake(){if(!frame)frame=requestHobbyFrame(tick,20);}
function onScroll(){wake();}
function onResize(){measure=true;boundsDirty=true;previousIntroState=null;wake();}
if(section){
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
  const state=new MutationObserver(wake);state.observe(document.body,{attributes:true,attributeFilter:['class']});
  wake();
  window.addEventListener('pagehide',event=>{if(event.persisted)return;cancelHobbyFrame(tick);resize.disconnect();state.disconnect();window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',wake);listeners.clear();});
}
