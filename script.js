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
const pose = {x:0, y:0, rx:0, ry:0, rz:0, z:0, light:0};
const targetPose = {...pose};
const velocity = {...pose};
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
  rig.style.transform = `translateX(-50%) perspective(1200px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${swing}deg)`;
  badge.style.setProperty('--glare-x', `${50 + pose.ry * 2.5}%`);
  badge.style.setProperty('--glare-y', `${50 - pose.rx * 2.5}%`);
  badge.style.setProperty('--glare-opacity', pose.light);
  badge.style.setProperty('--ticket-pattern-x', `${pose.ry * -0.7}px`);
  badge.style.setProperty('--ticket-pattern-y', `${pose.rx * 0.7}px`);
  badge.style.setProperty('--edge-x',(-pose.ry*.32).toFixed(2)+'px');
  badge.style.setProperty('--edge-y',(3+pose.rx*.2).toFixed(2)+'px');
  strap.style.setProperty('--strap-light',clamp(.18+pose.ry*.014,.04,.34).toFixed(3));
  // A bowed ribbon keeps both attachment points fixed while its middle flexes.
  const bend=ribbon.bend;
  ribbonSegments.forEach((segment,index)=>{
    const start=ribbonWeights[index]*bend;
    const end=ribbonWeights[index+1]*bend;
    const skew=Math.atan2(end-start,bounds.strapLength/8)*180/Math.PI;
    segment.style.transform=`translateX(${start.toFixed(3)}px) skewX(${skew.toFixed(3)}deg)`;
  });

}
function animateBadge(time) {
  if (!motionAllowed()) { stopBadge(); return; }
  const elapsed = Math.min((time - (lastTime || time - 16.67)) / 1000, .05);
  const steps = Math.max(1,Math.ceil(elapsed/(1/120)));
  const dt = elapsed/steps;
  lastTime = time;
  let unsettled = false;
  for (const key of poseKeys) {
    for(let step=0;step<steps;step++){
      // Firm grip while dragging; a lightly damped pendulum when released.
      const stiffness=key==='light'?100:dragging?150:60;
      const damping=key==='light'?20:dragging?23:11;
      const acceleration = (targetPose[key] - pose[key]) * stiffness - velocity[key] * damping;
      velocity[key] += acceleration * dt;
      pose[key] += velocity[key] * dt;
    }
    if (Math.abs(targetPose[key] - pose[key]) > .015 || Math.abs(velocity[key]) > .015) unsettled = true;
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
  if (!motionAllowed()) { stopBadge(); return; }
  if (!frame) { rig.classList.add('is-moving'); frame = requestAnimationFrame(animateBadge); }
}
function stopBadge() {
  cancelAnimationFrame(frame); frame = 0; lastTime = 0;
  for (const key of Object.keys(pose)) pose[key] = targetPose[key] = velocity[key] = 0;
  badge.style.transform = ''; badgeShell.style.transform=''; strap.style.transform = ''; badge.style.setProperty('--glare-opacity', 0);
  rig.style.transform='';rig.classList.remove('is-moving');
  ribbon.bend=0;ribbon.velocity=0;ribbonSegments.forEach(segment=>segment.style.transform='');
  badge.style.removeProperty('--edge-x');badge.style.removeProperty('--edge-y');
  badge.classList.remove('is-moving', 'dragging');
  strap.classList.remove('is-moving');
  strap.style.removeProperty('--strap-light');
  dragging = false;
  if (pointerId !== null && badge.hasPointerCapture(pointerId)) badge.releasePointerCapture(pointerId);
  pointerId = null;
}
function settleBadge() { setPose({x:0,y:0,rx:0,ry:0,rz:0,z:0,light:0}); }
measureBadge();
new ResizeObserver(measureBadge).observe(rig);
rig.addEventListener('badge-entrance-complete', measureBadge);
window.addEventListener('resize', measureBadge, {passive:true});
window.addEventListener('scroll', () => {badgeBoundsDirty=true;}, {passive:true});
hero.addEventListener('pointermove', event => {
  if (dragging || event.pointerType === 'touch' || !motionAllowed()) return;
  if(badgeBoundsDirty)measureBadge();
  const nx = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
  const ny = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
  // Use the stationary layout rectangle so transformed edges cannot cause hover jitter.
  const hovering = Math.abs(nx) <= 2.2 && ny <= 1.5 && event.clientY >= bounds.top-bounds.strapLength;
  if (!hovering) { settleBadge(); return; }
  setPose({x:clamp(nx,-1,1)*7, y:clamp(ny,-1,1)*2,
    rx:-clamp(ny,-1,1)*4, ry:clamp(nx,-1,1)*8, rz:clamp(nx,-1,1)*1.2,
    z:0, light:.12});
}, {passive:true});
hero.addEventListener('pointerleave', () => { if (!dragging) settleBadge(); });
badge.addEventListener('pointerdown', event => {
  if (!motionAllowed() || event.button !== 0) return;
  if(badgeBoundsDirty)measureBadge();
  dragging = true; pointerId = event.pointerId;
  startX = event.clientX; startY = event.clientY; originX = pose.x; originY = pose.y;
  badge.classList.add('dragging'); badge.setPointerCapture(pointerId);
});
badge.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== pointerId) return;
  const x = clamp(originX + (event.clientX - startX)*.6, -85, 85);
  const y = clamp(originY + (event.clientY - startY)*.4, -24, 40);
  setPose({x,y,rx:-y*.13,ry:x*.16,rz:0,z:0,light:.16});
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
new MutationObserver(() => { if (!motionAllowed()) stopBadge(); }).observe(document.body, {attributes:true, attributeFilter:['class']});
new MutationObserver(() => { if (!motionAllowed() && (frame || dragging)) stopBadge(); }).observe(hero, {attributes:true, attributeFilter:['class']});
document.querySelector('#year').textContent = new Date().getFullYear();



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
