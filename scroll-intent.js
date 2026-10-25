// Native touch scrolling can settle a CSS pixel backwards after a forward
// swipe. Accumulate reverse travel so that rounding cannot start a whole exit,
// while a deliberate slow reverse still works across many small updates.
export function createScrollReversalGuard(tolerance=4){
  let previous=null,origin=null;
  function reset(){previous=origin=null;}
  return {reset,update(position){
    if(!Number.isFinite(position)){reset();return false;}
    if(previous===null||position>previous)origin=position;
    previous=position;
    return origin-position>=tolerance;
  }};
}
