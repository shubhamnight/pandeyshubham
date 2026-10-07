'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { createTravelVideoPlayer } from '../../travel-video-player.js';

gsap.registerPlugin(SplitText);

const LERP_FACTOR = .08, DRAG_LERP_FACTOR = .22;
const MOMENTUM_FRICTION = .92, MIN_MOMENTUM = .1;
const lerp = (a: number, b: number, n: number) => a + (b - a) * n;

export interface ZoomSliderItem {
  number: string;
  type?: 'image' | 'video';
  src: string;
  title: string;
  desc: string;
  srcSet?: string;
  original?: string;
  alt?: string;
  poster?: string;
  width?: number;
  height?: number;
  videoFrameRatio?: number;
}

function TravelSliderVideo({ item, onReady }: { item: ZoomSliderItem;
  onReady: (video: HTMLVideoElement | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady); readyRef.current = onReady;
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const player = createTravelVideoPlayer(item, { deferSource: true });
    const video = player.querySelector('video')!;
    host.append(player); readyRef.current(video);
    return () => {
      readyRef.current(null); video.pause(); video.removeAttribute('src'); video.load(); player.remove();
    };
  }, [item]);
  return <div ref={hostRef} className="absolute inset-0" />;
}

interface ZoomSliderCompProps {
  sliderData: ZoomSliderItem[];
  title?: string;
  subheading?: string;
  scaleOnHover?: boolean;
  textOnHover?: boolean;
  size?: number;
  easeScrollPercentage?: number;
}

