import { createRoot } from 'react-dom/client';
import { HeroCarousel, type HeroCarouselItem } from '@/components/ui/hero-carousel';
import { photographyHeroSources } from '@/photography-hero-data.js';

const heroSources: Record<string, { src: string; width: number }[]> = photographyHeroSources;

interface PhotographyMedia {
  type: 'image' | 'video';
  src: string;
  original?: string;
  srcset?: string;
  poster?: string;
  width: number;
  height: number;
  alt: string;
}

/** A React island: styles and events stay inside the existing native dialog. */
export async function mountPhotographyCarousel(host: HTMLElement, media: PhotographyMedia[], signal?: AbortSignal) {
  host.toggleAttribute('data-batman-cursor', document.body.classList.contains('batman-cursor-active'));
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.replaceChildren();
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./photography-carousel.css', import.meta.url).href;
  const ready = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      stylesheet.onload = stylesheet.onerror = null;
    };
    const abort = () => { cleanup(); stylesheet.remove(); reject(new DOMException('Gallery closed', 'AbortError')); };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Photography styles took too long to load.')); }, 15000);
    stylesheet.onload = () => { cleanup(); resolve(); };
    stylesheet.onerror = () => { cleanup(); reject(new Error('Photography carousel styles could not load.')); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
  const container = document.createElement('div');
  container.className = 'photography-react-root';
  shadow.append(stylesheet, container);
  await ready;
  // The camera dialog may have closed while its first bundle was loading.
  if (signal?.aborted || !host.closest('dialog')?.open) return () => {};
  const items: HeroCarouselItem[] = media.map(item => ({
    id: item.original ?? item.src,
    title: item.type === 'video' ? 'Moving\nmoments.' : 'Through\nmy lens.',
    image: item.type === 'video' ? item.poster ?? item.src : item.src,
    fullImage: item.type === 'video' ? item.poster ?? item.src : item.original ?? item.src,
    fullSources: item.type === 'image' ? heroSources[item.original ?? item.src] : undefined,
    width: item.width,
    height: item.height,
    srcSet: item.type === 'image'
      ? [item.srcset, `${item.original ?? item.src} ${item.width}w`].filter(Boolean).join(', ')
      : undefined,
    videoSrc: item.type === 'video' ? item.src : undefined,
    alt: item.alt,
    credit: 'BY SHUBHAM.'
  }));
  const root = createRoot(container);
  root.render(<HeroCarousel items={items} defaultIndex={Math.min(4, items.length - 1)} className="photo-carousel" />);
  return () => {
    shadow.querySelectorAll('video').forEach(video => video.pause());
    root.unmount();
  };
}
