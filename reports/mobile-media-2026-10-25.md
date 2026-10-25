# Phone/tablet media compression — 25 October 2026

Prepared separate delivery files for the existing touch-device path. Original
media and fine-pointer desktop media URLs remain intact. A narrow desktop
window alone does not enable mobile delivery.

## Changes

- High-quality WebP copies use quality 90 with alpha quality 100. Image
  dimensions, aspect ratios and compositions are retained; no new crops,
  sharpen filters or image substitutions were introduced.
- Travel playback copies use H.264 CRF 20 with fast-start MP4, original frame
  cadence and source timestamps. Dimensions, frame counts and silent playback
  are retained. Two preview container durations round upward by 0.000651 s.
- Only encodings at least 5% smaller are selected (profile copies are also
  emitted for their native picture sources). Larger encodings keep their
  existing URLs.
- The existing responsive photography selector now avoids the desktop-only
  minimum 3840px download on tablets. It still selects a source sufficient for
  the background's cover dimensions and existing pixel-density calculation.
- Photography, travel, gaming and music previews/overlays resolve compressed
  URLs from a single shared manifest request on touch devices. Unknown entries,
  new image-studio uploads and manifest failures retain their existing sources.
- Native picture sources deliver compressed profile images to coarse pointers.
  The badge's existing shadow selector also matches its image inside picture.

No animations, timing constants, fonts, icons, text, controls or layout dimensions
were changed. Recompression is lossy and is not pixel-identical encoding.

## File-size accounting

| Selected source URL entries | Existing bytes | Alternate bytes |
| --- | ---: | ---: |
| 483 image / 7 video entries | 164,051,149 | 102,379,818 |
| Six profile images | 1,540,428 | 457,170 |
| 960px hero portrait | 734,592 | 125,638 |

Selected entries total **37.6% fewer bytes**; the hero portrait is **82.9%**
smaller at the same dimensions. Identical sources can share an output file.
These are catalogue file-size measurements, not an initial-page transfer size,
an FPS improvement, a Lighthouse score, or field device measurements. Clients
download only the media they request, not this entire catalogue.

The manifest is 44,056 uncompressed bytes and is not fetched by fine-pointer
desktop clients. JS/CSS/font delivery retains the existing compression and
lazy-loading architecture.

## Build and maintenance

`npm run build` completed successfully. No new dependencies were installed.
No automated regression suite or physical-device test was run for this change.

Run `npm run build:mobile-media` locally after media updates, then the ordinary
build. The optional media generator needs Sharp and FFmpeg; deployment builds
use the prepared committed copies and do not require FFmpeg. Build-cache data
is ignored under output/. Original images remain available to the local editor.

The initial compression work remained local. The user subsequently authorized
committing and pushing these changes to the repository. No manual deployment
was performed.
