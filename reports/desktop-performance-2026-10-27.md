# Desktop performance audit — 27 October 2026

Baseline: `05244ef28a3746bacf52cdf49546f6daed070974` on `main`.
Scope: underlying desktop execution and rendering, with existing content,
layout, fonts, artwork, paths, easing and animation detail preserved. The
follow-up request to “push” authorizes publishing the completed changes.

## Reproduced causes and repairs

1. **Incomplete Skills entrance under a stationary mouse.** Hovering an incoming
   icon paused the entrance timer indefinitely. One baseline reproduction held
   five visible holders after eight seconds at `entranceTime=1.0122`. Desktop
   pointer hover now pauses the finished orbit, allowing the entrance to finish.
   Keyboard focus pause and touch interaction rules remain. The retained browser
   regression checks entry completion, all 14 icons, hover pause and resume.
2. **Inherited transition properties invalidated large descendant trees.** The
   four owner-only scale/rotation properties were registered as non-inheriting
   only on touch devices. Supporting desktop engines now receive the same
   definitions. Older engines retain the ordinary CSS fallback. Touch-specific
   badge property registrations remain touch-specific.
3. **Heading opacity changes invalidated the entire pinned scene.** Desktop
   Skills/Hobbies heading opacity used changing inherited scene properties.
   The already established direct heading-opacity path now serves desktop too,
   with the same numeric opacity functions. It is removed when pinning is
   disabled. These two inheritance fixes account for the substantial measured
   improvement; an initial micro-optimization-only iteration did not.
4. **ID-card redundant reads and coordinate mapping.** Stationary spring frames
   no longer measure screen bounds solely because scrolling dirtied them.
   Pointer consumption and resize observation still refresh necessary geometry.
   High-frequency events no longer calculate unused intermediate coordinates.
   Lighting values are applied to the glare and face that consume them, as on
   touch already. Pose, velocities, ribbon geometry and lighting compare exactly
   in 4,824 simulated desktop/touch frames across six refresh rates.
5. **Repeated Travel style assignments.** The existing painted-pose cache also
   serves desktop, avoiding unchanged transform/width/height assignments. Inert,
   focus, video framing and all geometry remain equivalent across 720 fixture
   comparisons. The fixture issues 5,960 assignments instead of 7,734 (22.9%
   fewer); browser phase timings do not show a material Travel improvement.
6. **Contact particles skipped high-refresh paints.** The desktop 60 Hz draw gate
   quantized 165 delivered callbacks/s into about 55 paints/s. Desktop now paints
   each delivered frame, retaining the existing elapsed-time update function,
   particles, connections and detail. Touch retains its existing 30 Hz gate.
   This deliberately costs more drawing work on a high-refresh display.

No CSS, fonts, media library, content, icons, placeholders or layout files were
edited. No dependency was installed or upgraded. Lazy shared and recovery
bundles were regenerated from the existing build pipeline. No new production
diagnostic instrumentation is included.

## Measurement method

Production output was served locally with `SERVE_DIST=1 PORT=3013 node server.cjs`.
The measured browser was Chrome on Windows, 1440×900, DPR 1, fine pointer, 1× CPU.
The host has a Ryzen 7 7840HS, Radeon integrated graphics and RTX 4060 Laptop GPU;
these measurements do not identify which adapter every browser operation used.

Three complete baseline profiles (`before-2` through `before-4`) and three final
profiles (`optimized-1` through `optimized-3`) used the same scripted navigation,
pointer moves, overlays and sampling windows. Groups ran sequentially, not in
alternating pairs. No other browser tests ran during the timed profiles. CDP
timeline traces, CPU sampling, performance counters, RAF gaps, long-task entries,
production React commit counts, Event Timing and collected heap were recorded.
Commit counts are not development React Profiler component-duration measurements.

Raw traces, CPU profiles, screenshots and JSON remain in ignored local
`output/desktop-2026-10-27/`. `summary.json` contains the three-run medians. An
early partial baseline and intermediate iterations are retained for diagnosis
but excluded from the final three-versus-three comparison.

### Measured results

Milliseconds below represent cumulative work within each scripted phase, **not
the cost of a single frame**. Task duration includes scripting, style and other
main-thread work, so those columns must not be added together.

