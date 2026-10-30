# Visibility and delivery optimization — 30 October 2026

Scope: preserve the existing design, fonts, colors, controls, animation paths,
easing and timing, while reducing offscreen work and phone/tablet media cost.
The previously requested palette and restored ID-card colors remain intact.
Verification was performed locally. The user's subsequent “push everything”
request authorizes committing and pushing the completed changes; no manual
hosting deployment is performed as part of that follow-up.

## Reproduced work outside view

A 390×844 Chrome touch run at the Projects/playground anchor left Hobbies at
`top=-891.96875`, height `892`: only 0.03125 CSS pixels still intersected.
Its arc callback nevertheless ran 133 times during a 2.2-second sample.
The new intersection threshold ignores that rounding sliver. Final desktop,
phone and tablet checks record zero RAF callbacks in the settled anchor sample.

The original ambient observer watched the whole playground and included a
120px preload margin. Three spinning layers were still running while their
actual object was outside view. Observation now follows the kinetic object,
uses the real viewport, and also covers hero/footer decorative loops. CSS
`animation-play-state` preserves elapsed time. Dynamic study-art clones are
registered and removed scopes are released. Hidden tabs, native hobby dialogs
and persisted lifecycle events pause these scopes. Gaming's shadow-root
marquee now also checks intersection and persisted lifecycle state.

No visible animation was removed, slowed or reduced in detail. Existing
viewport-aware Skills, model, particle, media and carousel controllers remain.

## Compression and media

| Change | Before | After |
| --- | ---: | ---: |
| 47 browser ES modules, same-source minifier comparison | 319,382 B | 255,624 B |
| Those modules with Brotli quality 6 | 84,804 B | 76,768 B |
| Photography overlay CSS | 35,808 B | 11,605 B |
| Three selected phone orbit videos | 10,150,272 B | 3,935,692 B |
| Three selected large-tablet orbit videos | 10,150,272 B | 7,294,446 B |

The code reduction is approximately 20% before transfer compression and 9.5%
after the stated Brotli setting. Photography CSS is 67.6% smaller by excluding
unrelated component utilities. These are file-size measurements, not FPS gains.

The smaller video alternatives reduce the three selected phone previews by
61.2%, or 28.1% for the larger tablet alternatives, relative to their previous
mobile encodes. One already small video retains its existing file because a
new encode was larger. The two sets support the existing canvas's density and
hover enlargement; selection anticipates portrait/landscape rotation. Full
overlay videos, photographs, song/game artwork, source files and desktop
preview delivery are unchanged.

The orbit canvas already shows a centered 4:3 cover crop. Preparing only that
visible region avoids decoding a tall portrait frame before discarding most of
it. The large variant retains up to the canvas's existing 536px backing width;
smaller phones use 384px copies. Video loading now starts at the first visible
play instead of preloading metadata on hidden cards. Posters can warm ahead.
The optional manifest never gates gallery mounting or preview availability.

H.264 CRF 16 is lossy, not byte/pixel-identical. All six selected variants retain
their original frame counts and cadence; container duration differs by at most
0.000651 seconds. Full-reference SSIM against the same centered/scaled input is
at least 0.992567. This is an objective preservation check, not a promise of
perfect perceptual quality on every physical display. No originals are replaced.

Prepared variants add about 10.7 MiB of deployment storage, while clients fetch
only the selected version. Old hashed copies can remain usable by open pages.
No new runtime dependency is added. Already compressed WebP/WOFF2 media and tiny
SVG logos are retained; indiscriminate recompression could increase size or
reduce quality. Models are procedural Three.js geometry, so their source code
is minified rather than discarding meshes, vertices, normals or textures.

## Validation

- Full build and targeted final bundle/static packaging completed.
- TypeScript passes; 650 source/build checks and 1,854 media checks pass.
- Geometry batching checks pass; all 89 rounded boxes retain byte-identical
  positions, normals, UVs, groups and indices.
- The six media variants pass frame/cadence/duration, size and SSIM checks.
  Desktop media routing and failed-manifest fallback are also checked.
- Chrome visibility regression passes at 390×844, 768×1024 and 1440×900, with
  4× CPU slowdown on the touch profiles. It checks complete Hobbies, zero hidden
  frame work, preserved CSS time, resume, persisted lifecycle and shadow-root
  visibility. No page errors were recorded.
- The final minified production package passes the full functional suite at
  390×844, 768×1024 and 1440×900: hero reset, ID drag/settling, all 14 Skills
  buttons/logos, Hobbies handoff, four overlays, keyboard controls, rotation,
  fitting, close cleanup and six repeated gallery mount/unmount/GC cycles.
  No page/console errors, growing detached gallery trees or normal-path
  recovery-bundle downloads were recorded.
- Module loading recovery and original renderer DPR/antialiasing checks pass.
- The 4× CPU touch regression passes at 393×873, 360×800 and 768×1024. Pixel
  sampling confirms all 14 Skills icons are painted in the complete viewport;
  one-pixel settling, touch/compatibility input during entrance, reverse
  gestures, keyboard focus pause/resume and native swipes also pass.

Additional final browser results are recorded alongside this report's raw
artifacts in ignored `output/visibility-compression/`. These are local browser
emulation checks, not benchmarks on physical Redmi, Nothing or iPad devices.
The live hosted deployment has not been changed or benchmarked by this run.
