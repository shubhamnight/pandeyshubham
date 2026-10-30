// Pause decorative CSS loops outside the viewport, without changing their
// timing or restarting their animation when they return.
(() => {
const selector='#home,.ticker,.kinetic-object,.orbit-art,.footer-name';
const elements=new Set();
const visible=new Set();
let suspended=false;
function sync(){
  const covered=document.body.classList.contains('photography-gallery-open')||document.body.classList.contains('intro-active');
  elements.forEach(element=>{
  const paused=suspended||document.hidden||covered||!visible.has(element)||
    (element.id==='home'&&(element.classList.contains('hero-covered')||element.classList.contains('hero-idle')));
  if(element.classList.contains('ambient-paused')!==paused)element.classList.toggle('ambient-paused',paused);
});}
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting&&entry.intersectionRatio>=.002)visible.add(entry.target);else visible.delete(entry.target);});sync();
},{threshold:.002});
function register(element){
  if(elements.has(element))return;
  elements.add(element);element.classList.add('ambient-paused');observer.observe(element);
}
document.querySelectorAll(selector).forEach(register);
// Study art can be cloned into a native dialog. Register the clone rather than
// inheriting the hidden source's pause forever; release removed scopes as well.
const additions=new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes){
    if(node.nodeType!==1)continue;
    if(node.matches(selector))register(node);
    node.querySelectorAll(selector).forEach(register);
  }
  for(const element of elements)if(!element.isConnected){observer.unobserve(element);elements.delete(element);visible.delete(element);}
});
additions.observe(document.body,{childList:true,subtree:true});
document.addEventListener('visibilitychange',sync);sync();
const stateObserver=new MutationObserver(sync);
stateObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
const hero=document.querySelector('#home');
if(hero)stateObserver.observe(hero,{attributes:true,attributeFilter:['class']});
const resume=()=>{suspended=false;sync();};
window.addEventListener('pageshow',resume);
window.addEventListener('pagehide',event=>{
  suspended=true;sync();
  if(!event.persisted){observer.disconnect();stateObserver.disconnect();additions.disconnect();elements.clear();visible.clear();document.removeEventListener('visibilitychange',sync);window.removeEventListener('pageshow',resume);}
});
})();