| Phase | Style before → after | Main-thread task before → after |
| --- | ---: | ---: |
| Hero pointer | 142.68 → 137.92 | 604.07 → 582.63 |
| Skills entry | 625.95 → 210.70 | 1720.90 → 1301.58 |
| Skills orbit | 52.22 → 49.38 | 611.19 → 583.16 |
| Hobbies entry | 975.19 → 239.21 | 3613.53 → 2907.46 |
| Hobbies arcs | 66.84 → 66.68 | 750.23 → 751.19 |
| Model pointer | 42.81 → 38.36 | 519.73 → 502.29 |
| Travel interaction | 80.41 → 79.49 | 785.52 → 776.55 |
| Gaming interaction | 3.64 → 3.57 | 191.60 → 182.03 |
| Music interaction | 222.70 → 225.47 | 847.19 → 835.91 |
| Photography interaction | 18.22 → 17.99 | 318.32 → 350.99 |
| Contact pointer | 34.35 → 36.37 | 595.18 → 814.98 |

Skills style work fell **66.3%**, with phase task work **24.4%** lower. Hobbies
style work fell **75.5%**, with phase task work **19.5%** lower. Other phases
mostly vary slightly; this is not an across-the-whole-site speedup percentage.
Contact scripting rose from 95.30 to 183.83 ms as actual high-refresh paints
increased. Photography task time also rose in these samples; no improvement is
claimed there.

The separate real-canvas cadence check observed:

| Version | Sample duration | Delivered callbacks | Particle paints | Paints/s |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 4002.5 ms | 661 | 221 | 55.22 |
| Updated | 4004.8 ms | 661 | 661 | 165.05 |

Synthetic checks cover 60/75/120/144/165/240 Hz; actual physical display testing
was not performed at every rate. At 60 Hz the original draw elapsed-time sequence
is identical. At other rates the existing elapsed-time integrator takes smaller
steps; this is not a claim of bit-identical particle positions across refresh
rates. There is no new smoothing delay or particle-count reduction.

RAF-gap p95 remained about 6.2 ms before and after. No observed long tasks were
recorded in the sampled interaction windows in either version. Those facts do
not establish that no dropped frames or cold-load long tasks exist. React commit
counts remained zero during steady animation/entry/contact samples; overlay
actions produced expected commits (Travel 2, Gaming 7, Music 5, Photography 7),
without a per-frame React render storm.

### Loading and interaction limits

Local lab LCP medians were 444 ms before and 620 ms after; **LCP did not improve**
in this small sample. LCP reflects the intro before PLAY, local networking and
host variance, not completion of every section. Median CLS remained about
0.0105. The median maximum recorded Event Timing interaction was 96 ms in both
groups. This is not field INP, and no field Core Web Vitals claim is made.

Decoded JS across the complete lazy-loading route was 1,721,113 → 1,721,098
bytes; transferred JS was 533,789 → 533,804 bytes. This is essentially unchanged,
not a bundle-size optimization. Asset resolution and texture detail remain.

## Validation

- Production build and TypeScript check passed.
- Source/build validation: 640 checks passed.
- Media validation: 1,845 checks passed; media files were not rewritten.
- Model batching, byte-identical rounded geometry, loading recovery, scroll
  intent and renderer initialization checks passed.
- ID-card parity: 4,824 frames; Travel geometry parity: 720 comparisons.
- Travel recurrence: 4,800 comparisons; contour indexing: 1,444 vertex queries.
- Refresh-rate simulations include 30/60/75/90/120/144/165/240 Hz.
- Desktop hover/entrance regression passed at 1280×720, 1366×768, 1440×900,
  1920×1080 and 2560×1440, with zero page errors.

### Visual preservation

Fifty-five before/after screenshots cover six main sections, all four overlays
and a hovered ID card at all five desktop sizes. Reduced-motion snapshots
compare section/gallery layout; the hovered card also runs with normal motion.
The QA fixture seeds each media shuffler independently so unrelated random
consumption cannot select different photographs or games between versions.
These seeds are injected by test routes and are not shipped.

Forty-six pairs have no RGB pixel differences above 10/255. All Skills,
Hobbies, Photography, Gaming, profile, playground and home section pairs meet
that threshold. Nine pairs contain small differences: live Travel video frames
(0.06–0.50% of viewport pixels), filtered contact-portrait edges
(0.02–0.04%), one dialog shadow/close-button transition (0.14%) and one settled
hovered-card edge/lettering difference (0.04% of the card crop). The differences were
inspected without masking the product. Card geometry and lighting also have
the independent exact-value comparison above. These screenshots are evidence
against a layout/artwork regression, not a claim that live video frames or
GPU-filtered pixels are always identical.

### Repeated use and memory

At 1440×900, a separate session passed 20 complete Skills/Hobbies round trips,
rapid switching, back/forward, forward/reverse native scroll, persisted lifecycle
events and direct hash refreshes. With explicit GC after every round trip,
round 2 → round 20 measurements were:

