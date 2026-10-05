# Shubham Pandey portfolio: SEO audit and implementation

Audit date: 5 October 2026. Preferred public URL: **https://www.pandeyshubham.in/**.
The supplied `pandeyshubham.in` address redirects to this `www` address. This
report records implementation and validation before publication; a successful
Git push does not by itself confirm a production deployment.
During the pre-publication live check, the homepage returned HTTP 200 and had no
X-Robots-Tag, while robots and sitemap URLs returned HTTP 404. The new public
files described here were verified in the local production build.

## 1. SEO score before and after

These are measured Lighthouse scores, rather than invented estimates.

| Mobile Lighthouse category | Before | After |
| --- | ---: | ---: |
| SEO | 100 | 100 |
| Performance | 36 | 62 |
| Accessibility, initial intro screen | 100 | 100 |
| Best practices | 96 | 100 |

Lighthouse's SEO checklist already passed before implementation. That score did
not establish that entity data, social previews, a sitemap or canonical metadata
were present. Those missing pieces are now implemented. Neither a Lighthouse
score nor structured data guarantees indexing, rankings or rich results.

The accessibility score applies to the intro screen; an independent post-entry
audit found five existing text contrast failures, described below. The portfolio
is **not** being reported as fully WCAG compliant.

Measurements used local Chrome, simulated mobile throttling, 150ms RTT, approximately
1.6Mbps throughput and a 4× CPU slowdown, with a 412 × 823 mobile viewport. The
baseline served the original source; the after run served the optimized static
deployment through the same local server implementation. These are individual
lab runs, not measurements of real visitors or production Core Web Vitals.
The compact evidence is in [reports/seo-validation.json](reports/seo-validation.json).

## 2. Architecture and issues found

This is a static HTML portfolio with Three.js effects and a lazily mounted React,
Motion, Tailwind and TypeScript photography gallery. The homepage is the only
indexable document. Skills, hobbies, playground, profile and contact are section
fragments. Gallery dialogs are interactions within that document.

The important site content already existed in HTML. SSR, a framework migration,
or additional routes would not solve a demonstrated rendering problem here.

| Finding | Resolution |
| --- | --- |
| Generic `Shub — Portfolio` title and vague description | Full name and factual student/developer positioning |
| No canonical, Open Graph, Twitter card or author metadata | Centralized, build-generated metadata |
| Repository homepage pointed to an unavailable Vercel deployment | Preferred verified custom domain used throughout |
| No sitemap, robots file, schema, manifest or favicons | Added all; conventional favicon request now succeeds |
| Primary heading described the skills section, not the portfolio | One accessible identity H1; section headings use H2 |
| Education and technology interests absent from visible copy | Added only facts supplied by the user |
| “Work” navigation actually led to hobbies | Changed labels to Hobbies and Skills; retained existing fragment URLs |
| Contact section contained only a future-links placeholder | Linked the verified GitHub profile with a descriptive accessible name |
| JavaScript disabled left the loading overlay covering the site | Usable no-script content, skill list and original photograph links |
| Hero portrait was a 1.35MB PNG; camera fallback was oversized | Responsive delivery copies; original files retained |
| Blocking Google Fonts imports, including unused Barlow Condensed | Local Inter and Caveat variable WOFF2 subsets; unused import removed |
| Four hobby model imports could start behind the intro | Initialization waits for the intro to finish, then uses existing proximity loading |
| Browser repeated crowd sprite alpha cleanup on every visit | Cleanup baked once at build time |
| Static browser modules shipped without minification | Deployment-only minification with shared classic-script globals preserved |
| Gallery alternatives were generic photograph numbers | Descriptions keyed to original filenames; visible number captions retained |
| Music gallery scroll region could not receive keyboard focus | Added a named focusable region and keyboard focus outline |
| Fractional hobbies navigation endpoint could prevent card entrance | Destination rounded forward by at most two CSS pixels |
| Unknown local URLs returned an unstyled error | Styled, non-indexable HTTP 404; Vercel static 404 output included |
| Five dark-blue text accents fail AA contrast | Documented; current colors retained as explicitly requested |

