# Portfolio performance audit — 24 October 2026

## Scope and method

Audited and changed the existing workspace, prioritizing phones and tablets.
Production URL: https://www.pandeyshubham.in/ (responded HTTP 200).
All implementation and browser validation happened locally. During the initial
audit, no deployment, remote commit, push, pull request, or dependency
installation was performed. The authorized final follow-up is recorded below.
Starting revision: `ad5f55185e758558d30c432cd79a8b9ad9047a80`.

This is static HTML with JavaScript controllers, not Next.js. React 19.3 islands
use `createRoot` inside scoped gallery/contact roots; there is no hydration.
Dependencies inspected: Motion 14, GSAP 3.15/SplitText, Three.js 0.186,
Lenis 1.3.26, Tailwind 4 and esbuild. Existing architecture was retained.

Reviewed the hero ID spring, intro/WebGL morph, shared RAF scheduler,
skills/hobbies timeline and reverse handoff, rigid model batching, model
visibility/lifecycle, canvas video previews, gallery mounts/cleanup, travel
geometry/touch/wheel handling, photography decoding/filmstrip, music springs,
gaming scroll transforms, contact particle spatial buckets, parallax, fonts,
responsive rules, static packaging, compression, caching and media ranges.

Routes and surfaces inspected:

- `/`: Play/intro, `#home`, `#about`, `#projects`, `#playground`, `#profile`, `#contact`.
- Photography, Travel, Music and Gaming native dialogs and their controls.
- Local image manager and travel-label editor; read-only HTTP checks only.
- Offline preview, 404 output, social destinations and same-page navigation.

Raw results, traces and screenshots are in ignored
`output/performance/2026-10-24/`. They are local audit artifacts, not public assets
or production analytics. Browser harness prototypes are in ignored `tmp/`.

## A. Problems identified

1. **Music style invalidation.** Each spring frame changed inherited roll/glint
   variables on disc ancestors, invalidating artwork and SVG hub descendants.
   Phone baseline: about 752 ms of style recalculation in a 1.5 s sample at 4x CPU.
2. **Refresh-dependent Travel motion.** Easing and momentum advanced once per RAF
   rather than per elapsed time. A 165 Hz display ran the recurrence much faster
   than a 60 Hz display.
3. **Tablet rotation/close race.** Rotate with Travel open, close, then immediately
   rotate back: the native document position was restored before Lenis's cached
   position. A reproduced timeline position of 1.77781 became 2.53621.
4. **Expanded model vertices.** The rigid merger converted every indexed mesh to
   non-indexed geometry even when the entire material bucket could retain indices.
5. **Repeated contour scans.** Intro morph preparation scanned all 361 dense
   silhouette segments for each unique vertex projection.
6. **Partially minified vendor modules.** The static builder protected private
   ES-module identifiers using the same rule required by classic global scripts.
7. **Video-slide resume lifecycle.** The photography component's optional video
   path paused on hide but did not resume previously active playback. Current
   photography data is image-only; this path was covered with synthetic lifecycle
   tests, not claimed as a currently visible photography-video failure.

The initial 13-size fitting sweep found no document-wide horizontal overflow.
The idle skills/hobbies samples already had zero layout recalculations. These
results did not justify changing breakpoints, layouts, typography or animation
detail. The phone hobby trace spent more time on layer/style/paint preparation
than on JavaScript; removing visible effects was not used as a workaround.

## B. Optimizations implemented