/** Supplied zoom-strip geometry and motion, scoped to the containing overlay. */
export function ZoomSliderComp({ sliderData: images, title, subheading,
  scaleOnHover = true, textOnHover = true, size = 1, easeScrollPercentage = 100,
}: ZoomSliderCompProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageWrapRefs = useRef<(HTMLElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videoPlayingRef = useRef(new WeakMap<HTMLVideoElement, { wanted: boolean; failed: boolean }>());
  const viewportVisibleRef = useRef(true);
  const setVideoPlaying = useCallback((video: HTMLVideoElement, playing: boolean, retry = false) => {
    const previous = videoPlayingRef.current.get(video);
    if (previous?.wanted === playing && !(retry && playing && previous.failed)) return;
    const state = { wanted: playing, failed: false };
    videoPlayingRef.current.set(video, state);
    if (playing) video.play().catch(() => {
      // A superseded request cannot cancel the new playback state. Allow a
      // later gesture/visibility update to retry a blocked or interrupted play.
      if (videoPlayingRef.current.get(video) === state) state.failed = true;
    });
    else video.pause();
  }, []);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const announcedIndexRef = useRef(0);
  const stateRef = useRef({ current: 0, target: 0, raf: 0, isDragging: false,
    lastX: 0, lastY: 0, velocity: 0, dragged: false, dragDistance: 0 });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const read = () => {
      const w = viewport.clientWidth, h = viewport.clientHeight;
      setBox(previous => previous.w === w && previous.h === h ? previous : { w, h });
    };
    const observer = new ResizeObserver(read);
    read(); observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(preference.matches);
    sync(); preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

  const isMobile = box.w < 640, isTablet = box.w >= 640 && box.w < 1025;
  const resolvedSize = Math.max(.5, Number(size) || 1);
  const cardWidthMax = Math.min((isMobile ? 260 : isTablet ? 500 : 680) * resolvedSize, Math.max(1, box.w));
  const cardHeightMax = Math.max(1, Math.min(Math.round(box.h * (isMobile ? .6 : .82) * resolvedSize), box.h - 32));
  const cardHeightMin = Math.min((isMobile ? 80 : 50) * resolvedSize, cardHeightMax);
  const cardStep = cardWidthMax;
  const easingPercentage = Math.max(20, Number(easeScrollPercentage) || 100);

  const positionCards = useCallback((offset: number) => {
    if (!images.length || !box.w || !box.h) return;
    const loopWidth = images.length * cardStep;
    const easingDistance = 2 * box.w * (easingPercentage / 100);
    const mapVtoX = (value: number) => value <= 0 ? 0 : value >= easingDistance
      ? value - easingDistance / 2 : value * value / (2 * easingDistance);
    const normalizedOffset = ((offset % loopWidth) + loopWidth) % loopWidth;
    const startIndex = Math.floor(normalizedOffset / cardStep);
    const fractionalOffset = (normalizedOffset % cardStep) / cardStep;
    for (let index = 0; index < images.length; index++) {
      const cardIndex = (startIndex + index) % images.length;
      const card = cardRefs.current[cardIndex], wrap = imageWrapRefs.current[cardIndex];
      if (!card || !wrap) continue;
      const visualOffset = (index - fractionalOffset) * cardStep;
      const x = mapVtoX(visualOffset), width = mapVtoX(visualOffset + cardStep) - x;
      if (x >= box.w + cardStep && wrap.inert) continue;
      const height = cardHeightMin + width / cardWidthMax * (cardHeightMax - cardHeightMin);
      // Keep the strip's spacing and easing; fit videos to their own frame
      // proportions inside the same virtual card, without stretching footage.
      const videoRatio = images[cardIndex].type === 'video' ? (images[cardIndex].videoFrameRatio ?? 9 / 16) : 0;
      const frameWidth = videoRatio ? Math.min(width, height * videoRatio) : width;
      const frameHeight = videoRatio ? frameWidth / videoRatio : height;
      const frameX = x + (width - frameWidth) / 2;
      card.style.transform = `translate(${frameX}px, ${box.h - frameHeight}px)`;
      wrap.style.width = `${frameWidth}px`; wrap.style.height = `${frameHeight}px`;
      const shown = frameWidth > 24 && frameX < box.w && frameX + frameWidth > 0;
      if (wrap.tabIndex !== (shown ? 0 : -1)) wrap.tabIndex = shown ? 0 : -1;
      if (wrap.inert === shown) wrap.inert = !shown;
      // Fetch only approaching cards; keep decoded images when they loop around.
      const image = imageRefs.current[cardIndex];
      const imageSize = `${Math.min(cardWidthMax, box.w)}px`;
      if (image && image.sizes !== imageSize) image.sizes = imageSize;
      if (image && x < box.w + cardStep && !image.hasAttribute('src')) {
        if (images[cardIndex].srcSet) image.srcset = images[cardIndex].srcSet!;
        image.src = images[cardIndex].src;
      }
      const video = videoRefs.current[cardIndex];
      if (video) {
        if (x < box.w + cardStep && !video.hasAttribute('src')) {
          video.preload = 'metadata'; video.src = images[cardIndex].src;
        }
        setVideoPlaying(video, shown && viewportVisibleRef.current && !document.hidden);
      }
    }
    if (startIndex !== announcedIndexRef.current) {
      announcedIndexRef.current = startIndex; setActiveIndex(startIndex);
    }
  }, [box, cardHeightMax, cardHeightMin, cardStep, cardWidthMax, images, easingPercentage, setVideoPlaying]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !images.length || !box.w || !box.h) return;
    const state = stateRef.current, loopWidth = images.length * cardStep;
    // Preserve the same image position when an orientation change resizes cards.
    const previousStep = Number(viewport.dataset.cardStep) || cardStep;
    state.current = state.current / previousStep * cardStep;
    state.target = state.target / previousStep * cardStep;
    viewport.dataset.cardStep = String(cardStep);
    let visible = true, pointerId: number | null = null;
    const tick = () => {
      state.raf = 0;
      if (document.hidden || !visible) return;
      if (!reduceMotion && !state.isDragging && Math.abs(state.velocity) > MIN_MOMENTUM) {
        state.target += state.velocity; state.velocity *= MOMENTUM_FRICTION;
      } else if (!state.isDragging) state.velocity = 0;
      state.current = lerp(state.current, state.target,
        reduceMotion ? 1 : state.isDragging ? DRAG_LERP_FACTOR : LERP_FACTOR);
      const settled = Math.abs(state.current - state.target) < .01 &&
        Math.abs(state.velocity) <= MIN_MOMENTUM && !state.isDragging;
      if (settled) {
        state.current = state.target;
        const shift = Math.round(state.current / loopWidth) * loopWidth;
        state.current -= shift; state.target -= shift;
      }
      positionCards(state.current);
      if (!settled) state.raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!state.raf && visible && !document.hidden) state.raf = requestAnimationFrame(tick);
    };
    const retryVideos = () => {
      videoRefs.current.forEach(video => {
        if (video && videoPlayingRef.current.get(video)?.wanted) setVideoPlaying(video, true, true);
      });
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.h : 1;
      state.velocity = 0;
      state.target -= (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
      wake();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      pointerId = event.pointerId;
      state.isDragging = true; state.dragged = false; state.dragDistance = 0; state.velocity = 0;
      state.lastX = event.clientX; state.lastY = event.clientY;
      // Keep dragging attached to the image surface throughout the gesture.
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      retryVideos();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!state.isDragging || event.pointerId !== pointerId) return;
      const dx = event.clientX - state.lastX, dy = event.clientY - state.lastY;
      const delta = (Math.abs(dx) >= Math.abs(dy) ? -dx : -dy) * (event.pointerType === 'touch' ? -1 : 1);
      state.dragDistance += Math.abs(dx) + Math.abs(dy);
      if (state.dragDistance > 6) state.dragged = true;
      state.target += delta; state.velocity = lerp(state.velocity, delta, .5);
      state.lastX = event.clientX; state.lastY = event.clientY; wake();
    };
    const endDrag = () => { state.isDragging = false; pointerId = null; wake(); };
    const select = (index: number) => {
      // Invert the existing strip geometry to place this image in the largest
      // fully visible frame. Move within the nearest loop, preserving order.
      const easingDistance = 2 * box.w * (easingPercentage / 100);
      const edge = box.w >= easingDistance / 2 ? box.w + easingDistance / 2
        : Math.sqrt(2 * easingDistance * box.w);
      const featuredOffset = Math.min(Math.max(0, edge - cardStep), Math.max(0, loopWidth - cardStep));
      const target = index * cardStep - featuredOffset;
      state.target = target + Math.round((state.current - target) / loopWidth) * loopWidth;
      state.velocity = 0; state.dragged = false; wake();
    };
    const onClick = (event: MouseEvent) => {
      if (event.detail > 0 && state.dragged) {
        state.dragged = false; event.preventDefault(); return;
      }
      const surface = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-travel-index]') : null;
      if (!surface || !viewport.contains(surface)) return;
      retryVideos();
      const index = Number(surface.dataset.travelIndex);
      if (Number.isInteger(index) && index >= 0 && index < images.length) select(index);
    };
    const onKey = (event: KeyboardEvent) => {
      retryVideos();
      if (['Enter', ' '].includes(event.key) && event.target instanceof HTMLElement && event.target.dataset.travelIndex && event.target.tagName !== 'BUTTON') {
        event.preventDefault(); select(Number(event.target.dataset.travelIndex)); return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); state.velocity = 0;
      if (event.key === 'Home') state.target = 0;
      else if (event.key === 'End') state.target = (images.length - 1) * cardStep;
      else state.target += ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -cardStep : cardStep;
      wake();
    };
    const syncVisibility = () => {
      if (document.hidden) {
        videoRefs.current.forEach(video => { if (video) setVideoPlaying(video, false); });
        cancelAnimationFrame(state.raf); state.raf = 0;
        state.isDragging = false; pointerId = null; state.velocity = 0;
      } else wake();
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      viewportVisibleRef.current = visible;
      if (visible) wake(); else {
        videoRefs.current.forEach(video => { if (video) setVideoPlaying(video, false); });
        cancelAnimationFrame(state.raf); state.raf = 0;
      }
    });
    observer.observe(viewport);
    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove, { passive: true });
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('lostpointercapture', endDrag);
    viewport.addEventListener('click', onClick);
    viewport.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', syncVisibility);
    positionCards(state.current); wake();
    return () => {
      cancelAnimationFrame(state.raf); state.raf = 0; state.isDragging = false;
      observer.disconnect();
      videoRefs.current.forEach(video => { if (video) setVideoPlaying(video, false); });
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', endDrag);
      viewport.removeEventListener('pointercancel', endDrag);
      viewport.removeEventListener('lostpointercapture', endDrag);
      viewport.removeEventListener('click', onClick);
      viewport.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, [box, cardStep, images.length, positionCards, reduceMotion, easingPercentage, setVideoPlaying]);

  useEffect(() => {
    if (!box.w || !box.h) return;
    const cleanups: (() => void)[] = [];
    cardRefs.current.forEach((card, index) => {
      const text = textRefs.current[index], wrap = imageWrapRefs.current[index];
      if (!card || !text || !wrap) return;
      const elements = text.querySelectorAll('[data-title], [data-desc]');
      const split = elements.length ? SplitText.create(Array.from(elements), { type: 'lines', mask: 'lines' }) : null;
      const lines = split?.lines ?? [];
      const image = imageRefs.current[index];
      if (lines.length) gsap.set(lines, { yPercent: 100 }); gsap.set(text, { autoAlpha: 0 });
      const enter = () => {
        gsap.killTweensOf([text, lines]);
        if (textOnHover && lines.length) {
          gsap.set(text, { autoAlpha: 1 });
          gsap.to(lines, { yPercent: 0, duration: reduceMotion ? .18 : .55,
            stagger: reduceMotion ? 0 : .05, ease: 'power3.out', overwrite: true });
        }
        if (image && scaleOnHover && !reduceMotion)
          gsap.to(image, { scale: 1.05, duration: .6, ease: 'power2.out', overwrite: true });
      };
      const leave = () => {
        gsap.killTweensOf([text, lines]);
        if (lines.length) gsap.to(lines, { yPercent: 100, duration: reduceMotion ? .18 : .28,
          stagger: reduceMotion ? 0 : .03, ease: 'power2.in',
          onComplete: () => gsap.set(text, { autoAlpha: 0 }) });
        if (image && scaleOnHover)
          gsap.to(image, { scale: 1, duration: .6, ease: 'power2.out', overwrite: true });
      };
      const pointerEnter = (event: PointerEvent) => { if (event.pointerType !== 'touch') enter(); };
      const pointerLeave = (event: PointerEvent) => { if (event.pointerType !== 'touch') leave(); };
      wrap.addEventListener('pointerenter', pointerEnter); wrap.addEventListener('pointerleave', pointerLeave);
      wrap.addEventListener('focus', enter); wrap.addEventListener('blur', leave);
      cleanups.push(() => {
        wrap.removeEventListener('pointerenter', pointerEnter); wrap.removeEventListener('pointerleave', pointerLeave);
        wrap.removeEventListener('focus', enter); wrap.removeEventListener('blur', leave);
        gsap.killTweensOf([text, ...lines, ...(image ? [image] : [])]); split?.revert();
      });
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [box.w, box.h, images, reduceMotion, scaleOnHover, textOnHover]);

  return <div ref={viewportRef} className="zoom-slider relative w-full h-full overflow-hidden"
    style={{ touchAction: 'none' }} tabIndex={0} role="region"
    aria-label="Travel photographs and videos. Click a card, scroll, drag, or use arrow keys to explore." data-lenis-prevent>
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {images[activeIndex]?.title ? `${images[activeIndex].title}, ` : ''}{images[activeIndex]?.type === 'video' ? 'video' : 'photograph'} {activeIndex + 1} of {images.length}
    </div>
    {title && <div className="pointer-events-none absolute left-1/2 top-10 z-20 -translate-x-1/2 px-4 text-center">
      <h2 className="text-4xl max-md:text-2xl">{title}</h2>
      {subheading && <p className="mt-3 text-sm">{subheading}</p>}
    </div>}
    <div className="absolute inset-0">
      {images.map((item, index) => <div key={item.original ?? item.src}
        ref={element => { cardRefs.current[index] = element; }} className="zoom-card absolute left-0 top-0">
        <div ref={element => { textRefs.current[index] = element; }}
          className="zoom-caption absolute z-10 flex w-full flex-col gap-1.25">
          {item.title && <p data-title className="select-none text-[13px] font-extrabold uppercase leading-[1.15] tracking-[0.08em] text-white">{item.title}</p>}
          {item.desc && <p data-desc className="select-none text-[10px] leading-normal tracking-[0.04em] text-white/60">{item.desc}</p>}
        </div>
        {item.type === 'video' ? <div ref={element => { imageWrapRefs.current[index] = element; }}
          data-travel-index={index} tabIndex={-1} role="group"
          aria-label={`Show ${item.title || 'this video'} in the featured position`}
          className="zoom-image-wrap relative block overflow-hidden border-0 p-0 text-left">
          <TravelSliderVideo item={item} onReady={video => { videoRefs.current[index] = video; }} />
        </div> : <button ref={element => { imageWrapRefs.current[index] = element; }} type="button"
          data-travel-index={index} tabIndex={-1}
          aria-label={`Show ${item.title || item.alt || 'this photograph'} in the featured position`}
          draggable={false} className="zoom-image-wrap relative block overflow-hidden border-0 p-0 text-left">
          <img ref={element => { imageRefs.current[index] = element; }}
            alt={item.alt ?? item.title} draggable={false} decoding="async"
            className="pointer-events-none absolute inset-0 select-none object-cover w-full h-full"
            style={{ objectPosition: 'center bottom', transition: 'none' }} />
        </button>}
      </div>)}
    </div>
  </div>;
}

export default ZoomSliderComp;
