# Shub — Portfolio

Personal portfolio featuring an interactive ID card, skills, photography, travel, gaming and music. The hobbies section includes interactive Three.js models, animated media arcs and galleries.

## Run locally

Install a current Node.js LTS release, then run:

```sh
npm ci
npm start
```

Open http://localhost:3000. Keep the server running while browsing.

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
