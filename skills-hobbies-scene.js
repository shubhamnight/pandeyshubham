// One pinned stage and scroll timeline for the skills-to-hobbies handoff.
import { requestHobbyFrame, cancelHobbyFrame, getSmoothPosition, clampMotionProgress as clamp } from './hobby-motion-clock.js';

const skills = document.querySelector('#about');
const hobbies = document.querySelector('#projects');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set();
const ease = value => value * value * (3 - 2 * value);
// Only the idle holds shrink. Each moving stage keeps its original scroll span.
const idleScrollScale = .4;
const afterSkillsIdleScale = .85;
const skillsHoldScale = 1.15;
const hobbiesHoldScale = 1.10 * 1.25 * 1.10 * 1.10;
// The two latest +10% requests add page-height scroll, rather than multiplying
// the short existing hold (which added only a few pixels per request).
const extraHobbiesEndScroll = .10 + .10;
const timeline = {
  skillsHold: .90 * idleScrollScale * skillsHoldScale,
  skillsExit: .90,
  entryOverlap: .20,
  modelEntry: .55,
  modelOrbitHold: .30 * idleScrollScale * afterSkillsIdleScale,
  modelSpread: .40,
  hobbiesHold: .35 * idleScrollScale * afterSkillsIdleScale * hobbiesHoldScale + extraHobbiesEndScroll
};
const exitStart = timeline.skillsHold;
const modelStart = exitStart + timeline.skillsExit - timeline.entryOverlap;
const spreadStart = modelStart + timeline.modelEntry + timeline.modelOrbitHold;
const modelsAtHome = spreadStart + timeline.modelSpread;
const scrollLength = 1 + modelsAtHome + timeline.hobbiesHold;
export const sceneMotion = {
  element: null, viewport: null, enabled: false, visible: false,
  top: 0, height: 1, stageHeight: 1, advance: 0, exit: 0,
  modelEntry: 0, spread: 0, skillExit: 0, modelArrival: 0, modelSpread: 0, outletX: 0, outletY: 0
};
export function observeScene(callback) { listeners.add(callback); return () => listeners.delete(callback); }
export function setSkillExit(value) {
  if (sceneMotion.skillExit === value) return;
  sceneMotion.skillExit = value;
  wake();
}
export function setModelProgress(arrival, spread) {
  if (sceneMotion.modelArrival === arrival && sceneMotion.modelSpread === spread) return;
  sceneMotion.modelArrival = arrival; sceneMotion.modelSpread = spread;
  wake();
}
export function sceneAnchorPosition(hash) {
  if (!sceneMotion.enabled || (hash !== '#about' && hash !== '#projects')) return null;
  const top = sceneMotion.element.getBoundingClientRect().top + window.scrollY;
  return top + (hash === '#projects' ? sceneMotion.stageHeight * modelsAtHome : 0);
}
let frame = 0, measure = true, previous = '', previousSkillsInert = null, previousHobbiesInert = null;
let previousSkillsCopy = null, previousHobbiesCopy = null;

