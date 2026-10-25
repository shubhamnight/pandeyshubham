# Skills/Hobbies rendering repair — 25 October 2026

Starting revision: `b26fc87c111b6304c4faa2018dbd4e6e2c9618f6`.
At completion of the repair verification, work remained local. No push, commit,
merge or deployment had been authorized for that stage, and none was performed.
The user subsequently authorized committing and pushing these changes.

## Method and reproduced defects

This is a static page with hash navigation, a pinned Skills/Hobbies stage,
native JavaScript animation controllers, four Three.js models, and React
islands for buttons and overlays. There is no application-wide React router
or hydration boundary to fix.

The initial normal phone navigation probe passed at 4× CPU throttling. It did
not reproduce constant severe stuttering in headless Chrome. Additional
interrupted-load and orientation cases exposed specific failures:

| Defect | Evidence before repair | Repair |
| --- | --- | --- |
| One model-module failure suppresses the whole Hobbies sequence | Injecting one 503 on `gaming-controller.js` left skill exit at 1, model arrival/spread at 0, and all four model holders hidden after 14 seconds. | Retry transient module fetches with a fresh URL. Separate media/gallery initialization from 3D initialization. A genuinely unavailable model retains its existing native icon and cannot hide the other models or block gallery access. |
| Compression metadata blocks all hobby previews | Holding `mobile-media-data.json` pending left filled-preview counts at 0/0/0/0 while the models and media timeline were otherwise ready. | Compression metadata is optional and never awaited by preview creation or gallery mounting. Warm it asynchronously earlier; if not available, existing source URLs render immediately. |
| Skills rotation lands in the wrong timeline stage | At the Skills anchor, rounding below the exact scene top rejected restoration. Phone rotation to landscape produced timeline advance 1.0987 and zero visible skills. | Preserve the last rendered normalized coordinate, including the subpixel anchor tolerance, rather than mixing newly anchored native Y with old geometry. Keep an authoritative gallery restoration point across immediate subsequent rotation. |
| Failed shared chunk defeats entry-only retry | A single 503 on the React shared chunk left all 14 native logos present but zero shiny React buttons, even after retrying the entry URL. | On that fetch-failure path, load a standalone build of the same component. Successful modules stay cached; execution exceptions are not automatically re-run. |
| Travel rendering awaits optional location metadata | Code inspection found both preview and overlay mounting awaiting the location request. | Generate the user's existing saved names into a tiny module and refresh them in the background. A stalled API no longer blocks media; failed requests retain the saved names. |

Network failures in these cases were deliberately injected locally. They are
not claims that the public server was observed returning those exact errors.
The public URL could not be inspected with the web tool in this session;
the changed implementation and production package were evaluated locally.

Raw logs, CPU profiles, traces, screenshots and regression output are under
ignored `output/render-repair-2026-10-25/`. Test prototypes are under ignored
`tmp/`. The retained tests are in `checks/` and the root check scripts.

## Performance fixes and preservation

The baseline 6.5-second Skills entrance sample included five long tasks:
58, 182, 149, 298 and 174 ms at 4× CPU throttling. CPU samples identified
procedural geometry construction and model preparation alongside native
WebGL/context work. React commit instrumentation reported no repeated React
commits during the steady Skills/Hobbies animation samples; native controllers
and graphics work dominate those paths.

Three targeted graphics changes were implemented:

1. Cache the rounded-box unit grids, normals and arc-angle calculations by
   subdivision count. Apply each box's original dimensions/radius with the
   original arithmetic. The retained check compares every position, normal,
   UV, group and index for all **89** rounded boxes in the four real builders.
   Their attribute arrays are byte-identical. The current models use three
   bounded template entries; no mesh detail, segment count or texture is reduced.
2. Batch geometry with `BufferGeometry.copy`, avoiding procedural subclass
   constructors that `clone()` would otherwise run before copying buffers.
   Indexed/mixed geometry, transforms, normals, UVs, transparency exclusions,
   draw grouping and shared-resource preservation checks pass.
3. Initialize each model canvas at its existing final physical dimensions and
   pixel density. Previously, WebGL allocated the default 300×150 buffer,
   `setPixelRatio` resized it, and the first size observer resized it again.
   The new factory preserves alpha, antialiasing, power preference, the exact
   per-model DPR caps and camera projection. The size observer now skips its
   redundant first resize. Native `getContext` and buffer work were prominent
   in the repeated CPU profiles; no context, model or animation was removed.