| Change | Implementation and preservation |
| --- | --- |
| Music surfaces | Cache roll/sheen nodes, set rotation on the roll element and glint on the sheen element. Same transforms, gradients, artwork, spring constants and spin. |
| Travel elapsed time | Evaluate the original 60 Hz easing/momentum recurrence at elapsed time, including fractional frames. Normal 60 Hz behavior is preserved; high-refresh acceleration is corrected. |
| Rotation synchronization | A gallery restoration event updates native and Lenis coordinates synchronously and retains the original timeline point for an immediately following rotation. It also restores when rapid rotation returns to the original dimensions before the close event arrives. User input/navigation clears the saved point; the listener is cleaned up on disposal. |
| Model buffers | Keep compatible indexed buckets indexed. Mixed buckets retain their original path. Same draw grouping, vertices, normals, UVs, materials and transparent-piece ordering. |
| Intro projection | Exact spatial search with distance-bound termination and original segment tie order. No silhouette, shader, vertex count, morph timing or easing changes. |
| Static vendor delivery | Minify private ES-module identifiers while preserving names/exported APIs. Classic script globals retain their existing protection. |
| Video lifecycle | Remember whether playback was active, resume once on return, respect manual pause, and remove listeners/source on cleanup. |

No CSS, HTML/content, fonts, icons, photographs, footage, posters or media data
were changed. No new library was added. Existing animation complexity, particle
density, model detail and resolutions were retained.

## C. Performance comparison

### Controlled interaction samples

Chrome 155, headless; 390x844 phone and 768x1024 tablet contexts used touch,
2x device scale and **4x CPU throttling**. Desktop: 1440x900, 1x CPU. No network
throttling for these interaction samples. Figures are individual lab samples,
not field INP or physical-device FPS. The host supplied approximately 165 Hz RAF.

| Music sample, 1.5 seconds | Before | After |
| --- | ---: | ---: |
| Phone style recalculation | 751.9 ms | 349.8 ms |
| Tablet style recalculation | 712.0 ms | 348.9 ms |
| Desktop style recalculation | 300.6 ms | 108.7 ms |
| Phone main-thread task time | 1509.8 ms | 1419.7 ms |
| Desktop main-thread task time | 620.8 ms | 433.4 ms |
| Phone p95 RAF interval | 18.3 ms | 12.2 ms |
| Tablet p95 RAF interval | 18.2 ms | 12.1 ms |

Phone music style work decreased about **53%**. These numbers do not establish
the same percentage improvement for the entire website. Non-modified skills,
hobby arcs and particle samples varied between runs; no causal speedup is
claimed for unchanged controllers. Travel's after-sample lasts longer because
it now preserves the original 60 Hz duration on a high-refresh host.

### Lighthouse — production output served locally with compression

Default Lighthouse mobile simulated network/CPU settings. Three alternating
before/after runs used the same preview server and reconstructed original
production modules. Medians below; scores are lab results, not p75 field data.

| Mobile metric, three paired runs | Before median | After median |
| --- | ---: | ---: |
| Performance score | 75 | 76 |
| First Contentful Paint | 2.705 s | 1.515 s |
| Largest Contentful Paint | 4.732 s | 4.881 s |
| Total Blocking Time | 216.5 ms | 155 ms |
| Cumulative Layout Shift | 0.0000073 | 0.0000073 |

Score ranges: before **60–87**, after **75–87**. LCP alternated between the ID
portrait and marquee text, and remains above 2.5 s. **There is no verified
mobile LCP improvement or 90+ mobile result.** Independent single runs were
68 before and 63 after, which prompted the paired checks rather than selecting
the favorable result. The earlier uncompressed exploratory run is excluded
from the compressed comparison.

Desktop single run: **99 -> 100**, LCP **0.914 -> 0.790 s**, TBT **1 -> 0 ms**;
CLS remained approximately 0.0000011. Single-run differences can include noise.

**INP and p75 Core Web Vitals:** unavailable; no production analytics or physical
device field data was collected. TBT is not a substitute for INP.

### Delivery and memory

| Measurement | Before | After |
| --- | ---: | ---: |
| Five published Three.js/Lenis JS modules, uncompressed | 1,070,586 B | 818,047 B |
| Those modules, gzip comparison | 229,864 B | 216,630 B |
| Four models' typed-array geometry buffers | 11,442,176 B | 11,122,240 B |

