"use client";

import {
  useScroll, useMotionValueEvent, useReducedMotion, cubicBezier,
} from 'framer-motion';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

const easeIntoFocus = cubicBezier(.22, 1, .36, 1);
const easeOutOfFocus = cubicBezier(0, 0, .58, 1);

export interface TiltedGridImage {
  src: string;
  alt: string;
  title?: string;
  srcSet?: string;
  href?: string;
  width?: number;
  height?: number;
}
export type MaxWidthToken = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'none';
export type GapToken = 4 | 6 | 8 | 10 | 12 | 14;
const MAX_WIDTH_CLASS: Record<MaxWidthToken, string> = {
  sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl',
  '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', none: '',
};
const GAP_CLASS: Record<GapToken, string> = {
  4: 'gap-4', 6: 'gap-6', 8: 'gap-8', 10: 'gap-10', 12: 'gap-12', 14: 'gap-14',
};
type ScrollContainer = RefObject<HTMLElement | null>;
type TileConfig = {
  aspectRatio: string;
  perspective: number;
  maxTilt: number;
  maxBlur: number;
  rounded: string;
};

function Artwork({ image, index, requested = true }: { image: TiltedGridImage; index: number; requested?: boolean }) {
  const picture = <img className="tilted-artwork" src={requested ? image.src : undefined}
    srcSet={requested ? image.srcSet : undefined}
    sizes="(max-width:520px) 308px, (max-width:820px) 42vw, 340px"
    width={image.width} height={image.height} alt={image.alt}
    loading={index < 2 ? 'eager' : 'lazy'} decoding="async" draggable={false} />;
  return image.href ? (
    <a className="tilted-artwork-link" href={image.href} target="_blank" rel="noopener noreferrer"
      aria-label={`Open ${image.title ?? image.alt} artwork at original resolution`}>
      {picture}
    </a>
  ) : picture;
}

function ScrollCardMotion({ index, config, container, target, card, inner, caption, focused }: {
  index: number; config: TileConfig; container?: ScrollContainer;
  target: RefObject<HTMLElement | null>; focused: boolean;
  card: RefObject<HTMLDivElement | null>; inner: RefObject<HTMLDivElement | null>;
  caption: RefObject<HTMLElement | null>;
}) {
  const { scrollYProgress: p } = useScroll({
    container, target, offset: ['start end', 'end start'],
  });
  const reduce = useReducedMotion();
  // All supplied transforms share the same easing. Compute it once per visible card/frame.
  const apply = useCallback((progress: number) => {
    const element = card.current, surface = inner.current;
    if (!element || !surface) return;
    const value = Math.max(0, Math.min(1, progress));
    if (caption.current) caption.current.style.visibility = value >= .46 && value <= .54 ? 'visible' : 'hidden';
    if (reduce || focused) {
      element.style.filter = 'none'; element.style.transform = 'none'; surface.style.transform = 'none';
      return;
    }
    const entering = value <= .5;
    const distance = entering ? 1 - easeIntoFocus(value * 2) : easeOutOfFocus((value - .5) * 2);
    const direction = entering ? 1 : -1;
    const sign = index % 2 === 0 ? -1 : 1;
    element.style.filter = `blur(${config.maxBlur * distance}px) brightness(${1 - distance}) contrast(${1 + 3 * distance})`;
    element.style.transform = `translateX(${sign * 40 * distance}%) translateY(${direction * 100 * distance}%) translateZ(${300 * distance}px) rotate(${-sign * direction * 5 * distance}deg) rotateX(${direction * config.maxTilt * distance}deg) skewX(${sign * direction * 20 * distance}deg)`;
    surface.style.transform = `scaleY(${1 + .8 * distance})`;
  }, [card, inner, caption, config, focused, index, reduce]);
  useMotionValueEvent(p, 'change', apply);
  useLayoutEffect(() => {
    apply(p.get());
    const element = card.current, surface = inner.current, label = caption.current;
    return () => {
      if (element) { element.style.filter = ''; element.style.transform = ''; }
      if (surface) surface.style.transform = '';
      if (label) label.style.visibility = 'hidden';
    };
  }, [apply, p, card, inner, caption]);
  return null;
}