| Counter | Round 2 | Round 20 |
| --- | ---: | ---: |
| DOM nodes | 1,315 | 1,315 |
| JS event listeners | 2,297 | 2,297 |
| Pending RAF callbacks | 1 | 1 |
| Used JS heap | 10,077,600 bytes | 10,188,032 bytes |

All 20 RAF counts were one. Heap grew about 108 KiB after collection, while
DOM/listener counts remained unchanged; no accumulating loop or detached-tree
growth was detected in this session. This does not measure all GPU VRAM or
prove the absence of leaks over arbitrarily long sessions.

### Browser interactions and touch preservation

Chrome passed at all five desktop sizes, and Edge passed at 1440×900. Each run
covered PLAY-to-hero reset, ID drag/release/settling, 14 loaded Skills icons,
model handoff, Photography/Travel/Music/Gaming controls and keyboard use,
viewport fitting, native close cleanup, existing visible project controls,
contact links, and six gallery mount/unmount/GC cycles. No page/console errors
were recorded; ordinary browsing did not fetch recovery bundles. Across the six
gallery cycles in each Chrome run, DOM nodes settled at 1,488 and listeners at
3,162, with no growth from cycle 2 to cycle 6. Edge also passed those assertions.

All five sizes passed the separate rendering/navigation suite, including fast
reversals, rapid switching, back/forward, hash refresh, persisted lifecycle and
GC bounds. Two collected round trips were used at four sizes, five at 1440×900,
in addition to the separate 20-round-trip session above.

At 4× CPU throttling, touch emulation at 393×873, 360×800 and 768×1024 passed:
one-pixel settling, retained touch focus, compatibility pointer input during
entrance, all 14 icons actually painted, real reversal, keyboard pause/resume
and native swipes. This verifies preservation of the prior mobile repair in
emulation, not performance on physical Redmi or Nothing phones.

### Interrupted resources and GPU lifecycle

All six applicable desktop fault scenarios passed in the final recovery run:
one-time model failure, one-time Skills entry-bundle failure, failed shared
dependency, stalled location metadata, unavailable model module with later
online recovery, and WebGL context loss/restoration. The shared-dependency case
also opened all four galleries. Every case confirmed the intro's context was
released and permanent page disposal released every tracked model context.
The touch-only compressed-media manifest stall is inapplicable to desktop.

An earlier recovery test failed because Playwright implicitly scrolled an
animated pinned control while trying to make it stable. The retained QA now
uses a real pointer on the visible control and awaits native dialog-close
cleanup. The application was not altered to bypass that automation behavior.

## Remaining limits

Opera GX launched through its installed executable (Chromium 153.0.8010.55)
and returned the portfolio successfully, but its automated WebGL intro did not
reach the entry button within 45 seconds. Bringing the page to the foreground
confirmed it was visible but did not establish a full functional pass. Opera
coverage therefore remains incomplete; Chrome/Edge passes do not prove Opera
compatibility. No Opera-specific rendering workaround was added.

Firefox and WebKit/Safari runtimes are not installed on this Windows host;
macOS/Linux and physical phone/tablet hardware were not available. Browser
emulation and synthetic cadence checks cannot establish universal smoothness.
The live deployment was not benchmarked as this modified version. Repository
publication does not itself verify a completed hosting deployment.

The existing short desktop framing can put part of a top hobby control outside
the viewport. An early QA script aimed at its offscreen bounding-box centre;
the test now clicks the visible intersection. No positioning or spacing was
changed to make the test pass. Existing gallery shuffling also requires
independent deterministic test seeds for meaningful screenshot comparison.

## Files and reproducibility

Runtime source changes: `script.js`, `skills.js`, `skills-hobbies-scene.js`,
`touch-performance.js`, `components/ui/zoom-slider.tsx`, and
`components/ui/aether-flow-hero.tsx`, plus their generated lazy bundles/chunks.
Test-only changes: desktop parity/cadence/hover checks, expanded refresh-rate
coverage and optional desktop/browser parameters in existing browser suites.
README documents the commands and external Playwright requirement. Normal
application use has no Playwright dependency.

Run `npm run build`, `npm run typecheck`, `npm run check`,
`npm run check:desktop-performance` and the other `check:*` commands above.
Optional browser suites require `PLAYWRIGHT_MODULE` pointing to an already
installed `playwright-core`. Use `AUDIT_URL` for a local production preview.
The original-source parity and cadence references require Git revision
`05244ef` in the checkout's history.
