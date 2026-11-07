const badge = document.querySelector('.badge');
const strap = document.querySelector('.strap');
const rig = document.querySelector('.badge-rig');
const hanger = document.querySelector('.badge-hanger');
const cord = document.querySelector('.lanyard-cord');
const badgeShell = document.createElement('div');
badgeShell.className = 'badge-shell';
badgeShell.setAttribute('aria-hidden','true');
for(let depth=1;depth<=5;depth++){
  const layer=document.createElement('span');
  layer.style.transform=`translateZ(-${depth}px)`;
  badgeShell.append(layer);
}
hanger.insertBefore(badgeShell,badge);
const hero = document.querySelector('.hero');
const touchBadge=window.matchMedia('(pointer: coarse)').matches ||
  (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
// Keep drag lighting local to the two surfaces that actually paint it.
// The same values, gradients and transitions remain; other card descendants
// no longer inherit a changing set of lighting properties every frame.
const glareSurface=badge.querySelector('.badge-glare')||badge;
const patternSurface=badge.querySelector('.badge-face')||badge;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const restingPose = {x:0, y:0, rx:0, ry:0, rz:0, z:0, light:0, scale:1};
const pose = {...restingPose};
const targetPose = {...pose};
const velocity = Object.fromEntries(Object.keys(pose).map(key=>[key,0]));
const poseKeys = Object.keys(pose);
// Single-card pendulum values from the supplied lanyard component.
const ribbon = {angle:0, velocity:0, lag:0, previousVelocity:0};
let frame = 0, geometryFrame = 0, lastTime = 0, dragging = false, pointerId = null;
let startX = 0, startY = 0, originX = 0, originY = 0, originSwing = 0, originAngle = 0;
let bounds;
let badgeBoundsDirty=true;
let hoveringBadge=false, pointerPending=false, initialSway=true;
const latestPointer={x:0,y:0};
const paintedStyles=new WeakMap();
function writeBadgeStyle(element,property,value){
  let previous=paintedStyles.get(element);
  if(!previous){previous=new Map();paintedStyles.set(element,previous);}
  if(previous.get(property)===value)return;
  previous.set(property,value);element.style.setProperty(property,value);
}
const motionAllowed = () => !document.hidden && !reducedMotion.matches && !hero.classList.contains('hero-idle') && !hero.classList.contains('hero-covered') && !document.body.classList.contains('motion-paused') && !document.body.classList.contains('badge-entering') && !document.body.classList.contains('intro-active');
function measureBadge() {
  cancelAnimationFrame(geometryFrame);geometryFrame=0;
  badgeBoundsDirty=false;
  const rect = hero.getBoundingClientRect();
  // Pointer coordinates must use the hero's layout space, rather than its
  // transformed bounding rectangle. Keep the moving
  // rig out of this measurement so tilting cannot feed back into the next tilt.
  const inverse=new DOMMatrix(getComputedStyle(hero).transform).inverse();
  bounds = {left:rig.offsetLeft-rig.offsetWidth/2+badge.offsetLeft,
    top:rig.offsetTop+badge.offsetTop,width:badge.offsetWidth,height:badge.offsetHeight,
    strapLength:strap.offsetHeight,centerX:rect.left+rect.width/2,centerY:rect.top+rect.height/2,
    heroWidth:hero.offsetWidth,heroHeight:hero.offsetHeight,inverse};
  bounds.maxPull=Math.max(0,Math.min(64,bounds.heroHeight-bounds.top-bounds.height-16));
  const reach=bounds.top+bounds.height+bounds.maxPull, half=bounds.width*.56;
  bounds.maxSwing=Math.min(18,Math.max(0,Math.asin(Math.min(1,Math.max(0,bounds.heroWidth/2-12)/Math.hypot(reach,half)))-Math.atan2(half,reach))*180/Math.PI);
  bounds.maxX=Math.min(85,Math.tan(bounds.maxSwing*Math.PI/180)*(bounds.strapLength+bounds.height*.45));
  const size=clamp(bounds.width*.1,14,28), slot=badge.querySelector('.slot');
  const attach=badge.offsetTop+badge.clientTop+slot.offsetTop+slot.offsetHeight/2;
  const clipTop=attach-size*.65;
  bounds.cordLength=size*.42;
  for(const [name,value] of Object.entries({size,'clip-top':clipTop,'cord-length':bounds.cordLength,'cord-top':clipTop-bounds.cordLength,'reel-top':clipTop-bounds.cordLength-size}))
    writeBadgeStyle(rig,'--lanyard-'+name,value+'px');
  writeBadgeStyle(badgeShell,'top',badge.offsetTop+'px');
  writeBadgeStyle(badgeShell,'width',bounds.width+'px');
  writeBadgeStyle(badgeShell,'height',bounds.height+'px');
}
function badgePointer(x,y){
  const dx=x-bounds.centerX,dy=y-bounds.centerY,m=bounds.inverse;
  return {x:m.a*dx+m.c*dy+bounds.heroWidth/2,y:m.b*dx+m.d*dy+bounds.heroHeight/2};
}
function paintBadge() {
  // A fixed top pivot swings the suspension; the card tilts at its clip.
  const swing=clamp(ribbon.angle,-bounds.maxSwing,bounds.maxSwing);
  const bodyAngle=clamp(ribbon.lag+pose.rz,-bounds.maxSwing,bounds.maxSwing);
  writeBadgeStyle(rig,'transform',`translateX(-50%) rotateZ(${swing.toFixed(3)}deg)`);
  writeBadgeStyle(hanger,'transform',`translateY(${pose.y.toFixed(3)}px) rotateZ(${(bodyAngle-swing).toFixed(3)}deg) rotateX(${pose.rx.toFixed(3)}deg) rotateY(${pose.ry.toFixed(3)}deg) scale(${pose.scale.toFixed(4)})`);
  writeBadgeStyle(cord,'transform',`scaleY(${(1+pose.y/bounds.cordLength).toFixed(4)})`);
  writeBadgeStyle(glareSurface,'--glare-x',`${(50 + pose.ry * 2.5).toFixed(2)}%`);
  writeBadgeStyle(glareSurface,'--glare-y',`${(50 - pose.rx * 2.5).toFixed(2)}%`);
  writeBadgeStyle(glareSurface,'--glare-opacity',pose.light.toFixed(3));
  writeBadgeStyle(patternSurface,'--ticket-pattern-x',`${(pose.ry * -.7).toFixed(2)}px`);
  writeBadgeStyle(patternSurface,'--ticket-pattern-y',`${(pose.rx * .7).toFixed(2)}px`);
  writeBadgeStyle(badge,'--edge-x',(-pose.ry*.32).toFixed(2)+'px');
  writeBadgeStyle(badge,'--edge-y',(3+pose.rx*.2).toFixed(2)+'px');
  // The supplied tilt card's directional shadow follows the same smoothed pose.
  writeBadgeStyle(badge,'--tilt-shadow-x',(pose.ry*.5).toFixed(2)+'px');
  writeBadgeStyle(badge,'--tilt-shadow-y',(pose.rx*.5).toFixed(2)+'px');
  writeBadgeStyle(badge,'--tilt-shadow-blur',(40+Math.abs(pose.rx+pose.ry)*.5).toFixed(2)+'px');

}
function animateBadge(time) {
  if (!motionAllowed()) { stopBadge(); return; }
  // Consume only the newest pointer sample, with layout reads before any paint writes.
  // A stationary cursor does not consume screen coordinates. Scroll-only
  // spring frames can reuse the unchanged ribbon/card layout dimensions;
  // the resize observer still refreshes their backing layers independently.
  if(badgeBoundsDirty&&(pointerPending||!bounds))measureBadge();
  if(pointerPending){
    pointerPending=false;
    const pointer=badgePointer(latestPointer.x,latestPointer.y);
    if(dragging){
      const maxPull=bounds.maxPull;
      const x=clamp(originX+(pointer.x-startX)*.6,-bounds.maxX,bounds.maxX);
      const pull=Math.max(0,originY+(pointer.y-startY)*.8), knee=maxPull*.75;
      const y=maxPull>0 ? pull<=knee ? pull : knee+(maxPull-knee)*(1-Math.exp(-(pull-knee)/(maxPull-knee))) : 0;
      Object.assign(targetPose,{x,y,rx:-y*.13,ry:x*.16,rz:0,z:0,light:.16,scale:1.02});
    }else{
      const nx=(pointer.x-bounds.left-bounds.width/2)/(bounds.width/2);
      const ny=(pointer.y-bounds.top-bounds.height/2)/(bounds.height/2);
      hoveringBadge=Math.abs(nx)<=2.2&&ny<=1.5&&pointer.y>=bounds.top-bounds.strapLength;
      if(hoveringBadge)Object.assign(targetPose,{x:clamp(nx,-1,1)*7,y:0,
        rx:-clamp(ny,-1,1)*15,ry:clamp(nx,-1,1)*15,rz:clamp(nx,-1,1)*1.2,
        z:0,light:.12,scale:1.02});
      else Object.assign(targetPose,restingPose);
    }
  }
  const elapsed = Math.min((time - (lastTime || time - 16.67)) / 1000, .05);
  const steps = Math.max(3,Math.ceil(elapsed/.006));
  const dt = elapsed/steps;
  lastTime = time;
  let unsettled = false;
  for (const key of poseKeys) {
    for(let step=0;step<steps;step++){
      // Firm grip while dragging; a lightly damped pendulum when released.
      const stiffness=key==='light'?100:key==='scale'?180:dragging?150:key==='y'?220:hoveringBadge?180:60;
      const damping=key==='light'?20:key==='scale'?26:dragging?23:key==='y'?Math.sqrt(220):hoveringBadge?26:11;
      const acceleration = (targetPose[key] - pose[key]) * stiffness - velocity[key] * damping;
      velocity[key] += acceleration * dt;
      pose[key] += velocity[key] * dt;
      if(key==='y' && pose.y < -bounds.cordLength*.85){pose.y=-bounds.cordLength*.85;velocity.y=Math.max(0,velocity.y);}
    }
    const threshold=key==='scale'?.0002:.015;
    if (Math.abs(targetPose[key] - pose[key]) > threshold || Math.abs(velocity[key]) > threshold) unsettled = true;
  }
  const length=bounds.top+bounds.height/2;
  if(dragging){
    const angle=clamp(originSwing-Math.atan2(pose.x,length+pose.y)*180/Math.PI-originAngle,-18,18);
    ribbon.velocity=clamp((angle-ribbon.angle)/elapsed*.5,-90,90);
    ribbon.angle=angle;
  }
  for(let step=0;step<steps;step++){
    if(!dragging){
      // The reference's inertial kick, mapped to a fixed top attachment.
      if(step===0)ribbon.velocity=clamp(ribbon.velocity-(.25*57.3/length)*clamp(velocity.x-ribbon.previousVelocity,-900,900),-90,90);
      ribbon.velocity+=(-28*ribbon.angle-2.2*ribbon.velocity)*dt;
      ribbon.angle=clamp(ribbon.angle+ribbon.velocity*dt,-18,18);
    }
    ribbon.lag+=(ribbon.angle-ribbon.lag)*Math.min(1,dt/.12);
  }
  ribbon.previousVelocity=velocity.x;
  if(Math.abs(ribbon.angle)>.02||Math.abs(ribbon.velocity)>.05||Math.abs(ribbon.lag-ribbon.angle)>.01)unsettled=true;
  if (unsettled) { paintBadge(); frame = requestAnimationFrame(animateBadge); }
  else { Object.assign(pose, targetPose); for(const key of poseKeys)velocity[key]=0;
    Object.assign(ribbon,{angle:0,velocity:0,lag:0,previousVelocity:0});
    paintBadge(); frame = 0; lastTime = 0; rig.classList.remove('is-moving'); }
}
function setPose(next) {
  if(!frame && poseKeys.every(key=>next[key]===undefined || Math.abs(next[key]-pose[key])<.001))return;
  Object.assign(targetPose, next);
  requestBadgeFrame();
}
function requestBadgeFrame(){
  if (!motionAllowed()) { stopBadge(); return; }
  if (!frame) { rig.classList.add('is-moving'); frame = requestAnimationFrame(animateBadge); }
}
function queueBadgePointer(event){
  // No work for pointer movement far from the rig once its spring has settled.
  // A captured touch drag is mapped once by the next animation frame. It
  // does not need a second coordinate conversion for the hover bounds guard.
  const pointer=badgeBoundsDirty||frame||dragging||hoveringBadge?null:badgePointer(event.clientX,event.clientY);
  if(!frame&&!dragging&&!hoveringBadge&&!badgeBoundsDirty&&
    (pointer.x<bounds.left-bounds.width*.6||pointer.x>bounds.left+bounds.width*1.6||
      pointer.y<bounds.top-bounds.strapLength||pointer.y>bounds.top+bounds.height*1.25))return;
  latestPointer.x=event.clientX;latestPointer.y=event.clientY;pointerPending=true;
  requestBadgeFrame();
}
function stopBadge() {
  cancelAnimationFrame(frame); frame = 0; lastTime = 0;
  for (const key of poseKeys){pose[key]=targetPose[key]=restingPose[key];velocity[key]=0;}
  hoveringBadge=false;pointerPending=false;
  Object.assign(ribbon,{angle:0,velocity:0,lag:0,previousVelocity:0});
  badge.style.transform = ''; badgeShell.style.transform=''; strap.style.transform = ''; glareSurface.style.setProperty('--glare-opacity', 0);
  rig.style.transform='';rig.classList.remove('is-moving');
  hanger.style.transform='';cord.style.transform='';
  ['--edge-x','--edge-y','--tilt-shadow-x','--tilt-shadow-y','--tilt-shadow-blur'].forEach(property=>badge.style.removeProperty(property));
  ['--ticket-pattern-x','--ticket-pattern-y'].forEach(property=>patternSurface.style.removeProperty(property));
  ['--glare-x','--glare-y'].forEach(property=>glareSurface.style.removeProperty(property));
  [rig,hanger,cord,badge,strap,glareSurface,patternSurface].forEach(element=>paintedStyles.delete(element));
  badge.classList.remove('is-moving', 'dragging');
  strap.classList.remove('is-moving');
  dragging = false;
  if (pointerId !== null && badge.hasPointerCapture(pointerId)) badge.releasePointerCapture(pointerId);
  pointerId = null;
}
function settleBadge() { hoveringBadge=false;pointerPending=false;setPose(restingPose); }
function startInitialSway() {
  if(!initialSway || !motionAllowed()) return;
  if(badgeBoundsDirty)measureBadge();
  const top=bounds.centerY-bounds.heroHeight/2;
  if(top>=(window.innerHeight||bounds.heroHeight) || top+bounds.heroHeight<=0)return;
  initialSway=false;
  ribbon.velocity=30;
  requestBadgeFrame();
}
measureBadge();
requestAnimationFrame(startInitialSway);
function invalidateBadgeBounds(){
  badgeBoundsDirty=true;
  // Update the backing layers even when the spring is idle or the hero is
  // covered. Resizing must not leave an old rim visible until the next hover.
  if(!geometryFrame)geometryFrame=requestAnimationFrame(()=>{
    geometryFrame=0;if(badgeBoundsDirty)measureBadge();
    if(hoveringBadge){pointerPending=true;requestBadgeFrame();}
  });
}
const badgeResizeObserver=new ResizeObserver(invalidateBadgeBounds);
badgeResizeObserver.observe(rig);badgeResizeObserver.observe(badge);badgeResizeObserver.observe(strap);
rig.addEventListener('badge-entrance-complete', invalidateBadgeBounds);
window.addEventListener('resize', invalidateBadgeBounds, {passive:true});
window.addEventListener('scroll', () => {badgeBoundsDirty=true;}, {passive:true});
hero.addEventListener('pointermove', event => {
  if (dragging || event.pointerType === 'touch' || !motionAllowed()) return;
  queueBadgePointer(event);
}, {passive:true});
hero.addEventListener('pointerleave', () => { if (!dragging) settleBadge(); });
badge.addEventListener('pointerdown', event => {
  if (!motionAllowed() || event.button !== 0 || dragging || event.isPrimary===false) return;
  if(badgeBoundsDirty)measureBadge();
  pointerPending=false;hoveringBadge=false;
  initialSway=false;
  originSwing=clamp(ribbon.angle,-bounds.maxSwing,bounds.maxSwing);
  ribbon.lag=clamp(ribbon.lag+pose.rz,-bounds.maxSwing,bounds.maxSwing)-pose.rz;
  ribbon.angle=originSwing;ribbon.velocity=0;
  Object.assign(targetPose,pose);
  for(const key of poseKeys)velocity[key]=0;
  originAngle=-Math.atan2(pose.x,bounds.top+bounds.height/2+pose.y)*180/Math.PI;
  dragging = true; pointerId = event.pointerId;
  const pointer=badgePointer(event.clientX,event.clientY);
  startX = pointer.x; startY = pointer.y; originX = pose.x; originY = pose.y;
  badge.classList.add('dragging'); badge.setPointerCapture(pointerId);
});
badge.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== pointerId) return;
  queueBadgePointer(event);
}, {passive:true});
function releaseBadge(event) {
  if (!dragging || (event?.pointerId!==undefined && event.pointerId!==pointerId)) return;
  dragging = false; badge.classList.remove('dragging');
  if (pointerId !== null && badge.hasPointerCapture(pointerId)) badge.releasePointerCapture(pointerId);
  pointerId = null; settleBadge();
}
['pointerup','pointercancel','lostpointercapture'].forEach(type => badge.addEventListener(type, releaseBadge));
badge.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const x = event.key === 'ArrowLeft' ? -55 : event.key === 'ArrowRight' ? 55 : 0;
  setPose({x,y:event.key === 'ArrowDown' ? 35 : event.key === 'ArrowUp' ? -20 : 0,rx:0,ry:x*.1,rz:x*.08});
});
badge.addEventListener('keyup', event => { if (event.key.startsWith('Arrow')) settleBadge(); });
badge.addEventListener('blur', () => { releaseBadge(); settleBadge(); });
window.addEventListener('blur', stopBadge);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopBadge(); else startInitialSway(); });
reducedMotion.addEventListener('change', () => { if (!motionAllowed()) stopBadge(); else startInitialSway(); });
new MutationObserver(() => { if (!motionAllowed() && (frame || dragging || poseKeys.some(key=>pose[key]!==restingPose[key]))) stopBadge(); }).observe(document.body, {attributes:true, attributeFilter:['class']});
new MutationObserver(() => { if (!motionAllowed() && (frame || dragging)) stopBadge(); else startInitialSway(); }).observe(hero, {attributes:true, attributeFilter:['class']});



// Two identical groups, each at least a viewport wide, make the -50% reset invisible.
const nameTrack = document.querySelector('.name-track');
const nameGroups = [...nameTrack.querySelectorAll('.name-group')];
function sizeNameLoop() {
  const word=nameGroups[0].firstElementChild;
  // The hero scales during scrolling; that visual scale must not change the
  // number of marquee copies when a phone resizes or finishes loading fonts.
  const wordWidth = touchBadge ? parseFloat(getComputedStyle(word).width) || word.offsetWidth : word.getBoundingClientRect().width;
  if (!wordWidth) return;
  const count = Math.max(2, Math.ceil(hero.clientWidth / wordWidth) + 1);
  if (nameGroups[0].childElementCount !== count) {
    nameGroups.forEach(group => {
      const words = Array.from({length:count}, () => {
        const word = document.createElement('span');
        word.textContent = 'SHUBHAM';
        return word;
      });
      group.replaceChildren(...words);
    });
  }
  // Preserve the existing speed: 30.4 seconds per word including its spacing.
  nameTrack.style.setProperty('--name-duration', `${count * 30.4}s`);
}
sizeNameLoop();
document.fonts.ready.then(sizeNameLoop);
new ResizeObserver(sizeNameLoop).observe(hero);
