# Regression checks

Run these commands in PowerShell in the repository folder:

```powershell
npm ci
node node_modules/playwright-core/cli.js install firefox webkit
npm test
```

The complete run builds the production files, starts its own loopback preview,
runs 44 named cases sequentially, writes the real exit codes and evidence to
`output/regressions/<timestamp>/`, and stops its preview. It does not stop the
owner's preview or publish anything. Expect a substantial run: rendering stress
and the five-browser journeys are deliberately sequential to avoid competing
for the GPU. A failed case remains failed even if later cases pass.

The browser matrix requires installed Chrome, Edge and Opera GX on this Windows
machine, plus the pinned Playwright Firefox and WebKit distributions. FFmpeg and
FFprobe must be on PATH for video quality checks. Missing browsers or tools are
failures, not passing skips. Executables can be specified with
`CHROME_EXECUTABLE`, `EDGE_EXECUTABLE`, `OPERA_EXECUTABLE` and
`BROWSER_EXECUTABLE`. No external browser accounts or normal profiles are used.

```powershell
# List the cases, bug triggers and platform coverage.
npm run test:regression:list
# Backend only: creates and starts isolated servers automatically.
npm run test:backend
# Faster shared-code checks, including strict unused TypeScript checks.
npm run test:regression:core
# One or several cases, still rebuilding first.
npm test -- --case=id-card,connection,backend-stress
# Reuse an already-current production build.
npm test -- --case=browser-engines --no-build
# Give this run a separate evidence directory.
npm test -- --output=output/regressions/my-run
```

Groups are `core`, `backend`, `browser`, `history`, `media`, `performance`,
`stress`, `engines` and `sensitivity`; for example
`npm test -- --group=backend,history`. `AUDIT_URL` can point at an existing
preview, but the backend stress case always creates its own isolated servers.
The full run clears focused diagnostic filters so a leftover `READING_WIDTH`
or similar variable cannot silently reduce coverage. Focused runs may use
those variables; their evidence must be described as focused coverage.

## Historical bug coverage

| Area / previous problem | Regressions and actual triggers |
| --- | --- |
| Loader missing, old Batman allocation, failed bundle | `loading`: first paint, blocked loader bundle, reduced motion; `wave-loop`: loop seam and box artifacts |
| Loader-to-PLAY handoff and original button appearance | `liquid-play`: desktop, phone, tablet and hidden-tab morph; checked-in original style fixture |
| Reload entering Hobbies/Projects | `interactions`, `historical-contracts`, `rendering-stress`: reload/hash/history and PLAY entry |
| ID card jumping, clipping, stuck drag or needless frames | `id-card`: native mouse/touch drag, cancellation, blur, keyboard, rotation, settled paint and idle loop; `desktop-algorithms`: original pose comparisons |
| Skills icons stranded, late, absent or undecodable | `touch-skills`: native CDP touch scrolling at 360/393/768 widths, touch focus and actual paint; `skills-images`: delayed/failed image replacement; `stationary-hover`: five laptop sizes |
| Hobbies models incomplete or preparation blocks input | `cooperative-preparation`, `renderer`, `model-batching`, `rounded-box`, `rendering-stress`: staged work, GPU loss, retry, disposal, geometry/material preservation |
| Jitter, excess graphics work, high-refresh caps | `scroll-intent`, `animation-algorithms`, `cursor-physics`, `graphics-density`, `graphics-buffers`, `particle-paints`, `runtime-budget` |
| Offscreen or hidden-tab animation/video keeps running | `offscreen`, `animation-algorithms`, `gaming`: viewport exit, dialog pause, hidden tab and persisted page lifecycle |
| Missing previews, videos or wrong mobile assets | `media`, `asset-decoding`, `preview-quality`, `manifest-recovery`: all media decode, failed/stalled optional metadata, source selection, SSIM and video frame counts |
| Hung metadata body or initially failed hobby preview stays empty | `media-recovery`: deterministic deadlines, shared retry, same-item recovery, stale decode rejection and disposal; actual source modules in an isolated VM |
| Overlay lock, stale mount, CSS failure, unused-preload warning | `interactions`, `stylesheet-lifecycle`, `historical-contracts`: repeated open/close, abort/timeout/error/retry, speculative prefetch and browser log |
| Travel click, unwanted navigation, labels and video controls | `historical-contracts`: real click moves a visible card into featured position, explicit saved names only, no serials/external links, muted inline loops, portrait frames with retained landscape exception |
| Music typography, numbering and copy overlap | `historical-contracts`, `reading`, `short-music`: fonts, retired labels, all 28 cards, native lyric scroll and short screens |
| Overlay keyboard focus and video selection | `overlay-keyboard`: native Tab/Space/Enter/Escape, Songs focus return, visible Travel focus and actual featured-card movement |
| Photography/Travel crop editor journeys | `image-editor`: isolated synthetic media and routed API contracts across three viewport/input profiles; actual backend persistence/encoding stays covered separately by `backend-stress` |
| Gaming accessibility, seams, missing games | `gaming`: five profiles, wheel, touch swipe, keyboard, reduced-motion access and unmount cleanup |
| Cursor outline, drift or replacement of normal pointer | `cursor-follower`, `cursor-magnetism`, `cursor-physics`: hover/press/edge targets, shadow cards, top-layer dialogs and no touch cursor loop |
| Connection drop discards already-loaded page | `connection`: laptop, phone, tablet, failed contact bundle and retry, cold offline navigation |
| Mobile text tiny, ring/text collision or overflow | `reading`: 13 viewports, 320px through 2560px, portrait and landscape; `browser-engines`: all five apps at three profiles |
| Resume/project placeholders accidentally removed | `site`, `historical-contracts`: existing placeholders retained |
| Backend corruption, failed writes, download/encoding bugs | `backend-stress`: isolated concurrency, disconnects, UTF-8 chunks, validators, uploads, persistence and failure recovery; see below |

