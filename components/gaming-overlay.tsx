import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Marquee } from '@/components/ui/3d-testimonails';

interface GameArtwork {
  src: string;
  srcset?: string;
  title: string;
  alt: string;
  width: number;
  height: number;
}

function GamingOverlay({ images }: { images: GameArtwork[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(4);
  const columns = useMemo(() => Array.from({ length: columnCount }, (_, column) =>
    images.filter((_, index) => index % columnCount === column)), [images, columnCount]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => {
      setColumnCount(entry.contentRect.width < 600 ? 2 : entry.contentRect.width < 900 ? 3 : 4);
    });
    resize.observe(element);
    const sync = () => element.toggleAttribute('data-paused', document.hidden || document.body.classList.contains('motion-paused'));
    const pause = new MutationObserver(sync);
    pause.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', sync); sync();
    return () => { resize.disconnect(); pause.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  return <div ref={viewport} className="gaming-scroll-viewport" data-lenis-prevent
    role="group" aria-label="Game artwork" data-game-count={images.length}>
    <div className="gaming-marquee-scene">
      <div className="gaming-marquee-plane" style={{ '--columns': columnCount } as CSSProperties}>
        {columns.map((column, index) => <Marquee key={index} vertical pauseOnHover reverse={index % 2 === 1}
          className="gaming-marquee-column" ariaLabel={`Game artwork column ${index + 1}. Scroll or swipe to browse; hold to pause. Arrow keys browse; Space toggles pause.`}
          style={{ '--duration': `${Math.max(40, column.length * 5)}s` } as CSSProperties}>
          {column.map(image => <figure key={image.src} className="gaming-marquee-card" data-game-title={image.title}>
            <img className="gaming-marquee-artwork" src={image.src} srcSet={image.srcset}
              sizes="(max-width:600px) 220px, (max-width:900px) 280px, 320px"
              width={image.width} height={image.height} alt={image.alt}
              loading="lazy" decoding="async" draggable={false} />
            <figcaption>{image.title}</figcaption>
          </figure>)}
        </Marquee>)}
      </div>
    </div>
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
  // Retain the existing native-dialog lifecycle and local responsive artwork.
  gallery.classList.add('gaming-tilted-active');
  host.hidden = false;
  const root = createRoot(container);
  root.render(<GamingOverlay images={media} />);
  return () => { root.unmount(); host.hidden = true; gallery.classList.remove('gaming-tilted-active'); };
}
