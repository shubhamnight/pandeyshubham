# Regression verification — 2026-11-02

## Completed verification

- Full production-build run: **42/42 checks passed** (41 named cases plus build).
  Evidence: `output/regressions/2026-11-02T12-38-41-702Z/results.json`.
- Final affected-case rebuild/recheck: **8/8 passed**, including strict TypeScript,
  738 source/build assertions, 1,876 media assertions, backend, loading/PLAY and
  the strengthened five-browser matrix. Evidence:
  `output/regressions/final-browser-backend-recheck/results.json`.
- Final share-package and historical negative controls: **2/2 passed**. Evidence:
  `output/regressions/final-negative-controls/results.json`.
- All 42 changed CommonJS files passed syntax checks; whitespace checks passed.
  Both local previews returned 200 and served the corrected import map and the
  exact validated font bytes. Original media/library/location data was preserved.

The full run initially permitted working fallback icons in its browser journey.
Follow-up inspection identified missing Firefox 3D models behind that fallback.
The final browser check is stricter: all four models must render, the Batman
typeface must decode, and normal journeys must have zero console errors. Those
stronger requirements passed after the fixes below; earlier fallback-only
results are not presented as proof that Firefox rendered its models.

## Additional bugs fixed during verification

- Moved the Three.js import map before every module script/preload. Firefox had
  ignored the late map and failed all four model imports despite available WebGL.
- Repaired the Batman font's malformed metadata. FontTools 4.68.0 comparison
  preserved all **187 glyph outlines**, glyph order, character maps, advance
  metrics, kerning, instructions and hint tables. The invalid obsolete `hdmx`
  cache was removed and `cmap`/`kern` metadata recompiled. The font shrank from
  14,392 to 13,080 bytes. Integrity hashes are checked into
  `checks/fixtures/batman-font-integrity.json`; FontTools is not a runtime dependency.
- Aligned the Photography close cross with the other overlays on tablets by
  correcting its inset by three CSS pixels, retaining its existing appearance.
- Fixed the backend failures detailed in `backend-stress-2026-11-02.md`, including
  concurrent saves, UTF-8 bodies, encoding/validators, write recovery and an
  encoded-null-byte URL that could terminate the local server.

## Coverage and evidence

The final Chrome, Edge, Opera GX, Firefox and WebKit journeys passed at laptop
1366×768, phone 393×873 and tablet 820×1180: **15 combinations**, each with 14
decoded Skills icons, four rendered models, four usable galleries, fitting
layouts and zero page/console errors. Opera GX and Firefox ran headed. Firefox
and WebKit are Playwright test distributions, not physical Android/iOS browsers.

Additional checks covered 13 text-layout sizes with all 28 music cards, native
touch input, ID drag/cancel/blur/rotation, five gaming sizes, image/video decoding,
media quality, hidden-animation suspension, retained content during connection
drops, eight repeated-navigation stress profiles and seven injected failures.
Source geometry, model batching and animation recurrence comparisons passed.

Steady-state local Skills/Hobbies samples advanced normally; p95 frame gaps were
6.2ms in this run, with the largest sampled gap 42.4ms. The high-refresh particle
check painted 661 times for 661 delivered animation frames. These are controlled
local measurements, not a physical-phone FPS guarantee or a claim of a new
speedup attributable solely to this refactor.

The final negative controls rejected the original stranded-phone entrance,
restored CSS-preload hints, late import map, malformed original font and nine
old-backend failure groups. The current phone implementation passed the same
entrance trigger. The malformed-path control reproduced the old filesystem
exception; no live source was reverted to run these tests.

## Limits and running again

No physical phone/tablet was retested in this pass. The earlier isolated partial
hero CDP capture still needs independent physical-display verification; settled
ID paint samples do not establish that uncertainty is resolved. GPU/browser/OS
combinations outside the recorded matrix and subjective source-photo detail
cannot be certified by these automated checks. The backend load was bounded
and isolated, not a public-hosting capacity test or power-loss transaction test.

Run `npm test` for the full suite or `npm run test:backend` for the isolated
15-group backend test. See `checks/README.md` for setup, case selection, test
requirements and platform distinctions. Local evidence and temporary tools stay
ignored; only implementation, tests, validated assets and reports are published.
