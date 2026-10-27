# Shub — Portfolio

Personal portfolio featuring an interactive ID card, skills, photography, travel, gaming and music. The hobbies section includes interactive Three.js models, animated media arcs and galleries.

## Run locally

Install a current Node.js LTS release, then run:

```sh
npm ci
npm start
```

Open http://localhost:3000. Keep the server running while browsing.

## SEO and validation

The preferred production address is https://www.pandeyshubham.in/. Identity,
canonical origin, social metadata and verified profile links are configured in
`site.config.cjs`. `SITE_URL` can override the origin and
`GOOGLE_SITE_VERIFICATION` accepts a real Search Console verification token.

```sh
npm run build
npm run typecheck
npm run check
```

Animation and model regression checks (no additional dependencies):

```sh
npm run check:models
npm run check:animation-performance
npm run check:rounded-box
npm run check:loading-recovery
npm run check:renderer
npm run check:scroll-intent
npm run check:desktop-performance
```

The desktop performance check compares ID-card poses, lighting, Travel geometry
and high-refresh particle cadence against Git revision `05244ef`. Keep that
revision available when using a shallow checkout. It runs without a browser.

Optional browser regression checks use an externally installed `playwright-core`
and Chrome (or `BROWSER_CHANNEL=msedge`). Set `PLAYWRIGHT_MODULE` to that module's
absolute path, start the local server, then run `node checks/browser-regression.cjs`.
`AUDIT_URL` selects a local production preview; `BROWSER_PROFILE` can select
`phone`, `tablet`, or `desktop`. Screenshots and results are written under ignored
`output/performance/`. The checks do not edit gallery content or submit contact links.

For desktop coverage, set `BROWSER_PROFILE=desktop` and optionally
`DESKTOP_WIDTH` / `DESKTOP_HEIGHT`. `BROWSER_EXECUTABLE` selects another installed
Chromium browser. `node checks/desktop-hover-regression.cjs` verifies that a
stationary cursor cannot freeze the Skills entrance at five desktop sizes while
retaining the finished orbit's hover pause. `node checks/desktop-frame-cadence.cjs`
compares actual contact-canvas paints with delivered animation frames. Run that
timing check alone, with `AUDIT_URL` pointing to a production preview; its default
is port 3013. The cadence reference also requires revision `05244ef`.

The additional `node checks/rendering-reliability.cjs` suite checks repeated
Skills/Hobbies navigation, fast reversals, orientation changes at both anchors,
direct refresh, back/forward, collected DOM/listener counts, and interrupted
module/metadata requests. Set `REPAIR_WIDTH` for one viewport,
`REPAIR_FAULTS_ONLY=1` for the recovery cases, or `REPAIR_MEMORY_CYCLES=20` for a
longer collected-heap/RAF check. Results go under ignored
`output/render-repair-2026-10-25/` unless `REPAIR_OUTPUT` is provided.
`REPAIR_DESKTOP=1` selects five desktop viewports; `REPAIR_CPU` overrides CPU
throttling and `REPAIR_SKIP_FAULTS=1` isolates navigation/memory checks.

`node checks/media-decoding.cjs` uses the same external browser module to decode
the referenced gallery images and load each video to a playable state for
phone, tablet and desktop delivery. It reads assets without editing the library.

`node checks/touch-skills-regression.cjs` checks touch scrolling and persistent
focus halfway through the hero transition, including one-pixel scroll settling,
real reversal, keyboard pausing, and actual painted icon pixels. It uses the
same browser environment variables and runs at 4× CPU throttling. Its diagnostic
reads are injected by the test route and are not part of the website.

The Gaming overlay uses `components/ui/3d-testimonails.tsx`, adapted from the
supplied vertical marquee, with the existing local game artwork. Columns alternate
direction and fit desktop, tablet and phone viewports. Hover/hold pauses motion;
wheel, swipe and arrow keys browse, and Space toggles keyboard playback. Reduced
motion shows a scrollable static gallery. Decorative repeats are inert and hidden
from assistive technology. No testimonial/avatar assets or dependencies are needed.
`node checks/gaming-marquee-regression.cjs` checks these interactions, all 33 games,
five viewport sizes and repeated native-dialog cleanup using the same external
Playwright variables. `AUDIT_OUTPUT` selects its screenshots/results directory.

