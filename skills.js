// Adapt the supplied fill-and-tooltip interaction to the existing vanilla site.
document.querySelectorAll('#about .skill-tool').forEach((tool, index) => {
  const icon = tool.querySelector('svg, img, span');
  if (!icon) return;
  const label = [...tool.childNodes].filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent).join('').trim();
  const disc = document.createElement('span');
  disc.className = 'skill-icon-disc';
  disc.append(icon);
  const name = document.createElement('span');
  name.className = 'skill-icon-name';
  name.textContent = label;
  const tooltip = document.createElement('span');
  tooltip.className = 'skill-icon-tooltip';
  tooltip.id = 'skill-tooltip-' + index;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.textContent = label;
  tool.replaceChildren(disc, name, tooltip);
  tool.tabIndex = 0;
  tool.setAttribute('aria-describedby', tooltip.id);
  tool.addEventListener('keydown', event => {
    if (event.key === 'Escape') tool.classList.add('tooltip-dismissed');
  });
  ['pointerenter', 'focus'].forEach(type => tool.addEventListener(type, () => {
    tool.classList.remove('tooltip-dismissed');
  }));
});
// One animation loop for all cards; it sleeps as soon as the springs settle.
const cardMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const cardPointerPreference = matchMedia('(hover: hover) and (pointer: fine)');
const movingSkillCards = new Set();
let skillMotionFrame = 0;
let skillMotionTime = 0;
const skillMotionStates = [];
let skillMotionDirty=false;
function animateSkillCards(time) {
  const dt = Math.min((time - (skillMotionTime || time - 16)) / 1000, .025);
  skillMotionTime = time;
  movingSkillCards.forEach(state => {
    let unsettled = false;
    ['x', 'y', 'z'].forEach(axis => {
      state.velocity[axis] += ((state.target[axis] - state.pose[axis]) * 400 - state.velocity[axis] * 35) * dt / .8;
      state.pose[axis] += state.velocity[axis] * dt;
      if (Math.abs(state.target[axis] - state.pose[axis]) > .01 || Math.abs(state.velocity[axis]) > .02) unsettled = true;
    });
    if (!unsettled) Object.assign(state.pose, state.target);
    state.card.style.transform = 'perspective(1200px) translateZ(' + state.pose.z + 'px) rotateX(' + state.pose.x + 'deg) rotateY(' + state.pose.y + 'deg)';
    state.card.style.setProperty('--sheen-angle', (135 + state.pose.y) + 'deg');
    if (!unsettled) {
      movingSkillCards.delete(state);
      state.card.classList.remove('tilt-moving');
    }
  });
  skillMotionFrame = movingSkillCards.size ? requestAnimationFrame(animateSkillCards) : 0;
  if (!skillMotionFrame) skillMotionTime = 0;
}
function queueSkillMotion(state) {
  skillMotionDirty=true;
  movingSkillCards.add(state);
  state.card.classList.add('tilt-moving');
  if (!skillMotionFrame) skillMotionFrame = requestAnimationFrame(animateSkillCards);
}
function resetSkillMotion() {
  if(!skillMotionDirty)return;
  skillMotionDirty=false;
  cancelAnimationFrame(skillMotionFrame);
  skillMotionFrame = skillMotionTime = 0;
  movingSkillCards.clear();
  skillMotionStates.forEach(state => {
    ['pose', 'target', 'velocity'].forEach(key => state[key] = {x:0,y:0,z:0});
    state.card.style.removeProperty('transform');
    state.card.classList.remove('tilt-active', 'tilt-moving');
  });
}
document.querySelectorAll('#about .skill-card').forEach(card => {
  const state = {card, pose:{x:0,y:0,z:0}, target:{x:0,y:0,z:0}, velocity:{x:0,y:0,z:0}, bounds:null};
  skillMotionStates.push(state);
  card.classList.add('tilt-card');
  const layers = document.createElement('div');
  layers.className = 'skill-glass-layers';
  layers.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 4; index++) {
    const ring = document.createElement('span');
    ring.style.setProperty('--layer', index);
    layers.append(ring);
  }
  card.prepend(layers);
  card.querySelectorAll('.skill-tool').forEach((tool, index) => {
    tool.style.setProperty('--tool-order', index);
  });
  card.addEventListener('pointerenter', event => {
    if (card.parentElement.classList.contains('is-shuffling') || event.pointerType === 'touch' || cardMotionPreference.matches || !cardPointerPreference.matches) return;
    // Use the layout box, excluding our own tilt, to avoid cursor feedback jitter.
    const previous = card.style.transform;
    card.style.transform = 'none';
    state.bounds = card.getBoundingClientRect();
    card.style.transform = previous;
    card.classList.add('tilt-active');
    state.target.z = 12;
    queueSkillMotion(state);
  });
  card.addEventListener('pointermove', event => {
    if (!card.classList.contains('tilt-active')) return;
    const rect = state.bounds;
    const x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
    const y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
    state.target.x = -y * 12;
    state.target.y = x * 12;
    queueSkillMotion(state);
  });
  ['pointerleave', 'pointercancel'].forEach(type => card.addEventListener(type, () => {
    if (!card.classList.contains('tilt-active')) return;
    card.classList.remove('tilt-active');
    state.target = {x:0,y:0,z:0};
    queueSkillMotion(state);
  }));
});
cardMotionPreference.addEventListener('change', resetSkillMotion);
cardPointerPreference.addEventListener('change', resetSkillMotion);
window.addEventListener('scroll', resetSkillMotion, {passive:true});
window.addEventListener('resize', resetSkillMotion, {passive:true});
document.addEventListener('visibilitychange', resetSkillMotion);
const skillFilters = document.querySelectorAll('[data-skill-filter]');
const skillCards = document.querySelectorAll('[data-skill-category]');
const skillGrid = document.querySelector('#about .skills-grid');
let shuffleVersion = 0;
let shuffleAnimations = [];
let activeSkillFilter = 'all';
function stopSkillShuffle() {
  shuffleVersion++;
  shuffleAnimations.forEach(animation => animation.cancel());
  shuffleAnimations = [];
  skillCards.forEach(card => {
    ['position','left','top','width','height','z-index'].forEach(property => card.style.removeProperty(property));
    card.hidden = activeSkillFilter !== 'all' && activeSkillFilter !== card.dataset.skillCategory;
  });
  skillGrid.classList.remove('is-shuffling');
  skillGrid.style.removeProperty('height');
}
function shuffleCard(card, frames, options = {}) {
  const animation = card.animate(frames, {
    duration:504, easing:'cubic-bezier(.22,1,.36,1)', fill:'both', ...options
  });
  shuffleAnimations.push(animation);
  return animation.finished.catch(() => {});
}
skillFilters.forEach(button => button.addEventListener('click', async () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  // Capture the current visual positions before cancelling an interrupted shuffle.
  const gridBox = skillGrid.getBoundingClientRect();
  const previous = new Map([...skillCards].filter(card => !card.hidden).map(card => [card, {
    box:card.getBoundingClientRect()
  }]));
  stopSkillShuffle();
  resetSkillMotion();
  const version = shuffleVersion;
  activeSkillFilter = button.dataset.skillFilter;
  const matches = card => activeSkillFilter === 'all' || activeSkillFilter === card.dataset.skillCategory;
  skillFilters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
  skillCards.forEach(card => { card.hidden = !matches(card); });
  if (cardMotionPreference.matches) return;

  // Measure the final layout once, then animate all cards together.
  const finalHeight = skillGrid.getBoundingClientRect().height;
  const incoming = [...skillCards].filter(matches);
  const boxes = incoming.map(card => card.getBoundingClientRect());
  skillGrid.classList.add('is-shuffling');
  skillGrid.style.height = finalHeight + 'px';
  const motions = [shuffleCard(skillGrid, [
    {height:gridBox.height+'px'}, {height:finalHeight+'px'}
  ], {duration:504})];
  [...skillCards].filter(card => !matches(card) && previous.has(card)).forEach((card, index) => {
    const {box} = previous.get(card);
    card.hidden = false;
    Object.assign(card.style, {
      position:'absolute', left:(box.left-gridBox.left)+'px', top:(box.top-gridBox.top)+'px',
      width:box.width+'px', height:box.height+'px', zIndex:'0'
    });
    motions.push(shuffleCard(card, [
      {transform:'translate3d(0,0,0)'},
      {transform:`translate3d(${(gridBox.left-box.left)}px,${(gridBox.top-box.top)}px,0)`}
    ], {duration:504}));
  });
  incoming.forEach((card, index) => {
    const box = boxes[index];
    const from = previous.get(card);
    const x = (from ? from.box.left : gridBox.left) - box.left;
    const y = (from ? from.box.top : gridBox.top) - box.top;
    card.style.zIndex = '2';
    motions.push(shuffleCard(card, [
      {transform:`translate3d(${x}px,${y}px,0)`},
      {transform:'translate3d(0,0,0)'}
    ], {duration:504}));
  });
  await Promise.all(motions);
  if (version === shuffleVersion) stopSkillShuffle();
}));
function sizeSkillCards() {
  stopSkillShuffle();
  skillGrid.style.removeProperty('--skill-card-height');
  skillCards.forEach(card => { card.hidden = false; });
  const height = Math.ceil(Math.max(...[...skillCards].map(card => card.getBoundingClientRect().height)));
  skillGrid.style.setProperty('--skill-card-height', height + 'px');
  skillCards.forEach(card => {
    card.hidden = activeSkillFilter !== 'all' && activeSkillFilter !== card.dataset.skillCategory;
  });
}
let skillSizeFrame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(skillSizeFrame);
  skillSizeFrame = requestAnimationFrame(sizeSkillCards);
}, {passive:true});
sizeSkillCards();
document.fonts.ready.then(sizeSkillCards);
cardMotionPreference.addEventListener('change', stopSkillShuffle);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopSkillShuffle(); });
