# Photography carousel

The supplied React carousel is integrated into the existing camera dialog. The
rest of the portfolio continues to use its existing HTML and JavaScript.

- `components/ui/hero-carousel.tsx`: reusable carousel, matching the supplied
  filmstrip geometry and Motion animations.
- `components/photography-overlay.tsx`: mounts the component in a shadow root
  and adapts the existing photography media into carousel props.
- `styles/photography-carousel.css`: Tailwind and overlay styles, loaded only
  inside that shadow root. Its reset does not affect the rest of the portfolio.
- `lib/utils.ts`: shadcn's `cn` helper.
- `components.json` and `tsconfig.json`: shadcn component paths and TypeScript
  aliases. New reusable UI components belong in `components/ui`, which is also
  the `@/components/ui` import path used in the supplied prompt.

## Setup and builds

Run `npm install`, then `npm run build:photography` to compile the component for
the local server. `npm start` serves the website at localhost:3000. `npm run build`
compiles the component and packages the entire static Vercel deployment.

React, TypeScript, Framer Motion, Tailwind, and the shadcn directory structure are
already configured; a full website migration or a new shadcn project is not
required. Use the existing `components.json` when adding further shadcn components.

The browser loads the compiled React bundle only when the camera dialog opens.
The carousel reads the current `photography-data.js` manifest, includes all photos
and videos, and uses responsive sources including the untouched originals.
The selected background fills the overlay with `object-fit: cover`, using only
the scaling required to fill the stage. Filmstrip thumbnails retain their full
frame with `object-fit: contain`. There is no added grain, tint, or darkening wash.
`build-photography-hero.cjs` uses the existing AI-enhanced viewing copies when
their source hashes match. Its fallback prepares larger viewing copies using
Sharp's resize and restrained luminance sharpening. Originals remain untouched.
Fallback copies are capped at four times source width, 3840px wide, and a 4096px
long edge. See `PHOTOGRAPHY-QUALITY.md` for the enhancement workflow.
The viewer selects sources using the cover dimensions and at most 2× pixel density,
then decodes the selected source before fading in. Upscaling improves presentation;
generated detail should not be treated as evidence of what was in the photograph.
Saved crops now receive 3840-pixel background exports from the cached neural
master and original texture, with restrained edge sharpening and WebP quality 98. Background dimensions
are independent of filmstrip dimensions so source selection remains correct.
Desktop photography backgrounds request the 3840-pixel variant when available;
smaller screens continue choosing a file based on cover size and pixel density.
Descriptive alternatives come from `photography-descriptions.json`; short visible
photograph numbers are supplied separately through the item's `caption` field.
Content hashes cache the generated copies, so unchanged photos are not reprocessed.
Closing the dialog unmounts the React component and pauses media. If loading fails,
the original photography grid remains available as a fallback.

Controls: click a photo, drag the strip, scroll either axis, or press
Left/Right/Home/End. Escape and the close button dismiss
the dialog and restore focus to the camera. Autoplay is disabled.

## Connect page

The contact section in `index.html` and `connect.css` mirrors the supplied
contact design: a full viewport, near-black background, white Inter heading
reading “LET’S MAKE / SOMETHING” on the left, with a blue Caveat word to its right rotating through
“meaningful.”, “unexpected.”, and “memorable.” every 3.5 seconds. Words fade
and slide smoothly, pause offscreen or with reduced motion, and reserve their
fixed-width grid column so the complete heading stays centered above the icons
as each word changes. Both text columns center their content. The handwritten word
shares the second-line baseline with “SOMETHING” and uses a larger font size to
match its visible letter height. Both columns scale down together on
mobile rather than letting the animated word wrap underneath. Social links and Resume are
centered above the lower identity block. The fonts are self-hosted with their SIL licenses in
`assets/fonts`. The identity block shows Shubham's portrait, first name, and role.

