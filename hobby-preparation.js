// Model preparation is not animation. Give input and the next paint a turn
// between its CPU/GPU stages, without advancing any of the motion clocks.
const lifetime=new AbortController();
window.addEventListener('pagehide',event=>{if(!event.persisted)lifetime.abort();});
export function yieldHobbyPreparation() {
  const signal=lifetime.signal;
  return new Promise((resolve,reject)=>{
    let frame=0,idle=0,timer=0,finished=false;
    const cleanup=()=>{
      cancelAnimationFrame(frame);if(idle)cancelIdleCallback(idle);clearTimeout(timer);
      document.removeEventListener('visibilitychange',schedule);signal.removeEventListener('abort',abort);
    };
    const finish=()=>{if(finished)return;finished=true;cleanup();resolve();};
    const abort=()=>{if(finished)return;finished=true;cleanup();reject(new DOMException('Page left','AbortError'));};
    function schedule(){
      if(finished||frame||idle||timer||document.hidden)return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        const run=()=>{idle=timer=0;if(document.hidden)return;finish();};
        if('requestIdleCallback' in window)idle=requestIdleCallback(run,{timeout:100});
        else timer=setTimeout(run,0);
      });
    }
    if(signal.aborted){abort();return;}
    signal.addEventListener('abort',abort,{once:true});
    document.addEventListener('visibilitychange',schedule);schedule();
  });
}

// compileAsync alone leaves attribute uploads, uniform discovery and first-use
// GPU work for the first visible orbit frame. Prepare one unchanged draw at a
// time while its canvas is hidden; the final complete render is revealed once.
export async function warmHobbyRenderer(renderer,scene,view,model,alive) {
  const pieces=[];
  model.traverse(node=>{if(node.isMesh||node.isLine||node.isPoints)pieces.push([node,node.layers.mask]);});
  const canvas=renderer.domElement,visibility=canvas.style.visibility;
  canvas.style.visibility='hidden';
  try{
   try{
    for(const [node] of pieces)node.layers.mask=0;
    for(const [node,mask] of pieces){
      await yieldHobbyPreparation();if(!alive())return false;
      node.layers.mask=mask;
      await renderer.compileAsync(node,view,scene);
      await yieldHobbyPreparation();if(!alive())return false;
      renderer.render(scene,view);
      node.layers.mask=0;
    }
   }finally{
    for(const [node,mask] of pieces)node.layers.mask=mask;
   }
   await yieldHobbyPreparation();if(!alive())return false;
   renderer.render(scene,view);
   return true;
  }finally{canvas.style.visibility=visibility;}
}
