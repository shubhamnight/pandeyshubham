// One event-driven frame scheduler for all four hobby models.
import { hobbyIntro, observeHobbyIntro } from './hobby-intro.js';
import { requestHobbyFrame, cancelHobbyFrame } from './hobby-motion-clock.js';
const active = new Set();
let frame = 0;
function tick(time) {
  frame = 0;
  for (const update of active) update(time);
  if (active.size) frame = requestHobbyFrame(tick,50);else cancelHobbyFrame(tick);
}
function activate(update) { active.add(update); if (!frame) frame=requestHobbyFrame(tick,50); }
function deactivate(update) {
  active.delete(update);
  if (!active.size) { cancelHobbyFrame(tick); frame=0; }
}

const buildQueue = [];
let building = false;
function scheduleBuild() {
  if (building || !buildQueue.length || document.hidden) return;
  building = true;
  requestAnimationFrame(() => {
    const build = () => {
      building=false;
      if (!document.hidden) buildQueue.shift()?.();
      scheduleBuild();
    };
    if ('requestIdleCallback' in window) requestIdleCallback(build,{timeout:500});
    else setTimeout(build,0);
  });
}
document.addEventListener('visibilitychange',scheduleBuild);
export function deferHobbyModel(button,build) {
  const observer=new IntersectionObserver(entries=>{
    if (!entries.some(e=>e.isIntersecting)) return;
    observer.disconnect(); buildQueue.push(build); scheduleBuild();
  },{rootMargin:'650px'});
  observer.observe(document.querySelector('#projects')||button);
}

export function connectHobbyMotion({button,renderer,scene,view,model}) {
  // Only the root moves on hover; its detailed geometry remains rigid.
  // Reuse each child's local matrix rather than rebuilding it every render.
  model.traverse(node=>{if(node!==model){node.updateMatrix();node.matrixAutoUpdate=false;}});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false, targetX=0, targetY=0, last=0, dirty=true;
  let pointer=null, rect=null, width=0, height=0, contextLost=false,compiling=true,disposed=false;
  button.dataset.hobbyCompiling='true';
  const allowed=()=>visible && !document.hidden && !contextLost && !compiling && !disposed &&
    !document.body.classList.contains('photography-gallery-open') &&
    !document.body.classList.contains('motion-paused');
  const stop=()=>{deactivate(render);last=0;};
  function render(time) {
    if (!allowed()) {stop();return;}
    if(pointer){
      rect ||= button.getBoundingClientRect();
      targetY=Math.max(-1,Math.min(1,(pointer.x-rect.left)/rect.width*2-1))*.32;
      targetX=Math.max(-1,Math.min(1,(pointer.y-rect.top)/rect.height*2-1))*.22;
      pointer=null;
    }
    const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;
    const strength=reduced.matches?0:hobbyIntro.strength;
    if(strength>.001){
      targetX=targetY=0;
      pointer=null;rect=null;
    }
    const blend=1-Math.exp(-12*dt);
    model.rotation.x+=(targetX-model.rotation.x)*blend;
    model.rotation.y+=(targetY-model.rotation.y)*blend;
    const settled=Math.abs(targetX-model.rotation.x)+Math.abs(targetY-model.rotation.y)<.0004;
    if(settled) model.rotation.set(targetX,targetY,0);
    renderer.render(scene,view);dirty=false;
    if(settled)stop();
  }
  const wake=()=>{
    if(allowed() && (dirty || pointer || Math.abs(targetX-model.rotation.x)+Math.abs(targetY-model.rotation.y)>=.0004))activate(render);
    else if(!allowed())stop();
  };
  const follow=e=>{
    if(reduced.matches || hobbyIntro.strength>.001 || e.pointerType==='touch')return;
    pointer={x:e.clientX,y:e.clientY};wake();
  };
  button.addEventListener('pointerenter',e=>{rect=button.getBoundingClientRect();follow(e);});
  button.addEventListener('pointermove',follow,{passive:true});
  button.addEventListener('pointerleave',()=>{pointer=null;rect=null;targetX=targetY=0;wake();});
  const unobserveIntro=observeHobbyIntro(()=>{rect=null;if(hobbyIntro.strength<=.001)targetX=targetY=0;dirty=true;wake();});
  const resize=new ResizeObserver(()=>{
    rect=null;
    const w=button.clientWidth,h=button.clientHeight;
    if(!w || !h || (w===width && h===height))return;
    width=w;height=h;renderer.setSize(w,h,false);view.aspect=w/h;view.updateProjectionMatrix();dirty=true;wake();
  });resize.observe(button);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;rect=null;wake();});intersection.observe(button);
  const state=new MutationObserver(wake);state.observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',wake);
  const invalidateRect=()=>{rect=null;};
  window.addEventListener('scroll',invalidateRect,{passive:true});
  reduced.addEventListener('change',()=>{pointer=null;targetX=targetY=0;wake();});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;stop();});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;dirty=true;wake();});
  // Warm the unchanged materials before their first visible frame. Three.js
  // uses parallel shader compilation when the browser supports it.
  renderer.compileAsync(scene,view).catch(error=>console.warn('Model shader warm-up failed',error)).finally(()=>{
    compiling=false;button.dataset.hobbyCompiling='false';dirty=true;wake();
  });
  window.addEventListener('pagehide',e=>{
    if(e.persisted)return;
    disposed=true;stop();unobserveIntro();resize.disconnect();intersection.disconnect();state.disconnect();
    window.removeEventListener('scroll',invalidateRect);
    document.removeEventListener('visibilitychange',wake);
    const resources=new Set();
    model.traverse(node=>{
      if(node.geometry)resources.add(node.geometry);
      for(const mat of [node.material].flat().filter(Boolean)){
        resources.add(mat);
        for(const value of Object.values(mat))if(value?.isTexture)resources.add(value);
      }
    });
    resources.forEach(resource=>resource.dispose());renderer.dispose();
  });
}
