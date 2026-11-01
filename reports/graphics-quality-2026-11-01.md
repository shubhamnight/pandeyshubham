# Controlled graphics quality adjustment — 1 November 2026

Scope: discussion point 2. Baseline: `49f92b20c38644eb8da2ac255877255ebfda7bfb`.
Changes remain local for preview. No dependency installation or media re-encoding.

Decorative raster surfaces now use modest density caps. A fine-pointer device
uses model / particle-background / orbit-video-preview caps of 1.5 / 1.35 / 1.75.
Touch devices use 1.25 / 1.25 / 1.5. The helper also recognizes desktop-mode iPads,
retains lower native densities, and respects each renderer's existing lower cap.
Model antialiasing remains enabled. Canvas resizing continues through the existing
resize observers and uses the capped ratio from its initial allocation onward.

## Measured backing-store reductions

Chrome on Windows, local source server. Desktop: 1440×900 at DPR 2. Phone:
390×844 at DPR 3 with touch emulation. Tablet: 768×1024 at DPR 2 with touch
emulation. Before/after use the same viewport sizes and model geometry. Totals
below sum the four model buffers; preview numbers are for the visible orbit
video canvas. Raw measurements are in ignored `output/graphics-budget/`.

| Profile | Model pixels before → after | Model reduction | Preview reduction | Contact background reduction |
| --- | ---: | ---: | ---: | ---: |
| High-DPI desktop | 213,607 → 133,093 | 37.7% | 23.8% | 19.0% |
| Phone | 66,136 → 28,293 | 57.2% | 43.1% | 30.5% |
| Tablet | 109,422 → 47,175 | 56.9% | 43.8% | 30.6% |

These are allocated/drawn pixel reductions, not measured FPS or whole-site speed
improvements. Desktop displays at DPR 1 keep their current model density.
Actual smoothness depends on the device, GPU, browser and other active work.
The controlled tradeoff is a slight reduction in decorative surface sharpness,
with stronger reductions on touch devices. A physical phone review is still useful.

Model pieces and batched draw counts are identical before and after: camera
38 / 12, plane 31 / 11, controller 60 / 15, Walkman 75 / 26. Model meshes,
materials, lights, resting sizes, animation paths, easing and timing are unchanged.
The contact particle drawing/physics function and paint cadence are unchanged.
Photos, game and album artwork, full overlay videos, text, project/resume
placeholders and layout have not been altered.

## Validation

- `checks/graphics-quality.mjs`: 168 density/device-selection assertions.
- `check-renderer-initialization.mjs`: initial allocation and retained antialiasing.
- `checks/graphics-budget-regression.cjs`: real model buffers and contexts, all
  14 skill logos, contact canvas, and portrait/landscape resizing in three profiles.
- `checks/browser-regression.cjs` with the phone profile: ID drag/release, Skills,
  model handoff/rotation, all four galleries' controls/keyboard/close, and six
  repeated gallery mount/unmount cycles pass without browser errors.
- TypeScript, production packaging, model batching and 1,854 media checks pass.
- `check-desktop-performance.cjs`: 4,824 unchanged ID simulation frames,
  unchanged particle physics/cadence, and 720 unchanged Travel pose comparisons.
  Its particle reference was updated to the already accepted palette commit;
  the old reference incorrectly treated that earlier color change as a failure.
