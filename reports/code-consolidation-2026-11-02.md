# Code consolidation — 2026-11-02

This records the source-consolidation pass. Later backend and regression fixes,
including the small tablet close-button correction, are reported separately.

## Result

Consolidated repeated implementation across 17 existing source files into four
shared helpers. The affected implementation totals, including the helpers,
changed from 1,241 lines / 68,339 bytes to 1,011 lines / 54,141 bytes: a net
reduction of 230 lines and 14,198 bytes. Counts exclude generated bundles,
documentation and regression checks. They are source-maintenance measurements,
not a claim about FPS or total site download size.

## Shared implementations

- `lib/overlay-host.ts`: the four gallery mounts share shadow-root creation,
  stylesheet readiness, abort cleanup and their existing 15-second timeout.
  Each mount retains its content, classes, error wording and React lifecycle.
- `hobby-media-runtime.js`: photography, gaming and Travel share preview image
  creation, decoding and replacement, three-slot cycling, visibility-aware video
  playback and permanent-departure cleanup. The existing startup margin,
  reduced-motion handling, dialog pause and persisted-page behavior remain.
- `media-deck.js`: the four media categories share Fisher–Yates selection,
  exhaustion/refill and immediate-repeat avoidance. Travel still selects one
  video among every three previews; its distinct looping video player remains.
- `lib/build-ui.cjs`: seven UI build entry scripts share their Tailwind/esbuild
  pipeline; the shared/recovery build also reuses the same browser options.
  Photography preparation, music metadata generation, offline cache generation
  and current entry URLs remain. Complete-file JavaScript output uses the
  existing write/rename helper.

Speculative overlay styles now use low-priority CSS prefetch on intent, with
JavaScript module-preloading retained. The actual gallery still waits for its
scoped stylesheet before rendering. Hover/focus no longer asserts imminent CSS
use through preload.

## Audit boundaries

The pass reviewed the entry/build scripts, gallery mounts, media runtime and
data consumers, and checked the TypeScript components/helpers for unused locals
and parameters. No unused TypeScript locals or parameters were found. Current
model, cursor, hero and scrolling implementations already use shared runtime
helpers and were preserved. Root appearance styles and actual media were not
edited. Tailwind removed incidental unused utilities from four generated
stylesheets after the source extraction; active rendered styles were checked.

Source media, generated responsive copies, JSON/static-module data pairs,
standalone recovery bundles and existing hashed compatibility chunks serve
different runtime/editor/recovery roles and remain. Gallery-specific fallback
content and explicit cancellation/version guards remain separate where their
behavior differs. This is a targeted consolidation, not a claim that every
similar-looking line should become a generic abstraction.

## Verification

- Full production build, normal TypeScript check and the stricter unused-local /
  unused-parameter check passed.
- 734 site/source/build checks and 1,876 media checks passed; media checks now
  cover empty/single/multiple-item decks and repeat-free refill boundaries.
- Model batching and 4,800 animation recurrence comparisons passed.
- 36,000 before/after media selections matched exactly across all four
  categories, three random seeds and empty/single/multiple-item libraries.
- Shared stylesheet tests passed for application, pre-aborted signals, abort
  during loading, failed CSS, timeout, eight successful retries and reuse of
  the same shadow root, with no page errors.
- All 30 rendered-state snapshots matched the original files replayed on phone,
  tablet and desktop. Typography, colors, shadows and animation definitions are
  compared exactly; width/height/transform-origin geometry is compared to 0.1
  CSS px to account for rounded grid tracks occupied by shuffled artwork.
  Inert sections are excluded from visible-state sampling.
- Production-package interactions passed on phone, tablet and desktop: PLAY
  entry/hash reset, ID drag and settling, 14 loaded skill icons, model handoff,
  all four overlays and their controls, close/focus/scroll cleanup, repeated
  mounting, and Projects/résumé placeholders.
- Offscreen checks passed on phone/tablet with 4x CPU throttling and desktop:
  no hidden Hobbies/model frame callbacks at Projects, preserved animation
  phase and persisted-page/shadow-root visibility handling.
- Connection-retention and contact-module outage recovery passed on phone and
  desktop; the loaded document and open gallery survived connection drops.
- Warming all four galleries and waiting eight seconds produced four CSS
  prefetch hints, zero CSS preload hints and no unused overlay-preload warnings
  in Chrome's browser log.
- The optional share-packaging check and whitespace validation passed.

Raw captures, source backups, selection comparisons and measurement details
remain under ignored `output/code-consolidation-2026-11-02/`.

## Delivery

Available locally at `http://localhost:3000/`; the production-package preview is
at `http://localhost:3013/`. Reload an existing tab to use the new modules.
These checks used local Chrome viewport/touch emulation, not a newly connected
physical phone or tablet. No new FPS guarantee is claimed. The earlier isolated
partial-hero capture uncertainty is unchanged by this source refactor.
Publishing is a separate step after the combined regression verification.
