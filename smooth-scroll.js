import Lenis from './node_modules/lenis/dist/lenis.mjs';
import { requestHobbyFrame, cancelHobbyFrame, setSmoothPosition, getSmoothPosition } from './hobby-motion-clock.js';
import { sceneAnchorPosition, sceneMotion } from './skills-hobbies-scene.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const navigation=document.querySelector('.floating-nav');
const links=[...(navigation?.querySelectorAll('a[href^="#"]')||[])];
const navigationEase=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
let lenis=null,frame=0,locked=false,disposed=false;
let navigationFrame=0,geometryDirty=true,destinations=[],currentLink=null;
let activeNavigation=null,navigationSequence=0,deferredHash=location.hash||null;
let introHomePending=document.body.classList.contains('intro-active');

function cancel(){cancelHobbyFrame(tick);frame=0;}
function tick(time){
  frame=0;
  if(!lenis||locked||document.hidden){cancel();return;}
  lenis.raf(time);
  setSmoothPosition(lenis.animatedScroll);
  if(lenis.isScrolling==='smooth')frame=requestHobbyFrame(tick,10);else cancel();
}
function wake(){
  if(lenis&&!frame&&!locked&&!document.hidden){
    lenis.time=0;frame=requestHobbyFrame(tick,10);
  }
}
// Layout coordinates stay stable while sticky sections scale and rotate.
function layoutTop(element){
  let top=0;
  for(let node=element;node;node=node.offsetParent)top+=node.offsetTop;
  return top;
}
function navigationPosition(hash){
  if(hash==='#home')return 0;
  const pinned=sceneAnchorPosition(hash);
  if(pinned!==null)return pinned;
  let id;
  try{id=decodeURIComponent(hash.slice(1));}catch{return null;}
  const element=id&&document.getElementById(id);
  return element?layoutTop(element):null;
}
function boundedPosition(hash){
  const position=navigationPosition(hash);
  return position===null?null:Math.max(0,Math.min(position,document.documentElement.scrollHeight-innerHeight));
}
function updateNavigation(){
  cancelHobbyFrame(updateNavigation);navigationFrame=0;
  if(disposed||document.hidden)return;
  if(geometryDirty){
    geometryDirty=false;
    destinations=links.map(link=>({link,position:navigationPosition(new URL(link.href).hash)}))
      .filter(item=>item.position!==null).sort((a,b)=>a.position-b.position);
  }
  const position=getSmoothPosition()+innerHeight*.2;
  const selectedLink=activeNavigation?.link;
  let next=selectedLink||destinations[0]?.link;
  if(!selectedLink)for(const destination of destinations){
    if(destination.position>position)break;
    next=destination.link;
  }
  if(next===currentLink)return;
  currentLink?.removeAttribute('aria-current');
  currentLink=next||null;
  currentLink?.setAttribute('aria-current','location');
}
function queueNavigation(){
  if(!navigationFrame&&!disposed&&!document.hidden)navigationFrame=requestHobbyFrame(updateNavigation,11);
}
function geometryChanged(){geometryDirty=true;queueNavigation();}
function cancelNavigation(){
  if(activeNavigation&&lenis?.isScrolling==='smooth'){
    lenis.stop();if(!locked)lenis.start();
  }
  activeNavigation=null;navigationSequence++;queueNavigation();
}
function focusDestination(hash){
  let element;
  try{element=document.getElementById(decodeURIComponent(hash.slice(1)));}catch{return;}
  if(!element||element.inert)return;
  const temporary=!element.hasAttribute('tabindex');
  if(temporary)element.setAttribute('tabindex','-1');
  element.focus({preventScroll:true});
  if(temporary)element.addEventListener('blur',()=>element.removeAttribute('tabindex'),{once:true});
}
function goTo(hash,{immediate=false,link=null,focus=false}={}){
  const target=boundedPosition(hash);
  if(target===null)return false;
  const sequence=++navigationSequence;
  activeNavigation={hash,link};queueNavigation();
  const complete=()=>{
    if(sequence!==navigationSequence||disposed)return;
    activeNavigation=null;
    // Reconcile the endpoint if fonts or a resize changed layout during travel.
    const endpoint=boundedPosition(hash);
    if(endpoint!==null&&Math.abs(window.scrollY-endpoint)>2){
      if(lenis)lenis.scrollTo(endpoint,{immediate:true});
      else window.scrollTo({top:endpoint,behavior:'instant'});
    }
    if(focus)focusDestination(hash);
    queueNavigation();
  };
  if(lenis){
    const distance=Math.abs(target-getSmoothPosition())/Math.max(1,innerHeight);
    const duration=Math.max(.65,Math.min(1.6,.5+Math.sqrt(distance)*.45));
    lenis.scrollTo(target,{immediate,duration,easing:navigationEase,onStart:wake,onComplete:complete});wake();
  }else{window.scrollTo({top:target,behavior:'instant'});complete();}
  return true;
}
function sync(){
  const nextLocked=document.hidden||document.body.classList.contains('intro-active')||
    document.body.classList.contains('photography-gallery-open')||Boolean(document.querySelector('dialog[open]'));
  if(nextLocked!==locked){
    locked=nextLocked;
    if(locked){cancelNavigation();cancel();lenis?.stop();}
    else{lenis?.start();wake();}
  }
  // PLAY owns the first destination. A saved section hash must not override
  // its scroll reset when the intro releases the page and Lenis resumes.
  if(!locked&&(introHomePending||deferredHash!==null)){
    const hash=introHomePending?'#home':deferredHash;
    introHomePending=false;deferredHash=null;goTo(hash,{immediate:true});
  }
  queueNavigation();
}
function setup(){
  cancelNavigation();cancel();lenis?.destroy();lenis=null;setSmoothPosition(null);
  if(!reduced.matches){
    lenis=new Lenis({
      autoRaf:false,smoothWheel:true,syncTouch:false,wheelMultiplier:.75,duration:1.2,
      easing:t=>1-Math.pow(1-t,4),
      // One handler owns every same-page destination, including the pinned scene.
      anchors:false,
      prevent:element=>element.hasAttribute('data-lenis-prevent')||element.tagName==='DIALOG',
    });
    lenis.on('virtual-scroll',({event})=>{if(event.type==='wheel'&&!event.ctrlKey){cancelNavigation();wake();}});
    lenis.on('scroll',state=>{setSmoothPosition(state.animatedScroll);queueNavigation();});
  }
  locked=false;geometryChanged();sync();
}
function anchorLink(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||locked)return;
  const link=event.target.closest?.('a[href]');
  if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search||!url.hash)return;
  if(navigationPosition(url.hash)===null)return;
  event.preventDefault();
  if(location.hash!==url.hash)history.pushState(null,'',url.hash);
  goTo(url.hash,{link:links.includes(link)?link:null,focus:event.detail===0||link.classList.contains('skip-link')});
}
function hashChanged(){
  const hash=location.hash||'#home';
  if(locked){deferredHash=hash;return;}
  goTo(hash,{immediate:true});
}
function keyboardInput(event){
  if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))cancelNavigation();
}
const bodyObserver=new MutationObserver(sync);
bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
const dialogObserver=new MutationObserver(sync);
document.querySelectorAll('dialog').forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
const resizeObserver=new ResizeObserver(geometryChanged);
resizeObserver.observe(document.body);
if(sceneMotion.viewport)resizeObserver.observe(sceneMotion.viewport);
document.addEventListener('visibilitychange',sync);
document.addEventListener('click',anchorLink,true);
document.addEventListener('pointerdown',cancelNavigation,{passive:true});
document.addEventListener('keydown',keyboardInput);
window.addEventListener('hashchange',hashChanged);
window.addEventListener('scroll',queueNavigation,{passive:true});
window.addEventListener('resize',geometryChanged,{passive:true});
window.addEventListener('load',geometryChanged,{once:true});
reduced.addEventListener('change',setup);
document.fonts?.ready.then(geometryChanged);
function pageShow(event){if(event.persisted){geometryChanged();sync();wake();}}
window.addEventListener('pageshow',pageShow);
window.addEventListener('pagehide',event=>{
  cancelNavigation();cancel();cancelHobbyFrame(updateNavigation);navigationFrame=0;
  if(event.persisted)return;
  disposed=true;bodyObserver.disconnect();dialogObserver.disconnect();resizeObserver.disconnect();
  lenis?.destroy();lenis=null;setSmoothPosition(null);
  document.removeEventListener('visibilitychange',sync);
  document.removeEventListener('click',anchorLink,true);
  document.removeEventListener('pointerdown',cancelNavigation);
  document.removeEventListener('keydown',keyboardInput);
  window.removeEventListener('hashchange',hashChanged);
  window.removeEventListener('scroll',queueNavigation);window.removeEventListener('resize',geometryChanged);
  window.removeEventListener('load',geometryChanged);window.removeEventListener('pageshow',pageShow);
  reduced.removeEventListener('change',setup);
});
setup();

