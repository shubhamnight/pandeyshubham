(() => {
  const hero = document.querySelector('#home');
  const skills = document.querySelector('#about');
  const hobbies = document.querySelector('#projects');
  if (!hero || !skills || !hobbies) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'hero-skills-transition';
  hero.before(wrapper);
  wrapper.append(hero, skills, hobbies);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, height = hero.offsetHeight, visible = true;
  let previous = -1;
  let documentTop=wrapper.getBoundingClientRect().top+window.scrollY;
  function update() {
    frame = 0;
    const progress = preference.matches ? 0 : Math.max(0, Math.min(1, (window.scrollY-documentTop) / height));
    if (progress === previous) return;
    previous = progress;
    hero.style.setProperty('--exit-scale', 1 - progress * .2);
    hero.style.setProperty('--exit-rotation', (-progress * 5) + 'deg');
    skills.style.setProperty('--enter-scale', preference.matches ? 1 : .8 + progress * .2);
    skills.style.setProperty('--enter-rotation', (preference.matches ? 0 : (1 - progress) * 5) + 'deg');
    wrapper.classList.toggle('transition-running', progress > 0 && progress < 1);
    if(hero.classList.contains('hero-covered')!==(progress===1))hero.classList.toggle('hero-covered',progress===1);
  }
  function schedule() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(update);
  }
  const transitionResizeObserver = new ResizeObserver(() => {
    height = hero.offsetHeight;
    documentTop=wrapper.getBoundingClientRect().top+window.scrollY;
    wrapper.style.setProperty('--hero-sticky-top', Math.min(0, innerHeight-height) + 'px');
    wrapper.style.setProperty('--skills-sticky-top', Math.min(0, innerHeight-skills.offsetHeight) + 'px');
    previous = -1;
    schedule();
  });
  transitionResizeObserver.observe(hero);
  transitionResizeObserver.observe(skills);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) schedule();
    else wrapper.classList.remove('transition-running');
  }).observe(wrapper);
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', () => {
    documentTop=wrapper.getBoundingClientRect().top+window.scrollY;
    wrapper.style.setProperty('--hero-sticky-top', Math.min(0, innerHeight-height) + 'px');
    wrapper.style.setProperty('--skills-sticky-top', Math.min(0, innerHeight-skills.offsetHeight) + 'px');
    previous = -1;schedule();
  }, {passive:true});
  preference.addEventListener('change', () => {previous = -1;schedule();});
  document.addEventListener('visibilitychange', schedule);
  update();
})();
