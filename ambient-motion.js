// Pause decorative CSS loops outside the viewport, without changing their
// timing or restarting their animation when they return.
const elements=[...document.querySelectorAll('.ticker,.play-stage,.orbit-art')];
const visible=new Set();
function sync(){
  const covered=document.body.classList.contains('photography-gallery-open')||document.body.classList.contains('intro-active');
  elements.forEach(element=>{
  const paused=document.hidden||covered||!visible.has(element);
  if(element.classList.contains('ambient-paused')!==paused)element.classList.toggle('ambient-paused',paused);
});}
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);});sync();
},{rootMargin:'120px'});
elements.forEach(element=>observer.observe(element));
document.addEventListener('visibilitychange',sync);sync();
const stateObserver=new MutationObserver(sync);
stateObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pageshow',sync);
window.addEventListener('pagehide',event=>{if(!event.persisted){observer.disconnect();stateObserver.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('pageshow',sync);}});
