// One ordered animation frame: scroll, models' positions, arcs, video, WebGL.
const callbacks=new Map();
let ordered=[],frame=0,ticking=false,smoothPosition=null,orderDirty=false;
function reorder(){orderDirty=true;}
function tick(time){
  frame=0;ticking=true;
  // Multiple starts/stops in one frame only rebuild the order once.
  if(orderDirty){ordered=[...callbacks].sort((a,b)=>a[1]-b[1]).map(([callback])=>callback);orderDirty=false;}
  const current=ordered;
  try{
    for(const callback of current)if(callbacks.has(callback)){
      try{callback(time);}catch(error){cancelHobbyFrame(callback);console.error('Animation frame failed',error);}
    }
  }
  finally{ticking=false;if(callbacks.size&&!frame)frame=requestAnimationFrame(tick);}
}
export function requestHobbyFrame(callback,priority=30){
  if(!callbacks.has(callback)){callbacks.set(callback,priority);reorder();}
  if(!frame&&!ticking)frame=requestAnimationFrame(tick);
  return 1;
}
export function cancelHobbyFrame(callback){
  if(callbacks.delete(callback))reorder();
  if(!callbacks.size&&frame){cancelAnimationFrame(frame);frame=0;}
}
export function setSmoothPosition(value){smoothPosition=value;}
export function getSmoothPosition(){return smoothPosition??window.scrollY;}