Shared algorithm/source checks apply to the code used by all three platforms;
they are not presented as three physical-device runs. The standard browser
journey uses laptop 1366×768, phone 393×873 and tablet 820×1180. Individual
regressions also use their documented sizes. Rendering stress covers eight
viewports and seven injected fault scenarios, with repeated gallery mounts,
history, resize, memory/listener/RAF tracking and CPU throttling.

Chrome and Edge are the installed applications. Opera is the installed **Opera
GX**, run headed because its automated headless mode stalls preparation.
Firefox runs headed too, since the visible app exposes working WebGL on this
machine. The matrix requires all four models to render in normal journeys;
it does not accept fallback icons as a substitute. Explicit failure scenarios
verify fallback access separately. It also rejects normal console errors and
checks the Batman font decodes. The import map must precede all module loads;
the repaired font's original outlines and metrics are recorded in
`fixtures/batman-font-integrity.json`. Firefox is Playwright's
automation build; WebKit is Playwright's Windows
engine, not a physical Safari browser. The Firefox launcher has a Windows-only
fallback that copies the unchanged test distribution into `tmp/` if the cache
location fails to launch. It changes no system settings or the owner's browser profiles.

Headed Firefox launches on Windows disable window occlusion tracking only in
their temporary automation profile, following [Mozilla's remote-protocol
recommendation](https://bugzilla.mozilla.org/show_bug.cgi?id=1802473). Covered
automation windows otherwise delivered only nine RAF callbacks in 46 seconds
despite reporting a visible, focused document, stranding the loader. The same
unchanged website completed all three profile journeys with the preference;
the morph finished in 1.68–1.77 seconds. This does not replace RAF, alter the
website's animation clocks, change the owner's Firefox settings, or suppress
any journey assertion. Explicit launcher preferences remain overridable for
negative controls; headless and non-Windows launches retain their defaults.

## Backend isolation and stress

`backend-stress.cjs` copies the Node server and required helpers into a unique
`tmp/backend-stress-*` folder, with synthetic 64×48 images, manifests, editor
state and a dummy environment file. It never reads the real environment file
or copies the owner's original photos. It verifies the real media and location
state files remain byte-for-byte unchanged after the run.

Fifteen groups exercise compression preferences/q=0, suffix/open-ended ranges,
cache validators, HEAD/method restrictions, private-file refusal, 240 static
requests at concurrency 16, 64 aborted downloads, split UTF-8 bodies, 48 label
saves alongside 120 reads, malformed/oversized requests, interrupted uploads,
50 queued media mutations, 144 compressed cache requests, a real synthetic
3840px photography output, upload/delete/restore, deliberate write failures,
disabled editors in the production preview, and malformed URLs including an
encoded null byte. Cache entries and collected
heap growth are bounded by assertions. Limits are a controlled regression load,
not a maximum-capacity or public denial-of-service claim.

The production website is a static deployment. This tests the repository's
local Node static server/editor APIs and its read-only production preview;
it does not stress Vercel or the public domain. Fixtures and logs remain in
ignored local folders for inspection.

## Proving the assertions and understanding limits

`historic-reproductions` routes the original stranded-phone Skills code and
restores the CSS-preload bug in isolated browser sessions. It requires those
checks to fail for the behavioral reason, then requires the current phone code
to pass. It restores the late-import-map and original malformed-font bugs in
Firefox and requires the corresponding model/console assertions to fail.
It also runs the backend tests against the prior server revision and
requires six specific historical failure groups. No live source is reverted.
These negative controls are successful only when the old faults are rejected.

Comparison checks require Git history, including revisions `05244ef`, `49f92b2`,
`21ffb09b6f78acff4e11ffc3620e2bd51b322a5f` and
`2b6022d1513d53115ee078745b2832ecc29a4a03`. A shallow clone needs the relevant
history fetched first. `legacy-cleanup-regression.cjs` is a separate before/after
visual-contract audit that requires a pre-change baseline; it is intentionally
not counted as a self-contained passing regression in the default manifest.

Phone/tablet tests here use browser input and viewport emulation. They do not
establish physical Android/iOS, Google app, every browser version, all devices,
or universally stutter-free FPS. Local steady-state frame budgets verify the
animations actually advance and reject sustained gaps/stalls; they do not
measure every physical compositor frame. The previously isolated partial-hero
CDP capture still needs independent physical-display verification. Settled ID
card paint samples do not resolve that uncertainty. Perceived source-photo
detail also requires visual judgment; upscaling cannot prove new real detail.
