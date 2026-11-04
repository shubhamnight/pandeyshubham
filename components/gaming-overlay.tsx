import { prepareOverlayHost } from '@/lib/overlay-host';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Marquee } from '@/components/ui/3d-testimonails';

interface GameArtwork {
  src: string;
  srcset?: string;
  original?: string;
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
    let visible=false, suspended=false;
    const sync = () => element.toggleAttribute('data-paused', suspended || !visible || document.hidden || document.body.classList.contains('motion-paused'));
    const intersection = new IntersectionObserver(([entry]) => { visible=entry.isIntersecting; sync(); });
    intersection.observe(element);
    const artwork = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        const image = target as HTMLImageElement;
        if (image.dataset.srcset) image.srcset = image.dataset.srcset;
        if (image.dataset.src) image.src = image.dataset.src;
        artwork.unobserve(image);
      }
    }, { root: element, rootMargin: '120px' });
    const observeArtwork = () => element.querySelectorAll('img:not([src])').forEach(image => artwork.observe(image));
    const cards = new MutationObserver(observeArtwork);
    cards.observe(element, { childList: true, subtree: true });
    observeArtwork();
    const suspend = () => { suspended=true; sync(); };
    const resume = () => { suspended=false; sync(); };
    const pause = new MutationObserver(sync);
    pause.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', sync); sync();
    window.addEventListener('pagehide',suspend); window.addEventListener('pageshow',resume);
    return () => { cards.disconnect(); artwork.disconnect(); resize.disconnect(); pause.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', sync); window.removeEventListener('pagehide',suspend); window.removeEventListener('pageshow',resume); };
  }, []);
  return <div ref={viewport} className="gaming-scroll-viewport" data-lenis-prevent data-paused=""
    role="group" aria-label="Game artwork" data-game-count={images.length}>
    <div className="gaming-marquee-scene">
      <div className="gaming-marquee-plane" style={{ '--columns': columnCount } as CSSProperties}>
        {columns.map((column, index) => <Marquee key={index} vertical pauseOnHover reverse={index % 2 === 1}
          className="gaming-marquee-column" ariaLabel={`Game artwork column ${index + 1}. Scroll or swipe to browse; hold to pause. Arrow keys browse; Space toggles pause.`}
          style={{ '--duration': `${Math.max(40, column.length * 5)}s` } as CSSProperties}>
          {column.map(image => <figure key={image.src} className="gaming-marquee-card" data-game-title={image.title}>
            <img className="gaming-marquee-artwork" data-src={image.src} data-srcset={image.srcset}
              sizes="(max-width:600px) 220px, (max-width:900px) 280px, 320px"
              width={image.width} height={image.height} alt={image.alt}
              decoding="async" draggable={false} />
            <figcaption>{image.title}{image.original && <> · <a href={image.original} aria-label={`View original ${image.title} artwork`} target="_blank" rel="noopener" onPointerDown={event => event.stopPropagation()}>View original</a></>}</figcaption>
          </figure>)}
        </Marquee>)}
      </div>
    </div>
  </div>;
}

/** Load styles and React only when the native games dialog opens. */
export async function mountGamingOverlay(host: HTMLElement, media: GameArtwork[], signal?: AbortSignal) {
  const { container } = await prepareOverlayHost(host, {
    stylesheet: new URL('./gaming-overlay.css', import.meta.url),
    containerClass: 'gaming-react-root', label: 'Gaming',
  }, signal);
  const gallery = host.closest('dialog');
  if (signal?.aborted || !gallery?.open) return () => {};
  // Retain the existing native-dialog lifecycle and local responsive artwork.
  gallery.classList.add('gaming-tilted-active');
  host.hidden = false;
  const root = createRoot(container);
  root.render(<GamingOverlay images={media} />);
  return () => { root.unmount(); host.hidden = true; gallery.classList.remove('gaming-tilted-active'); };
}
