"use client";

import * as React from 'react';
import { motion, useInView, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AetherFlowHeroProps {
  className?: string;
  onReady?: () => void;
  backgroundOnly?: boolean;
  pointerTarget?: HTMLElement;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

/** The supplied particle hero, adapted for the portfolio's connect section. */
export default function AetherFlowHero({ className, onReady, backgroundOnly = false, pointerTarget }: AetherFlowHeroProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const inView = useInView(stageRef, { amount: .15 });
  const reducedMotion = useReducedMotion();
  const [wordIndex, setWordIndex] = React.useState(0);
  const words = ['meaningful.', 'unexpected.', 'memorable.'];

  React.useEffect(() => {
    if (backgroundOnly || !inView || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.hidden || document.body.classList.contains('motion-paused') || document.body.classList.contains('intro-active')) return;
      setWordIndex(index => (index + 1) % 3);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [backgroundOnly, inView, reducedMotion]);

  React.useLayoutEffect(() => { onReady?.(); }, [onReady]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    // A background can observe the footer's pointer events without blocking links.
    const pointerSurface = pointerTarget ?? stage;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    const ctx = context;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const mouse = { x: 0, y: 0, active: false, radius: 200 };
    let width = 0, height = 0, density = 0;
    let visible = false, frame = 0, lastDraw = 0;
    let suspended = false;
    let particles: Particle[] = [];
    let buckets: Particle[][] = [];
    let columns = 1, rows = 1, cellSize = 1, connectionSquared = 0;
    const frameInterval = 1000 / (matchMedia('(pointer:coarse)').matches ? 30 : 60);

    function paused() {
      return suspended || document.hidden || !visible || motionPreference.matches ||
        ['intro-active', 'motion-paused', 'photography-gallery-open'].some(name => document.body.classList.contains(name));
    }

    function draw(elapsed = 0) {
      const step = elapsed / (1000 / 60);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0c0d10';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#5685c1';
      ctx.globalAlpha = .8;
      // Match the reference's straight drift, dot sizes and direct repulsion.
      for (const particle of particles) {
        if (step) {
          if (particle.x > width || particle.x < 0) particle.vx *= -1;
          if (particle.y > height || particle.y < 0) particle.vy *= -1;
          if (mouse.active) {
            const dx = mouse.x - particle.x, dy = mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Guard the zero-distance case in the original component.
            if (distance > .001 && distance < mouse.radius + particle.size) {
              const force = (mouse.radius - distance) / mouse.radius * 5 * step;
              particle.x -= dx / distance * force;
              particle.y -= dy / distance * force;
            }
          }
          particle.x += particle.vx * step;
          particle.y += particle.vy * step;
        }
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      // The original connects within (width / 7) * (height / 7), using
      // 1 - distanceSquared / 20000 opacity. Transparent pairs can be skipped.
      // Reusing local buckets preserves that look without an all-pairs scan.
      for (const bucket of buckets) bucket.length = 0;
      ctx.lineWidth = 1;
      for (const particle of particles) {
        const column = Math.max(0, Math.min(columns - 1, Math.floor(particle.x / cellSize)));
        const row = Math.max(0, Math.min(rows - 1, Math.floor(particle.y / cellSize)));
        for (let y = Math.max(0, row - 1); y <= Math.min(rows - 1, row + 1); y++) {
          for (let x = Math.max(0, column - 1); x <= Math.min(columns - 1, column + 1); x++) {
            for (const neighbor of buckets[y * columns + x]) {
              const dx = particle.x - neighbor.x, dy = particle.y - neighbor.y;
              const distanceSquared = dx * dx + dy * dy;
              if (distanceSquared >= connectionSquared) continue;
              ctx.globalAlpha = Math.max(0, 1 - distanceSquared / 20000);
              const highlighted = mouse.active &&
                (neighbor.x - mouse.x) ** 2 + (neighbor.y - mouse.y) ** 2 < mouse.radius ** 2;
              ctx.strokeStyle = highlighted ? '#e7ebf0' : '#87acd9';
              ctx.beginPath();
              ctx.moveTo(neighbor.x, neighbor.y);
              ctx.lineTo(particle.x, particle.y);
              ctx.stroke();
            }
          }
        }
        buckets[row * columns + column].push(particle);
      }
      ctx.globalAlpha = 1;
    }

    function tick(now: number) {
      frame = 0;
      if (paused()) return;
      if (!lastDraw || now - lastDraw >= frameInterval - 1) {
        draw(lastDraw ? Math.min(50, now - lastDraw) : 1000 / 60);
        lastDraw = now;
      }
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      if (paused()) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastDraw = 0;
        mouse.active = false;
      } else if (!frame) {
        lastDraw = 0;
        frame = requestAnimationFrame(tick);
      }
    }

    function resize() {
      const nextWidth = Math.round(stage!.clientWidth);
      const nextHeight = Math.round(stage!.clientHeight);
      const nextDensity = Math.min(window.devicePixelRatio || 1, 1.5);
      if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight && density === nextDensity)) return;
      const previousWidth = width, previousHeight = height;
      width = nextWidth;
      height = nextHeight;
      density = nextDensity;
      canvas!.width = Math.round(width * density);
      canvas!.height = Math.round(height * density);
      ctx.setTransform(density, 0, 0, density, 0, 0);
      connectionSquared = Math.min(width * height / 49, 20000);
      cellSize = Math.sqrt(connectionSquared);
      columns = Math.max(1, Math.ceil(width / cellSize));
      rows = Math.max(1, Math.ceil(height / cellSize));
      buckets = Array.from({ length: columns * rows }, () => []);
      // Mirror the reference density at normal sizes, bound very large screens.
      const count = Math.min(220, Math.ceil(width * height / 9000));
      if (previousWidth && previousHeight) {
        for (const particle of particles) {
          particle.x *= width / previousWidth;
          particle.y *= height / previousHeight;
        }
      }
      particles.length = Math.min(particles.length, count);
      while (particles.length < count) {
        const size = Math.random() * 2 + 1;
        particles.push({
          x: Math.random() * Math.max(1, width - size * 4) + size * 2,
          y: Math.random() * Math.max(1, height - size * 4) + size * 2,
          vx: Math.random() * .4 - .2, vy: Math.random() * .4 - .2, size,
        });
      }
      mouse.active = false;
      draw();
      sync();
    }

    function pointerMove(event: PointerEvent) {
      if (paused() || event.pointerType === 'touch') return;
      const bounds = stage!.getBoundingClientRect();
      mouse.x = event.clientX - bounds.left;
      mouse.y = event.clientY - bounds.top;
      mouse.active = true;
    }
    function pointerLeave() { mouse.active = false; }
    function suspend() { suspended = true; sync(); }
    function resume() { suspended = false; sync(); }
    const visibility = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      sync();
    });
    const resizeObserver = new ResizeObserver(resize);
    const bodyObserver = new MutationObserver(sync);
    resize();
    visibility.observe(stage);
    resizeObserver.observe(stage);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    pointerSurface.addEventListener('pointermove', pointerMove, { passive: true });
    pointerSurface.addEventListener('pointerleave', pointerLeave);
    document.addEventListener('visibilitychange', sync);
    motionPreference.addEventListener('change', sync);
    window.addEventListener('pageshow', resume);
    window.addEventListener('pagehide', suspend);
    return () => {
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resizeObserver.disconnect();
      bodyObserver.disconnect();
      pointerSurface.removeEventListener('pointermove', pointerMove);
      pointerSurface.removeEventListener('pointerleave', pointerLeave);
      document.removeEventListener('visibilitychange', sync);
      motionPreference.removeEventListener('change', sync);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('pagehide', suspend);
    };
  }, [pointerTarget]);

  if (backgroundOnly) {
    return <div ref={stageRef} className={cn('connect-aether-background', className)}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>;
  }

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: (index: number) => ({
      opacity: 1, y: 0,
      transition: { delay: reducedMotion ? 0 : index * .16, duration: reducedMotion ? 0 : .75, ease: [.22, 1, .36, 1] },
    }),
  };

  return (
    <div ref={stageRef} className={cn('connect-hero relative flex min-h-svh w-full items-center justify-center overflow-hidden', className)}>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="connect-copy relative z-10 w-full px-6 text-center">
        <motion.h2 className="connect-title" custom={0} variants={fadeUp}
          initial={reducedMotion ? false : 'hidden'} animate={inView || reducedMotion ? 'visible' : 'hidden'}>
          Let’s make<br />something <motion.em key={wordIndex}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : .45, ease: [.22, 1, .36, 1] }}>
            {words[wordIndex]}
          </motion.em>
        </motion.h2>
      </div>
    </div>
  );
}
