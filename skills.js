// All skill holders share the hobby page's ordered animation clock.
import { requestHobbyFrame, cancelHobbyFrame, getSmoothPosition, advanceProgress } from './hobby-motion-clock.js';
import { sceneMotion, observeScene, setSkillExit } from './skills-hobbies-scene.js';

const section = document.querySelector('#about');
const stage = section?.querySelector('.skills-orbit-stage');
const slots = [...(stage?.querySelectorAll('.skills-orbit-slot') || [])];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const TAU = Math.PI * 2, joinAngle = -Math.PI * .75;
const entranceSpeed = 1.2;
const fastTime = 4 / entranceSpeed, blendTime = 1.8 / entranceSpeed, entranceDuration = fastTime + blendTime;
const resolution = 256;
let scheduled = 0, lastTime = null, measure = true;
let mode = 'waiting', entered = false, travel = 0, entranceTime = 0, retreat = null;
let orbitTime = 0, entranceRate = 1;
let handoff = null, exitLength = 1;
const exitPhase = Math.PI / 2;
const exitPoints = new Float64Array((resolution + 1) * 2);
let previousScroll = null;
let retreatRequested = false;
const reverseStart = .10, reverseEnd = .65;
let visible = false, pointerInside = false, focusInside = false;
let sectionTop = 0, sectionHeight = 0, centerX = 0, centerY = 0;
let radius = 1, size = 1, circumference = TAU, spacing = 1, entryLength = 1;
let cruiseSpeed = 1, fastSpeed = 1, entryPoints = new Float64Array((resolution + 1) * 2);
const orbitOffsets = slots.map((_, index) => {
  const angle = index * TAU / slots.length;
  return { cosine: Math.cos(angle), sine: Math.sin(angle) };
});
let lastDrawMode = null, lastDrawTravel = null, lastDrawRetreat = null, lastDrawExit = null;
let measuredWidth = -1, measuredHeight = -1, measuredSize = -1;
function bodyIsPaused() {
  const classes = document.body.classList;
  return classes.contains('motion-paused') || classes.contains('photography-gallery-open') || classes.contains('intro-active');
}
let bodyPaused = bodyIsPaused();
const clamp = value => Math.max(0, Math.min(1, value));
const wrap = value => ((value % circumference) + circumference) % circumference;

