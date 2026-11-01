# OnePlus 12R and desktop runtime audit — 1 November 2026

Baseline: `b4a7bfd5fd49d36d983d19ae28eac4f761610888`.

Scope: missing/late Skills icons on phones; lag and jitter on phones and
laptops. The connected OnePlus 12R was inspected through its actual Chrome tab
over authorized USB debugging. Its viewport was approximately 425 × 831 CSS
pixels, expanding to 425 × 887 when browser chrome collapsed, at DPR 2.975.
The public site and the local source were both inspected before fixes.

## Reproduced causes and retained fixes

1. **Large model-preparation tasks blocked input and paint.** The original idle
   callback still built an entire model, batched all its geometry and initiated
   shader work synchronously. In physical-phone runs, individual preparation
   tasks took about 85–289 ms. Calling something from an idle callback does not
   make the task interruptible. Model builders now yield between stages; the
   batching generator yields across pieces/buckets with a 5 ms budget. The
   preparation queue awaits each model, so yielding does not accidentally start
   four competing preparations. This applies to desktop as well as touch.
2. **The first visible GPU draw still did substantial work.** `compileAsync`
   alone left uniform/attribute discovery, buffer/texture upload and first-use
   driver work for the shared animation frame. Preparation now warms each
   unchanged draw separately behind a hidden canvas, restores every original
   layer mask, and reveals only the final complete render. The existing model
   arrival, orbital paths, camera views, materials, geometry, lighting and
   timing functions are preserved. Context restoration runs the same process
   with serialized jobs, preventing a stale warm-up from overwriting new masks.
3. **Transformed/clipped sections could trigger preparation too late.** Both
   readiness observers now observe the stable Skills/Hobbies scroll track.
   Preparation waits for the existing ID entrance to finish, or for the hero to
   become covered. It can finish before the model handoff without competing
   with that entrance. Offscreen preparation does not advance animation clocks.
4. **Phone shader diagnostics added synchronous driver reads.** CPU samples
   included `getProgramInfoLog` and `getShaderInfoLog` during initial drawing.
   These development diagnostics are disabled for the fixed shaders on touch
   devices. Compilation, context-loss recovery, antialiasing, drawing-buffer
   quality, model failure handling and native gallery fallbacks remain.
   Desktop diagnostics are retained.
5. **Skills enhancement discarded decoded icon elements.** It created fresh
   async-decoding images and removed the originals. The enhanced buttons now
   reuse the same fetched/decoded image nodes in the same holders. A regression
   verifies all 14 identities, successful decoding and continued presence after
   scrolling. Phone-only recovery retries an actually failed same-origin icon
   request at most twice with backoff, stops when hidden/offline, and clears its
   timers on permanent departure. A real injected SVG 503 recovered in exactly
   one retry. There is no polling and successful icons are not re-requested.

No designs, typefaces, copy, icons, artwork, placeholders, features, animation
durations, paths or physics were replaced. No dependencies were added. The
loader, PLAY button and ID animation source are unchanged in the final patch.

## Physical-phone evidence

Raw evidence is ignored under `output/oneplus-12r/`, not included in deployment.

- `hosted-model-reload.json` and `local-before-model-reload.json`: repeated
  reloads with CPU samples and long-animation-frame attribution. The local
  baseline's largest model-preparation script task was 288.7 ms.
- `local-after-model-reload.json`: largest attributed model-preparation script
  task 90.9 ms in the comparable run; the cluster of first-visible model draw
  stalls was absent. These are observed runs, not a universal speed guarantee.
  Native WebGL context construction is still synchronous and can briefly stall.
- `final-skills.json`: all 14 holders visible; the ring actually advancing;
  303 measured frame intervals over five seconds, median 16.6 ms, 95th percentile
  16.7 ms, maximum 16.7 ms, no long animation frames, no layout, no overflow and
  no captured runtime errors. A frame sampler alone would not prove animation
  smoothness, so the report also records changed start/end icon positions and
  the active orbit state.
