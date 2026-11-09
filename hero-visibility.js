const hero = document.querySelector('#home');
const listeners = new AbortController();
const { signal } = listeners;
const grid = hero.querySelector('.hero-dot-grid');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let visible = false;
let loadingGrid = false;
let unmountGrid;
let gridIntro = true;

function canMountGrid() {
  return visible && !hero.classList.contains('hero-idle') && !document.hidden &&
    !reducedMotion.matches && !document.querySelector('#page-loading[open]') && !signal.aborted;
}

async function syncGrid() {
  if (reducedMotion.matches) {
    unmountGrid?.();
    unmountGrid = undefined;
  }
  if (!canMountGrid() || unmountGrid || loadingGrid) return;
  loadingGrid = true;
  try {
    const { mountHeroDotGrid } = await import('./assets/ui/hero-dot-grid.js');
    if (canMountGrid()) {
      unmountGrid = mountHeroDotGrid(grid, gridIntro);
      gridIntro = false;
    }
  } catch {
    // The CSS grid is already visible when the island cannot load.
  } finally {
    loadingGrid = false;
  }
}

function sync() {
  const covered = document.body.classList.contains('photography-gallery-open');
  hero.classList.toggle('hero-idle', !visible || covered);
  syncGrid();
}

const intersection = new IntersectionObserver(([entry]) => {
  visible = entry.intersectionRatio > 0;
  sync();
}, { threshold: [0, .001] });
const cover = new MutationObserver(sync);
intersection.observe(hero);
cover.observe(document.body, { attributes: true, attributeFilter: ['class'] });
const loader = document.querySelector('#page-loading');
const loaderState = new MutationObserver(syncGrid);
if (loader) loaderState.observe(loader, { attributes: true, attributeFilter: ['open'] });
sync();
reducedMotion.addEventListener('change', syncGrid, { signal });
document.addEventListener('visibilitychange', syncGrid, { signal });
window.addEventListener('pageshow', sync, { signal });
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  intersection.disconnect();
  cover.disconnect();
  loaderState.disconnect();
  listeners.abort();
  unmountGrid?.();
}, { signal });
