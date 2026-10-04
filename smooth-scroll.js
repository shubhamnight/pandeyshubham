import Lenis from './node_modules/lenis/dist/lenis.mjs';
import { requestHobbyFrame, cancelHobbyFrame, setSmoothPosition } from './hobby-motion-clock.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let lenis=null,frame=0,locked=false;
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
    // A new input must not advance by the entire time spent idle.
    lenis.time=0;frame=requestHobbyFrame(tick,10);
  }
}
function sync(){
  const nextLocked=document.hidden||document.body.classList.contains('intro-active')||document.body.classList.contains('photography-gallery-open');
  if(nextLocked!==locked){
    locked=nextLocked;
    if(locked){cancel();lenis?.stop();}else{lenis?.start();wake();}
  }
}
function setup(){
  cancel();lenis?.destroy();lenis=null;setSmoothPosition(null);
  if(reduced.matches)return;
  lenis=new Lenis({
    autoRaf:false,
    smoothWheel:true,
    syncTouch:false,
    wheelMultiplier:.75,
    duration:1.65,
    easing:t=>1-Math.pow(1-t,4),
    anchors:{offset:-32,duration:1.8,onStart:wake},
    prevent:element=>element.hasAttribute('data-lenis-prevent')||element.tagName==='DIALOG',
  });
  lenis.on('virtual-scroll',({event})=>{if(event.type==='wheel'&&!event.ctrlKey)wake();});
  lenis.on('scroll',state=>setSmoothPosition(state.animatedScroll));
  locked=false;sync();
}
const observer=new MutationObserver(sync);
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',sync);
reduced.addEventListener('change',setup);
setup();
window.addEventListener('pagehide',event=>{
  if(event.persisted){cancel();return;}
  cancel();observer.disconnect();lenis?.destroy();lenis=null;setSmoothPosition(null);
  document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',setup);
});
window.addEventListener('pageshow',event=>{if(event.persisted){sync();wake();}});
