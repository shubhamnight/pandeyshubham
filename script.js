const badge = document.querySelector('.badge');
const strap = document.querySelector('.strap');
const rig = document.querySelector('.badge-rig');
const badgeShell = document.createElement('div');
badgeShell.className = 'badge-shell';
badgeShell.setAttribute('aria-hidden','true');
for(let depth=1;depth<=5;depth++){
  const layer=document.createElement('span');
  layer.style.transform=`translateZ(-${depth}px)`;
  badgeShell.append(layer);
}
rig.insertBefore(badgeShell,badge);
const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const restingPose = {x:0, y:0, rx:0, ry:0, rz:0, z:0, light:0, scale:1};
const pose = {...restingPose};
const targetPose = {...pose};
const velocity = Object.fromEntries(Object.keys(pose).map(key=>[key,0]));
const poseKeys = Object.keys(pose);
const ribbon = {bend:0,velocity:0};
const ribbonWeights=Array.from({length:9},(_,index)=>Math.sin(index*Math.PI/8));
const ribbonSegments=Array.from({length:8},(_,index)=>{
  const segment=document.createElement('span');
  segment.className='strap-segment';
  segment.style.top=(index*12.5)+'%';
  strap.append(segment);return segment;
});
strap.classList.add('is-flexible');
let frame = 0, lastTime = 0, dragging = false, pointerId = null;
let startX = 0, startY = 0, originX = 0, originY = 0;
let bounds;
let badgeBoundsDirty=true;
let hoveringBadge=false, pointerPending=false;
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
  badgeBoundsDirty=false;
  const rect = hero.getBoundingClientRect();
  bounds = {left:rect.left+rect.width/2-badge.offsetWidth/2, top:rect.top + badge.offsetTop, width:badge.offsetWidth, height:badge.offsetHeight, strapLength:strap.offsetHeight};
  badgeShell.style.top=badge.offsetTop+'px';
  badgeShell.style.width=bounds.width+'px';
  badgeShell.style.height=bounds.height+'px';
}
function paintBadge() {
  // One transform keeps the ribbon, slot, face and rim rigidly attached.
  const suspensionLength=bounds.strapLength+bounds.height*.45;
  const swing=pose.rz-Math.atan2(pose.x,Math.max(1,suspensionLength))*180/Math.PI;
  writeBadgeStyle(rig,'transform',`translateX(-50%) perspective(1000px) rotateX(${pose.rx.toFixed(3)}deg) rotateY(${pose.ry.toFixed(3)}deg) rotateZ(${swing.toFixed(3)}deg) scale3d(${pose.scale.toFixed(4)},${pose.scale.toFixed(4)},${pose.scale.toFixed(4)})`);
  writeBadgeStyle(badge,'--glare-x',`${(50 + pose.ry * 2.5).toFixed(2)}%`);
  writeBadgeStyle(badge,'--glare-y',`${(50 - pose.rx * 2.5).toFixed(2)}%`);
  writeBadgeStyle(badge,'--glare-opacity',pose.light.toFixed(3));
  writeBadgeStyle(badge,'--ticket-pattern-x',`${(pose.ry * -.7).toFixed(2)}px`);
  writeBadgeStyle(badge,'--ticket-pattern-y',`${(pose.rx * .7).toFixed(2)}px`);
  writeBadgeStyle(badge,'--edge-x',(-pose.ry*.32).toFixed(2)+'px');
  writeBadgeStyle(badge,'--edge-y',(3+pose.rx*.2).toFixed(2)+'px');
  // The supplied tilt card's directional shadow follows the same smoothed pose.
  writeBadgeStyle(badge,'--tilt-shadow-x',(pose.ry*.5).toFixed(2)+'px');
  writeBadgeStyle(badge,'--tilt-shadow-y',(pose.rx*.5).toFixed(2)+'px');
  writeBadgeStyle(badge,'--tilt-shadow-blur',(40+Math.abs(pose.rx+pose.ry)*.5).toFixed(2)+'px');
  writeBadgeStyle(strap,'--strap-light',clamp(.18+pose.ry*.014,.04,.34).toFixed(3));
  // A bowed ribbon keeps both attachment points fixed while its middle flexes.
  const bend=ribbon.bend;
  ribbonSegments.forEach((segment,index)=>{
    const start=ribbonWeights[index]*bend;
    const end=ribbonWeights[index+1]*bend;
    const skew=Math.atan2(end-start,bounds.strapLength/8)*180/Math.PI;
    writeBadgeStyle(segment,'transform',`translateX(${start.toFixed(3)}px) skewX(${skew.toFixed(3)}deg)`);
  });

}
function animateBadge(time) {
  if (!motionAllowed()) { stopBadge(); return; }
  // Consume only the newest pointer sample, with layout reads before any paint writes.
  if(badgeBoundsDirty)measureBadge();
  if(pointerPending){
    pointerPending=false;
    if(dragging){
      const x=clamp(originX+(latestPointer.x-startX)*.6,-85,85);
      const y=clamp(originY+(latestPointer.y-startY)*.4,-24,40);
      Object.assign(targetPose,{x,y,rx:-y*.13,ry:x*.16,rz:0,z:0,light:.16,scale:1.02});
    }else{
      const nx=(latestPointer.x-bounds.left-bounds.width/2)/(bounds.width/2);
      const ny=(latestPointer.y-bounds.top-bounds.height/2)/(bounds.height/2);
      hoveringBadge=Math.abs(nx)<=2.2&&ny<=1.5&&latestPointer.y>=bounds.top-bounds.strapLength;
      if(hoveringBadge)Object.assign(targetPose,{x:clamp(nx,-1,1)*7,y:clamp(ny,-1,1)*2,
        rx:-clamp(ny,-1,1)*15,ry:clamp(nx,-1,1)*15,rz:clamp(nx,-1,1)*1.2,
        z:0,light:.12,scale:1.02});
      else Object.assign(targetPose,restingPose);
    }
  }
  const elapsed = Math.min((time - (lastTime || time - 16.67)) / 1000, .05);
  const steps = Math.max(1,Math.ceil(elapsed/(1/120)));
  const dt = elapsed/steps;
  lastTime = time;
  let unsettled = false;
  for (const key of poseKeys) {
    for(let step=0;step<steps;step++){
      // Firm grip while dragging; a lightly damped pendulum when released.
      const stiffness=key==='light'?100:key==='scale'?180:dragging?150:hoveringBadge?180:60;
      const damping=key==='light'?20:key==='scale'?26:dragging?23:hoveringBadge?26:11;
      const acceleration = (targetPose[key] - pose[key]) * stiffness - velocity[key] * damping;
      velocity[key] += acceleration * dt;
      pose[key] += velocity[key] * dt;
    }
    const threshold=key==='scale'?.0002:.015;
    if (Math.abs(targetPose[key] - pose[key]) > threshold || Math.abs(velocity[key]) > threshold) unsettled = true;
  }
  const ribbonTarget=clamp(-velocity.x*.025-velocity.ry*.05,-5,5);
  for(let step=0;step<steps;step++){
    ribbon.velocity+=((ribbonTarget-ribbon.bend)*100-ribbon.velocity*14)*dt;
    ribbon.bend+=ribbon.velocity*dt;
  }
  if(Math.abs(ribbon.bend)>.015||Math.abs(ribbon.velocity)>.015)unsettled=true;
  if (unsettled) { paintBadge(); frame = requestAnimationFrame(animateBadge); }
  else { Object.assign(pose, targetPose); paintBadge(); frame = 0; lastTime = 0; rig.classList.remove('is-moving'); }
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
  if(!frame&&!dragging&&!hoveringBadge&&!badgeBoundsDirty&&
    (event.clientX<bounds.left-bounds.width*.6||event.clientX>bounds.left+bounds.width*1.6||
      event.clientY<bounds.top-bounds.strapLength||event.clientY>bounds.top+bounds.height*1.25))return;
  latestPointer.x=event.clientX;latestPointer.y=event.clientY;pointerPending=true;
  requestBadgeFrame();
}
function stopBadge() {
  cancelAnimationFrame(frame); frame = 0; lastTime = 0;
  for (const key of poseKeys){pose[key]=targetPose[key]=restingPose[key];velocity[key]=0;}
  hoveringBadge=false;pointerPending=false;
  badge.style.transform = ''; badgeShell.style.transform=''; strap.style.transform = ''; badge.style.setProperty('--glare-opacity', 0);
  rig.style.transform='';rig.classList.remove('is-moving');
  ribbon.bend=0;ribbon.velocity=0;ribbonSegments.forEach(segment=>{segment.style.transform='';paintedStyles.delete(segment);});
  ['--edge-x','--edge-y','--tilt-shadow-x','--tilt-shadow-y','--tilt-shadow-blur',
    '--ticket-pattern-x','--ticket-pattern-y','--glare-x','--glare-y'].forEach(property=>badge.style.removeProperty(property));
  [rig,badge,strap].forEach(element=>paintedStyles.delete(element));
  badge.classList.remove('is-moving', 'dragging');
  strap.classList.remove('is-moving');
  strap.style.removeProperty('--strap-light');
  dragging = false;
  if (pointerId !== null && badge.hasPointerCapture(pointerId)) badge.releasePointerCapture(pointerId);
  pointerId = null;
}
function settleBadge() { hoveringBadge=false;pointerPending=false;setPose(restingPose); }
measureBadge();
function invalidateBadgeBounds(){badgeBoundsDirty=true;if(hoveringBadge){pointerPending=true;requestBadgeFrame();}}
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
  if (!motionAllowed() || event.button !== 0) return;
  if(badgeBoundsDirty)measureBadge();
  pointerPending=false;hoveringBadge=false;
  dragging = true; pointerId = event.pointerId;
  startX = event.clientX; startY = event.clientY; originX = pose.x; originY = pose.y;
  badge.classList.add('dragging'); badge.setPointerCapture(pointerId);
});
badge.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== pointerId) return;
  queueBadgePointer(event);
}, {passive:true});
function releaseBadge() {
  if (!dragging) return;
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
document.addEventListener('visibilitychange', () => { if (document.hidden) stopBadge(); });
reducedMotion.addEventListener('change', () => { if (!motionAllowed()) stopBadge(); });
new MutationObserver(() => { if (!motionAllowed() && (frame || dragging || poseKeys.some(key=>pose[key]!==restingPose[key]))) stopBadge(); }).observe(document.body, {attributes:true, attributeFilter:['class']});
new MutationObserver(() => { if (!motionAllowed() && (frame || dragging)) stopBadge(); }).observe(hero, {attributes:true, attributeFilter:['class']});



// Two identical groups, each at least a viewport wide, make the -50% reset invisible.
const nameTrack = document.querySelector('.name-track');
const nameGroups = [...nameTrack.querySelectorAll('.name-group')];
function sizeNameLoop() {
  const wordWidth = nameGroups[0].firstElementChild.getBoundingClientRect().width;
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
