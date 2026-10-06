import { requestHobbyFrame, cancelHobbyFrame, getSmoothPosition } from './hobby-motion-clock.js';
import { sceneMotion } from './skills-hobbies-scene.js';

(() => {
  const hero = document.querySelector('#home');
  const skills = document.querySelector('#about');
  const hobbies = document.querySelector('#projects');
  if (!hero || !skills || !hobbies) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'hero-skills-transition';
  hero.before(wrapper);
  wrapper.append(hero, sceneMotion.element);
  const incoming = sceneMotion.viewport;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, height = 1, visible = true, geometryDirty = true;
  let previous = -1;
  let documentTop = 0;
  function stop() { cancelHobbyFrame(update); frame = 0; }
  function update() {
    stop();
    if (geometryDirty) {
      geometryDirty = false;
      // Read layout together, before any transform or sticky-position writes.
      height = Math.max(1, hero.offsetHeight);
      const skillsHeight = skills.offsetHeight;
      documentTop = wrapper.getBoundingClientRect().top + window.scrollY;
      wrapper.style.setProperty('--hero-sticky-top', Math.min(0, innerHeight-height) + 'px');
      wrapper.style.setProperty('--skills-sticky-top', Math.min(0, innerHeight-skillsHeight) + 'px');
    }
    const progress = preference.matches ? 0 : Math.max(0, Math.min(1, (getSmoothPosition()-documentTop) / height));
    if (progress === previous) return;
    previous = progress;
    hero.style.setProperty('--exit-scale', 1 - progress * .2);
    hero.style.setProperty('--exit-rotation', (-progress * 5) + 'deg');
    incoming.style.setProperty('--enter-scale', preference.matches ? 1 : .8 + progress * .2);
    incoming.style.setProperty('--enter-rotation', (preference.matches ? 0 : (1 - progress) * 5) + 'deg');
    wrapper.classList.toggle('transition-running', progress > 0 && progress < 1);
    if(hero.classList.contains('hero-covered')!==(progress===1))hero.classList.toggle('hero-covered',progress===1);
  }
  function schedule() {
    if (!frame && visible && !document.hidden) frame = requestHobbyFrame(update, 12);
  }
  function resize() { geometryDirty = true; schedule(); }
  const transitionResizeObserver = new ResizeObserver(resize);
  transitionResizeObserver.observe(hero);
  transitionResizeObserver.observe(skills);
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) schedule();
    else { stop(); wrapper.classList.remove('transition-running'); }
  });
  visibilityObserver.observe(wrapper);
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', resize, {passive:true});
  const preferenceChanged = () => {previous = -1;schedule();};
  const visibilityChanged = () => { if (document.hidden) stop(); else schedule(); };
  preference.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('pagehide', event => {
    stop();
    if (event.persisted) return;
    transitionResizeObserver.disconnect(); visibilityObserver.disconnect();
    window.removeEventListener('scroll', schedule); window.removeEventListener('resize', resize);
    window.removeEventListener('pageshow', resize);
    preference.removeEventListener('change', preferenceChanged);
    document.removeEventListener('visibilitychange', visibilityChanged);
  });
  window.addEventListener('pageshow', resize);
  update();
})();