// The integrated velocity blend preserves speed at both the entrance and orbit joins.
function entranceDistance(time) {
  if (time <= fastTime) return time * fastSpeed;
  const u = clamp((time - fastTime) / blendTime);
  return fastTime * fastSpeed + blendTime *
    (fastSpeed * u + (cruiseSpeed - fastSpeed) * (u * u * u - .5 * u * u * u * u));
}
function retreatDistance() {
  const u = retreat.progress;
  return retreat.goal * u * u * (3 - 2 * u);
}
function distanceFor(index, retreatOffset = mode === 'retreat' ? retreatDistance() : 0) {
  if (mode === 'handoff') return handoff.slots[index] + handoff.progress * handoff.length;
  if (mode === 'retreat') return retreat.slots[index] - retreatOffset;
  if (mode === 'orbit') return entryLength + wrap(travel - entryLength - index * spacing);
  return travel - index * spacing;
}
function draw() {
  const retreatOffset = mode === 'retreat' ? retreatDistance() : 0;
  const exitOffset = mode === 'handoff' ? handoff.progress : 0;
  if (lastDrawMode === mode && lastDrawTravel === travel && lastDrawRetreat === retreatOffset && lastDrawExit === exitOffset) return;
  lastDrawMode = mode; lastDrawTravel = travel; lastDrawRetreat = retreatOffset; lastDrawExit = exitOffset;
  // A rigid circular orbit needs only one sine/cosine pair per frame.
  const orbiting = mode === 'orbit';
  const baseAngle = orbiting ? joinAngle - wrap(travel - entryLength) / radius : 0;
  const baseCosine = orbiting ? Math.cos(baseAngle) : 0;
  const baseSine = orbiting ? Math.sin(baseAngle) : 0;
  for (let index = 0; index < slots.length; index++) {
    // Settled holders share one phase; no per-holder modulo or path lookup.
    const slot = slots[index], distance = orbiting ? entryLength : distanceFor(index, retreatOffset);
    const exiting = mode === 'handoff' && distance >= handoff.ends[index];
    const showing = mode !== 'waiting' && distance >= 0 &&
      !(exiting && distance >= handoff.ends[index] + exitLength);
    const visibility = showing ? 'visible' : 'hidden';
    if (slot.orbitVisibility !== visibility) {
      slot.orbitVisibility = visibility;
      slot.style.visibility = visibility;
    }
    if (!showing) continue;
    let x, y;
    if (distance < entryLength || exiting) {
      const points = exiting ? exitPoints : entryPoints;
      const at = (exiting ? (distance - handoff.ends[index]) / exitLength : distance / entryLength) * resolution;
      const point = Math.min(resolution - 1, Math.floor(at)), mix = at - point;
      const offset = point * 2;
      x = points[offset] + (points[offset + 2] - points[offset]) * mix;
      y = points[offset + 1] + (points[offset + 3] - points[offset + 1]) * mix;
    } else if (orbiting) {
      const offset = orbitOffsets[index];
      x = centerX + radius * (baseCosine * offset.cosine - baseSine * offset.sine);
      y = centerY + radius * (baseSine * offset.cosine + baseCosine * offset.sine);
    } else {
      // One radius on both axes keeps the orbit a true circle at every screen size.
      const angle = joinAngle - (distance - entryLength) / radius;
      x = centerX + radius * Math.cos(angle);
      y = centerY + radius * Math.sin(angle);
    }
    const transform = 'translate3d(' + (x - size / 2).toFixed(3) + 'px,' +
      (y - size / 2).toFixed(3) + 'px,0)';
    if (slot.orbitTransform !== transform) {
      slot.orbitTransform = transform;
      slot.style.transform = transform;
    }
  }
}
function layout() {
  measure = false;
  const oldEntry = entryLength, oldCircle = circumference;
  const width = stage.clientWidth, height = stage.clientHeight;
  const nextSize = slots[0].offsetWidth;
  // Refresh the normal document position even when only the hero height changed.
  const wrapper = section.closest('.hero-skills-transition');
  if (sceneMotion.element) sectionTop = sceneMotion.element.getBoundingClientRect().top + window.scrollY;
  else if (wrapper) sectionTop = wrapper.getBoundingClientRect().top + window.scrollY +
    document.querySelector('#home').offsetHeight;
  else sectionTop = section.getBoundingClientRect().top + window.scrollY;
  sectionHeight = sceneMotion.enabled ? sceneMotion.element.offsetHeight : section.offsetHeight;
  if (width === measuredWidth && height === measuredHeight && nextSize === measuredSize) return;
  measuredWidth = width; measuredHeight = height; measuredSize = nextSize;
  lastDrawMode = null;
  size = nextSize;
  centerX = width / 2; centerY = height / 2;
  radius = Math.max(1, Math.min((width - size - 32) / 2, (height - size - 80) / 2, 320));
  circumference = TAU * radius; spacing = circumference / slots.length;
  const end = [centerX + Math.cos(joinAngle) * radius, centerY + Math.sin(joinAngle) * radius];
  const points = [
    [centerX + radius * .15, -size - 40],
    [centerX + radius * .1, centerY - radius - 80],
    [end[0] + radius * .45, end[1] - radius * .45],
    end
  ];
  // Bake only the approach curve. Its final tangent matches the circular orbit.
  const samples = []; let length = 0;
  for (let index = 0; index <= resolution; index++) {
    const t = index / resolution, u = 1 - t;
    const point = [0, 1].map(axis => u * u * u * points[0][axis] +
      3 * u * u * t * points[1][axis] + 3 * u * t * t * points[2][axis] + t * t * t * points[3][axis]);
    if (index) length += Math.hypot(point[0] - samples[index - 1].x, point[1] - samples[index - 1].y);
    samples.push({ x: point[0], y: point[1], distance: length });
  }
  entryLength = length;
  let cursor = 0;
  for (let index = 0; index <= resolution; index++) {
    const distance = index / resolution * entryLength;
    while (cursor < resolution - 1 && samples[cursor + 1].distance < distance) cursor++;
    const a = samples[cursor], b = samples[cursor + 1];
    const mix = (distance - a.distance) / Math.max(.0001, b.distance - a.distance);
    entryPoints[index * 2] = a.x + (b.x - a.x) * mix;
    entryPoints[index * 2 + 1] = a.y + (b.y - a.y) * mix;
  }
  // Peel off at the lower-left tangent, through the same outlet the models use.
  const exitAngle = joinAngle - exitPhase;
  const start = [centerX + radius * Math.cos(exitAngle), centerY + radius * Math.sin(exitAngle)];
  const outlet = [width * .45, height + 128];
  const departure = [start, [start[0] + radius * .45, start[1] + radius * .45],
    [outlet[0], height - size], outlet];
  const exitSamples = []; let exitDistance = 0;
  for (let index = 0; index <= resolution; index++) {
    const t = index / resolution, u = 1 - t;
    const x = u*u*u*departure[0][0] + 3*u*u*t*departure[1][0] + 3*u*t*t*departure[2][0] + t*t*t*departure[3][0];
    const y = u*u*u*departure[0][1] + 3*u*u*t*departure[1][1] + 3*u*t*t*departure[2][1] + t*t*t*departure[3][1];
    if (index) exitDistance += Math.hypot(x-exitSamples[index-1].x, y-exitSamples[index-1].y);
    exitSamples.push({x,y,distance:exitDistance});
  }
  exitLength = exitDistance; cursor = 0;
  for (let index = 0; index <= resolution; index++) {
    const distance = index / resolution * exitLength;
    while (cursor < resolution-1 && exitSamples[cursor+1].distance < distance) cursor++;
    const a = exitSamples[cursor], b = exitSamples[cursor+1];
    const mix = (distance-a.distance) / Math.max(.0001,b.distance-a.distance);
    exitPoints[index*2] = a.x+(b.x-a.x)*mix; exitPoints[index*2+1] = a.y+(b.y-a.y)*mix;
  }
  cruiseSpeed = circumference / 34;
  fastSpeed = (entryLength + circumference - cruiseSpeed * blendTime / 2) / (fastTime + blendTime / 2);
  const remap = distance => distance < oldEntry ? distance / oldEntry * entryLength :
    entryLength + (distance - oldEntry) / oldCircle * circumference;
  if (mode === 'orbit') travel = remap(travel);
  else if (mode === 'entrance') travel = entranceDistance(entranceTime);
  else if (retreat) {
    retreat.slots = retreat.slots.map(remap);
    retreat.goal = Math.max(0, ...retreat.slots) + size;
    travel = retreat.resumeMode === 'orbit' ? remap(travel) : entranceDistance(entranceTime);
  } else if (handoff) {
    handoff.slots = handoff.slots.map(remap); handoff.ends = handoff.ends.map(remap);
    handoff.length = Math.max(...handoff.ends.map((end,index) => end-handoff.slots[index])) + exitLength;
    travel = handoff.resumeMode === 'orbit' ? remap(travel) : entranceDistance(entranceTime);
  }
  section.style.setProperty('--skills-ring-radius', radius.toFixed(2) + 'px');
  section.classList.add('skills-orbit-ready');
}
function beginHandoff() {
  const distances = slots.map((_, index) => distanceFor(index));
  const exitAt = exitPhase * radius;
  const ends = distances.map(distance => distance < entryLength ? entryLength + exitAt :
    distance + wrap(exitAt - wrap(distance - entryLength)));
  const length = Math.max(...ends.map((end,index) => end-distances[index])) + exitLength;
  handoff = { slots: distances, ends, length, progress: 0, value: 0, velocity: 0, resumeMode: mode };
  pointerInside = focusInside = false;
  mode = 'handoff';
}
function beginRetreat() {
  const distances = slots.map((_, index) => distanceFor(index));
  const goal = Math.max(0, ...distances) + size;
  // Capture the current orbit phase so either scroll direction resumes without a jump.
  retreat = { slots: distances, progress: 0, value: 0, velocity: 0, goal, resumeMode: mode };
  mode = 'retreat';
}
function stop() {
  cancelHobbyFrame(tick); scheduled = 0; lastTime = null;
  if (section.classList.contains('skills-orbit-running')) section.classList.remove('skills-orbit-running');
}
function tick(time) {
  scheduled = 0;
  if (document.hidden) { stop(); return; }
  if (measure) layout();
  const scroll = getSmoothPosition(), top = sectionTop - scroll;
  const scrollingBack = previousScroll !== null && scroll < previousScroll - .1;
  previousScroll = scroll;
  visible = top < innerHeight && scroll < sectionTop + sectionHeight;
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .05);
  lastTime = time;
  // Start at 50% viewport coverage; keep the same reverse-trigger buffer.
  if (top <= innerHeight * .50) entered = true;
  else if (top >= innerHeight * .62) entered = false;
  // Remember an upward request while the downstream stages return. Otherwise
  // finishing the handoff after the wheel stops could strand the ring onscreen.
  if (top <= innerHeight * reverseStart) retreatRequested = false;
  else if (scrollingBack || !entered) retreatRequested = true;
  let paused = pointerInside || focusInside || bodyPaused;
  const reverseTarget = clamp((top / innerHeight - reverseStart) / (reverseEnd - reverseStart));
  if (reduced.matches) {
    mode = 'orbit'; travel = entryLength + circumference; retreat = handoff = null;
  } else {
    if (mode === 'handoff' && (!sceneMotion.enabled || (sceneMotion.exit === 0 && handoff.progress === 0))) {
      mode = handoff.resumeMode; handoff = null;
    }
    // Finish the entire train's approach before capturing an exit path. In
    // particular, never capture holders still above the page or in its middle.
    if (sceneMotion.enabled && sceneMotion.exit > 0 && mode === 'orbit' && orbitTime >= .25) beginHandoff();
    if (entered && mode === 'waiting') { mode = 'entrance'; entranceTime = travel = orbitTime = 0; entranceRate = 1; retreatRequested = false; }
    else if ((mode === 'entrance' || mode === 'orbit') &&
      retreatRequested) beginRetreat();
    // Hover still pauses the settled ring, but cannot block an exit caused by scrolling.
    if (mode === 'retreat' || mode === 'handoff' || (sceneMotion.enabled && sceneMotion.exit > 0)) paused = bodyPaused;
    if (!visible && !entered) { mode = 'waiting'; travel = entranceTime = orbitTime = 0; retreat = handoff = null; }
    else if (!visible && scroll >= sectionTop + sectionHeight && mode === 'entrance') {
      mode = 'orbit'; travel = entryLength + circumference; entranceTime = entranceDuration; orbitTime = .25;
      if (sceneMotion.enabled) { beginHandoff(); handoff.progress = handoff.value = sceneMotion.exit; }
    } else if (!visible && scroll >= sectionTop + sectionHeight && mode === 'handoff') {
      handoff.progress = handoff.value = sceneMotion.exit; handoff.velocity = 0;
    } else if (visible && !paused) {
      if (mode === 'entrance') {
        // Catch up gently if the scroll has already requested departure. Normal
        // entry timing stays unchanged; a skipped target still forms the circle.
        const rateTarget = sceneMotion.enabled && sceneMotion.exit > 0 && entranceTime < fastTime ? 1.35 : 1;
        entranceRate += (rateTarget - entranceRate) * (1 - Math.exp(-8 * dt));
        const consumed = Math.min(dt * entranceRate, entranceDuration - entranceTime);
        entranceTime += consumed; travel = entranceDistance(entranceTime);
        if (entranceTime >= entranceDuration) {
          mode = 'orbit'; orbitTime = Math.max(0, dt - consumed / entranceRate);
          travel += cruiseSpeed * orbitTime;
        }
      } else if (mode === 'orbit') { travel += cruiseSpeed * dt; orbitTime += dt; }
      else if (mode === 'retreat') {
        // Scrub the return path with scrolling, smoothing input without a timed exit.
        retreat.progress = advanceProgress(retreat, reverseTarget, dt, 1.8);
        if (reverseTarget === 0 && retreat.progress === 0) { mode = retreat.resumeMode; retreat = null; }
        else if (retreat.progress === 1) {
          mode = 'waiting'; travel = entranceTime = orbitTime = 0; retreat = null;
        }
      } else if (mode === 'handoff') {
        // On return, let the models use the shared outlet before skills enter it.
        const returnFloor = sceneMotion.modelArrival > 0 ? .78 + .22 * sceneMotion.modelArrival : 0;
        const target = Math.max(sceneMotion.exit, returnFloor);
        handoff.progress = advanceProgress(handoff, target, dt);
      }
    }
  }
  setSkillExit(mode === 'handoff' ? handoff.progress : 0);
  draw();
  const retreatMoving = mode === 'retreat' && (retreat.progress !== reverseTarget || retreat.velocity !== 0);
  const running = visible && !paused && !reduced.matches && mode !== 'waiting' &&
    (mode !== 'retreat' || retreatMoving) &&
    (mode !== 'handoff' || handoff.velocity !== 0 || handoff.progress !== Math.max(sceneMotion.exit,
      sceneMotion.modelArrival > 0 ? .78 + .22 * sceneMotion.modelArrival : 0));
  if (section.classList.contains('skills-orbit-running') !== running) section.classList.toggle('skills-orbit-running', running);
  if (running) scheduled = requestHobbyFrame(tick, 15);
  else stop();
}
function wake() {
  if (!scheduled && !document.hidden) scheduled = requestHobbyFrame(tick, 15);
}
function resize() { measure = true; wake(); }
function visibilityChanged() { if (document.hidden) stop(); else wake(); }
function pointerEnter() { pointerInside = true; wake(); }
function pointerLeave() { pointerInside = false; wake(); }
function focusIn() { focusInside = true; wake(); }
function focusOut(event) { focusInside = stage.contains(event.relatedTarget); wake(); }
if (slots.length) {
  // The existing logos remain usable until the small React island and its scoped styles are ready.
  let disposeIcons=null,disposed=false;
  const iconObserver=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    iconObserver.disconnect();
    import('./assets/ui/skills-icons.js').then(({mountSkillsIcons})=>disposed?null:mountSkillsIcons(section))
      .then(dispose=>{if(disposed)dispose?.();else disposeIcons=dispose;})
      .catch(error=>console.error('Shiny skill icons could not load; keeping the native icons.',error));
  },{rootMargin:'350px 0px'});
  iconObserver.observe(section);
  const unobserveScene = observeScene(wake);
  const pointerOver = event => {
    if (event.target.closest('.skills-orbit-disc')) pointerEnter();
  };
  const pointerOut = event => {
    if (!event.relatedTarget?.closest?.('.skills-orbit-disc')) pointerLeave();
  };
  stage.addEventListener('pointerover', pointerOver);
  stage.addEventListener('pointerout', pointerOut);
  stage.addEventListener('focusin', focusIn);
  stage.addEventListener('focusout', focusOut);
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('load', resize, { once: true });
  reduced.addEventListener('change', wake);
  document.addEventListener('visibilitychange', visibilityChanged);
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  const hero = document.querySelector('#home'); if (hero) observer.observe(hero);
  const bodyObserver = new MutationObserver(() => {
    const next = bodyIsPaused();
    if (next !== bodyPaused) { bodyPaused = next; wake(); }
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.fonts?.ready.then(resize);
  window.addEventListener('pagehide', event => {
    stop();
    if (event.persisted) return;
    disposed=true;
    iconObserver.disconnect();disposeIcons?.();
    observer.disconnect(); bodyObserver.disconnect(); unobserveScene();
    window.removeEventListener('scroll', wake);
    window.removeEventListener('resize', resize);
    window.removeEventListener('load', resize);
    window.removeEventListener('pageshow', resize);
    stage.removeEventListener('pointerover', pointerOver);
    stage.removeEventListener('pointerout', pointerOut);
    stage.removeEventListener('focusin', focusIn);
    stage.removeEventListener('focusout', focusOut);
    reduced.removeEventListener('change', wake);
    document.removeEventListener('visibilitychange', visibilityChanged);
  });
  window.addEventListener('pageshow', resize);
  wake();
}
