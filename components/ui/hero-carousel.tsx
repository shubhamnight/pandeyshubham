"use client"

// A full-bleed editorial hero driven by a filmstrip.
//
// Every card shares one top edge. The focused card unfurls to full height while
// its neighbours stay clipped to half, so the strip reads as a row of cropped
// heads with one complete photograph standing in the middle of it. The selected
// photograph fills the stage without extra tint, grain, or decorative zoom.
//
// Geometry is measured, never hard-coded: one ResizeObserver reads the stage and
// every size below is a ratio of it, so the same component is pixel-identical in
// a 600px preview box and on a 4K display.
import * as React from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion"

import { cn } from "@/lib/utils"

export interface HeroCarouselItem {
  /** Stable key; falls back to the index. @default undefined */
  id?: string | number
  /** Headline for the active slide. Newlines become separate reveal lines. */
  title: string
  /** Lightweight responsive thumbnail for the filmstrip. */
  image: string
  /** Untouched full-resolution source for the selected photograph. */
  fullImage?: string
  /** Responsive enhanced viewing copies for full-overlay backgrounds. */
  fullSources?: { src: string; width: number }[]
  width?: number
  height?: number
  /** Responsive sources retain the original photograph's full resolution. */
  srcSet?: string
  alt?: string
  /** Short visible caption, separate from the descriptive image alternative. */
  caption?: string
  videoSrc?: string
  /** Byline printed beside the headline, e.g. "BY AURELIA STUDIO." @default undefined */
  credit?: string
  /** Right-aligned facts, e.g. ["SAT NOV 15", "5-10 PM", "MIAMI"]. @default undefined */
  meta?: string[]
}

export interface HeroCarouselProps {
  /** Slides, in strip order. */
  items: HeroCarouselItem[]
  /** Focused slide when controlled. Leave unset for internal state. @default undefined */
  index?: number
  /** Focused slide on mount when uncontrolled. @default 0 */
  defaultIndex?: number
  /** Fires on every focus change, from any input. @default undefined */
  onIndexChange?: (index: number) => void
  /** Wordmark in the middle of the top bar. @default undefined */
  brand?: React.ReactNode
  /** Renders the "Back" control when provided. @default undefined */
  onBack?: () => void
  /** Renders the "Menu" control when provided. @default undefined */
  onMenu?: () => void
  /** Advance on a timer. Pauses on hover, drag and focus. @default false */
  autoplay?: boolean
  /** Milliseconds between autoplay steps. @default 4000 */
  autoplayDelay?: number
  /** Extra classes for the stage. @default undefined */
  className?: string
}

/* Ratios lifted from the reference layout, all relative to the stage box. */
const CARD_H = 0.264 // active card height ÷ stage height
const CARD_AR = 0.75 // active card is 3:4
const CARD_SCALE = 1.3 // enlarge both dimensions of every filmstrip image by 30%
const GAP = 0.038 // gap ÷ card width
const STRIP_TOP = 0.5 // strip's shared top edge, down the stage
const TITLE = 0.067 // headline cap size ÷ stage height
const LABEL = 0.0103 // small mono label ÷ stage height
const PAD = 0.017 // page gutter ÷ stage width

