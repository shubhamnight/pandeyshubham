"use client";

import { Children, useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

interface MarqueeProps extends ComponentPropsWithoutRef<'div'> {
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
  autoFill?: boolean;
  ariaLabel?: string;
  ariaLive?: 'off' | 'polite' | 'assertive';
}

/** The supplied repeating marquee, with inert copies and direct input seeking. */
export function Marquee({ className, reverse = false, pauseOnHover = false,
  children, vertical = false, repeat = 2, autoFill = false,
  ariaLabel, ariaLive = 'off', ...props }: MarqueeProps) {
  const root = useRef<HTMLDivElement>(null);
  const span = useRef(1);
  const drag = useRef<{ id: number; position: number } | null>(null);
  const [copies, setCopies] = useState(Math.max(2, repeat));

  useEffect(() => {
    const viewport = root.current, track = viewport?.firstElementChild as HTMLElement | null;
    if (!viewport || !track) return;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(viewport).getPropertyValue('--gap')) || 16;
      span.current = Math.max(1, (vertical ? track.offsetHeight : track.offsetWidth) + gap);
      setCopies(Math.max(2, repeat, autoFill
        ? Math.ceil((vertical ? viewport.clientHeight : viewport.clientWidth) / span.current) + 1 : 2));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport); observer.observe(track); measure();
    const wheel = (event: WheelEvent) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      event.preventDefault();
      const delta = vertical ? event.deltaY : event.deltaX || event.deltaY;
      seek(delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1));
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); viewport.removeEventListener('wheel', wheel); };
  }, [autoFill, repeat, vertical, reverse]);

  function seek(delta: number) {
    const viewport = root.current;
    if (!viewport || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const track of viewport.children) for (const animation of track.getAnimations()) {
      const duration = Number(animation.effect?.getTiming().duration);
      if (!duration || !Number.isFinite(duration)) continue;
      const next = Number(animation.currentTime || 0) + delta / span.current * duration * (reverse ? -1 : 1);
      animation.currentTime = ((next % duration) + duration) % duration;
    }
  }

  function release() { drag.current = null; root.current?.removeAttribute('data-held'); }

  return <div {...props} ref={root} data-slot="marquee"
    data-vertical={vertical || undefined} data-reverse={reverse || undefined}
    data-pause-hover={pauseOnHover || undefined}
    className={cn('marquee', className)} role="region" aria-label={ariaLabel}
    aria-live={ariaLive} tabIndex={0}
    onKeyDown={event => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault(); seek(event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 100 : -100);
      } else if (event.code === 'Space') {
        event.preventDefault();
        const track = event.currentTarget.firstElementChild;
        const paused = track && getComputedStyle(track).animationPlayState === 'paused';
        event.currentTarget.toggleAttribute('data-user-paused', !paused);
        event.currentTarget.toggleAttribute('data-keyboard-play', !!paused);
      }
    }}
    onBlur={event => { props.onBlur?.(event); event.currentTarget.removeAttribute('data-keyboard-play'); }}
    onPointerDown={event => {
      props.onPointerDown?.(event);
      if (event.defaultPrevented || event.pointerType === 'mouse' || !event.isPrimary ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      drag.current = { id: event.pointerId, position: vertical ? event.clientY : event.clientX };
      event.currentTarget.setAttribute('data-held', ''); event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      props.onPointerMove?.(event);
      if (!drag.current || drag.current.id !== event.pointerId) return;
      const position = vertical ? event.clientY : event.clientX;
      seek(drag.current.position - position); drag.current.position = position;
    }}
    onPointerUp={event => { props.onPointerUp?.(event); release(); }}
    onPointerCancel={event => { props.onPointerCancel?.(event); release(); }}
    onLostPointerCapture={event => { props.onLostPointerCapture?.(event); release(); }}>
    {Array.from({ length: copies }, (_, index) => <div key={index} className="marquee-track"
      aria-hidden={index > 0 || undefined} inert={index > 0 || undefined}>
      {Children.toArray(children)}
    </div>)}
  </div>;
}
