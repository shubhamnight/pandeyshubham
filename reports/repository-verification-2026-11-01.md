# Repository verification — 2026-11-01

Follow-up to the OnePlus runtime audit and legacy cleanup, at the user's request
to verify and push all pending work. The earlier reports describe their local,
pre-commit state; this verification covers the combined changes.

## Fresh checks

- Full production build and TypeScript passed.
- 716 site/source/build checks and 1,854 media checks passed.
- Model batching and exact geometry parity for all 89 rounded boxes passed.
- Loading recovery, renderer initialization and scroll-intent checks passed.
- Desktop performance and animation regressions passed, including 4,824 ID-card
  comparisons, 720 desktop Travel comparisons, 4,800 animation comparisons and
  eight refresh rates.
- All 168 graphics-density checks passed, including desktop-mode iPad detection.
- Optional share packaging passed without publishing or using owner credentials.
- On the fresh production package, all 14 original decoded Skills images stayed
  connected through enhancement and navigation on phone and desktop profiles.
  An injected phone SVG outage recovered in one retry, without page errors.

The six browser suites completed during cleanup also passed: opening loader,
liquid-to-PLAY handoff, wave-loop rendering, three-platform interactions,
offscreen animation lifecycle, and connection retention. All 30 rendered-style
states matched the exact pre-cleanup baseline. No browser-facing source changes
were made after that verification.

## Extended production-package stress test

Passed on all eight viewport sizes: 320×568, 360×800, 390×844, 430×932,
768×1024, 820×1180, 1024×1366 and 1440×900. The 390px and 768px profiles
used 4x CPU throttling. Coverage included rapid section switching, reverse native
scrolling, history, rotation where applicable, persisted-page lifecycle,
repeated visits with garbage collection, and direct-hash reload/re-entry.
All profiles finished without captured runtime errors or failed requests.

All seven fault cases passed: an interrupted model module, interrupted Skills
module, interrupted shared module, stalled mobile manifest, stalled location
data, unavailable model rendering and WebGL context loss/restoration. Galleries
remained accessible through fallbacks, context counts stayed bounded, and
permanent disposal released the model contexts.

Final results are stored locally in
`output/pre-push-verification/rendering/results.json`. No further runtime fixes
were required during this verification pass.

## Delivery scope

The repository changes include the recent Skills image/model-preparation fixes,
confirmed legacy removals, packaging consolidation, regression checks and audit
reports. Personal attachments, credentials, generated deployment output and raw
test captures are excluded. Chrome viewport/touch emulation is not a new test
on a connected physical tablet or phone. The isolated partial-hero capture
uncertainty described in the OnePlus report remains unconfirmed; these checks
do not claim it is resolved. A repository push does not by itself verify a
subsequent hosting deployment.
