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
mobile rather than letting the animated word wrap underneath. Social links are centered above the lower
identity and About / Resume navigation. The fonts are self-hosted with their SIL licenses in
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
a resume file is available. About links to the existing profile section.

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
