import Lenis from './node_modules/lenis/dist/lenis.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let lenis=null,frame=0,locked=false;
function cancel(){cancelAnimationFrame(frame);frame=0;}
function tick(time){
  frame=0;
  if(!lenis||locked||document.hidden)return;
  lenis.raf(time);
  if(lenis.isScrolling==='smooth')frame=requestAnimationFrame(tick);
}
function wake(){
  if(lenis&&!frame&&!locked&&!document.hidden){
    // A new input must not advance by the entire time spent idle.
    lenis.time=0;frame=requestAnimationFrame(tick);
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
  cancel();lenis?.destroy();lenis=null;
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
  locked=false;sync();
}
const observer=new MutationObserver(sync);
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',sync);
reduced.addEventListener('change',setup);
setup();
window.addEventListener('pagehide',event=>{
  if(event.persisted){cancel();return;}
  cancel();observer.disconnect();lenis?.destroy();lenis=null;
  document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',setup);
});
window.addEventListener('pageshow',event=>{if(event.persisted){sync();wake();}});
