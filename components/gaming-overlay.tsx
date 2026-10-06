import { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ScrollTiltedGrid, type TiltedGridImage } from '@/components/ui/scroll-tilted-grid';

interface GameArtwork {
  src: string;
  srcset?: string;
  title: string;
  alt: string;
  width: number;
  height: number;
}

function GamingOverlay({ images }: { images: TiltedGridImage[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  return <div ref={viewport} className="gaming-scroll-viewport" data-lenis-prevent
    tabIndex={0} aria-label="Scroll game artwork">
    <ScrollTiltedGrid images={images} container={viewport} aspectRatio="4/3"
      maxWidth="3xl" gap={10} rounded=".5rem" className="gaming-tilted-gallery" />
  </div>;
}

/** Load styles and React only when the native games dialog opens. */
export async function mountGamingOverlay(host: HTMLElement, media: GameArtwork[], signal?: AbortSignal) {
  host.toggleAttribute('data-batman-cursor', document.body.classList.contains('batman-cursor-active'));
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.replaceChildren();
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./gaming-overlay.css', import.meta.url).href;
  const ready = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      stylesheet.onload = stylesheet.onerror = null;
    };
    const abort = () => { cleanup(); stylesheet.remove(); reject(new DOMException('Gallery closed', 'AbortError')); };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Gaming styles took too long to load.')); }, 15000);
    stylesheet.onload = () => { cleanup(); resolve(); };
    stylesheet.onerror = () => { cleanup(); reject(new Error('Gaming styles could not load.')); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
  const container = document.createElement('div');
  container.className = 'gaming-react-root';
  shadow.append(stylesheet, container);
  await ready;
  const gallery = host.closest('dialog');
  if (signal?.aborted || !gallery?.open) return () => {};
  const images: TiltedGridImage[] = media.map(item => ({
    src: item.src, srcSet: item.srcset,
    title: item.title, alt: item.alt, width: item.width, height: item.height,
  }));
  // Establish the viewport's dimensions before Motion measures any tile offsets.
  gallery.classList.add('gaming-tilted-active');
  host.hidden = false;
  const root = createRoot(container);
  root.render(<GamingOverlay images={images} />);
  return () => { root.unmount(); host.hidden = true; gallery.classList.remove('gaming-tilted-active'); };
}