An isolated warmed-constructor sample for three passes over those 89 shapes
was approximately 74.5 ms with the native constructor and 15.9 ms with cached
templates. This is a microbenchmark, not a whole-website speed percentage.
The full browser comparison includes initial template preparation.

The completed intro now explicitly releases its WebGL context after disposal.
Model contexts are released on permanent page disposal, while persisted
page lifecycle restores retain their resources. An explicit context-loss/
restoration test exercises model recovery without removing its graphics.

No CSS, font, image, video, poster, icon, content or animation timing/easing
was changed by this repair. The HTML addition is a nonblocking metadata warm-up
module. Recovery builds use the original component sources and scoped styles.

## Repeated browser performance measurements

Three alternating before/after pairs ran sequentially, without other browser
tests or builds competing with the measurement. The reference was Git HEAD;
the repaired version was the current source. Each used a fresh headless
Chrome page, 390×844 touch emulation, DPR 2 and 4× CPU throttling. Media shuffle
choices were held constant with a test-only deterministic seed. Results are
local laboratory observations, not field INP, a physical-phone benchmark or
a promised frame rate. Both variants used the same test routing fixture.

The Skills entrance sample is nominally 6.5 seconds. Blocking below means
the sum of `max(longTaskDuration - 50 ms, 0)` during that sample; it is not a
Lighthouse TBT score. Queued native graphics work can extend sample completion.

| Pair | Before blocking | After blocking | Before JS execution | After JS execution | Before largest task | After largest task |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 2,047 ms | 879 ms | 2,428 ms | 1,599 ms | 1,029 ms | 368 ms |
| 2 | 2,580 ms | 1,476 ms | 2,955 ms | 1,865 ms | 938 ms | 879 ms |
| 3 | 1,989 ms | 1,636 ms | 2,426 ms | 2,016 ms | 863 ms | 1,010 ms |
| Median | **2,047 ms** | **1,476 ms** | **2,428 ms** | **1,865 ms** | **938 ms** | **879 ms** |

Median startup blocking decreased **27.9%** and median JavaScript execution
decreased **23.2%**. All three pairs improved both measures. Largest-task
duration varied considerably and was worse in the third repaired run; the
remaining native WebGL startup cost is not eliminated. Median total main-thread
task time was 4,727 → 4,308 ms, but one repaired run was 7,025 ms. That variability
is retained in the raw results rather than discarded.

Steady Skills orbit and Hobbies arcs had zero long tasks and zero React commits
in all six samples. Frame-gap measurements varied with headless rendering;
they do not establish a consistent steady-state frame-rate improvement. The
measured causal gains are concentrated in model initialization and eliminating
blocked or permanently incomplete rendering. No animation cadence was changed.

Raw paired metrics: `output/render-repair-2026-10-25/paired-results.json`.
Each `paired-before-*` and `paired-after-*` folder contains CPU profiles and
a Hobbies trace. Earlier iteration metrics are retained separately.

## Files changed

| Area | Files |
| --- | --- |
| Loading and independent gallery access | `module-loader.js`, `hobby-boot.js`, `skills.js`, `photography-media.js`, `travel-media.js`, `gaming-media.js`, `music-records.js` |
| Optional metadata | `mobile-media.js`, `index.html`, `travel-location-label.js`, generated `travel-location-data.js`, `build-site-assets.cjs` |
| Scroll restoration | `skills-hobbies-scene.js`, `smooth-scroll.js` |
| Graphics construction and disposal | `rounded-box-geometry.js`, `hobby-renderer.js`, `hobby-model-runtime.js`, `hobby-model-batching.js`, `photography-camera.js`, `travel-plane.js`, `gaming-controller.js`, `music-walkman.js`, `batman-loader.js` |
| React build and photography readiness | `components/photography-overlay.tsx`, `build-shared-ui.cjs`, regenerated `assets/ui/photography-carousel.js`, `assets/ui/travel-overlay.js`, `assets/ui/chunks/shared-TRZACPSK.js`, five `assets/ui/*-recovery.js` files |
| Retained checks and documentation | `check-media.cjs`, `check-model-batching.mjs`, `check-rounded-box.mjs`, `check-loading-recovery.mjs`, `check-renderer-initialization.mjs`, `checks/rendering-reliability.cjs`, `checks/media-decoding.cjs`, `checks/browser-regression.cjs`, `package.json`, `README.md`, this report |

