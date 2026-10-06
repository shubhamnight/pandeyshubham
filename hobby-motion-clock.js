// One ordered animation frame: scroll, models' positions, arcs, video, WebGL.
const callbacks=new Map();
let ordered=[],frame=0,ticking=false,smoothPosition=null,orderDirty=false,activeCount=0;
const removed=new Set();
function prune(){
  if(!removed.size)return;
  for(const entry of removed)callbacks.delete(entry.callback);
  ordered=ordered.filter(entry=>entry.active);
  removed.clear();
}
function tick(time){
  frame=0;ticking=true;
  // A callback can cancel and schedule itself without rebuilding the order.
  // New callbacks still join on the next frame, in their requested priority.
  if(orderDirty){ordered=[...callbacks.values()].sort((a,b)=>a.priority-b.priority);orderDirty=false;}
  const current=ordered;
  try{
    for(const entry of current)if(entry.active){
      try{entry.callback(time);}catch(error){cancelHobbyFrame(entry.callback);console.error('Animation frame failed',error);}
    }
  }
  finally{ticking=false;prune();if(activeCount&&!frame)frame=requestAnimationFrame(tick);}
}
export function requestHobbyFrame(callback,priority=30){
  let entry=callbacks.get(callback);
  if(!entry){
    entry={callback,priority,active:true};callbacks.set(callback,entry);activeCount++;orderDirty=true;
  }else if(!entry.active){
    entry.active=true;activeCount++;removed.delete(entry);
    if(entry.priority!==priority){entry.priority=priority;orderDirty=true;}
  }
  if(!frame&&!ticking)frame=requestAnimationFrame(tick);
  return 1;
}
export function cancelHobbyFrame(callback){
  const entry=callbacks.get(callback);
  if(entry?.active){entry.active=false;activeCount--;removed.add(entry);}
  if(!ticking)prune();
  if(!activeCount&&frame){cancelAnimationFrame(frame);frame=0;}
}
export function setSmoothPosition(value){smoothPosition=value;}
export function getSmoothPosition(){return smoothPosition??window.scrollY;}

// Derived scroll fractions can land at 0.9999999999999999 instead of 1.
// Stage completion must use canonical endpoints so the next stage can start.
export function clampMotionProgress(value){
  const bounded=Math.max(0,Math.min(1,value));
  return bounded<=1e-7?0:bounded>=1-1e-7?1:bounded;
}

// A bounded, critically damped scroll follower. Large scroll jumps cannot
// teleport a stage; small updates retain their velocity, including on reversal.
export function advanceProgress(state,target,dt,maxSpeed=1.5,response=18){
  target=clampMotionProgress(target);
  if(dt<=0)return state.value;
  const steps=Math.max(1,Math.ceil(dt*120)),step=dt/steps;
  for(let index=0;index<steps;index++){
    const difference=target-state.value;
    state.velocity+=(response*response*difference-2*response*state.velocity)*step;
    state.velocity=Math.max(-maxSpeed,Math.min(maxSpeed,state.velocity));
    const next=state.value+state.velocity*step;
    if(difference===0||difference*(target-next)<=0){state.value=target;state.velocity=0;}
    else{
      state.value=Math.max(0,Math.min(1,next));
      if(state.value!==next)state.velocity=0;
    }
  }
  if(Math.abs(target-state.value)<.0001&&Math.abs(state.velocity)<.001){state.value=target;state.velocity=0;}
  return state.value;
}
