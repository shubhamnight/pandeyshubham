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