Vendor module source bytes decreased **23.6%**, gzip bytes **5.8%**. This is a
vendor-subset measurement, not the total website payload. The small new contour
module and travel helper add application bytes; all images/video remain intact.
Geometry buffers decreased by **319,936 bytes**, with unchanged draw counts
12/15/11/26 for camera/controller/plane/walkman. This is buffer accounting,
not measured device VRAM. Heap snapshots varied with GC and are not evidence
of a general JavaScript heap reduction.

Six music open/close cycles per device profile, with GC between readings:

- Phone DOM nodes: 1762 -> 1763, then stable; listeners: 3307 throughout.
- Tablet DOM nodes: 1766 -> 1767, then stable; listeners: 3307 throughout.
- Desktop DOM nodes: 1477 -> 1478, then stable; listeners: 3159 throughout.

No sustained DOM/listener growth appeared in this bounded exercise. It is not
a multi-hour memory, battery, temperature or thermal-throttling test.

## D. Responsive and interaction testing

Fitting sweep, portrait and landscape:

`320x568`, `360x800`, `375x812`, `390x844`, `414x896`, `430x932`,
`600x960`, `768x1024`, `820x1180`, `1024x768`, `1180x820`, `844x390`,
`1440x900`.

All retained equal section geometry/key typography signatures and no
document-wide horizontal overflow. This sweep does not prove every possible
screen ratio or every device-specific browser behavior.

Full Chrome normal-motion interaction checks passed at phone, tablet and
desktop sizes, including:

- Play resets a saved section hash to the hero.
- Actual touch/mouse ID drag, release and finite settling; existing coordinate
  mapping/spring tests also passed in both touch and desktop modes.
- All 14 skill buttons/logos mounted, no duplicate native icons, focus works.
- Hobbies handoff, forward navigation, return scrolling and resting models.
- Rotation both ways, plus rotation with Travel open followed by immediate
  close/rotation back; the reproduced race now passes.
- All four gallery buttons, close buttons, keyboard navigation and fitting.
- Photography selection, Music previous/next, the 28-item song menu,
  Travel card selection/arrows and silent looping video attributes, Gaming scroll.
- Contact destinations inspected without sending messages or opening mail.
- Six mount/unmount cycles per profile with bounded DOM counts.

Hidden legacy study cards are intentionally `display:none` in the existing
design; they were excluded from visible-control claims. No controls were added
or exposed to change that design.

Edge desktop and the built production preview also passed the interaction suite.
Firefox, Safari, iOS Safari, Samsung Internet and real phones/tablets were not
available. Chromium touch emulation and CPU throttling do not replace those tests.

Other validation:

- `npm run build`, `npm run typecheck`.
- `npm run check`: **618** source/build/SEO/link/syntax checks.
- `npm run check:media`: **840** asset/crop/caption/playback checks.
- `npm run check:models`: indexed/mixed geometry and resource preservation.
- `npm run check:animation-performance`: **4,800** 60 Hz recurrence comparisons,
  30/60/90/120/144/165 Hz checks, **1,444** exact contour queries over **361**
  segments, ties/boundaries/exterior queries and video lifecycle cleanup.
- Local HTTP: gallery chunks, image editor, offline preview, compression,
  ETags and partial video ranges passed.
- Browser runtime errors: none in the passing suites.
- `git diff --check` passed. Node prints the repository's existing module-type
  warning in standalone ESM checks; this is not a browser runtime warning.

## E. Visual preservation

Captured raw before/after references for hero, skills, hobbies, projects,
profile/contact and all four overlays at desktop/phone/tablet sizes.

Controlled comparisons covered six main sections at widths 320, 390, 768,
1024 and 1440. Capture-only masks excluded random hobby preview choices and
random particle placement; actual model canvases were retained. The masks
exist only in the QA script, never in website source.

