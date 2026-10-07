# Photography viewing copies

The photography overlay uses offline AI restoration with the photo model
`realesrgan-x4plus`. Originals in `PHOTOGRAPHY` are never overwritten. The model
produces 4× width and height; Sharp blends 20% of the resized original back in
and encodes responsive WebP copies at quality 95. AI reconstructs plausible
detail; it cannot recover exact information lost to compression.

The carousel chooses a viewing copy using the overlay's cover dimensions and
device pixel ratio. Only the selected large photograph is decoded. The existing
small images continue to serve the hobby animation and thumbnail strip.

## Prepare new photos locally

Download and extract the official portable Windows bundle from the
[Real-ESRGAN repository](https://github.com/xinntao/Real-ESRGAN#portable-executable-files-ncnn).
Keep it under the ignored `tmp` directory. Then run:

```powershell
npm run enhance:photography -- --runtime tmp/ai-upscale/runtime --gpu 0
npm run build:photography
```

GPU 0 is the NVIDIA GPU on the current machine; choose the device appropriate
for another machine. Processing is sequential with 256px tiles. An interrupted
run resumes from cached model outputs and completed photographs.

Commit `assets/photography/hero/ai-*.webp`, `ai-index.json`, and
`photography-hero-data.js` along with the application changes when publishing.
The executable, model weights, and intermediate PNGs remain local. Normal
builds reuse the prepared files; changed or new originals without an AI copy
receive the conventional Sharp fallback until the optional enhancement command
is run. Vercel and visitors never need an AI runtime.

## Saved full-screen crops

The local image studio's photography saves now prepare responsive copies at
480, 960, 1280, 1920, 2560 and 3840 pixels wide (with an 8192-pixel long-edge
bound for unusually tall crops). `lib/photography-quality.cjs` reapplies the
crop to the original source and its cached 4× neural master. It blends 80%
restored detail with 20% original texture, applies restrained luminance edge
sharpening after resizing, then encodes WebP at quality 98.
Existing framing and colors remain unchanged; increasing pixel count cannot
restore exact detail that was absent from a compressed source.

The background's own dimensions, rather than the separate filmstrip image's
dimensions, determine which responsive file the carousel loads. Small screens
can load smaller variants; desktop overlays at least 1024 CSS pixels wide request
a source at least 3840 pixels wide when available, even on a low-density screen.
New photography uploads are preserved losslessly before further crops.

For low-resolution sources, the local portable runtime automatically prepares
a master when one is missing. Neural inference is serialized, tiled, capped at
8-megapixel inputs, and limited to three minutes. A missing runtime or failed
inference uses a conventional high-quality resize. Native crops already large
enough for the target export bypass neural processing.

Rebuild previously saved backgrounds with:

```powershell
npm run enhance:photography-crops
npm run build:photography
```

Publish `media-library.json`, `media-library-data.js`, and
`assets/media-edits/4k/` along with the application changes. Originals and
earlier viewing copies are preserved.