Recovery bundles add about 1.46 MB of generated deployment files. They contain
the existing components and are downloaded only after failed normal imports.
Normal browsing is checked to download none of them. This is an explicit
deployment-size tradeoff for recovering from a poisoned shared module map;
there is no normal mobile payload increase from those backup bundles.

## Verification results

### Build and retained checks

All passed on the final application code:

- `npm run build` — generated the local production package; no deployment.
- `npm run typecheck`.
- `npm run check` — 638 source/build, syntax, metadata, link and sprite checks.
- `npm run check:media` — 1,845 asset, crop, caption and silent-playback checks.
- `npm run check:models` — batching, transforms, transparency and resource retention.
- `npm run check:rounded-box` — byte-identical attributes for all 89 actual shapes.
- `npm run check:renderer` — original DPR, dimensions and renderer options.
- `npm run check:loading-recovery` — bounded retries, deduplication, successful
  caching, execution-error isolation, shared-chunk recovery and later online
  recovery, including a previously failed backup URL.
- `npm run check:animation-performance` — 4,800 original recurrence comparisons
  across 30/60/90/120/144/165 Hz, 1,444 exact contour queries and video lifecycle checks.
- Existing ID-card motion checks passed for fine-pointer and touch behavior.
- All three retained browser scripts passed syntax checks; `git diff --check` passed.

Node emits the existing module-type warning when importing browser ESM from
standalone checks. These runs completed successfully. The project’s module
mode was not changed because its other build scripts use CommonJS.

### Viewport and navigation regression

`checks/rendering-reliability.cjs` passed all eight final profiles:

| Viewport | Orientation exercise | Collected navigation round trips | Result |
| --- | --- | ---: | --- |
| 320×568 | Portrait → landscape → portrait | 2 | Passed |
| 360×800 | Portrait → landscape → portrait | 2 | Passed |
| 390×844 | Portrait → landscape → portrait, 4× CPU | 5 | Passed |
| 430×932 | Portrait → landscape → portrait | 2 | Passed |
| 768×1024 | Portrait → landscape → portrait, 4× CPU | 5 | Passed |
| 820×1180 | Portrait → landscape → portrait | 2 | Passed |
| 1024×1366 | Portrait → landscape → portrait | 2 | Passed |
| 1440×900 | Desktop | 5 | Passed |

Each profile checked all 14 Skills buttons and decoded logos, all four Hobbies
model holders, all three previews in each category, document overflow, rapid
navigation reversals, fast native scrolling in both directions, back/forward,
simulated persisted page lifecycle and direct hash refresh. The established
PLAY-to-hero reset remains intact. The 390/768/1440 profiles exercised the
longer Home/Skills/Hobbies navigation sequence.

All eight normal profiles finished with **zero unexpected console/runtime
errors and zero HTTP responses of 400 or above**.
Results: `output/render-repair-2026-10-25/final-regression/results.json`.

### Recovery regression

All seven final cases passed:

1. One failed model-module fetch.
2. One failed Skills entry fetch.
3. One failed shared React chunk; Skills and all four overlays then work.
4. Compression manifest held pending; all 12 Hobbies previews still fill.
5. Location API held pending; Travel previews and overlay still work.
6. Model module unavailable across initial/retry requests; its existing native
   icon still opens the full Gaming gallery. An online event restores the 3D model.
7. Explicit WebGL context loss and restoration on the camera model.

Each case verified that the intro context was released after completion and
all five captured contexts were released on permanent page disposal. Persisted
page events retain working models. Injected HTTP errors are intentional test
fixtures, not concealed normal-browsing failures.

### Longer browsing and gallery lifecycle

A separate 390×844, DPR 2, 4× CPU run completed **20 Skills/Hobbies round trips**,
with explicit browser garbage collection after each pair. Across those samples:

- DOM nodes: **1,600 throughout**.
- Event listeners: **2,445 throughout**.
- Pending native animation-frame requests: **1 throughout**.
- Backing storage: **14,456,061 bytes throughout**.
- Collected JS heap: cycle 2 **9,848,428 bytes**, cycle 20 **9,950,120 bytes**,
  a **99.3 KiB** increase. The later samples remain close together rather than
  accumulating a new DOM tree, listener set or backing buffer per navigation.

