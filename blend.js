import { requestHobbyFrame, cancelHobbyFrame } from './hobby-motion-clock.js';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
function setMotion(value) {
  paused = value;
  document.body.classList.toggle('motion-paused', paused);
}
setMotion(paused);
reducedMotion.addEventListener('change', event => setMotion(event.matches));
// Navigation starts at Profile, beyond the hero's suspension.
const navigation = document.querySelector('.floating-nav');
const heroBoundary = document.querySelector('#home');
function syncNavigation() {
  const visible = heroBoundary.getBoundingClientRect().bottom < 72;
  navigation.classList.toggle('visible', visible);
  navigation.inert = !visible;
}
const navigationObserver = new IntersectionObserver(syncNavigation, { rootMargin: '-72px 0px 0px', threshold: 0 });
navigationObserver.observe(heroBoundary);
navigation.setAttribute('data-enhanced', '');
syncNavigation();
window.addEventListener('pageshow', syncNavigation);
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  navigationObserver.disconnect();
  window.removeEventListener('pageshow', syncNavigation);
});

const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
}), {threshold:0.1});
document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
const stage = document.querySelector('.play-stage');
const kinetic = document.querySelector('.kinetic-object');
let kineticFrame=0,kineticBounds=null,kineticX=0,kineticY=0,kineticPaint='';
function paintKinetic(){
  kineticFrame=0;
  if(paused||document.hidden)return;
  kineticBounds ||= stage.getBoundingClientRect();
  const value=`${(kineticX-kineticBounds.left-kineticBounds.width/2)*.12}px ${(kineticY-kineticBounds.top-kineticBounds.height/2)*.15}px`;
  if(value!==kineticPaint){kineticPaint=value;kinetic.style.translate=value;}
}
function kineticPointer(event){
  if(paused||document.hidden||event.pointerType==='touch')return;
  kineticX=event.clientX;kineticY=event.clientY;
  if(!kineticFrame)kineticFrame=requestAnimationFrame(paintKinetic);
}
function resetKinetic(){cancelAnimationFrame(kineticFrame);kineticFrame=0;kineticPaint='0 0';kinetic.style.translate=kineticPaint;}
function invalidateKinetic(){kineticBounds=null;}
function kineticVisibility(){if(document.hidden)resetKinetic();}
stage.addEventListener('pointermove',kineticPointer,{passive:true});
stage.addEventListener('pointerleave',resetKinetic);
window.addEventListener('scroll',invalidateKinetic,{passive:true});
window.addEventListener('resize',invalidateKinetic,{passive:true});
document.addEventListener('visibilitychange',kineticVisibility);
const kineticResize=new ResizeObserver(invalidateKinetic);kineticResize.observe(stage);
window.addEventListener('pagehide',event=>{
  resetKinetic();if(event.persisted)return;
  kineticResize.disconnect();stage.removeEventListener('pointermove',kineticPointer);stage.removeEventListener('pointerleave',resetKinetic);
  window.removeEventListener('scroll',invalidateKinetic);window.removeEventListener('resize',invalidateKinetic);
  document.removeEventListener('visibilitychange',kineticVisibility);
});
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
  cancelHobbyFrame(updateParallax);
  parallaxFrame = 0;
  if(document.body.classList.contains('photography-gallery-open')||document.body.classList.contains('intro-active'))return;
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
  if(document.hidden){cancelHobbyFrame(updateParallax);parallaxFrame=0;return;}
  // Measure before the scene, orbit and model callbacks write transforms.
  if(!parallaxFrame&&(visibleParallax.size||visibleSections.size))parallaxFrame=requestHobbyFrame(updateParallax,11.5);
}
parallaxLayers.forEach(element => { element.classList.add('scroll-parallax'); parallaxObserver.observe(element); });
parallaxSections.forEach(section => sectionObserver.observe(section));
window.addEventListener('scroll', requestParallaxFrame, {passive:true});
window.addEventListener('resize', requestParallaxFrame, {passive:true});
reducedMotion.addEventListener('change', requestParallaxFrame);
document.addEventListener('visibilitychange', requestParallaxFrame);
const parallaxStateObserver=new MutationObserver(requestParallaxFrame);
parallaxStateObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pagehide',event=>{
  cancelHobbyFrame(updateParallax);parallaxFrame=0;
  if(event.persisted)return;
  parallaxObserver.disconnect();sectionObserver.disconnect();parallaxStateObserver.disconnect();
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
    footerWordVisible && !document.body.classList.contains('intro-active') && !document.body.classList.contains('photography-gallery-open');
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
