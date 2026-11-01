# Connection continuity, mobile reading and final audit — 1 November 2026

Baseline: `52f98629b25be318e9fb9f135ab15d833f2fcdd3`.
Scope: discussion points 5 and 6, followed by a functional/performance audit.
The existing composition, fonts, artwork, motion functions/timing, ID card, loader,
icons and project/résumé placeholders are retained. No dependencies were added.

## Reproduced problems and changes

1. **Connection drops discarded a healthy page.** `offline-boot.js` used
   `location.replace` on every browser `offline` event. That destroyed loaded
   content, open overlays and scroll position. Connectivity hints no longer
   navigate an already loaded portfolio. A genuinely failed new document still
   receives the existing cached offline UI. Backup-page preparation is deferred
   until after document load/idle so its separate React/3D assets do not compete
   with the first page's critical requests. Large media and portfolio pages are
   still not service-worker cached; uncached content needs a connection.
2. **Contact enhancements could remain unavailable after a transient failure.**
   Their observers disconnected before success and raw dynamic imports could
   remain poisoned in the module map. Near-viewport loading now retries on
   reconnect/re-entry/visibility, deduplicates pending work, keeps native links
   visible until the enhanced row commits, and aborts unfinished stylesheet/data
   loads on permanent departure. The existing recovery module mechanism now
   includes Contact; its standalone backup is fetched only on import failure.
3. **A failed mobile manifest disabled compressed-source selection for the rest
   of the visit.** Native and React islands now share one event-driven retry and
   recovered map. Recovery does not replace displayed images. Desktop does not
   request the mobile manifest and no polling loop was introduced.
4. **Repeated events could re-execute a module that threw a code error.** Failed
   network imports remain recoverable with fresh URLs, but execution failures
   now retain their rejected module promise. This prevents duplicate module
   side effects/listeners when input or connectivity events repeat.
5. **Phone text was unnecessarily small.** Skills copy could fall to 10px,
   artist/lyrics text to 8.25–9.75px and music controls to 9px. Responsive reading
   sizes now preserve the same font families and words: Skills copy is 13–15px
   (12.5px in short landscapes), profile paragraphs 16px, contact role 14px,
   music singers/lyrics 12.5–15px and song menu text 12px. Explicit photo captions
   are 12px and phone/tablet game captions 12–13px. Travel captions wrap rather
   than overflowing. Music reserves room for the menu while retaining the same
   text/disc regions and native scrolling for longer content.
6. **Naively enlarging text caused a 320px Skills-ring collision.** Line-box
   measurement exposed a 12.58px overlap with the circular icon lane. A narrow
   breakpoint scales the heading from 20 to 22px through 360px width, with a
   155px copy measure, 13px body text and tighter spacing. This also covers the
   transition widths where switching back too early caused a 4.45px collision.
   Every measured line clears the entire orbit without replacing icon assets or
   changing animation functions/speed.
7. **Short portraits inherited oversized landscape discs.** The short-screen
   rule sized discs only from viewport height, crowding a 320×480 portrait ring.
   It now bounds them by both width and height, matching the existing portrait
   sizing while leaving ordinary landscape sizing unchanged. Music also keeps
   its original 45%-of-stage text boundary when reserving space for the menu;
   longer excerpts scroll inside that area instead of overlapping the discs.
8. **Long-song text retained the previous card's scroll position.** On 320×480,
   selecting another long card could leave its title scrolled upward by 17px.
   The copy scroller now resets before paint on selection changes. Native touch
   reading remains independent of disc navigation.

## Validation evidence

Raw screenshots/results are local, ignored files under `output/final-audit/`.

- Connection tests use real browser offline mode. Phone and desktop retain the
  same document and open music-gallery nodes, recover Contact after reconnecting,
  avoid duplicate mounts, and still show the cached UI for a failed new navigation.
  A separate three-request Contact outage recovers through the standalone module.
  The final production run also verifies that backup preparation starts after
  the critical document load.
- Mobile manifest tests verify failed-fetch recovery, deduplicated simultaneous
  reconnect events, shared native/second-island state and no desktop manifest fetch.
- Reading tests cover 320×480, 320×568, 341×640, 350×780, 360×800, 390×844,
  430×932, 768×1024, 820×1180, 1024×1366, 844×390, 1440×900 and 2560×1440.
  All 28 song cards fit their reading
  regions without horizontal overflow; desktop singer/lyric sizes remain the
  same. The tightest settled Skills clearance is 1.51px using conservative text
  line-box corners against the entire circular icon lane.
- Interaction tests cover phone, tablet and desktop: ID drag/settling, 14 logos,
  models, every hobby gallery, keyboard controls, video rules, rotation, close,
  project controls and six repeated gallery mount/unmount cycles.
- Offscreen tests cover phone/tablet at 4× CPU slowdown and desktop at 1×:
  hidden Hobbies/model frame callbacks are zero at Projects; CSS time is paused
  and resumes without restart; persisted lifecycle and shadow-root visibility work.
- Native touch tests at 393×873, 360×800 and 768×1024 under 4× CPU slowdown keep
  all 14 icons painted, preserve genuine reversal/focus behavior and recover
  correctly from settling jitter and actual touch swipes.
- Rendering reliability tests at 390×844, 768×1024 and 1440×900 pass rapid
  switching, forward/reverse native scrolling, history, rotation where applicable,
  persisted lifecycle, direct-hash reloads and three repeated round trips with
  garbage collection. DOM, heap, listeners and pending frame callbacks stay
  bounded by the existing regression thresholds.
- Seven rendering failure cases recover: a model import failure, Skills import
  failure, failed shared dependency, stalled mobile manifest, stalled location
  metadata, unavailable model module and WebGL context loss. The intro allocates
  no extra WebGL context, and permanent disposal releases every model context.
- Final packaged-output checks use a separate local production server and confirm
  the 13-viewport/364-card reading matrix, real offline/reconnect behavior,
  mobile-manifest recovery and tablet gaming interactions/seam/reduced-motion
  behavior. A dedicated 320×480 native-touch test verifies reading long cards
  without selecting a different disc and resetting scroll on new song selection.
- TypeScript, source/build/link checks, 1,854 media assertions, model batching,
  rounded geometry, scroll intent and module recovery pass. Existing numeric
  regression checks retain 4,824 ID simulation frames, 720 Travel comparisons
  and particle physics/cadence across 60–240Hz.
  The final source/build/link/syntax/asset suite contains 706 passing assertions.

These are browser emulation and deterministic/structural checks, not a claim of
identical FPS on every physical phone or a percentage speedup for the whole site.