- `remaining-audit.json`: actual phone music navigation/menu, gaming swipe and
  close, projects/profile/contact, and a scoped offline transition. The loaded
  document and open music nodes survived the connection drop; scrolling was
  released after close; there was no horizontal overflow.

Browser recording was separate from timing measurement. Frame-by-frame pixel
screening and manual inspection of flagged frames/contact sheets covered:

| Capture | Frames | Coverage |
| --- | ---: | --- |
| `film-before` | 2,360 | Local loading, PLAY/hero, drag, Skills, Hobbies, reverse |
| `film-before-hero-repeat` | 931 analyzed | Local loading/hero repeat and drag |
| `film-hosted-before` | 2,356 | Same full journey on the public site on the phone |
| `film-final-after` | 2,366 | Local fixes, same full journey |

All full-journey captures formed the complete Skills ring, brought all four
models home and revealed the Hobbies previews. Screening found no isolated
fully blank viewport between painted frames.

## Remaining visual uncertainty

CDP streaming repeatedly captured one isolated **partially painted hero/card
frame** around entry completion. It appeared on the existing public site and
local baseline, and remained with WebGL deliberately unavailable in a separate
diagnostic run. Stable compositor hints and committing the finished animation
pose did not remove it, so those speculative changes were discarded. A final
repeat after the phone restart did not capture the entry phase and is excluded
as evidence of a fix. The final patch does not claim this anomaly is resolved.

An independent Android display-recording attempt was blocked by device
permissions and produced no usable frames. Its stuck native process could not
be stopped by Android shell commands. The user restarted the phone, after which
the test process was verified absent. No phone security/display settings were
changed. The browser frame sequences and timing measurements above remain valid
independent evidence; the partial-frame observation cannot yet be distinguished
conclusively from a streaming/compositor capture artifact.

## Regression validation

- Full build; TypeScript; 707 site/source/build checks; 1,854 media checks.
- `checks/skills-image-continuity.cjs`: source and packaged build, phone and
  desktop; 14 original decoded images preserved; injected phone SVG outage
  recovered. Desktop execution verifies compatibility, not a desktop icon bug.
- `checks/touch-skills-regression.cjs`: 393 × 873 at 4× CPU, native gestures,
  one-pixel settling, reversal, keyboard pause/resume, all in-frame icon pixels
  painted and no icons stranded after input stops.
- `checks/browser-regression.cjs`: phone, tablet and desktop locally; desktop
  against the hosted baseline; phone against the packaged build. PLAY/hash
  reset, ID drag/settle, Skills, model handoff, all four galleries, controls,
  close/scroll cleanup, responsive fitting and repeated mount/unmount passed.
- `checks/rendering-reliability.cjs`: phone navigation/rapid switching, reverse
  native scrolling, rotation, history, reload, persisted lifecycle and repeated
  round trips. Explicit context-loss recovery passed with four total contexts;
  permanent disposal released them.
- `checks/offscreen-motion-regression.cjs`: phone/tablet at 4× CPU and desktop;
  zero hidden Hobbies/model RAF callbacks at Projects; CSS phase, persisted
  lifecycle and shadow-root visibility preserved.
- Loader liquid/wave regressions: unchanged final PLAY styles and flicker,
  preserved hero entry, no inner box composite, and seamless wave cycle.
- Geometry batching, renderer setup and loading-recovery checks passed;
  4,824 ID simulation comparisons, 720 travel comparisons and refresh-cadence
  checks preserved the existing motion.

The hosted laptop was also inspected interactively in the desktop browser.
Its complete Skills ring had all 14 loaded logos. Automated desktop checks use
desktop Chromium and are not measurements of every laptop GPU or browser.
Physical-device results here apply to this OnePlus/Chrome session; tablets were
tested through responsive/touch automation, not a connected physical tablet.

## Delivery

The changes are available locally at `http://localhost:3000/`. The packaged
preview was checked at `http://localhost:3013/`. They have not been committed or
pushed as part of this phone-inspection task. Personal input attachments remain
untouched and excluded from the changes.
