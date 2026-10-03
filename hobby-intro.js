// Scroll positioning is shared by the four existing model canvases.
const section=document.querySelector('#projects');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const listeners=new Set();
export const hobbyIntro={strength:0};
export function observeHobbyIntro(callback){listeners.add(callback);return()=>listeners.delete(callback);}
let centers=[],frame=0,last=0,progress=0,visible=false,measure=true;
let orbitAngle=0,centerX=0,centerY=0,radius=0;
let previousIntroState=null,previousReveal=-1,bounds=null,boundsDirty=true,modelsReady=false;
let sectionTop=0,sectionHeight=0;
const travelSpan=.10/(.65*.90);
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>value*value*value*(value*(value*6-15)+10);
function draw(){
  const spread=smooth(progress);
  hobbyIntro.strength=reduced.matches?0:1-spread;
  const active=visible&&hobbyIntro.strength>.001;
  const stateChanged=active!==previousIntroState;
  centers.forEach(({element,homeX,homeY,angle})=>{
    const x=centerX+Math.cos(angle+orbitAngle)*radius-homeX;
    const y=centerY+Math.sin(angle+orbitAngle)*radius-homeY;
    const translate=`${(x*hobbyIntro.strength).toFixed(2)}px ${(y*hobbyIntro.strength).toFixed(2)}px`;
    if(element.introTranslate!==translate){element.introTranslate=translate;element.style.translate=translate;}
    if(stateChanged)element.style.willChange=active?'translate':'';
  });
  if(document.body.classList.contains('hobbies-intro-active')!==active)document.body.classList.toggle('hobbies-intro-active',active);
  const reveal=reduced.matches?1:clamp((progress-.70)/.30);
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
  if(document.hidden){last=0;return;}
  if(boundsDirty||!bounds){
    bounds=section.getBoundingClientRect();
    sectionTop=bounds.top+window.scrollY;sectionHeight=bounds.height;
    boundsDirty=false;
  }
  // The section's document position is stable during scrolling. Reuse it
  // instead of forcing a layout read after each set of animation writes.
  const top=sectionTop-window.scrollY;
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
      return {element,button:element.querySelector('button'),homeX:rect.left-bounds.left+rect.width/2,homeY:rect.top-top+rect.height/2,angle:[-3,-1,3,1][index]*Math.PI/4};
    });
    measure=false;
  }
  const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;
  const paused=document.body.classList.contains('photography-gallery-open')||document.body.classList.contains('motion-paused');
  if(reduced.matches)progress=1;
  else if(visible&&!paused&&(progress<1||target<1)){
    if(!modelsReady)modelsReady=centers.every(({button})=>button?.classList.contains('camera-ready'));
    if(modelsReady){
      // Follow the site's existing smooth scroll directly, so the models
      // are already home at 95% and reverse naturally when scrolling back.
      progress=target;
      orbitAngle+=dt*.65*(1-smooth(progress));
    }
  }
  draw();
  if(visible&&(progress<1||progress!==target)&&!reduced.matches&&!paused)frame=requestAnimationFrame(tick);else last=0;
}
function wake(){if(!frame)frame=requestAnimationFrame(tick);}
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
  window.addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(frame);resize.disconnect();state.disconnect();window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',wake);listeners.clear();});
}
