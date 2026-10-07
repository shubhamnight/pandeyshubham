# Local image studio

Run `npm start`, then open `http://localhost:3000/image-manager.html`.

- Choose **Photography** or **Travel** and select **Crop / update**.
- Drag the preview to position the image, adjust zoom, then select **Save & update website**.
- Photography has separate **Filmstrip card** (3:4) and **Full-screen background** crops. Choose the screen preset for the background. A background still fills different screen shapes using the existing cover behavior.
- Travel uses the enlarged slider frame. The frame changes size and ratio as the existing animation runs. Open Travel in a website tab to record its actual dimensions for **This screen**; other screen presets use the existing layout rules to approximate the frame.
- **Replace image** uploads a new JPEG, PNG or WebP for the selected image. **Add image** adds one to the selected collection. Limits: 20 MB, 40 megapixels, still images only.
- **Delete** removes an image from the website's image lists. Toggle **Show deleted** and choose **Restore image** to undo it. **Restore original** clears edits to an original image. Original media files remain intact.

Changes are stored in `media-library.json`, its generated browser module `media-library-data.js`, and `assets/media-edits/`. Optimized crops use fresh URLs and responsive sizes. Original uploads are preserved separately so future crops use the full image.

Photography saves also prepare high-quality background copies up to 3840 pixels wide. The local Real-ESRGAN master is reused, with original texture blended in, so saving a new crop does not reduce the full-screen background to a small preview. New photography upload sources are stored losslessly. See `PHOTOGRAPHY-QUALITY.md` for the pipeline and resize fallback.

The browser merges edits into the existing media data without changing the original generators. Open local website tabs refresh after a save through BroadcastChannel / storage events. Static builds include the edited library and assets; deploying or pushing those changes is separate from saving locally.

The editor and write API run only on the local Node server, which binds to loopback. The editor page, script and stylesheet are excluded from public deployment builds. No credentials or public management endpoint are needed.
