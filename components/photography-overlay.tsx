import { prepareOverlayHost } from '@/lib/overlay-host';
import { createRoot } from 'react-dom/client';
import { HeroCarousel, type HeroCarouselItem } from '@/components/ui/hero-carousel';
import { photographyHeroSources } from '@/photography-hero-data.js';
import { touchPerformance } from '@/touch-performance.js';
import { mobileMediaSource, mobileMediaSrcset, mobileMediaSources } from '@/mobile-media.js';

const heroSources: Record<string, { src: string; width: number }[]> = photographyHeroSources;

interface PhotographyMedia {
  type: 'image' | 'video';
  src: string;
  original?: string;
  sourceOriginal?: string;
  srcset?: string;
  poster?: string;
  width: number;
  height: number;
  alt: string;
  label?: string;
  edited?: boolean;
  overlayImage?: string;
  overlaySources?: { src: string; width: number }[];
  overlayWidth?: number;
  overlayHeight?: number;
}

/** A React island: styles and events stay inside the existing native dialog. */
export async function mountPhotographyCarousel(host: HTMLElement, media: PhotographyMedia[], signal?: AbortSignal) {
  const { shadow, container } = await prepareOverlayHost(host, {
    stylesheet: new URL('./photography-carousel.css', import.meta.url),
    containerClass: 'photography-react-root', label: 'Photography', errorLabel: 'Photography carousel',
  }, signal);
  // The camera dialog may have closed while its first bundle was loading.
  if (signal?.aborted || !host.closest('dialog')?.open) return () => {};
  const items: HeroCarouselItem[] = media.map(item => ({
    id: item.original ?? item.src,
    title: item.type === 'video' ? 'Moving\nmoments.' : 'Through\nmy lens.',
    image: mobileMediaSource(item.type === 'video' ? item.poster ?? item.src : item.src),
    fullImage: mobileMediaSource(item.type === 'video' ? item.poster ?? item.src : item.overlayImage ?? item.src),
    originalHref: item.sourceOriginal ?? item.original,
    fullSources: item.type === 'image' ? mobileMediaSources(item.overlaySources ?? heroSources[item.original ?? item.src]) : undefined,
    width: item.width,
    height: item.height,
    fullWidth: item.overlayWidth ?? item.width,
    fullHeight: item.overlayHeight ?? item.height,
    desktopSourceWidth: item.type === 'image' && !touchPerformance ? 3840 : undefined,
    srcSet: item.type === 'image'
      ? mobileMediaSrcset(item.srcset ?? '')
      : undefined,
    videoSrc: item.type === 'video' ? mobileMediaSource(item.src) : undefined,
    alt: item.alt,
    caption: item.label && !/^Photograph\s+\d+$/i.test(item.label.trim()) ? item.label : undefined,
    credit: 'BY SHUBHAM.'
  }));
  const root = createRoot(container);
  root.render(<HeroCarousel items={items} defaultIndex={Math.min(4, items.length - 1)} className="photo-carousel" />);
  return () => {
    shadow.querySelectorAll('video').forEach(video => video.pause());
    root.unmount();
  };
}