// Retain each tile's geometry and links, but release Motion subscriptions outside the viewport buffer.
const Tile = memo(function Tile({ image, index, config, container, active }: {
  image: TiltedGridImage; index: number; config: TileConfig; container?: ScrollContainer; active: boolean;
}) {
  const target = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(false);
  const [requested, setRequested] = useState(active);
  const visible = active || focused;
  useEffect(() => { if (visible) setRequested(true); }, [visible]);
  return <figure ref={target} data-tilted-index={index} className="tilted-tile relative z-10 m-0"
    style={{ perspective: config.perspective }} onFocusCapture={() => setFocused(true)}
    onBlurCapture={() => setFocused(false)}>
      <div ref={card} className="tilted-card relative w-full overflow-hidden"
        style={{ aspectRatio: config.aspectRatio, borderRadius: config.rounded,
          opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}>
        <div ref={inner} className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
          <Artwork image={image} index={index} requested={visible || requested} />
        </div>
      </div>
      {image.title && <figcaption ref={caption} className="tilted-caption">{image.title}</figcaption>}
      {visible && <ScrollCardMotion index={index} config={config} container={container} target={target}
        card={card} inner={inner} caption={caption} focused={focused} />}
  </figure>;
});

export interface ScrollTiltedGridProps {
  images?: readonly (string | TiltedGridImage)[];
  container?: ScrollContainer;
  loop?: boolean;
  initialCycles?: number;
  aspectRatio?: string;
  maxWidth?: MaxWidthToken;
  gap?: GapToken;
  perspective?: number;
  maxTilt?: number;
  maxBlur?: number;
  rounded?: string;
  className?: string;
}

/** The supplied scroll-tilt animation, with support for a dialog scroll root and local artwork. */
export function ScrollTiltedGrid({
  images = [], container, loop = false, initialCycles = 3, aspectRatio = '3/4',
  maxWidth = 'lg', gap = 10, perspective = 900, maxTilt = 70, maxBlur = 8,
  rounded = '.375rem', className,
}: ScrollTiltedGridProps) {
  const [cycles, setCycles] = useState(loop ? initialCycles : 1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeTiles, setActiveTiles] = useState(() => new Set([0, 1, 2, 3]));
  useEffect(() => {
    if (!loop || !sentinelRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setCycles(value => value + 2);
    }, { root: container?.current, rootMargin: '1500px 0px 1500px 0px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loop, container]);
  const items = useMemo(() => {
    const normalized = images.map((image, i) => typeof image === 'string'
      ? { src: image, alt: `Gallery image ${i + 1}` } : image);
    return loop ? Array.from({ length: cycles }, () => normalized).flat() : normalized;
  }, [images, loop, cycles]);
  const config = useMemo(() => ({ aspectRatio, perspective, maxTilt, maxBlur, rounded }),
    [aspectRatio, perspective, maxTilt, maxBlur, rounded]);
  useEffect(() => {
    if (!gridRef.current) return;
    // One observer for the entire grid; the buffer covers the cards' entry/exit transforms.
    const observer = new IntersectionObserver(entries => {
      setActiveTiles(previous => {
        const next = new Set(previous);
        let changed = false;
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.tiltedIndex);
          if (entry.isIntersecting === previous.has(index)) continue;
          changed = true;
          if (entry.isIntersecting) next.add(index); else next.delete(index);
        }
        return changed ? next : previous;
      });
    }, { root: container?.current, rootMargin: '350px 0px', threshold: 0 });
    gridRef.current.querySelectorAll('[data-tilted-index]').forEach(tile => observer.observe(tile));
    return () => observer.disconnect();
  }, [container, items.length]);
  return (
    <section className={['relative w-full', className].filter(Boolean).join(' ')} aria-label="Game artwork">
      <div ref={gridRef} className={['tilted-grid mx-auto grid w-full grid-cols-2 px-6',
        MAX_WIDTH_CLASS[maxWidth], GAP_CLASS[gap]].filter(Boolean).join(' ')}>
        {items.map((image, index) => <Tile key={`${index}-${image.src}`} image={image}
          index={index} config={config} container={container} active={activeTiles.has(index)} />)}
      </div>
      {loop && <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />}
    </section>
  );
}
