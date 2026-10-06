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

export function connectHobbyMotion({button,renderer,scene,view,model,orientModel=null}) {
  // Only the root turns with the orbit or hover; detailed geometry stays rigid.
  // Reuse each child's local matrix rather than rebuilding it every render.
  model.traverse(node=>{if(node!==model){node.updateMatrix();node.matrixAutoUpdate=false;}});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false, targetX=0, targetY=0, last=0, dirty=true;
  let pointerPending=false, pointerX=0, pointerY=0, rect=null, width=0, height=0, contextLost=false,compiling=true,disposed=false;
  const bodyIsPaused=()=>document.body.classList.contains('photography-gallery-open') ||
    document.body.classList.contains('motion-paused') || document.body.classList.contains('intro-active');
  let bodyPaused=bodyIsPaused();
  const renderedTransform = new Float64Array(10);
  renderedTransform.fill(NaN);
  function drawIfChanged() {
    const position=model.position, rotation=model.quaternion, scale=model.scale;
    const changed = dirty || renderedTransform[0]!==position.x || renderedTransform[1]!==position.y ||
      renderedTransform[2]!==position.z || renderedTransform[3]!==rotation.x ||
      renderedTransform[4]!==rotation.y || renderedTransform[5]!==rotation.z ||
      renderedTransform[6]!==rotation.w || renderedTransform[7]!==scale.x ||
      renderedTransform[8]!==scale.y || renderedTransform[9]!==scale.z;
    if (!changed) return;
    renderer.render(scene,view);
    renderedTransform[0]=position.x;renderedTransform[1]=position.y;renderedTransform[2]=position.z;
    renderedTransform[3]=rotation.x;renderedTransform[4]=rotation.y;renderedTransform[5]=rotation.z;renderedTransform[6]=rotation.w;
    renderedTransform[7]=scale.x;renderedTransform[8]=scale.y;renderedTransform[9]=scale.z;
    dirty=false;
  }
  button.dataset.hobbyCompiling='true';
  const allowed=()=>visible && hobbyIntro.motion.get(button)?.visible!==false &&
    !document.hidden && !contextLost && !compiling && !disposed && !bodyPaused;
  const stop=()=>{deactivate(render);last=0;};
  function render(time) {
    if (!allowed()) {stop();return;}
    if(pointerPending){
      rect ||= button.getBoundingClientRect();
      targetY=Math.max(-1,Math.min(1,(pointerX-rect.left)/rect.width*2-1))*.32;
      targetX=Math.max(-1,Math.min(1,(pointerY-rect.top)/rect.height*2-1))*.22;
      pointerPending=false;
    }
    const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;
    const strength=reduced.matches?0:hobbyIntro.strength;
    const orbiting=strength>.001;
    const motion=hobbyIntro.motion.get(button);
    let rotationX=targetX,rotationY=targetY,rotationZ=0;
    if(orbiting){
      targetX=targetY=0;
      pointerPending=false;rect=null;
      rotationX=motion?.pitch||0;rotationY=motion?.yaw||0;rotationZ=motion?.roll||0;
    }
    const blend=1-Math.exp(-(orbiting?9:12)*dt);
    let settled;
    if(orientModel){
      settled=orientModel(orbiting,motion,rotationX,rotationY,rotationZ,blend,dt);
    }else{
      model.rotation.x+=(rotationX-model.rotation.x)*blend;
      model.rotation.y+=(rotationY-model.rotation.y)*blend;
      model.rotation.z+=(rotationZ-model.rotation.z)*blend;
      settled=Math.abs(rotationX-model.rotation.x)+Math.abs(rotationY-model.rotation.y)+Math.abs(rotationZ-model.rotation.z)<.0004;
      if(settled) model.rotation.set(rotationX,rotationY,rotationZ);
    }
    drawIfChanged();
    if(settled&&!orbiting)stop();
  }
  const wake=()=>{
    if(!allowed()){stop();return;}
    if(dirty || pointerPending || (!reduced.matches&&hobbyIntro.strength>.001) || Math.abs(targetX-model.rotation.x)+Math.abs(targetY-model.rotation.y)+Math.abs(model.rotation.z)>=.0004)activate(render);
  };
  const follow=e=>{
    if(reduced.matches || hobbyIntro.strength>.001 || e.pointerType==='touch')return;
    // Keep only the latest position; high-rate pointer events allocate nothing.
    pointerX=e.clientX;pointerY=e.clientY;pointerPending=true;wake();
  };
  const pointerEnter=e=>{rect=button.getBoundingClientRect();follow(e);};
  const pointerLeave=()=>{pointerPending=false;rect=null;targetX=targetY=0;wake();};
  button.addEventListener('pointerenter',pointerEnter);
  button.addEventListener('pointermove',follow,{passive:true});
  button.addEventListener('pointerleave',pointerLeave);
  const unobserveIntro=observeHobbyIntro(()=>{rect=null;if(hobbyIntro.strength<=.001)targetX=targetY=0;wake();});
  const resize=new ResizeObserver(()=>{
    rect=null;
    const w=button.clientWidth,h=button.clientHeight;
    if(!w || !h || (w===width && h===height))return;
    width=w;height=h;renderer.setSize(w,h,false);view.aspect=w/h;view.updateProjectionMatrix();dirty=true;wake();
  });resize.observe(button);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;rect=null;wake();});intersection.observe(button);
  const state=new MutationObserver(()=>{
    const next=bodyIsPaused();
    if(next!==bodyPaused){bodyPaused=next;wake();}
  });state.observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',wake);
  const invalidateRect=()=>{rect=null;};
  window.addEventListener('scroll',invalidateRect,{passive:true});
  const preferenceChanged=()=>{pointerPending=false;targetX=targetY=0;wake();};
  const contextLostHandler=e=>{e.preventDefault();contextLost=true;stop();};
  const contextRestored=()=>{contextLost=false;dirty=true;wake();};
  reduced.addEventListener('change',preferenceChanged);
  renderer.domElement.addEventListener('webglcontextlost',contextLostHandler);
  renderer.domElement.addEventListener('webglcontextrestored',contextRestored);
  // Warm the unchanged materials before their first visible frame. Three.js
  // uses parallel shader compilation when the browser supports it.
  renderer.compileAsync(scene,view).catch(error=>console.warn('Model shader warm-up failed',error)).finally(()=>{
    if(disposed)return;
    compiling=false;button.dataset.hobbyCompiling='false';dirty=true;wake();
  });
  window.addEventListener('pageshow',wake);
  window.addEventListener('pagehide',e=>{
    stop();if(e.persisted)return;
    disposed=true;unobserveIntro();resize.disconnect();intersection.disconnect();state.disconnect();
    button.removeEventListener('pointerenter',pointerEnter);
    button.removeEventListener('pointermove',follow);
    button.removeEventListener('pointerleave',pointerLeave);
    reduced.removeEventListener('change',preferenceChanged);
    renderer.domElement.removeEventListener('webglcontextlost',contextLostHandler);
    renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);
    window.removeEventListener('scroll',invalidateRect);
    document.removeEventListener('visibilitychange',wake);
    window.removeEventListener('pageshow',wake);
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
