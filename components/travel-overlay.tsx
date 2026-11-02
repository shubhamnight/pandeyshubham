import { prepareOverlayHost } from '@/lib/overlay-host';
import { createRoot } from 'react-dom/client';
import { ZoomSliderComp, type ZoomSliderItem } from '@/components/ui/zoom-slider';

/** Mount only while the native traveling dialog is open. */
export async function mountTravelOverlay(host: HTMLElement, images: ZoomSliderItem[], signal?: AbortSignal) {
  if (signal?.aborted) return () => {};
  const { container } = await prepareOverlayHost(host, {
    stylesheet: new URL('./travel-overlay.css', import.meta.url),
    containerClass: 'travel-react-root', label: 'Travel',
  }, signal);
  const gallery = host.closest('dialog');
  if (signal?.aborted || !gallery?.open) return () => {};
  gallery.classList.add('travel-zoom-active'); host.hidden = false;
  const root = createRoot(container);
  root.render(<ZoomSliderComp sliderData={images} scaleOnHover textOnHover size={1} easeScrollPercentage={100} />);
  return () => { root.unmount(); host.hidden = true; gallery.classList.remove('travel-zoom-active'); };
}