Of 30 controlled comparisons, 26 had no pixels differing by more than 10 RGB
levels. Four had localized avatar/portrait rasterization differences, at most
0.0512% of the screenshot. Their locations were inspected; section geometry,
fonts, colors and shadows matched. Raw screenshots containing shuffled media
and particles are not claimed to be pixel-identical.

Separate Music component comparisons used the original and optimized code,
identical artwork/fonts, and frozen/reduced motion capture states at song indices
0 and 4. All six captures at widths 390, 768 and 1440 were **pixel-identical**.
The normal-motion interaction traces and tests were run separately with motion
enabled. Evidence: `output/performance/2026-10-24/music-visual/results.json`.

The deliberate behavioral correction is refresh-independent Travel motion:
its 60 Hz curve/duration is retained; high-refresh displays no longer run the
same recurrence faster. The rotation restoration fix removes a scroll jump.
There were no font, media, layout, palette or animation-detail substitutions.

## F. Remaining limits

- Mobile Lighthouse 90+, LCP <=2.5 s and field INP <=200 ms are **not verified**.
- The intro's WebGL setup/compilation, intentional entrance sequence, moving
  marquee, full-quality images, gradient sheen, blur and multiple layers remain
  substantial work on weak devices. They were preserved as requested.
- No blanket “100% lag-free,” universal browser compatibility, zero future
  bugs, lower temperature, or physical-device FPS claim is supported.
- Existing shader/model preparation still produces some long tasks under CPU
  throttling. More radical GPU/asset/loader architecture changes need separate
  measurement and visual validation, not removal of effects for a score.
- No responsive redesign was necessary for the measured widths. Actual iOS
  dynamic-toolbars, safe-area hardware, thermal behavior and prolonged device
  sessions remain physical-device QA items.

## G. Modified files

Source/runtime:

- `batman-loader.js`, new `contour-nearest.js`: exact accelerated projection.
- `hobby-model-batching.js`: preserve compatible indexed buffers.
- `hobby-gallery.js`, `smooth-scroll.js`: synchronize restored scroll position.
- `components/ui/disc-cascade-carousel.tsx`: localize music surface updates.
- `components/ui/zoom-slider.tsx`, new `lib/travel-motion.ts`: elapsed-time motion.
- `components/ui/hero-carousel.tsx`: video suspension/resume cleanup.
- `build-vercel.cjs`: safe vendor ES-module identifier minification.

Generated bundles: `assets/ui/music-overlay.js`,
`assets/ui/photography-carousel.js`, `assets/ui/travel-overlay.js`.

Regression/docs: `check-model-batching.mjs`, new
`check-animation-performance.mjs`, new `checks/browser-regression.cjs`,
`package.json` (one check command), `README.md`, and this report.

No unrelated user changes were discarded. Generated output and audit evidence
remain ignored. No media originals were modified.

## H. Git and delivery status

The initial audit ended with **local, uncommitted and reviewable** changes.
Nothing was pushed or deployed at that stage.

### Authorized final follow-up

The user subsequently requested final checks, final optimization, and a push to
the repository. The final optimization reuses the contour-search visitor across
all vertex queries, avoiding one captured-function allocation per unique point.
The exact-query and animation recurrence checks still pass. Production build,
type checking, source/media/model validation, ID-card tests and HTTP checks were
rerun before delivery, alongside fresh browser interaction checks.

The final stress run reproduced an intermittent rapid tablet rotation race in
the initial fix. Restoration now retains the dialog's original timeline point
instead of deriving it from mixed old/new geometry. Eight consecutive rapid
rotate–close–rotate cycles passed, and the retained browser regression repeats
this sequence three times per touch profile. Both phone and tablet passed those
repeated checks. Fresh full phone/tablet/desktop interaction suites and the
built production desktop preview also passed with no browser runtime errors.

The repository commit records the authorized delivery. No manual deployment,
design change, media replacement, or dependency addition was performed. The
local server remains available at http://localhost:3000/.
