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
`build-photography-hero.cjs` prepares larger viewing copies using Sharp's resize
and restrained luminance sharpening, preserving the originals and their colors.
Copies are capped at four times source width, 3840px wide, and a 4096px long edge.
The viewer selects sources using the cover dimensions and at most 2× pixel density,
then decodes the selected source before fading in. No AI-redrawn detail is used;
upscaling improves presentation but cannot recover information absent in the source.
Content hashes cache the generated copies, so unchanged photos are not reprocessed.
Closing the dialog unmounts the React component and pauses media. If loading fails,
the original photography grid remains available as a fallback.

Controls: click a photo, drag the strip, scroll either axis, use the previous/next
buttons, or press Left/Right/Home/End. Escape and the close button dismiss
the dialog and restore focus to the camera. Autoplay is disabled.