/** Wheel distance that commits to a step, and the lockout after one. */
const WHEEL_THRESHOLD = 60
const WHEEL_COOLDOWN = 420

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export function HeroCarousel({
  items,
  index: controlled,
  defaultIndex = 0,
  onIndexChange,
  brand,
  onBack,
  onMenu,
  autoplay = false,
  autoplayDelay = 4000,
  className,
}: HeroCarouselProps) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState({ w: 0, h: 0 })
  const [uncontrolled, setUncontrolled] = React.useState(defaultIndex)
  const [dragging, setDragging] = React.useState(false)
  const [paused, setPaused] = React.useState(false)
  const [displayed, setDisplayed] = React.useState<{ image: string; alt: string } | null>(null)
  const wheel = React.useRef({ accumulated: 0, until: 0, last: 0 })
  const positioned = React.useRef(false)
  const dragFinished = React.useRef(0)
  const reduced = useReducedMotion()

  const last = items.length - 1
  const index = clamp(controlled ?? uncontrolled, 0, Math.max(0, last))
  const active = items[index]
  const coverWidth = Math.max(box.w, box.h * ((active?.width ?? 1) / (active?.height ?? 1)))
  const neededWidth = Math.ceil(coverWidth * Math.min(window.devicePixelRatio || 1, 2))
  const sources = active?.fullSources
  const fullSource = sources?.find(source => source.width >= neededWidth)?.src ?? sources?.[sources.length - 1]?.src ?? active?.fullImage ?? active?.image

  React.useEffect(() => {
    if (!active || !box.w) return
    let cancelled = false
    const image = new Image()
    image.decoding = 'async'
    image.fetchPriority = 'high'
    const reveal = async () => {
      image.src = fullSource ?? active.image
      try {
        await image.decode()
      } catch {
        if (cancelled) return
        // Keep the original available even if a generated viewing copy is missing.
        image.src = active.fullImage ?? active.image
        try { await image.decode() } catch {
          if (cancelled) return
          image.src = active.image
          try { await image.decode() } catch { return }
        }
      }
      if (!cancelled) setDisplayed({ image: image.src, alt: active.alt ?? 'Photograph' })
    }
    void reveal()
    return () => { cancelled = true; image.removeAttribute('src') }
  }, [fullSource, active?.fullImage, active?.image, active?.alt, Boolean(box.w)])

  const go = React.useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, Math.max(0, last))
      if (controlled === undefined) setUncontrolled(clamped)
      if (clamped !== index) onIndexChange?.(clamped)
    },
    [controlled, index, last, onIndexChange]
  )

  // One observer feeds every measurement below.
  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const read = () => {
      const w = stage.clientWidth, h = stage.clientHeight
      setBox(previous => previous.w === w && previous.h === h ? previous : { w, h })
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  // Preserve the filmstrip proportions, with a width bound for tall phones.
  // The focused photograph must fit across the stage before its neighbours.
  const fullH = Math.min(clamp(box.h * CARD_H, 96, 360) * CARD_SCALE,
    Math.max(1, box.w - 32) / CARD_AR)
  const halfH = fullH / 2
  const cardW = fullH * CARD_AR
  const gap = Math.max(4, Math.round(cardW * GAP))
  const step = cardW + gap
  const pad = Math.max(16, Math.round(box.w * PAD))
  const label = Math.max(9, Math.round(box.h * LABEL))

  // Centre the focused card: the track slides, the card never moves itself.
  const xFor = React.useCallback(
    (i: number) => box.w / 2 - (i * step + cardW / 2),
    [box.w, step, cardW]
  )
  const x = useMotionValue(0)
  const target = xFor(index)

  const swing = reduced
    ? { duration: 0 }
    : { duration: 0.7, ease: "easeOut" as const }
  const spring = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 34, mass: 0.9 }

  // The track is driven by a motion value rather than an `animate` prop so a
  // drag that starts mid-spring reads the real position, not where the spring
  // was headed - otherwise the release snaps a card off.
  React.useEffect(() => {
    if (dragging || !box.w) return
    if (!positioned.current) {
      positioned.current = true
      x.set(target)
      return
    }
    const run = animate(x, target, spring)
    return () => run.stop()
    // `spring` is a literal, so `reduced` (all it derives from) stands in for it.
  }, [target, dragging, reduced, x, box.w]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wheel and trackpad. Both axes step the strip.
  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || dragging || items.length < 2) return
      if (e.target instanceof Element && e.target.closest('video,input')) return
      // Trackpads report the dominant axis; take whichever is stronger.
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      // Scroll chaining: once the strip is against an end, hand the gesture
      // back to the page. Without this a full-height carousel is a scroll trap
      // with no way past it.
      const stuck = (delta > 0 && index === last) || (delta < 0 && index === 0)
      if (stuck) {
        wheel.current.accumulated = 0
        return
      }
      e.preventDefault()
      const now = e.timeStamp
      const state = wheel.current
      if (now < state.until) return
      if (now - state.last > 180 || Math.sign(delta) !== Math.sign(state.accumulated)) state.accumulated = 0
      state.last = now
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? box.h : 1
      state.accumulated += delta * unit
      if (Math.abs(state.accumulated) < WHEEL_THRESHOLD) return
      go(index + Math.sign(state.accumulated))
      state.accumulated = 0
      state.until = now + WHEEL_COOLDOWN
    }

    stage.addEventListener("wheel", onWheel, { passive: false })
    return () => stage.removeEventListener("wheel", onWheel)
  }, [go, index, dragging, items.length, box.h, last])

  React.useEffect(() => {
    if (!autoplay || paused || dragging || items.length < 2) return
    const id = window.setTimeout(
      () => go(index === last ? 0 : index + 1),
      autoplayDelay
    )
    return () => window.clearTimeout(id)
  }, [autoplay, autoplayDelay, dragging, go, index, items.length, last, paused])

  React.useEffect(() => {
    const video = stageRef.current?.querySelector('video')
    if (!video) return
    const pauseHidden = () => { if (document.hidden) video.pause() }
    const pause = () => video.pause()
    document.addEventListener('visibilitychange', pauseHidden)
    window.addEventListener('pagehide', pause)
    return () => {
      document.removeEventListener('visibilitychange', pauseHidden)
      window.removeEventListener('pagehide', pause)
      video.pause()
      // A replaced slide no longer needs its decoder or pending media request.
      video.removeAttribute('src')
      video.load()
    }
  }, [active?.videoSrc])

  if (!active) return null

  const lines = active.title.split("\n")

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label="Photography filmstrip"
      style={{ visibility: box.w ? 'visible' : 'hidden' }}
      onKeyDown={(e) => {
        if (e.target instanceof Element && e.target.closest('video,input')) return
        const keys: Record<string, number> = {
          ArrowLeft: index - 1,
          ArrowRight: index + 1,
          Home: 0,
          End: last,
        }
        if (!(e.key in keys)) return
        e.preventDefault()
        go(keys[e.key]!)
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "relative h-full min-h-[24rem] w-full overflow-hidden bg-black text-white select-none",
        "outline-none focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:ring-inset",
        className
      )}
    >
      {/* Decode the best viewing source before the full-overlay crossfade. */}
      <AnimatePresence initial={false}>
        {displayed && <motion.img
          key={displayed.image}
          src={displayed.image}
          alt={displayed.alt}
          draggable={false}
          decoding="async"
          className="photo-full-image absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={swing}
        />}
      </AnimatePresence>

      {/* ── Top bar: a centred cluster, not edge-to-edge ── */}
      <div
        className="absolute inset-x-0 z-10 flex items-center justify-center"
        style={{ top: Math.max(16, box.h * 0.029), gap: `${Math.max(20, box.w * 0.06)}px` }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="opacity-90 transition-opacity hover:opacity-100"
              style={{ fontSize: label * 1.15, minHeight: 44 }}
          >
            <span aria-hidden>↖</span> Back
          </button>
        ) : null}
        {brand ? (
          <div
            className="font-semibold tracking-[0.06em]"
            style={{ fontSize: label * 1.35 }}
          >
            {brand}
          </div>
        ) : null}
        {onMenu ? (
          <button
            type="button"
            onClick={onMenu}
            className="opacity-90 transition-opacity hover:opacity-100"
            style={{ fontSize: label * 1.15 }}
          >
            Menu <span aria-hidden>☰</span>
          </button>
        ) : null}
      </div>

      {/* ── Headline block, sitting just above the strip's top edge ── */}
      <div
        className="photo-headline pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-end"
        style={{
          height: `${STRIP_TOP * 100}%`,
          paddingLeft: pad,
          paddingRight: pad,
          paddingBottom: Math.round(box.h * 0.028),
        }}
      >
        <div className="flex w-full flex-wrap items-end gap-x-[6vw] gap-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h2
              key={active.title}
              className="photo-title font-semibold leading-[1.06] tracking-[-0.025em]"
              style={{ fontSize: Math.max(24, Math.round(box.h * TITLE)) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              transition={reduced ? { duration: 0 } : undefined}
            >
              {lines.map((line, i) => (
                // Each line wipes up from behind its own edge.
                <span key={i} className="photo-title-line block">
                  <motion.span
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.62, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }
                    }
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </motion.h2>
          </AnimatePresence>

          {active.credit ? (
            <motion.p
              key={`credit-${index}`}
              className="font-mono uppercase tracking-[0.14em] opacity-80"
              style={{ fontSize: label }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={reduced ? { duration: 0 } : { duration: 0.5, delay: 0.1 }}
            >
              {active.credit}
            </motion.p>
          ) : null}

          {active.meta?.length ? (
            <div
              className="ml-auto flex items-end"
              style={{ gap: `${Math.max(16, box.w * 0.055)}px` }}
            >
              {active.meta.map((fact, i) => (
                <motion.span
                  key={`${index}-${fact}`}
                  className="font-mono whitespace-nowrap uppercase tracking-[0.14em] opacity-80"
                  style={{ fontSize: label }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  transition={
                    reduced ? { duration: 0 } : { duration: 0.45, delay: 0.12 + i * 0.06 }
                  }
                >
                  {fact}
                </motion.span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── The strip: one shared top edge, the focused card twice as tall ── */}
      <div
        className="absolute inset-x-0"
        style={{ top: `${STRIP_TOP * 100}%`, height: fullH }}
      >
        <motion.div
          className="flex items-start"
          style={{ gap, x, cursor: dragging ? "grabbing" : "grab" }}
          dragPropagation={false}
          drag="x"
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{ left: xFor(last), right: xFor(0) }}
          onDragStart={() => setDragging(true)}
          onDragEnd={(_, info) => {
            setDragging(false)
            dragFinished.current = performance.now()
            // Land on whatever card the release sits nearest, nudged by throw
            // velocity so a flick clears more than one card.
            const thrown = x.get() + info.velocity.x * 0.12
            go(Math.round((box.w / 2 - thrown - cardW / 2) / step))
          }}
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id ?? i}
              className="photo-card"
              style={{ width: cardW }}
              initial={false}
              animate={{ height: i === index ? fullH : halfH }}
              transition={spring}
            >
              <button
                type="button"
                aria-label={item.alt ?? item.title.replace(/\n/g, ' ')}
                aria-current={i === index ? 'true' : undefined}
                tabIndex={Math.abs(i - index) <= Math.ceil(box.w / step / 2) ? 0 : -1}
                onClick={() => { if (performance.now() - dragFinished.current > 200) go(i) }}
              >
              {/* Both portrait and landscape photographs keep their full frame. */}
              {Math.abs(i - index) <= Math.ceil(box.w / step / 2) + 2 && <img
                src={item.image}
                srcSet={item.srcSet}
                sizes={`${Math.ceil(cardW)}px`}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full object-contain"
              />}
              </button>
              {i === index && item.videoSrc && <video
                key={item.videoSrc}
                src={item.videoSrc}
                poster={item.image}
                controls
                playsInline
                preload="none"
                aria-label={item.alt ?? 'Photography video'}
                onPointerDown={(event) => event.stopPropagation()}
              />}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <p className="photo-active-caption" style={{ top: box.h * STRIP_TOP + fullH + 14 }} aria-live="polite" aria-atomic="true">
        {active.caption ?? active.alt ?? `Photograph ${index + 1}`}
      </p>

    </div>
  )
}
