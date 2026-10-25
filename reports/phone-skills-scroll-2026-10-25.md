# Phone Skills scroll/focus repair — 25 October 2026

Starting revision: `21ffb09b6f78acff4e11ffc3620e2bd51b322a5f`.

## Reported symptom and scope

The user supplied two hosted-site screenshots and reported missing Skills
icons and stuttering on Redmi Note 13 Pro and Nothing Phone (3). The gaps
remained after waiting and changed only after further scrolling.

The screenshots do not expose internal animation state or GPU diagnostics.
Two concrete controller failures were reproduced with the same code; they
are documented below. This report does not claim physical access to those
phones or establish every device-specific graphics behavior from a screenshot.

The relevant hosted HTML/JS/CSS was fetched successfully. The hosted
`skills.js`, `hero-transition.js`, `hobby-motion-clock.js`, `smooth-scroll.js`,
`responsive.css`, and Skills JS/CSS matched the local production package by
SHA-256 at the start of this repair. A stale deployed version was not the
explanation for those files.

## Root causes reproduced

### 1. Native settling is misclassified as deliberate reverse scrolling

`skills.js` treated any backward change greater than **0.1 CSS px** as a reverse
request. In the middle of hero-to-Skills entry, a single **1 px** backward
adjustment switched `mode` from `entrance` to `retreat`. The retreat target is
based on the current scroll coordinate, so it then settled at a nonzero
fraction and stopped running. Waiting did not resume entry. Scrolling further
down cleared the return target and restored the ring.

At 393×873, touch emulation and 4× CPU throttling, one isolated local baseline
case held **4 visible holders after 11 seconds**, in `retreat` at progress
0.354765. Further downward scrolling restored all 14. The same reverse-mode
transition was also observed on the hosted page after a 1 px adjustment to a
settled ring; its smaller reverse target kept the holders visible but froze
the intended orbit.

### 2. Touch focus and non-hover compatibility events pause unfinished entry

The animation paused whenever `focusInside` or `pointerInside` was true. A tap
leaves a button focused after the finger lifts. Focus was not distinguished
from keyboard-visible focus, and mouse-type pointer events were accepted even
on a device advertising no hover capability. If either happened during entry,
the remaining icons could stay outside the visible part of the path indefinitely.

An isolated baseline tap case held **6 visible holders after 11 seconds**, still
in `entrance`, with both pause flags true. A retained regression against the
original `21ffb09` controller combined the settling and interaction cases and
failed after 18 seconds, with **3 visible holders**, nonzero retreat, and both
pause flags true. These are state-controller failures, not absent SVG files.

Raw baseline evidence is in `output/phone-scroll-2026-10-25/before/`,
`hosted-before/` and `reference-regression/`.

## Targeted repair

- Touch scrolling now uses a **4 CSS px accumulated reverse-distance guard**.
  Single-pixel settling does not request a whole exit, while a slow deliberate
  reverse still works across small updates. This changes input classification,
  not the existing path, easing, velocity, duration or reverse animation.
- On touch devices, resize/re-anchoring and visibility return reset the direction
  reference. Browser geometry changes are not counted as reverse gestures.
- Touch-only devices ignore hover-pause events when no hover-capable input is
  available. Touch focus pauses the orbit only when it is keyboard-visible
  focus. Focus itself and the existing tooltip behavior remain available.
- Real keyboard focus continues to pause the ring and blur resumes it. Deliberate
  reverse scrolling still uses the original retreat. Fine-pointer desktop
  direction/focus behavior retains its previous branches.

No visibility override, delay, forced refresh, reduced icon count, replacement
asset, layout edit, CSS change or animation simplification was introduced.

This removes two reproducible sources of an apparent freeze or direction
jolt. It is not a claim that all native WebGL startup pauses identified in
the earlier report have disappeared.

## Files

- `skills.js` — input classification and the relevant listener lifecycle.
- `scroll-intent.js` — small, allocation-free-per-update direction guard.
- `check-scroll-intent.mjs`, `package.json` — deterministic guard checks.
- `checks/touch-skills-regression.cjs` — native touch, focus, reversal and painted-pixel regression.
- `README.md`, this report — verification instructions and evidence.

## Verification

Passed:

- `npm run check:scroll-intent` — one-pixel settling, accumulated genuine reverse,
  forward resumption, invalid-coordinate handling and geometry reset.
- `npm run typecheck` and `npm run build`.
- `npm run check` — 639 source/build checks.
- `npm run check:animation-performance` — 4,800 existing recurrence comparisons,
  the original refresh-rate cases and 1,444 exact contour queries.
- `git diff --check` and syntax checking of the retained browser regression.

The new `checks/touch-skills-regression.cjs` passed at **393×873, 360×800 and
768×1024**, all using touch emulation, DPR 2 and **4× CPU throttling**, against
both the source server and the rebuilt local production package. It checks:

1. A one-pixel backward settling adjustment during entrance.
2. Touch focus and a mouse-type compatibility pointer event on a non-hover device.
3. Completion to 14 visible holders and continued orbit while no more scrolling occurs.
4. Actual screenshot pixels for the in-frame cards during the incoming transition.
5. All 14 cards painted when the Skills viewport is fully visible.
6. The existing deliberate reverse animation.
7. Keyboard-focus pausing and blur resumption.
8. Native CDP touch swipes from Home back into Skills without stranded icons.

The test distinguishes an icon intentionally outside the screen while a page
is partly entering from an in-frame card that failed to paint. It does not
mask screenshot regions or force visibility. Its injected diagnostic getter
is a test-only route modification and is not shipped in the application.

All six source/production touch profiles completed with zero unexpected
console or runtime errors. Before repair the isolated tap case remained at
6 holders; after repair it reached 14 and continued orbiting without further
scrolling. The isolated settling case improved from 4 to 14 under the same
conditions. The original controller also fails the retained combined test,
as recorded in `reference-regression/failure.json`.

The existing wider navigation suite was rerun at **390×844 and 768×1024**,
both at 4× CPU throttling. Both passed Home/Skills/Hobbies sequences, rapid
reversal, portrait/landscape, fast native scrolling, back/forward, five collected
round trips, persisted lifecycle simulation and direct refresh. All 14 logos
loaded, with no unexpected errors or failing HTTP responses.

The local production **desktop** regression also passed: ID drag/release,
Skills, all four gallery controls/keyboard/close behavior, project controls and
six gallery mount/unmount cycles. No desktop style or asset was modified.

Results and screenshots are under ignored `output/phone-scroll-2026-10-25/`:
`regression/`, `production-touch/`, `production-desktop/`, `navigation-390/`
and `navigation-768/`. The temporary production-preview server was stopped;
the source server on port 3000 remains available.

Physical-phone confirmation after publishing is still required. These results
establish the two reproduced input-state defects and their repairs; they do
not guarantee that every GPU or browser-specific stutter is eliminated.

## Publication

At completion of verification the repair was local, with no commit, push or
deployment performed. The user subsequently authorized committing and pushing
the repair. The user's original screenshots remain local and are excluded
from the commit. Physical-phone confirmation is required after the hosting
service publishes the new revision.