`components/ui/social-icons.tsx` maps GitHub, Instagram, LinkedIn, Twitter,
and Email to the supplied `components/ui/social-media.tsx` component. It displays
48 px circular buttons with 28 px local SVG logos, a brand color fill rising on hover,
and platform names in tooltips underneath. Keyboard focus gets the same feedback.
The 32 px desktop / 24 px mobile column gaps and 18 px end padding are retained.
Wrapped rows reserve space for their tooltips, and reduced motion skips transitions.
Instagram uses a multicolor gradient, LinkedIn uses blue, GitHub and X use their
monochrome marks, and the email envelope uses a Gmail red accent. Hover fills
and tooltips match each icon, with white foregrounds over the filled circles.
Destinations are configured in
`social-links.json`; email converts to a mailto link. LinkedIn remains a
non-navigating placeholder until supplied. Resume also remains inactive until
a resume file is available. Resume sits below the social icons; the About link is removed.

The social component loads lazily through `connect-boot.js` into a shadow root.
`styles/connect-page.css` scopes its reset and interaction styles. Native text
links work when JavaScript is unavailable. The same Aether Flow component now
mounts behind the native contact layout in background-only mode, retaining the
approved blue dots, connection lines, drift, and cursor repulsion. Footer pointer
events drive the background without intercepting links. Animation pauses offscreen,
in hidden tabs, and with reduced motion; particle count and pixel density are bounded.
The supplied hero's staggered fade-up entrance applies to the existing heading,
social row, and identity block when the contact section enters view: 20 px rise,
800 ms ease-in-out, and the original 500 ms plus 200 ms stagger. The social row
retains its 32 px desktop / 24 px mobile column spacing. Reduced motion skips
the entrance, and the native content remains usable without the React background.

Run `npm run build:connect` after editing the social component. The regular
Vercel build includes it and copies the social configuration into production.

## Skill icon interaction

The same supplied SocialTooltip design is adapted to the existing native skill
orbit holders in `index.html` and `portfolio-theme.css`. Each holder keeps its
original dimensions, accessible skill label, keyboard focus, and local logo.
An inner circle clips the rising fill without cutting off the tooltip underneath.
Hover and keyboard focus reveal matching colored tooltips and a stronger shadow;
the logos retain their original colors. Reduced motion removes the transitions.
The orbit remains controlled by `skills.js` and its existing shared animation clock,
preserving the entrance, full circular path, reverse scroll, and hobby handoff.

## Offline Batman page

`components/ui/ghost-404-page-1.tsx` adapts the supplied layout to an offline state,
with the intro's rotating 3D Batman emblem, floating and hover motion, an animated `FlowButton`, a retry
connection check, and automatic return when the browser reports it is online.
The standalone page uses the existing React, TypeScript, Tailwind, Framer Motion,
and Lucide dependencies, native HTML instead of Next.js, and local fonts.
`lib/offline-batman.js` uses the shared `batman-emblem.js` outline, matching the
intro's bevels, blue metallic materials, lighting, and spin speed. It pauses while
hidden, renders a still pose for reduced motion, and caps GPU draws at 30 fps.
The local Batman vector remains visible if WebGL is unavailable.

`offline-boot.js` registers the root service worker and switches an open portfolio
to the offline page when the browser reports a lost connection. The worker also
serves it when a navigation request fails. Only offline HTML, compiled UI, Batman model,
and required fonts are cached; portfolio pages, APIs, and large media are not.
This requires one successful online visit to install the cache, and HTTPS or
localhost. Return destinations are restricted to this site's origin.

Run `npm run build:offline` to regenerate the compiled assets and content-versioned
`offline-sw.js` from `lib/offline-worker.js`. The full build includes this step.
Use `/offline.html?preview=1` for a separate preview that remains open while online.
The existing 404 page continues to handle missing URLs.

## Navigation and animation scheduling

`smooth-scroll.js` owns same-page navigation for Hero, Skills, Hobbies, Projects,
and Contact. Hero resolves to document zero; Skills and Hobbies use the pinned
scene's timeline, and regular sections use stable layout coordinates. The custom
handler disables Lenis's duplicate anchor handler. Travel uses cubic easing and
distance-based durations between 0.65 and 1.6 seconds, with interruptible motion,
keyboard focus handling, in-session hash restoration, and immediate reduced motion.
Fresh visits and reloads clear the saved section hash and disable native scroll
restoration during the intro. PLAY always lands at Hero; the scroll controller
discards any queued section destination when the intro releases the page.
Navigation geometry is cached until resize or font/layout changes, and the
current destination is marked with `aria-current="location"` on the shared clock.