No progressive resource leak was detected in this run. This is bounded test
evidence, not proof of unlimited browsing on every device. Results:
`output/render-repair-2026-10-25/long-session/results.json`.

The production package was served locally at port 3013 and checked with
`checks/browser-regression.cjs`: Chrome phone/tablet/desktop and Edge desktop
all passed, with zero unexpected errors. Checks include ID-card drag/release,
Skills focus, all four gallery controls and keyboard interactions, Travel
video attributes, click-to-select, repeated rotation/close restoration, visible
project controls and six Music mount/unmount cycles. Collected gallery DOM
counts stabilized after the second cycle (Chrome: 1,773 phone, 1,777 tablet,
1,488 desktop). No recovery bundle downloaded during normal use.

The initial production test exposed a test synchronization assumption:
`dialog.close()` removes `open` immediately but queues its native `close`
event. Scroll cleanup happens in that event. The check now waits for actual
cleanup instead of assuming that hidden means the queued event has run. The
application’s closing behavior and animation were not changed.

Production results: `production-chrome/results.json` and
`production-msedge/results.json` under the same output folder. The temporary
production-preview server was stopped afterward; the original local server
on port 3000 remains running.

### Actual browser media decoding

`checks/media-decoding.cjs` passed at 390×844, 768×1024 and 1440×900. The test
uses an isolated document with the correct viewport metadata and waits for the
optional mapping only to inspect every prepared delivery candidate. It does
not introduce that wait into the website.

- Phone: **456 image URLs decoded; 12 video variants reached `canplay`**.
- Tablet: **456 image URLs decoded; 12 video variants reached `canplay`**.
- Desktop: **457 image URLs decoded; 12 video variants reached `canplay`**.

These counts include responsive/crop/hero candidates and multiple encodings
of the same content, not 456 unique portfolio photographs. There were no
decode failures or page exceptions. Results: `media-decoding/results.json`.

### Visual preservation

Thirty before/after viewport screenshots compared six sections and all four
overlays at 390×844, 768×1024 and 1440×900. Both versions used the existing
reduced-motion setting to isolate static appearance, DPR 1 and deterministic
media selection. No regions were masked and no assets were replaced.

Skills and Hobbies were **pixel-identical at all three sizes**. Across all
30 comparisons, 25 had zero pixels whose RGB delta exceeded 10. The remaining
differences were inspected:

- Phone Travel: 37 pixels, 0.0112%, within the playing aircraft video.
- Tablet Travel: 476 pixels, 0.0605%, a single-pixel-wide edge of that video.
- Contact: 442/385/397 pixels at phone/tablet/desktop respectively, confined
  to the existing SVG-filtered portrait. Its source asset, filter and CSS are
  unchanged. A focused repeat captured two reference and two repaired phone
  sessions: **all four settled portrait screenshots have the same SHA-256
  hash**. One initial repaired capture differed before its lazy image/filter
  paint settled, confirming capture-time variability rather than an edited style.

No layout, typeface, model shape, icon, poster, button, media count, animation
math, timing or easing was redesigned. The geometry and animation checks cover
the motion/detail invariants that a static screenshot alone cannot establish.
The comparison does not claim pixel identity between different video frames.

Visual output: `visual/results.json`, `visual/difference-regions.json`, and
`contact-filter-repeat/results.json` under the same output folder.

## Remaining limits and final state

No reproduced critical functional failure remains in the scenarios above.
Native WebGL startup still creates occasional substantial pauses under 4×
CPU throttling; the measured worst task did not improve in every pair. A claim
that all lag is eliminated, or that every physical device will maintain its
refresh rate, would exceed the evidence.

Physical Android/iPad/iPhone hardware, Safari/WebKit, device thermal throttling,
actual low-memory pressure and production-network field metrics were not
available for verification. React commit instrumentation was used with the
production islands; detailed React profiling-build component timings were not
collected. CPU profiles and native browser traces supplied the cost attribution.

The website’s appearance and features are retained. At the end of verification,
all repairs, generated recovery files, retained tests and this report were
**local and uncommitted**. Git HEAD was
`b26fc87c111b6304c4faa2018dbd4e6e2c9618f6`. Nothing was staged, pushed, merged
or deployed during the repair verification. Committing and pushing were
authorized in the user's subsequent request; this report records the results
before that publication step.
