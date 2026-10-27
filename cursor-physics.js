// Exact critically damped spring step. Reuse each axis record; no per-frame
// objects, numerical substeps, or refresh-rate-dependent interpolation.
export function stepCursorSpring(axis,target,dt,response=32){
  if(dt<=0)return;
  const decay=Math.exp(-response*dt),offset=axis.value-target;
  const momentum=axis.velocity+response*offset;
  axis.value=target+(offset+momentum*dt)*decay;
  axis.velocity=(axis.velocity-response*momentum*dt)*decay;
}
export function cursorSpringSettled(axis,target,position=.025,velocity=.5){
  return Math.abs(axis.value-target)<position&&Math.abs(axis.velocity)<velocity;
}