Contact word changes use a visibility-driven timeout instead of a permanent
interval, canceling transitions when hidden. The particle field samples pointer
positions once per rendered frame, caches bounds until scroll/resize, and computes
each particle's highlight once instead of once per connection. Existing particle
density, colors, repulsion, and motion timing are retained. Hero transition and
parallax observers/listeners are released on page disposal and pause when hidden.

The shared clock retains callback records during a frame, so callbacks that cancel
and reschedule themselves do not trigger repeated sorting. Inactive callbacks are
removed after the frame; newly registered callbacks join the next ordered frame.
The pinned scene compares a reusable numeric snapshot, and the settled skills ring
uses its shared circular phase without per-holder wrapping calculations. Hobby
models sample the latest pointer coordinates without allocating event objects,
release their interaction listeners on disposal, and ignore late shader completion
after disposal. Pending skill icon imports also avoid mounting into a disposed page.

## Responsive size constraints

`responsive.css` loads after the existing portfolio styles. Its overrides apply
to viewports up to 1100px wide, tall portrait ratios, and short touch landscapes.
Ordinary laptop layouts retain their existing dimensions. The overrides change
size bounds, gutters and safe-area padding, keeping the same content, section
order, colours, circular paths, corner positions, motion curves and timing.

The hero badge and strap share fitted dimensions that the existing controller
measures. The pinned scene keeps its scroll-length multiplier while sizing its
stage to the stable viewport height, preventing mobile browser chrome from
stretching the stage during a scroll. Skills, model canvases and arc cards inherit
smaller size limits. Contact retains its two heading columns and second-line word;
its font size is bounded by the invitation width. The five contact icons retain
their row, with narrower gaps on phones and unchanged dock springs and fill.

Dialog dimensions account for available height and safe areas. The photography
filmstrip retains its spring and reveal animations, with a width bound on tall
phone cards. Gaming keeps its existing column breakpoints and tilt transforms,
with a height-based maximum width in short landscapes. Offline content uses
safe-area padding and tighter height bounds. Rebuild affected React island assets
with `build:connect`, `build:photography`, `build:gaming` and `build:offline`, then
run `node build-vercel.cjs` to package the responsive stylesheet for production.

## Resource and interaction work

The particle field precomputes neighboring cell indices on resize, preserving
connection order, colours, opacity and timing while avoiding repeated bounds
calculations. Pointer repulsion takes square roots only for particles within its
existing range. Pause state is cached between body and visibility changes.

The playground pointer response samples once per paint and caches stage bounds
until scroll or resize. Gallery video observers track inserted and removed
branches, pause detached or hidden media, and release listeners on disposal.
Photography, gaming and travel orbit media retain direct player/surface references
and ignore unrelated body class changes. Pending loads cannot mount after disposal.
Video canvases fit the rendered card width at the existing density/hover limits;
the compatibility frame loop skips already decoded frames where supported.

The games artwork component is memoized and its visibility observer allocates a
new set only when membership changes. Photography ignores unchanged resize
measurements and releases a replaced video's decoder. Hero observers, model build
queues and intro sprites release unused resources; the crowd's final painted
frame remains available for its original exit fade. Navigation ignores redundant
cancel requests, and travel playback controls skip unchanged DOM updates. No
animation curves, spring constants, artwork, colours or content were changed.

## Traveling overlay zoom slider

The supplied zoom-strip component lives in `components/ui/zoom-slider.tsx`.
`components/travel-overlay.tsx` mounts it in an isolated shadow root when the
native Traveling dialog opens. The shadcn aliases, TypeScript and Tailwind are
already configured; its stylesheet is `styles/travel-overlay.css`. GSAP and
SplitText are bundled locally by `npm run build:travel-overlay` and the main
build includes this step. No CDN or replacement stock images are used.