Normal galleries retain the shared runtime. Standalone `*-recovery.js` bundles
are built from the same components and loaded only if a lazy import's shared
dependency has failed and become stuck in the browser module map. They are not
preloaded during normal browsing. Native fallback icons and media access remain
independent of a model module's availability. Saved travel captions are also
generated from `travel-locations.json` so a delayed metadata API cannot block
Travel previews or its overlay.

The build generates responsive portraits, prepared crowd sprites, social icons,
metadata, JSON-LD, robots.txt, sitemap.xml, a manifest and a custom 404 page.
It then compiles the lazy photography island and minifies the static deployment.
Original media is retained. Vercel preview HTML receives `noindex`; its canonical
continues to point to production. Production HTML is indexable.

### Phone and tablet media delivery

Touch devices use separate, high-quality compressed media under `assets/mobile/`.
Desktop clients keep the original delivery URLs. The photographs retain their
dimensions and aspect ratios; travel videos retain their dimensions, frame
count and source cadence. Two preview-container durations round by less than
one millisecond. Compression is lossy, not a claim of pixel-identical encoding.
Tablet photography uses the existing responsive selection instead of the
desktop-only minimum 3840px source. No animation or layout is simplified.

After updating media, run `npm run build:mobile-media` locally, then `npm run build`.
The media command uses the installed Sharp package and an `ffmpeg` executable
on PATH; it caches unchanged encodings. Commit the generated mobile assets and
`mobile-media-data.json` with the source changes. Regular deployment builds use
those prepared files and do not require FFmpeg or re-encode the media.
Missing manifest entries (including new image-studio uploads) use the existing
sources until copies are regenerated. An unavailable manifest also falls back
to the existing sources. Native `<picture>` sources handle profile images.

Submit https://www.pandeyshubham.in/sitemap.xml after deployment. Read
`SEO-AUDIT.md` for measurements, remaining accessibility issues, Search Console
steps and future analytics setup. No analytics tracking is installed.

`photography-descriptions.json` stores descriptions keyed by original filename.
Review descriptions when adding photographs; regenerate the photography data
before running the deployment build. Visible photograph numbers remain separate
from the descriptive alternatives used by assistive technology.

## Project layout

- `index.html`: website sections and galleries.
- Root CSS and JavaScript files: styling, animation, smooth scrolling and model interactions.
- `assets/`: optimized media, artwork and icons.
- `PHOTOGRAPHY/` and `TRAVEL/`: original media.
- `photography-data.js`, `travel-data.js`, `gaming-data.js`, `music-data.js`: gallery content.
- `server.cjs`: local server with video range support and compression.

## Travel location labels

While the local server is running, open http://localhost:3000/travel-locations.html to edit labels. Changes are saved in `travel-locations.json`. Reload the portfolio after saving.

## Refresh media

After updating the original media folders, regenerate the corresponding assets:

```sh
node build-photography.cjs
node build-travel.cjs
```

The media builders use Sharp; video processing also requires FFmpeg and FFprobe on your PATH. Additional scripts generate gaming and music artwork.

## Hosted version

### Vercel

Import this GitHub repository into Vercel. The included `vercel.json` configures:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `./` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

The build copies the portfolio and original media, publishes the required Three.js and Lenis browser files under `vendor/`, and reads location labels from the saved JSON. No FFmpeg or media regeneration is needed during deployment. The editing form remains available only through the local server. To publish changed labels, save locally and commit `travel-locations.json`.

Run `npm run build` to generate the same static output locally. Generated `dist/` files are excluded from Git.

### Sites

https://shub-creative-portfolio.shubhamppandey1.chatgpt.site

The hosted copy is a read-only snapshot. `build-share.cjs` prepares that snapshot using the owner's local Sites configuration, which is intentionally excluded from this repository. The location editor runs locally.
