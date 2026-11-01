# Legacy cleanup — 2026-11-01

## Scope

Remove confirmed unused source, CSS, markup and handlers while preserving the
current portfolio. The working tree already contained phone Skills image
recovery and cooperative hobby-model preparation fixes; those changes remain.
This cleanup does not change gallery content, fonts, visual quality, animation
timing, model geometry, ID-card physics, or the Projects and résumé placeholders.

## Removed and consolidated

- Removed the retired opening `batman-loader.js` and its contour-search helper.
  The current gooey loader, liquid-to-PLAY handoff, cursor follower, Batman
  branding and offline page remain active.
- Removed three unreferenced UI components: the old three-dot loader, tilted
  grid and stacking cards, plus the old loader demo. Renamed the current music
  demo to describe the MusicOverlay component it actually uses.
- Removed three permanently hidden study demos and their unreachable dialog,
  click handlers, mood-picker handlers and clone-registration observer.
- Removed 288 dead CSS rules, 375 dead selectors and four unused keyframes.
  Mixed selectors and fallback rules that affect current specificity remain.
- Shared the production packager with the optional read-only share builder.
  The share now includes the current offline, recovery, metadata and vendor
  files. Packaging prepares local files only; it does not publish anything.
- Stopped deploying Three.js's old RoundedBoxGeometry module. The development
  dependency remains available for exact geometry-parity checks.
- Updated regression checks to assert the current placeholders and awaited
  model builders instead of retired study demos and opening-loader benchmarks.
- Ignored personal remote attachments without deleting their contents.

The import graph was checked across all active React entries, including the
offline entry. Framer Motion, GSAP, the animated dock, existing recovery bundles
and published compatibility chunks are still needed and were retained. Source
media and optimized viewing copies were not deleted or re-encoded.

## Size measurements

Compared with the exact working tree immediately before cleanup:

| Measurement | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Touched live HTML/CSS/JS source | 183,675 B | 148,151 B | 35,524 B (19.3%) |
| Same files, Brotli quality 5 | 43,139 B | 35,517 B | 7,622 B (17.7%) |
| Retired dormant source files | 45,368 B | 0 B | 45,368 B |

These are measurements of the affected files, not the whole website or an FPS
claim. Dormant source files were not part of the active initial download.
Detailed measurements and the exact pre-cleanup backup remain locally under
ignored `output/legacy-cleanup/`.

## Verification

- Full production build and TypeScript checks passed.
- Site validation passed 716 checks; media validation passed 1,854 checks.
- Model batching, all 89 rounded-box geometries, loading recovery, renderer
  initialization, scroll intent and desktop performance regressions passed.
- Animation regression retained 4,800 travel comparisons, eight refresh rates
  and both video lifecycle cases; all passed.
- All 30 computed-style state snapshots match the pre-cleanup baseline across
  phone, tablet and desktop sizes, including all four overlays. No browser
  page errors occurred during those captures.
- Intro checks passed for desktop, phone, tablet, reduced motion and native
  fallback. Liquid handoff retained the finished PLAY styles and hero entry;
  the complete wave-loop check passed.
- Production browser interactions passed on phone, tablet and desktop:
  navigation, ID-card dragging and settling, 14 loaded skill logos, hobby model
  handoff, gallery controls and keyboard input, repeated mount/unmount cycles,
  and preservation of Projects and résumé placeholders.
- The optional share-package check passed using a temporary local identity,
  without reading owner credentials or publishing.
- Offscreen-motion checks passed for phone, tablet and desktop, with 4x CPU
  throttling on the touch profiles: complete Hobbies, zero hidden Hobbies/model
  frame callbacks at Projects, preserved CSS animation time, persisted-page
  lifecycle and shadow-root visibility handling, without page errors.
- Connection-retention checks passed on phone and desktop: the loaded document
  and open gallery survived a drop, contact enhancements recovered without
  duplicate mounts, and genuinely failed new navigation retained the offline
  fallback. An injected contact-module outage recovered after three failures.

All six final browser suites passed against the local production package.
Their outcomes are recorded in `output/legacy-cleanup/final-checks.json`.

## Limits and delivery

This pass used local Chrome viewport and touch emulation, including CPU-throttled
offscreen checks; it did not reconnect to the phone or retest the public site.
It does not establish that the previously unconfirmed isolated partial-hero
frame is resolved. Refer to the separate OnePlus runtime audit for that finding.
The local preview remains available at `http://localhost:3000/` and the packaged
preview at `http://localhost:3013/`. No commit, push or deployment was performed.
