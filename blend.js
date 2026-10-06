const floatNav = document.querySelector('.floating-nav');
let paused = reducedMotion.matches;
function setMotion(value) {
  paused = value;
  document.body.classList.toggle('motion-paused', paused);
}
setMotion(paused);
reducedMotion.addEventListener('change', event => setMotion(event.matches));
const heroObserver = new IntersectionObserver(entries => {
  const show = !entries[0].isIntersecting;
  floatNav.classList.toggle('visible', show);
  floatNav.inert = !show;
}, {threshold: 0.15});
heroObserver.observe(document.querySelector('.hero'));
floatNav.inert = true;
document.body.classList.add('motion-enabled');
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
}), {threshold:0.1});
document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
const studies = {
  type: {title:'Form & feeling', category:'01 / TYPOGRAPHIC STUDY', copy:'An exploration of expressive type: oversized letterforms, a warm orange palette, and a rotating asterisk. A study in making a simple identity feel unmistakably its own.', art:'.type-art', background:'#183f73'},
  interface: {title:'Daylight', category:'02 / INTERFACE CONCEPT', copy:'A fictional focus dashboard exploring a calmer digital workspace. Soft sky blue, generous spacing, and a simple visual rhythm put everyday intentions first. This is a visual concept, not a released product.', art:'.ui-art', background:'#11233c'},
  motion: {title:'Out of orbit', category:'03 / MOTION EXPERIMENT', copy:'Three elliptical paths and one playful center. This experiment explores how repetition, rotation, and a small shift in perspective can give simple geometry a sense of life.', art:'.orbit-art', background:'#202124'}
};
const dialog = document.querySelector('#study-dialog');
let lastStudy;
document.querySelectorAll('[data-study]').forEach(card => card.addEventListener('click', () => {
  lastStudy = card;
  const data = studies[card.dataset.study];
  document.querySelector('#dialog-title').textContent = data.title;
  document.querySelector('#dialog-category').textContent = data.category;
  document.querySelector('#dialog-copy').textContent = data.copy;
  const art = document.querySelector('#dialog-art');
  art.replaceChildren(card.querySelector(data.art).cloneNode(true));
  art.style.background = data.background;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}));
