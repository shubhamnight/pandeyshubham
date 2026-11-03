# Adaptive decorative graphics — 4 November 2026

The previous regression repair is commit `be4e036`. Eight deployed artifact
hashes matched. Twelve Chrome, Edge, Opera and Firefox journeys passed across
laptop, phone and tablet profiles. Hosted WebKit laptop reached the Hobbies
section with all four models ready, but sparse frames left its spread at 0.983
after a minute and the cards never began to reveal during the test.

The user explicitly authorized lowering graphics on weaker devices. Preserve
the existing website: fonts, layout, hit areas, animation curves/cadence, model
geometry and antialiasing, original photographs/videos and their overlay sources.
Use the existing backing-buffer limits and lifecycle hooks, without new packages,
an always-running sampling loop, persistent fingerprint or transmitted telemetry.

## Bounded plan and agent responsibilities

- Runtime review/implementation: shared `graphics-quality.js` policy and the
  existing deterministic quality tests. Existing normal caps remain identical;
  weak hardware is a conservative hint, not exact device identification.
- Interaction/performance integration: existing model, video preview and footer
  buffers; existing active frame clock; actual buffer/browser regressions. A
  density-only change must preserve positions, pointer state, video source/time,
  accessibility and visible animation progress. Detach every subscription.
- Compatibility/reliability review: classic-script crowd and offline decorative
  canvas, optional enhancement failures, shared-bundle state, cleanup and privacy.
  The crop editor's export canvas and original media stay outside this policy.
- Root: scope/minimality review, measured pixel budgets, local preview, regression
  gates, and the previously authorized push and hosted verification workflow.

The relevant ECC workflows are the existing benchmark/correctness loop, motion
performance/lifecycle guidance, React effect cleanup, verification and browser
QA. User preservation constraints take precedence over skill suggestions to
replace motion libraries, change durations or remove animations.

## Policy contracts to prove

Normal/capable and unknown hardware keeps the current caps. A lower initial tier
requires both valid positive hints: memory at most 4 GiB and logical cores at most
four. Missing or malformed hints retain normal quality. These browser values are
coarse, sometimes unavailable and not exact hardware facts.

Low caps: models 1, backgrounds 1, previews 1.25; the additional `decorative` kind
keeps the crowd/offline normal cap 1.5 and lowers to 1. Native DPR and any lower
caller maximum always win. Geometry, CSS dimensions and antialiasing do not change.

Unknown or capable devices may reach the same lower tier after two consecutive
pressure windows, each at least two seconds and 12 eligible intervals, with a
strict majority over 45 ms. Normal 30 Hz and intentionally 24/30 FPS media must
not be mistaken for graphics pressure. Ignore hidden/loading/paused periods,
duplicate/backwards timestamps, isolated stalls, and gaps over one second.
Reuse already-running visible frames, with no new timer/RAF. A single downward
latch per document avoids oscillation; no localStorage, cookies or server state.
Native modules and standalone/recovery React bundles share one Symbol state.

## Evidence and acceptance

The existing 168 density assertions are retained. Added weak-hardware assertions
first failed against the original policy (`1.5 != 1`), saved in
`output/adaptive-graphics-policy-red.log`. Further deterministic and real-browser
checks must verify sampling boundaries, in-place resizing, cross-bundle delivery,
capable-device parity, subscription cleanup, visible paint and offscreen idling.
Synthetic hardware/frame inputs are emulation, not physical-device FPS evidence.

The Hobbies progress solver now catches up by at most 250 ms per visible frame
using its existing small integration steps. Frame deltas of 50 ms or less are
unchanged. The deterministic 4 Hz regression checks that spread finishes within
five seconds and a longer interruption still has bounded catch-up.

The build, strict TypeScript, static site, cooperative model preparation,
desktop and animation algorithms, graphics density, renderer, offscreen motion,
runtime budgets and decorative lifecycle checks passed locally. The adaptive
browser test's initial run observed one frame on synthetic BFCache restoration.
The revised check measures offscreen idling after that visibility update and
passed all six Chromium profiles. The drawing buffers used about 56% fewer
pixels for high-DPR laptop models and 36% fewer for high-DPR touch models on
the lower tier. CSS dimensions, antialiasing and video sources matched. All 15
local engine and viewport journeys passed, including WebKit laptop, and all
connection recovery scenarios passed.