There are no supported employment records, certifications, published software
case studies, college details, LinkedIn URL or email address in the supplied
material. None were invented. The hidden visual-study cards are not represented
as completed software projects or separate indexed case-study pages.

## 3. Changes made

### Crawlability, indexability and routes

- `robots.txt` allows public assets and references the production sitemap.
- `sitemap.xml` contains only the canonical homepage. Fragment links and dialogs
  are not listed as separate pages; fabricated project routes and last-modified
  dates were avoided.
- Production receives `index, follow, max-image-preview:large`.
- Vercel preview HTML receives `noindex, follow`, while retaining the production
  canonical. Root source HTML remains production metadata during preview builds.
- `/index.html` redirects permanently to `/`; existing section URLs remain usable.
- Unknown routes use `404.html` with noindex metadata. There is no catch-all
  rewrite that turns nonexistent pages into a homepage with HTTP 200.
- Static deployment does not include the local travel-location editor or its API.
- Main content and photograph links remain available without JavaScript. This
  fallback serves visitors as well as crawlers; it is not hidden keyword content.

Google recommends ordinary crawlable links and meaningful rendered content.
The native HTML and real anchor links support that approach. See
[Google's JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
and [crawlable links guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).
Vercel supports a static `404.html` in the output directory; see its
[custom 404 documentation](https://vercel.com/kb/guide/custom-404-page).

### Semantics, content and entity clarity

- Primary accessible heading: **Shubham Pandey — Portfolio**. The visual card and
  marquee remain unchanged; the heading names the actual page for assistive technology.
- Skills heading changed from H1 to H2, with corresponding CSS selectors updated
  so its computed typography and dimensions remain the same.
- Visible introductory copy now identifies Shubham Pandey and BCA (Honours).
- The profile explains software, web development, cybersecurity basics, quick
  learning, communication and entry-level development interests.
- Footer identity uses the full name; the contact link connects to the existing
  GitHub profile. No fake hiring history or credentials are implied.
- Section labels, main focus target, image descriptions, external-link protections
  and keyboard focus styles were improved.

### Social sharing and branding

- A 1200 × 630 JPEG social preview uses the existing portrait, a monochrome photo
  treatment, the site's dark-blue palette, full name and factual student positioning.
- SVG/PNG favicons, conventional ICO, Apple touch icon and manifest icons use
  the existing Batman silhouette. Loading-screen geometry and colors were not changed.
- Social preview paths use absolute production URLs. No fictitious Twitter handle
  or profile URL was added.

## 4. Metadata created

| Field | Value |
| --- | --- |
| Title | Shubham Pandey \| IT, Software & Developer Portfolio |
| Title length | 51 characters |
| Description | Shubham Pandey is a BCA (Honours) student exploring software, web development and cybersecurity. Discover his skills, creative work and technology interests. |
| Description length | 157 characters |
| Canonical / `og:url` | https://www.pandeyshubham.in/ |
| Author | Shubham Pandey |
| Application / `og:site_name` | Shubham Pandey Portfolio |
| Production robots | index, follow, max-image-preview:large |
| Open Graph type / locale | website / en_US |
| OG and Twitter title / description | Same factual title and description above |
| OG and Twitter image | https://www.pandeyshubham.in/assets/brand/shubham-pandey-portfolio-og.jpg |
| OG image dimensions / type | 1200 × 630 / image/jpeg |
| Image alternative | Shubham Pandey — BCA (Honours) student and aspiring IT and software professional |
| Twitter card | summary_large_image |

Identity and origin are configured in `site.config.cjs`. `SITE_URL` can override
the domain when deliberately moving the site; invalid or localhost origins are
rejected. `GOOGLE_SITE_VERIFICATION` accepts a real Search Console token. No fake
verification value is emitted.

## 5. Structured data

A linked JSON-LD graph contains:

1. **Person**: Shubham Pandey, real website and portrait, factual description,
   supported skills/interests, and the verified GitHub `sameAs` link.
2. **WebSite**: Portfolio name, preferred origin, language and Person publisher.
3. **ProfilePage**: Homepage title, description, WebSite relationship, Person
   main entity and social preview image.

The same entity IDs connect the graph. The current student is not incorrectly
marked as an alumnus, and an unknown college is not supplied. No fake reviews,
jobs, awards, project outcomes or SoftwareApplication records are included.
The graph parses and its entity relationships are checked locally. Google rich
result validation and eligibility should be checked after deployment; no external
validation result is claimed. See Google's
[ProfilePage documentation](https://developers.google.com/search/docs/appearance/structured-data/profile-page).

## 6. Performance improvements

| Mobile lab metric | Before | After |
| --- | ---: | ---: |
| First Contentful Paint | 3.3s | 2.6s |
| Largest Contentful Paint | 16.2s | 5.5s |
| Total Blocking Time | 2,180ms | 450ms |
| Cumulative Layout Shift | 0.004 | 0 |
| Initial transfer | 3,774KiB | 941KiB |
| JavaScript execution | 5.8s | 1.7s |

The after run transferred approximately 75% fewer initial bytes and reduced
blocking time approximately 79%. These changes include:

- Lossless responsive WebP delivery portraits, appropriate `srcset`/`sizes`,
  explicit dimensions, high hero fetch priority and lazy below-fold photos.
- Smaller responsive camera fallback and preserved original media.
- Local, licensed Inter and Caveat Latin subsets with `font-display: swap`.
  Only the critical Inter font is preloaded.
- Minification of deployment JS/CSS and required vendor modules. Classic script
  names remain intact because existing scripts share globals.
- Four hobby model allocations delayed until PLAY completes; their existing
  proximity observer, animation clock, hidden-tab handling and paused states remain.
- Existing lazy React gallery loading retained. Selected high-resolution photos
  decode before fading in; large gallery assets are not loaded during the intro.
- Crowd flood-fill/alpha repair moved to a cached build step. All 105 sprites
  retain their exact dimensions and alpha. Browser comparison covered 4,381,869
  sprite pixels: 487 RGB pixels differed by at most 2/255 from browser rounding;
  all alpha values matched.
- Existing muted travel media, posters, preview assets, `preload` behavior and
  offscreen playback suspension retained.

LCP still exceeds the requested 2.5s target. The preserved loading gate and
Batman-to-PLAY animation delay the prominent visible text. Achieving a substantially
lower LCP may require changing that experience or doing additional WebGL work.
No animation durations or deliberate scroll holds were shortened for a score.
TBT is a lab responsiveness proxy; it is not a measurement of INP. Production INP
and field Core Web Vitals require real-user data.

## 7. Validation and accessibility

Passed:

- `npm run build`, `npm run typecheck`, `npm run check` and `git diff --check`.
- 476 assertions covering source/build metadata, canonical origin, schema,
  image alternatives, local links/assets, unique IDs, preview noindex behavior,
  JS/CSS parser warnings and crowd bounds. There was no pre-existing lint command;
  the check script adds syntax validation without installing a production linter.
- Built both preview and production output: preview receives noindex, production
  retains index metadata, and the source and canonical remain production values.
- Browser widths 320, 375, 390, 430, 768, 1024, 1440 and 1920: no document-level
  horizontal overflow; all 14 skills present and hero portrait decoded.
- Normal-motion intro and pinned scene: models initialize after entry, hobbies
  cards appear at the navigation endpoint, and cards withdraw on scrolling back.
- Reduced-motion experience remains usable.
- Photography gallery: keyboard image navigation, Escape close, focus restored
  to the camera button, and no axe WCAG A/AA violations in the open dialog.
- Travel, gaming and music galleries: mobile fit, Escape close, restored focus,
  no script/resource errors, and no axe WCAG A/AA violations. Travel gallery
  videos remain muted with custom controls and no native audio controls.
- JavaScript disabled: main content accessible, 14 skills and 25 real original
  photograph links available; loading overlay removed.
- No browser script errors or HTTP errors during the tested flows.
- Local static endpoints: homepage, robots, sitemap, manifest, fonts and favicon
  return HTTP 200 with appropriate MIME types; unknown route returns HTTP 404;
  `/index.html` returns HTTP 308 to `/`.
- Compared computed hero/skills typography, colors and geometry against the
  baseline: the sampled properties match. Screenshot review confirms the visual
  hero composition remains intact.

Remaining **existing contrast failures** after entering the main site:

| Text | Existing color/background | Measured contrast |
| --- | --- | ---: |
| Skills heading handwritten phrase | #183f73 / #0c0d10 | 1.84:1 |
| Playground heading handwritten phrase | #183f73 / #18191d | 1.67:1 |
| Profile eyebrow | #183f73 / #18191d | 1.67:1 |
| Profile heading handwritten phrase | #183f73 / #18191d | 1.67:1 |
| Profile signature | #183f73 / #18191d | 1.67:1 |

These were documented rather than recolored because the brief explicitly requires
preserving colors. A future narrowly scoped adjustment to these text accents can
address contrast. Automated testing is not a substitute for a full manual audit
with assistive technology and physical devices.

## 8. Files modified and created

Existing files modified:

- `README.md`, `components/README.md`
- `index.html`, `style.css`, `blend.css`, `skills.css`, `portfolio-theme.css`
- `intro.js`, `intro-crowd.js`, `hobby-boot.js`, `skills-hobbies-scene.js`
- `server.cjs`, `build-vercel.cjs`, `build-photography.cjs`, `package.json`, `vercel.json`
- `photography-data.js`, `components/photography-overlay.tsx`,
  `components/ui/hero-carousel.tsx`, `assets/ui/photography-carousel.js`

New source/configuration/report files:

- `site.config.cjs`, `build-seo.cjs`, `build-site-assets.cjs`, `build-intro-crowd.cjs`
- `check-site.cjs`, `accessibility.css`, `photography-descriptions.json`, `.env.example`
- `SEO-AUDIT.md`, `reports/seo-validation.json`

New generated public files and assets:

- `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `404.html`, `favicon.ico`
- `assets/brand/favicon.svg`, `assets/brand/favicon-32.png`,
  `assets/brand/apple-touch-icon.png`, `assets/brand/icon-192.png`,
  `assets/brand/icon-512.png`, `assets/brand/shubham-pandey-portfolio-og.jpg`
- `assets/fonts/fonts.css`, `assets/fonts/inter-latin.woff2`,
  `assets/fonts/caveat-latin.woff2`, `assets/fonts/Inter-OFL.txt`, `assets/fonts/Caveat-OFL.txt`
- `assets/profile/shubham-pandey-portrait-64.webp`,
  `assets/profile/shubham-pandey-portrait-480.webp`,
  `assets/profile/shubham-pandey-portrait-640.webp`,
  `assets/profile/shubham-pandey-portrait-960.webp`,
  `assets/profile/shubham-pandey-cafe-480.webp`,
  `assets/profile/shubham-pandey-cafe-960.webp`
- `assets/photography-camera-160.webp`, `assets/photography-camera-320.webp`,
  `assets/intro-crowd.webp`, `assets/intro-crowd-sprites.json`

Original media was not overwritten. Deployment output, full Lighthouse reports,
browser QA scripts, screenshots and temporary audit tools remain in ignored
`dist/` or `tmp/`; diagnostic packages were not added to application dependencies.

## 9. Search Console setup and remaining priorities

After an explicitly authorized push and successful Vercel production deployment:

1. Add a **Domain property** for `pandeyshubham.in` in Search Console. Verify the
   exact DNS TXT record Google supplies at the domain's DNS provider. A domain
   property covers both bare and `www` host variants. Alternatively, verify the
   exact URL-prefix property `https://www.pandeyshubham.in/`; a real HTML token
   can be provided through `GOOGLE_SITE_VERIFICATION` before rebuilding.
2. Open the production homepage, robots file and sitemap. Confirm the canonical
   is `https://www.pandeyshubham.in/`, production has no noindex header, and
   the bare domain continues redirecting to `www`.
3. Submit **https://www.pandeyshubham.in/sitemap.xml** in the Sitemaps report.
4. Use URL Inspection → Test live URL → Request indexing for
   **https://www.pandeyshubham.in/** first. Skills/hobbies/gallery fragments are
   part of that same document and do not need separate indexing requests.
5. Run the deployed URL through Google's Rich Results Test and Schema Markup
   Validator. Monitor Page indexing, search performance and Core Web Vitals as
   real visitor data becomes available.

Google describes sitemap submission through Search Console in its
[sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
Its [ownership verification instructions](https://support.google.com/webmasters/answer/9008080?hl=en)
cover domain DNS verification; its [URL Inspection documentation](https://support.google.com/webmasters/answer/9012289?hl=en)
explains live testing and indexing requests.

Priorities requiring additional factual information or external access:

- Add authentic software case studies when project details, role, technologies,
  screenshots and real repository/demo URLs are available. Each substantial
  indexable case study can then receive a unique title, description, canonical,
  social preview and appropriate CreativeWork/application schema.
- Add a real public email or LinkedIn profile if desired, and factual education
  institution details. Do not fill the reserved config fields with placeholders.
- Fix the five text-contrast failures if a small visual color adjustment is accepted.
- Consider further loader changes only if reducing the intentionally delayed LCP
  takes priority over preserving the current intro.
- Update the GitHub repository's stale homepage field to the preferred custom
  domain when repository settings changes are authorized.

## 10. Analytics preparation

No existing analytics was found, and no fake GA4 ID or tracking script was added.
`site.config.cjs` reserves `analyticsMeasurementId: null`. It is intentionally
inactive; setting that field alone does not start tracking.

When a real GA4 property and consent requirements are established, add a single
consent-controlled loader after the `portfolio-ready` event or idle time. It can
read a verified measurement ID from configuration. Use that one integration for
page views and selected gallery events; avoid duplicate automatic page views or
adding a second tracking loader via another package. Check performance and privacy
behavior after integrating it. The site already has one document, so hash navigation
should not automatically be treated as separate indexable pages or duplicate views.
See Google's [consent implementation guidance](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)
and [pageview documentation](https://developers.google.com/analytics/devguides/collection/ga4/views).

## 11. Coverage of the supplied brief

| Brief phases | Implementation / audit coverage |
| --- | --- |
| 1–4 | Architecture, factual portfolio strategy, title, description |
| 5–7 | Semantic landmarks, primary H1, section headings, visible copy |
| 8–14 | Entity graph, OG/Twitter, canonical, robots, one-document sitemap |
| 15–21 | Responsive images, preserved video strategy, WebGL deferral, fonts, JS delivery |
| 22–25 | Real internal links, project-content limitations, unchanged fragments, true 404 |
| 26–30 | Eight responsive widths, keyboard/dialog checks, GitHub, factual identity |
| 31–35 | Icons/manifest, measured performance, targeted preload, lazy loading, syntax/link checks |
| 36–40 | Consistent name and student positioning; no stuffing, fabricated profiles or doorway pages |
| 41–43 | Build/type/syntax/browser validation, preserved animation design, this report |
| 44–46 | Exact Search Console steps, inactive analytics configuration, prioritized external follow-up |
