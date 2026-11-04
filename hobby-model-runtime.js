import { requestHobbyFrame, cancelHobbyFrame } from './hobby-motion-clock.js';
import { batchRigidModelAsync } from './hobby-model-batching.js';
import { yieldHobbyPreparation, warmHobbyRenderer } from './hobby-preparation.js';
import { createHobbyRenderer, resizeHobbyRenderer } from './hobby-renderer.js';
import { observeGraphicsQuality } from './graphics-quality.js';

export async function mountHobbyModel({button, signal, model, Renderer, maxDensity, assemble, onFailure}) {
  const yieldWork=()=>yieldHobbyPreparation(signal);
  const surface=button.querySelector('.hobby-model-fallback')||button;
  let renderer, cleanupMotion=()=>{};
  function dispose() {
    cleanupMotion();
    button.classList.remove('camera-ready');
    delete button.dataset.hobbyCompiling;
    const resources=new Set();
    model.traverse(node=>{
      if(node.geometry)resources.add(node.geometry);
      for(const material of [node.material].flat().filter(Boolean)){
        resources.add(material);
        for(const value of Object.values(material))if(value?.isTexture)resources.add(value);
      }
    });
    resources.forEach(resource=>resource.dispose());
    renderer?.domElement.remove();
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
  signal.throwIfAborted();
  signal.addEventListener('abort',dispose,{once:true});
  try {
    button.dataset.hobbyCompiling='true';
    const {scene,view,orientModel,configure}=await assemble(model,yieldWork);
    const batches=await batchRigidModelAsync(model,yieldWork);
    signal.throwIfAborted();
    button.dataset.modelPieces=String(batches.before);
    button.dataset.modelDraws=String(batches.after);
    model.traverse(node=>{if(node!==model){node.updateMatrix();node.matrixAutoUpdate=false;}});
    renderer=createHobbyRenderer(Renderer,surface,maxDensity);
    configure?.(renderer);
    view.aspect=surface.clientWidth/Math.max(1,surface.clientHeight);view.updateProjectionMatrix();
    renderer.setClearColor(0,0);
    const canvas=renderer.domElement;
    canvas.setAttribute('aria-hidden','true');
    canvas.style.pointerEvents='none';
    canvas.style.visibility='hidden';
    button.append(canvas);
    canvas.addEventListener('webglcontextlost',onFailure,{signal});
    await warmHobbyRenderer(renderer,scene,view,model,()=>!signal.aborted,yieldWork);
    signal.throwIfAborted();
    canvas.style.visibility='';
    button.classList.add('camera-ready');
    button.dataset.hobbyCompiling='false';
    cleanupMotion=connectHobbyMotion({button,surface,signal,renderer,scene,view,model,orientModel,onFailure});
  } catch(error) {
    if(!signal.aborted){signal.removeEventListener('abort',dispose);dispose();}
    throw error;
  }
}

function connectHobbyMotion({button,surface,signal,renderer,scene,view,model,orientModel,onFailure}) {
  const options={signal},reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false,last=0,targetX=0,targetY=0,position=null,rect=null,dirty=true;
  const allowed=()=>visible&&!document.hidden&&
    !document.body.matches('.photography-gallery-open,.motion-paused,.intro-active');
  const stop=()=>{cancelHobbyFrame(render);last=0;};
  function render(time) {
    if(!allowed()){stop();return;}
    if(dirty){
      const width=surface.clientWidth,height=surface.clientHeight;
      if(width&&height){
        resizeHobbyRenderer(renderer,width,height);
        view.aspect=width/height;view.updateProjectionMatrix();
      }
      dirty=false;
    }
    if(position){
      rect ||= surface.getBoundingClientRect();
      const clamp=value=>Math.max(-1,Math.min(1,value));
      targetY=clamp((position.clientX-rect.left)/rect.width*2-1)*.32;
      targetX=clamp((position.clientY-rect.top)/rect.height*2-1)*.22;
      position=null;
    }
    const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;
    const blend=1-Math.exp(-12*dt);
    let settled;
    if(orientModel)settled=orientModel(false,null,targetX,targetY,0,blend,dt);
    else {
      model.rotation.x+=(targetX-model.rotation.x)*blend;
      model.rotation.y+=(targetY-model.rotation.y)*blend;
      settled=Math.abs(targetX-model.rotation.x)+Math.abs(targetY-model.rotation.y)<.0004;
      if(settled)model.rotation.set(targetX,targetY,0);
    }
    try{renderer.render(scene,view);}
    catch(error){onFailure(error);return;}
    if(settled)stop();
  }
  const wake=()=>{if(allowed())requestHobbyFrame(render,50);else stop();};
  const resize=()=>{rect=null;dirty=true;wake();};
  const unobserveQuality=observeGraphicsQuality(resize);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;rect=null;wake();});
  intersection.observe(button);
  const observer=new ResizeObserver(resize);observer.observe(surface);
  let paused=!allowed();
  const state=new MutationObserver(()=>{
    const next=!allowed();
    if(next!==paused){paused=next;wake();}
  });
  state.observe(document.body,{attributes:true,attributeFilter:['class']});
  button.addEventListener('pointermove',event=>{
    if(!reduced.matches&&event.pointerType!=='touch'){position=event;wake();}
  },{...options,passive:true});
  const reset=()=>{position=rect=null;targetX=targetY=0;wake();};
  button.addEventListener('pointerleave',reset,options);
  reduced.addEventListener('change',reset,options);
  document.addEventListener('visibilitychange',wake,options);
  window.addEventListener('pageshow',wake,options);
  window.addEventListener('pagehide',stop,options);
  window.addEventListener('scroll',()=>{rect=null;},{...options,passive:true});
  return ()=>{stop();unobserveQuality();intersection.disconnect();observer.disconnect();state.disconnect();};
}