function update() {
  cancelHobbyFrame(update); frame = 0;
  const { element, viewport } = sceneMotion;
  if (!element || document.hidden) return;
  if (measure) {
    measure = false;
    sceneMotion.top = element.getBoundingClientRect().top + window.scrollY;
    sceneMotion.height = element.offsetHeight;
    sceneMotion.stageHeight = Math.max(1, viewport.offsetHeight);
    sceneMotion.outletX = viewport.clientWidth * .45;
    sceneMotion.outletY = sceneMotion.stageHeight + 128;
    element.style.setProperty('--scene-sticky-top', Math.min(0, innerHeight - sceneMotion.stageHeight) + 'px');
  }
  const local = getSmoothPosition() - sceneMotion.top;
  sceneMotion.advance = Math.max(0, local / sceneMotion.stageHeight);
  sceneMotion.visible = local > -innerHeight && local < sceneMotion.height;
  // Leave room to see the circle before releasing the skills, then the model orbit.
  sceneMotion.exit = clamp((sceneMotion.advance - exitStart) / timeline.skillsExit);
  sceneMotion.modelEntry = clamp((sceneMotion.advance - modelStart) / timeline.modelEntry);
  sceneMotion.spread = clamp((sceneMotion.advance - spreadStart) / timeline.modelSpread);
  const key = [sceneMotion.enabled, sceneMotion.visible, sceneMotion.exit, sceneMotion.modelEntry, sceneMotion.spread,
    sceneMotion.skillExit, sceneMotion.modelArrival, sceneMotion.modelSpread,
    sceneMotion.stageHeight, sceneMotion.outletX].join(':');
  if (key === previous) return;
  previous = key;
  if (sceneMotion.enabled) {
    // Copy and interaction follow the rendered sequence, not a scroll target
    // that may have skipped several stages in a single wheel event.
    const skillsCopy = 1 - ease(clamp((sceneMotion.skillExit - .55) / .30));
    const hobbiesCopy = ease(clamp((sceneMotion.modelArrival - .40) / .60));
    if (skillsCopy !== previousSkillsCopy) { element.style.setProperty('--scene-skills-copy', skillsCopy); previousSkillsCopy = skillsCopy; }
    if (hobbiesCopy !== previousHobbiesCopy) { element.style.setProperty('--scene-hobbies-copy', hobbiesCopy); previousHobbiesCopy = hobbiesCopy; }
    const skillsInert = sceneMotion.skillExit > 0 || !sceneMotion.visible;
    const hobbiesInert = sceneMotion.modelSpread < 1 || !sceneMotion.visible;
    if (skillsInert !== previousSkillsInert) { skills.inert = skillsInert; previousSkillsInert = skillsInert; }
    if (hobbiesInert !== previousHobbiesInert) { hobbies.inert = hobbiesInert; previousHobbiesInert = hobbiesInert; }
  } else {
    skills.inert = hobbies.inert = false;
    previousSkillsInert = previousHobbiesInert = null;
  }
  listeners.forEach(callback => callback());
}
function wake() { if (!frame && !document.hidden) frame = requestHobbyFrame(update, 14); }
function resize() { measure = true; previous = ''; wake(); }
function preferenceChanged() {
  sceneMotion.enabled = !reduced.matches;
  sceneMotion.element.classList.toggle('scene-pinned', sceneMotion.enabled);
  resize();
}
if (skills && hobbies) {
  const element = document.createElement('div');
  element.className = 'skills-hobbies-scene';
  element.style.setProperty('--scene-scroll-length', scrollLength);
  const viewport = document.createElement('div');
  viewport.className = 'skills-hobbies-viewport';
  skills.before(element); element.append(viewport); viewport.append(skills, hobbies);
  sceneMotion.element = element; sceneMotion.viewport = viewport;
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element); resizeObserver.observe(viewport);
  const hero = document.querySelector('#home'); if (hero) resizeObserver.observe(hero);
  const pauseState = () => ['intro-active', 'photography-gallery-open', 'motion-paused'].map(name => document.body.classList.contains(name)).join(':');
  let bodyState = pauseState();
  const stateObserver = new MutationObserver(() => { const next = pauseState(); if (next !== bodyState) { bodyState = next; wake(); } });
  stateObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('load', resize, { once: true });
  window.addEventListener('pageshow', resize);
  document.addEventListener('visibilitychange', wake);
  reduced.addEventListener('change', preferenceChanged);
  document.fonts?.ready.then(resize);
  preferenceChanged();
  window.addEventListener('pagehide', event => {
    cancelHobbyFrame(update); frame = 0;
    if (event.persisted) return;
    resizeObserver.disconnect(); stateObserver.disconnect(); listeners.clear();
    window.removeEventListener('scroll', wake); window.removeEventListener('resize', resize);
    window.removeEventListener('pageshow', resize); window.removeEventListener('load', resize);
    document.removeEventListener('visibilitychange', wake);
    reduced.removeEventListener('change', preferenceChanged);
  });
}