The slider receives the existing travel photographs and videos, responsive WebP sources,
original image identifiers and saved location names. It uses the supplied nonlinear widths,
bottom alignment, hover zoom/caption animation, drag momentum and scroll easing.
Sizing follows the dialog rather than the browser window. Input listeners are
scoped to the slider, idle/offscreen/hidden frame loops stop, and closing the
dialog unmounts React and kills its GSAP tweens. Keyboard arrows also navigate
and reduced motion removes glide. All four videos share the same navigable queue
and play silently on repeat without playback controls, including when selected.
Three videos use portrait 9:16 frames; the shared night scene keeps a landscape
4:3 frame and its encoded black bars are cropped. Photographs and strip motion
keep their existing geometry. Sources load only when cards approach the viewport;
visible videos play together, hidden videos pause, and closing releases their
decoders. The orbit preview cycles include a
video in each group of three cards. The original media grid is the loading-error fallback.
Travel images never open another page. Clicking or tapping a slider image moves
it into the largest fully visible frame using the existing scroll easing and
nearest loop. Drag gestures suppress click selection; Enter / Space also select.
Hover captions, drag, scroll and arrow-key navigation remain available. The
fallback grid remains non-navigating.
Visible place captions come only from saved location names. Unnamed images
have no caption and do not fall back to generated photograph labels.

## Music stacking cards

The supplied Khoa Phan stacking-cards component lives in
`components/ui/stacking-cards.tsx`; it uses the existing `framer-motion` API,
so another Motion runtime and Next.js are unnecessary. Native `img` elements
serve the existing locally hosted album covers. `styles/music-overlay.css`
is compiled in isolation; TypeScript, Tailwind and the shadcn component aliases
are already configured. Rebuild with `npm run build:music-overlay`.

`music-highlights.json` contains researched brief song excerpts and source links.
`build-music-overlay.cjs` combines those with the existing music metadata and
samples artwork colors to generate `music-overlay-data.js`. Song credits and
artwork sources remain in `components/music-sources.md`. Artwork, singer credits
and lyric text are non-navigating elements so clicking a card cannot open another page.
The left side holds the song title, singer/artist and a brief excerpt formatted
as two lyric lines. Both lines remain available when they wrap on narrow screens;
the right side holds its artwork on a rotating record. Card colors are darkened
versions of the sampled palette, with readable light text.

The right side now displays the same artwork as a vinyl record with grooves,
a spindle hole and a continuous 20-second turn. Only the front and incoming
visible records rotate; document visibility pauses them, reduced motion stops
rotation, and unmount releases the scroll/resize listeners. The record diameter
uses the previous square artwork's dimensions.

`music-typography.json` maps every title to an album/campaign lettering style.
Commercial fonts and custom lettering use open-font approximations, recorded
honestly per song in `components/music-sources.md`. Fonts are self-hosted under
`assets/fonts/music/` with their licenses. Font-face declarations load lazily
into the document when the overlay opens, with title styles scoped to its shadow
root. Refresh those assets with `node build-music-fonts.cjs` only when needed;
normal builds need no font network requests.

The Music dialog mounts its React island only when opened and unmounts on close.
Supported browsers use native CSS scroll timelines for the same linear scale
curve, percentage ranges and top offsets, avoiding all 28 Motion subscriptions
and JavaScript transform updates during scroll. Feature detection retains the
original shared Motion progress implementation in other browsers. A smaller scale multiplier
and bounded top offsets accommodate all 28 songs in the overlay; sizing uses
the available dialog height, with dedicated phone and short-height rules.
Reduced motion renders a normal card list. The previous record grid remains
available if the island cannot load. The hobby orbit records are unchanged.

Record visibility is tracked by one IntersectionObserver. Geometry is cached
by ResizeObserver, and the passive scroll handler only changes record activity
when crossing a card boundary; there are no layout queries or requestAnimationFrame
loops in the record controller. At most two Web Animations rotate records at the
same 20-second speed. Inactive animations are cancelled after their angle is saved,
releasing their layer hints; scrolling back resumes the exact angle. Hidden tabs,
page suspension and reduced motion stop rotation. Closing disconnects both
observers, removes all listeners and cancels remaining animations. Low-priority
lazy artwork and paint containment on the record reduce unrelated rendering work.

Native timeline reference: https://developer.chrome.com/docs/css-ui/scroll-driven-animations
