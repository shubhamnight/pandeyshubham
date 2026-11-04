// Share animation frames between visible decorative renderers.
import { touchPerformance } from './touch-performance.js';
import { reportGraphicsFrame } from './graphics-quality.js';
const callbacks=new Map();
// Reuse mobile callback records without retaining disposed gallery callbacks.
const reusable=touchPerformance?new WeakMap():null;
let ordered=[],frame=0,ticking=false,orderDirty=false,activeCount=0;
const removed=new Set();
function prune(){
  if(!removed.size)return;
  for(const entry of removed)callbacks.delete(entry.callback);
  if(touchPerformance){
    let count=0;
    for(const entry of ordered)if(entry.active)ordered[count++]=entry;
    ordered.length=count;
  }else ordered=ordered.filter(entry=>entry.active);
  removed.clear();
}
function tick(time){
  frame=0;ticking=true;
  // A callback can cancel and schedule itself without rebuilding the order.
  // New callbacks still join on the next frame, in their requested priority.
  if(orderDirty){
    if(touchPerformance){ordered.length=0;for(const entry of callbacks.values())ordered.push(entry);ordered.sort((a,b)=>a.priority-b.priority);}
    else ordered=[...callbacks.values()].sort((a,b)=>a.priority-b.priority);
    orderDirty=false;
  }
  const current=ordered;
  if(current.some(entry=>entry.active&&entry.sampleGraphics))reportGraphicsFrame(time);
  try{
    for(const entry of current)if(entry.active){
      try{entry.callback(time);}catch(error){cancelHobbyFrame(entry.callback);console.error('Animation frame failed',error);}
    }
  }
  finally{ticking=false;prune();if(activeCount&&!frame)frame=requestAnimationFrame(tick);}
}
export function requestHobbyFrame(callback,priority=30,sampleGraphics=true){
  let entry=callbacks.get(callback);
  if(!entry){
    entry=reusable?.get(callback)||{callback,priority,active:true};
    entry.priority=priority;entry.active=true;
    reusable?.set(callback,entry);callbacks.set(callback,entry);activeCount++;orderDirty=true;
  }else if(!entry.active){
    entry.active=true;activeCount++;removed.delete(entry);
    if(entry.priority!==priority){entry.priority=priority;orderDirty=true;}
  }
  entry.sampleGraphics=sampleGraphics;
  if(!frame&&!ticking)frame=requestAnimationFrame(tick);
  return 1;
}
export function cancelHobbyFrame(callback){
  const entry=callbacks.get(callback);
  if(entry?.active){entry.active=false;activeCount--;removed.add(entry);}
  if(!ticking)prune();
  if(!activeCount&&frame){cancelAnimationFrame(frame);frame=0;}
}
