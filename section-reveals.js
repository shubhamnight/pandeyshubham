const motion = matchMedia('(prefers-reduced-motion: reduce)');
const distance = 100;
const threshold = .1;
const preparationMargin = 240;
const targets = document.querySelectorAll('main > .section [data-animated-content]');
const reveals = new Map();
const listeners = new AbortController();
const { signal } = listeners;
let approach;
let viewport;
let trigger;
let load;
let prepareContent;
let viewportWidth;
let viewportHeight;
let lastScrollY = scrollY;
let scrollingDown = false;
let bypassAnchor = location.hash;

function finish(target) {
  const reveal = reveals.get(target);
  if (!reveal) return;
  reveals.delete(target);
  trigger.unobserve(target);
  reveal.reset();
}

function prepare(target) {
  if (!prepareContent || reveals.has(target) || motion.matches || document.hidden ||
      target.contains(document.activeElement) || bypassAnchor === '#' + target.closest('.section').id) return;
  const { top } = target.getBoundingClientRect();
  if (top <= innerHeight || top > innerHeight + preparationMargin) return;
  reveals.set(target, prepareContent(target, distance));
  trigger.observe(target);
}

function warm() {
  if (load || motion.matches) return;
  // A stalled or blocked enhancement leaves the native content readable.
  load = import('./assets/ui/animated-content.js')
    .then(module => {
      if (signal.aborted) return;
      prepareContent = module.prepareContent;
      watch();
    })
    .catch(() => {});
}

function watch() {
  viewportWidth = innerWidth;
  viewportHeight = innerHeight;
  stopWatching();
  if (!prepareContent || motion.matches || document.hidden) return;

  approach = new IntersectionObserver((entries, source) => {
    if (source !== approach || signal.aborted) return;
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) prepare(target);
      else finish(target);
    }
  }, { rootMargin: `0px 0px ${preparationMargin}px` });

  viewport = new IntersectionObserver((entries, source) => {
    if (source !== viewport || signal.aborted) return;
    for (const { target, isIntersecting } of entries) {
      const reveal = reveals.get(target);
      if (reveal?.started) continue; // Its entrance transform can briefly cross the viewport edge.
      if (!isIntersecting) prepare(target);
      else if (reveal && !scrollingDown) finish(target);
    }
  });

  // AnimatedContent starts when the block's top reaches 90% of the viewport.
  trigger = new IntersectionObserver((entries, source) => {
    if (source !== trigger || signal.aborted) return;
    const arrivals = [];
    for (const entry of entries) {
      const { target, isIntersecting } = entry;
      const reveal = reveals.get(target);
      if (!isIntersecting || !reveal || reveal.started) continue;
      if (scrollingDown && !motion.matches && !document.hidden) arrivals.push(entry);
      else finish(target);
    }
    arrivals.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top ||
      a.boundingClientRect.left - b.boundingClientRect.left);
    const stagger = new Map();
    for (const { target } of arrivals) {
      const section = target.closest('.section');
      const delay = stagger.get(section) ?? 0;
      stagger.set(section, delay + .08);
      trigger.unobserve(target);
      reveals.get(target).play(delay, () => {
        finish(target);
        prepare(target);
      });
    }
  }, { rootMargin: `0px 0px -${Math.round(viewportHeight * threshold)}px` });
  for (const target of targets) {
    approach.observe(target);
    viewport.observe(target);
  }
}

function settle() {
  for (const target of reveals.keys()) finish(target);
}

function stopWatching() {
  settle();
  approach?.disconnect();
  viewport?.disconnect();
  trigger?.disconnect();
  approach = viewport = trigger = undefined;
}

function onScroll() {
  if (scrollY === lastScrollY) return;
  scrollingDown = scrollY > lastScrollY;
  lastScrollY = scrollY;
  if (scrollY > 0) warm();
  if (scrollY <= innerHeight * .2) bypassAnchor = '';
}

if (targets.length && 'IntersectionObserver' in window) {
  window.addEventListener('scroll', onScroll, { passive: true, signal });
  window.addEventListener('resize', () => {
    // Small height changes from the mobile browser toolbar should not cut a reveal short.
    if (innerWidth === viewportWidth && Math.abs(innerHeight - viewportHeight) < 64) return;
    watch();
  }, { passive: true, signal });
  window.addEventListener('hashchange', () => {
    bypassAnchor = location.hash;
    watch();
  }, { signal });
  document.addEventListener('focusin', event => {
    for (const target of reveals.keys()) if (target.contains(event.target)) finish(target);
  }, { signal });
  document.addEventListener('visibilitychange', watch, { signal });
  motion.addEventListener('change', watch, { signal });
  window.addEventListener('pagehide', event => {
    stopWatching();
    if (!event.persisted) listeners.abort();
  }, { signal });
  window.addEventListener('pageshow', event => { if (event.persisted) watch(); }, { signal });
  if (scrollY) warm();
  watch();
}
