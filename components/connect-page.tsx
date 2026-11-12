import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import AetherFlowHero from '@/components/ui/aether-flow-hero';
import { SocialIcons, type SocialLinks } from '@/components/ui/social-icons';

/** Fade the particle canvas independently of the Contact content. */
function prepareContactBackground(footer: HTMLElement, background: HTMLElement) {
  const animations: Animation[] = [];
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (motionPreference.matches || document.body.classList.contains('motion-paused')) return;
    animations.push(background.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 800, easing: 'ease-in-out',
    }));
  }, { threshold: .15 });
  const finish = () => { for (const animation of animations) animation.finish(); };
  const syncMotion = () => {
    if (motionPreference.matches || document.body.classList.contains('motion-paused')) finish();
  };
  const bodyObserver = new MutationObserver(syncMotion);
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  motionPreference.addEventListener('change', syncMotion);
  observer.observe(footer);
  return () => {
    observer.disconnect();
    bodyObserver.disconnect();
    motionPreference.removeEventListener('change', syncMotion);
    for (const animation of animations) animation.cancel();
  };
}

/** Mount the same particle field behind the existing, native contact content. */
export async function mountConnectBackground(host: HTMLElement, signal?: AbortSignal) {
  if (signal?.aborted) return () => {};
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./connect-page.css', import.meta.url).href;
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Aether styles took too long to load.')); }, 15000);
    const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener('abort', abort); stylesheet.onload = stylesheet.onerror = null; };
    const abort = () => { cleanup(); stylesheet.remove(); reject(new DOMException('Contact closed', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    stylesheet.onload = () => { cleanup(); resolve(); };
    stylesheet.onerror = () => { cleanup(); reject(new Error('Aether styles could not load.')); };
  });
  const container = document.createElement('div');
  container.className = 'connect-aether-root';
  shadow.replaceChildren(stylesheet, container);
  await ready;
  if (signal?.aborted) return () => {};
  const root = createRoot(container);
  let disposeEntrance: (() => void) | undefined;
  const footer = host.parentElement!;
  const reveal = () => {
    host.hidden = false;
    disposeEntrance = prepareContactBackground(footer, host);
  };
  root.render(<AetherFlowHero backgroundOnly pointerTarget={footer} onReady={reveal} />);
  return () => { disposeEntrance?.(); root.unmount(); host.hidden = true; };
}

/** Scope the social component's reset to its own shadow root. */
export async function mountSocialIcons(host: HTMLElement, links: SocialLinks, signal?: AbortSignal) {
  if (signal?.aborted) return () => {};
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./connect-page.css', import.meta.url).href;
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Social styles took too long to load.')); }, 15000);
    const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener('abort', abort); stylesheet.onload = stylesheet.onerror = null; };
    const abort = () => { cleanup(); stylesheet.remove(); reject(new DOMException('Contact closed', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    stylesheet.onload = () => { cleanup(); resolve(); };
    stylesheet.onerror = () => { cleanup(); reject(new Error('Social styles could not load.')); };
  });
  const container = document.createElement('div');
  container.className = 'social-icons-section';
  shadow.replaceChildren(stylesheet, container);
  await ready;
  if (signal?.aborted) return () => {};
  const fallback = host.parentElement?.querySelector<HTMLElement>('.footer-socials-fallback');
  const root = createRoot(container);
  flushSync(() => root.render(<SocialIcons links={links} />));
  host.hidden = false;
  if (fallback) fallback.hidden = true;
  return () => {
    root.unmount();
    host.hidden = true;
    if (fallback) fallback.hidden = false;
  };
}
