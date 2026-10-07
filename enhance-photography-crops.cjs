// Rebuild saved background crops from the original / cached neural master, never from a small preview.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { enhancePhotographyCrop } = require('./lib/photography-quality.cjs');
const root = __dirname;

(async () => {
  const statePath = path.join(root, 'media-library.json');
  const initial = JSON.parse(await fs.readFile(statePath, 'utf8'));
  const prepared = [];
  for (const [id, edit] of Object.entries(initial.photography)) {
    if (edit.deleted) continue;
    const crop = edit.backdropCrop || edit.crop;
    if (!crop) continue;
    const source = edit.source || id;
    const file = path.resolve(root, decodeURIComponent(source));
    if (!file.startsWith(path.join(root, 'PHOTOGRAPHY') + path.sep) && !file.startsWith(path.join(root, 'assets/media-edits/sources') + path.sep)) throw Error('Invalid photograph source');
    const media = await enhancePhotographyCrop(file, crop);
    prepared.push({ id, source, crop, media, backdrop: Boolean(edit.backdropCrop) });
    console.log(`${prepared.length}: ${decodeURIComponent(id.split('/').pop())} → ${media.width}×${media.height} (${media.enhancement.method})`);
  }
  // Re-read to preserve any edits made while the assets were processing.
  const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
  let updated = 0;
  for (const item of prepared) {
    const edit = state.photography[item.id];
    const currentCrop = item.backdrop ? edit?.backdropCrop : edit?.crop;
    if (!edit || edit.deleted || (edit.source || item.id) !== item.source || JSON.stringify(currentCrop) !== JSON.stringify(item.crop)) continue;
    // Enhancement is for the full-screen background; filmstrip framing stays independent.
    edit.backdropMedia = item.media;
    edit.backdropCrop = item.crop;
    updated++;
  }
  state.revision = crypto.randomUUID();
  const json = JSON.stringify(state, null, 2);
  await fs.writeFile(statePath + '.tmp', json + '\n');
  await fs.rename(statePath + '.tmp', statePath);
  const modulePath = path.join(root, 'media-library-data.js');
  await fs.writeFile(modulePath + '.tmp', '// Updated by the local image manager.\nexport const mediaLibrary = ' + json + ';\n');
  await fs.rename(modulePath + '.tmp', modulePath);
  console.log(`Enhanced ${updated} saved photography backgrounds. Original files and crop positions preserved.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
