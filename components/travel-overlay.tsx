import { createRoot } from 'react-dom/client';
import { ZoomSliderComp, type ZoomSliderItem } from '@/components/ui/zoom-slider';

/** Mount only while the native traveling dialog is open. */
export async function mountTravelOverlay(host: HTMLElement, images: ZoomSliderItem[], signal?: AbortSignal) {
  if (signal?.aborted) return () => {};
  host.toggleAttribute('data-batman-cursor', document.body.classList.contains('batman-cursor-active'));
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.replaceChildren();
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./travel-overlay.css', import.meta.url).href;
  const ready = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout); signal?.removeEventListener('abort', abort);
      stylesheet.onload = stylesheet.onerror = null;
    };
    const abort = () => { cleanup(); stylesheet.remove(); reject(new DOMException('Gallery closed', 'AbortError')); };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Travel styles took too long to load.')); }, 15000);
    stylesheet.onload = () => { cleanup(); resolve(); };
    stylesheet.onerror = () => { cleanup(); reject(new Error('Travel styles could not load.')); };
    signal?.addEventListener('abort', abort, { once: true });
  });
  const container = document.createElement('div'); container.className = 'travel-react-root';
  shadow.append(stylesheet, container);
  await ready;
  const gallery = host.closest('dialog');
  if (signal?.aborted || !gallery?.open) return () => {};
  gallery.classList.add('travel-zoom-active'); host.hidden = false;
  const root = createRoot(container);
  root.render(<ZoomSliderComp sliderData={images} scaleOnHover textOnHover size={1} easeScrollPercentage={100} />);
  return () => { root.unmount(); host.hidden = true; gallery.classList.remove('travel-zoom-active'); };
}
