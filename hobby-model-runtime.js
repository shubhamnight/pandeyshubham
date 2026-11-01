// One event-driven frame scheduler for all four hobby models.
import { hobbyIntro, observeHobbyIntro } from './hobby-intro.js';
import { requestHobbyFrame, cancelHobbyFrame } from './hobby-motion-clock.js';
import { batchRigidModelAsync } from './hobby-model-batching.js';
import { yieldHobbyPreparation, warmHobbyRenderer } from './hobby-preparation.js';
import { touchPerformance } from './touch-performance.js';
import { Vector2 } from './node_modules/three/build/three.module.js';
const active = new Set();
let frame = 0;
function tick(time) {
  frame = 0;
  for (const update of active) {
    // One renderer failure must not cancel the shared clock for every model.
    try { update(time); }
    catch (error) { deactivate(update); console.error('Hobby model frame failed',error); }
  }
  if (active.size) frame = requestHobbyFrame(tick,50);else cancelHobbyFrame(tick);
}
function activate(update) { active.add(update); if (!frame) frame=requestHobbyFrame(tick,50); }
function deactivate(update) {
  active.delete(update);
  if (!active.size) { cancelHobbyFrame(tick); frame=0; }
}

const buildQueue = [];
const deferredObservers=new Set();
let building = false,buildFrame=0,idleBuild=0,buildTimeout=0,buildDisposed=false;
function scheduleBuild() {
  if (building || buildDisposed || !buildQueue.length || document.hidden) return;
  // Geometry construction and shader warm-up otherwise compete with the ID
  // entrance. Its existing completion event resumes
  // preparation; scrolling away permits preparation immediately.
  if(document.body.classList.contains('badge-entering')&&
    !document.querySelector('#home')?.classList.contains('hero-covered'))return;
  building = true;
  buildFrame=requestAnimationFrame(() => {
    buildFrame=0;
    const build = async () => {
      idleBuild=buildTimeout=0;
      try{if(!buildDisposed&&!document.hidden)await buildQueue.shift()?.();}
      catch(error){if(error.name!=='AbortError')console.error('Hobby model could not be prepared',error);}
      finally{building=false;scheduleBuild();}
    };
    if ('requestIdleCallback' in window) idleBuild=requestIdleCallback(build,{timeout:500});
    else buildTimeout=setTimeout(build,0);
  });
}
document.addEventListener('visibilitychange',scheduleBuild);
document.querySelector('.badge-rig')?.addEventListener('badge-entrance-complete',scheduleBuild);
window.addEventListener('scroll',scheduleBuild,{passive:true});
window.addEventListener('pagehide',event=>{
  if(event.persisted)return;
  buildDisposed=true;cancelAnimationFrame(buildFrame);
  if(idleBuild)cancelIdleCallback(idleBuild);
  clearTimeout(buildTimeout);buildQueue.length=0;
  deferredObservers.forEach(observer=>observer.disconnect());deferredObservers.clear();
  document.removeEventListener('visibilitychange',scheduleBuild);
  document.querySelector('.badge-rig')?.removeEventListener('badge-entrance-complete',scheduleBuild);
  window.removeEventListener('scroll',scheduleBuild);
});
export function deferHobbyModel(button,build) {
  const observer=new IntersectionObserver(entries=>{
    if (!entries.some(e=>e.isIntersecting)) return;
    observer.disconnect();deferredObservers.delete(observer);
    buildQueue.push(async()=>{try{await build();}catch(error){if(error.name!=='AbortError')button.dataset.hobbyModelFailed='true';throw error;}});scheduleBuild();
  },{rootMargin:'650px'});
  if(buildDisposed)return;
  const section=document.querySelector('#projects');
  deferredObservers.add(observer);observer.observe(section?.closest('.skills-hobbies-scene')||section||button);
}

export async function connectHobbyMotion({button,renderer,scene,view,model,orientModel=null}) {
  const batches=await batchRigidModelAsync(model,yieldHobbyPreparation);
  button.dataset.modelPieces=String(batches.before);
  button.dataset.modelDraws=String(batches.after);
  // Only the root turns with the orbit or hover; detailed geometry stays rigid.
  // Reuse each child's local matrix rather than rebuilding it every render.
  model.traverse(node=>{if(node!==model){node.updateMatrix();node.matrixAutoUpdate=false;}});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false, targetX=0, targetY=0, last=0, dirty=true;
  const initialSize=renderer.getSize(new Vector2());
  let pointerPending=false, pointerX=0, pointerY=0, rect=null, width=initialSize.x, height=initialSize.y, contextLost=false,compiling=true,disposed=false;
  view.aspect=width/height;view.updateProjectionMatrix();
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
  let preparation=Promise.resolve(),preparationVersion=0;
  const contextLostHandler=e=>{
    e.preventDefault();contextLost=true;preparationVersion++;compiling=true;
    button.dataset.hobbyCompiling='true';stop();
  };
  const contextRestored=()=>{contextLost=false;dirty=true;void prepare();};
  reduced.addEventListener('change',preferenceChanged);
  renderer.domElement.addEventListener('webglcontextlost',contextLostHandler);
  renderer.domElement.addEventListener('webglcontextrestored',contextRestored);
  // Warm the unchanged materials before their first visible frame. Three.js
  // uses parallel shader compilation when the browser supports it.
  function prepare(){
    const version=++preparationVersion;
    compiling=true;button.dataset.hobbyCompiling='true';stop();
    // A restore can arrive while an old warm-up is yielding. Let that job
    // restore its temporary layer masks before the new one starts.
    preparation=preparation.then(async()=>{
      const alive=()=>!disposed&&!contextLost&&version===preparationVersion;
      try{
        if(!alive()||!await warmHobbyRenderer(renderer,scene,view,model,alive))return;
        if(!alive())return;
        compiling=false;button.dataset.hobbyCompiling='false';button.classList.add('camera-ready');
        delete button.dataset.hobbyModelFailed;dirty=true;wake();
      }catch(error){
        if(!alive()||error.name==='AbortError')return;
        compiling=false;button.dataset.hobbyCompiling='false';button.dataset.hobbyModelFailed='true';
        button.classList.remove('camera-ready');console.warn('Model preparation failed; keeping gallery icon.',error);
      }
    });
    return preparation;
  }
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
    resources.forEach(resource=>resource.dispose());renderer.dispose();renderer.forceContextLoss();
  });
  await prepare();
}