function closeStudy() { dialog.close(); }
document.querySelector('.dialog-close').addEventListener('click', closeStudy);
document.querySelector('.dialog-done').addEventListener('click', closeStudy);
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeStudy(); } });
dialog.addEventListener('close', () => { document.body.style.overflow = ''; lastStudy?.focus(); });
const stage = document.querySelector('.play-stage');
const kinetic = document.querySelector('.kinetic-object');
stage.addEventListener('pointermove', event => {
  if (paused || event.pointerType === 'touch') return;
  const rect = stage.getBoundingClientRect();
  kinetic.style.translate = `${(event.clientX - rect.left - rect.width / 2) * .12}px ${(event.clientY - rect.top - rect.height / 2) * .15}px`;
});
stage.addEventListener('pointerleave', () => { kinetic.style.translate = '0 0'; });
document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => {
  stage.dataset.mood = button.dataset.color;
  document.querySelectorAll('[data-color]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
}));
// Scroll-linked parallax: update only visible layers, at most once per frame.
const parallaxLayers = [...document.querySelectorAll('[data-scroll-parallax]')];
const parallaxSections = [...document.querySelectorAll('.scroll-section:not(#about):not(#projects):not(#playground)')];
const visibleParallax = new Set();
const visibleSections = new Set();
let parallaxFrame = 0;
const layerSpeed = {1:.075, 2:.12, 3:-.09, 4:.045};
const parallaxValues=new WeakMap();
function writeParallax(element,property,value){
  let values=parallaxValues.get(element);
  if(!values){values={};parallaxValues.set(element,values);}
  if(values[property]===value)return;
  values[property]=value;element.style.setProperty(property,value);
}
const parallaxObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) visibleParallax.add(entry.target);
    else { visibleParallax.delete(entry.target); writeParallax(entry.target,'--scroll-parallax-y','0px'); }
  });
  requestParallaxFrame();
}, {rootMargin:'12% 0px 12% 0px'});
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) visibleSections.add(entry.target);
    else {
      visibleSections.delete(entry.target);
      writeParallax(entry.target,'--scroll-section-y','0px');
    }
  });
  requestParallaxFrame();
}, {rootMargin:'20% 0px 20% 0px'});
function updateParallax() {
  parallaxFrame = 0;
  if (paused || reducedMotion.matches || document.hidden) {
    visibleParallax.forEach(element => writeParallax(element,'--scroll-parallax-y','0px'));
    visibleSections.forEach(section => writeParallax(section,'--scroll-section-y','0px'));
    return;
  }
  const viewportCenter = window.innerHeight * .5;
  const measurements = [];
  visibleParallax.forEach(element => {
    const rect = element.getBoundingClientRect();
    const center = rect.top + rect.height * .5;
    const speed = layerSpeed[element.dataset.scrollParallax] ?? .08;
    const offset = Math.max(-36, Math.min(36, (viewportCenter - center) * speed));
    measurements.push([element, offset]);
  });
  const sectionMeasurements = [];
  visibleSections.forEach(section => {
    const rect = section.getBoundingClientRect();
    const sectionOffset = Math.max(-18, Math.min(18, (viewportCenter - (rect.top + rect.height * .5)) * .028));
    sectionMeasurements.push([section, sectionOffset]);
  });
  measurements.forEach(([element, offset]) => writeParallax(element,'--scroll-parallax-y',`${offset.toFixed(1)}px`));
  sectionMeasurements.forEach(([section, offset]) => writeParallax(section,'--scroll-section-y',`${offset.toFixed(1)}px`));
}
function requestParallaxFrame() {
  if(document.hidden){cancelAnimationFrame(parallaxFrame);parallaxFrame=0;return;}
  if(!parallaxFrame&&(visibleParallax.size||visibleSections.size))parallaxFrame=requestAnimationFrame(updateParallax);
}
parallaxLayers.forEach(element => { element.classList.add('scroll-parallax'); parallaxObserver.observe(element); });
parallaxSections.forEach(section => sectionObserver.observe(section));
window.addEventListener('scroll', requestParallaxFrame, {passive:true});
window.addEventListener('resize', requestParallaxFrame, {passive:true});
reducedMotion.addEventListener('change', requestParallaxFrame);
document.addEventListener('visibilitychange', requestParallaxFrame);
window.addEventListener('pagehide',event=>{
  cancelAnimationFrame(parallaxFrame);parallaxFrame=0;
  if(event.persisted)return;
  parallaxObserver.disconnect();sectionObserver.disconnect();
  window.removeEventListener('scroll',requestParallaxFrame);window.removeEventListener('resize',requestParallaxFrame);
  reducedMotion.removeEventListener('change',requestParallaxFrame);
  document.removeEventListener('visibilitychange',requestParallaxFrame);
});
const footerWords = ['meaningful.', 'unexpected.', 'memorable.'];
let wordIndex = 0;
let footerWordVisible = false;
let footerWordAnimating = false;
let footerWordTimer = 0, footerWordSuspended = false;
let footerWordAnimations = [];
const footerWordStage = document.querySelector('#contact');
const footerWord = footerWordStage?.querySelector('.footer-rotator');
function canRotateFooterWord() {
  return Boolean(footerWord) && !footerWordSuspended && !paused && !document.hidden &&
    footerWordVisible && !document.body.classList.contains('intro-active');
}
function scheduleFooterWord(delay = 3500) {
  if (!footerWordTimer && !footerWordAnimating && canRotateFooterWord()) {
    footerWordTimer = setTimeout(rotateFooterWord, delay);
  }
}
function syncFooterWord() {
  if (canRotateFooterWord()) { scheduleFooterWord(); return; }
  clearTimeout(footerWordTimer); footerWordTimer = 0;
  footerWordAnimations.forEach(animation => animation.cancel());
}
async function rotateFooterWord() {
  footerWordTimer = 0;
  if (!canRotateFooterWord()) return;
  const word = footerWord;
  if (!word.animate) {
    word.textContent = footerWords[++wordIndex % footerWords.length];
    scheduleFooterWord();
    return;
  }
  footerWordAnimating = true;
  let incoming;
  const outgoing = word.animate([
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: 'translateY(-8px)' },
  ], { duration: 200, easing: 'ease-in-out', fill: 'forwards' });
  footerWordAnimations = [outgoing];
  try {
    await outgoing.finished;
    if (!canRotateFooterWord()) return;
    word.textContent = footerWords[++wordIndex % footerWords.length];
    incoming = word.animate([
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
    footerWordAnimations.push(incoming);
    outgoing.cancel();
    await incoming.finished;
  } catch (error) {
    if (error.name !== 'AbortError') console.error('Contact word animation failed.', error);
  } finally {
    outgoing.cancel();
    incoming?.cancel();
    footerWordAnimations = [];
    footerWordAnimating = false;
    scheduleFooterWord(2850);
  }
}
if (footerWordStage && footerWord) {
  const wordObserver = new IntersectionObserver(entries => {
    footerWordVisible = entries.some(entry => entry.isIntersecting);
    syncFooterWord();
  });
  wordObserver.observe(footerWordStage);
  const wordStateObserver = new MutationObserver(syncFooterWord);
  wordStateObserver.observe(document.body, { attributes:true, attributeFilter:['class'] });
  document.addEventListener('visibilitychange', syncFooterWord);
  const resumeFooterWord = () => { footerWordSuspended = false; syncFooterWord(); };
  window.addEventListener('pageshow', resumeFooterWord);
  window.addEventListener('pagehide', event => {
    footerWordSuspended = true; syncFooterWord();
    if (event.persisted) return;
    wordObserver.disconnect(); wordStateObserver.disconnect();
    document.removeEventListener('visibilitychange', syncFooterWord);
    window.removeEventListener('pageshow', resumeFooterWord);
  });
}
