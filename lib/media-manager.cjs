const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { enhancePhotographyCrop } = require('./photography-quality.cjs');

const root = path.resolve(__dirname, '..');
const statePath = path.join(root, 'media-library.json');
let queue = Promise.resolve();
const categories = { photography: ['photography-data.js', 'PHOTOGRAPHY'], travel: ['travel-data.js', 'TRAVEL'] };
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

async function readState() { return JSON.parse(await fs.readFile(statePath, 'utf8')); }
async function baseItems(category) {
  const text = await fs.readFile(path.join(root, categories[category][0]), 'utf8');
  return JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
}
function resolveSource(url, category) {
  const decoded = decodeURIComponent(url);
  const prefix = categories[category][1] + '/';
  if (!decoded.startsWith(prefix) && !decoded.startsWith('assets/media-edits/sources/')) throw fail('Invalid source image');
  const file = path.resolve(root, decoded);
  const directory = path.resolve(root, decoded.startsWith(prefix) ? categories[category][1] : 'assets/media-edits/sources');
  if (!file.startsWith(directory + path.sep)) throw fail('Invalid image path');
  return file;
}
async function catalog(state) {
  const libraries = {};
  for (const category of Object.keys(categories)) {
    const items = (await baseItems(category)).filter(item => item.type === 'image');
    const originals = items.map(item => {
      const edit = state[category][item.original] || {};
      return { id: item.original, source: edit.source || item.original, preview: edit.cardMedia?.src || item.src,
        alt: edit.alt || item.alt, deleted: Boolean(edit.deleted), crop: edit.crop, backdropCrop: edit.backdropCrop,
        edited: Boolean(edit.cardMedia || edit.backdropMedia), added: false };
    });
    const added = Object.entries(state[category]).filter(([, edit]) => edit.added).map(([id, edit]) => ({
      id, source: edit.source, preview: edit.cardMedia?.src || edit.source, alt: edit.alt || 'Photograph',
      deleted: Boolean(edit.deleted), crop: edit.crop, backdropCrop: edit.backdropCrop, edited: true, added: true,
    }));
    libraries[category] = [...originals, ...added];
  }
  return { revision: state.revision, ...libraries };
}
async function writeState(state) {
  state.revision = crypto.randomUUID();
  // Immutable asset URLs let open tabs keep displaying their previous image while saving.
  const json = JSON.stringify(state, null, 2);
  await fs.writeFile(statePath + '.tmp', json + '\n');
  await fs.rename(statePath + '.tmp', statePath);
  const modulePath = path.join(root, 'media-library-data.js');
  await fs.writeFile(modulePath + '.tmp', '// Updated by the local image manager.\nexport const mediaLibrary = ' + json + ';\n');
  await fs.rename(modulePath + '.tmp', modulePath);
}
async function mutate(input) {
  const { category, action, id, mode = 'card' } = input;
  if (!Object.hasOwn(categories, category)) throw fail('Choose Photography or Travel');
  const state = await readState();
  const items = await baseItems(category);
  const base = items.find(item => item.original === id && item.type === 'image');
  const previous = state[category][id];
  if (id && !base && !previous?.added) throw fail('Image not found', 404);
  if (['delete', 'restore', 'reset'].includes(action)) {
    if (!id) throw fail('Choose an image');
    if (action === 'reset') {
      if (previous?.added) throw fail('Use Crop / update to edit an uploaded image');
      delete state[category][id];
    } else state[category][id] = { ...previous, deleted: action === 'delete' };
  } else if (action === 'save') {
    if (!['card', 'backdrop'].includes(mode) || (category === 'travel' && mode !== 'card')) throw fail('Invalid crop view');
    if (!id && !input.upload) throw fail('Choose an image to upload');
    if (typeof input.alt !== 'string' || input.alt.trim().length > 300) throw fail('Description must be under 300 characters');
    const crop = input.crop;
    if (!crop || !['x', 'y', 'width', 'height'].every(key => typeof crop[key] === 'number' && Number.isFinite(crop[key])) ||
      crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > 1.000001 || crop.y + crop.height > 1.000001) throw fail('Crop is outside the image');
    let source = previous?.source || base?.original;
    let decoded;
    if (input.upload) {
      if (typeof input.upload !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.upload)) throw fail('Use a JPEG, PNG or WebP image');
      const buffer = Buffer.from(input.upload.slice(input.upload.indexOf(',') + 1), 'base64');
      if (!buffer.length || buffer.length > 20 * 1024 * 1024) throw fail('Image must be smaller than 20 MB');
      const metadata = await sharp(buffer, { limitInputPixels: 40000000 }).metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw fail('Use a still JPEG, PNG or WebP image');
      decoded = await sharp(buffer, { limitInputPixels: 40000000 }).rotate().toBuffer({ resolveWithObject: true });
      const name = crypto.randomUUID() + '.webp';
      source = 'assets/media-edits/sources/' + name;
      await fs.mkdir(path.join(root, 'assets/media-edits/sources'), { recursive: true });
      await sharp(decoded.data).webp(category==='photography'?{lossless:true,effort:4}:{quality:96}).toFile(path.join(root, source));
    }
    let media;
    if(category==='photography') media=await enhancePhotographyCrop(resolveSource(source,category),crop);
    else {
      decoded ??= await sharp(resolveSource(source, category), { limitInputPixels: 40000000 }).rotate().toBuffer({ resolveWithObject: true });
      const w = decoded.info.width, h = decoded.info.height;
      const left = Math.min(w - 1, Math.round(crop.x * w)), top = Math.min(h - 1, Math.round(crop.y * h));
      const width = Math.max(1, Math.min(w - left, Math.round(crop.width * w))), height = Math.max(1, Math.min(h - top, Math.round(crop.height * h)));
      const token = crypto.randomUUID();
      const output = path.join(root, 'assets/media-edits');
      await fs.mkdir(output, { recursive: true });
      const cropped = await sharp(decoded.data).extract({ left, top, width, height }).toBuffer();
      const sources = [];
      for (const size of [...new Set([Math.min(480, width), Math.min(960, width), width])]) {
        const url = `assets/media-edits/${token}-${size}.webp`;
        await sharp(cropped).resize({ width: size }).webp({ quality: 94, effort: 4 }).toFile(path.join(root, url));
        sources.push({ src: url, width: size });
      }
      media = { type: 'image', src: sources[0].src, srcset: sources.map(s => `${s.src} ${s.width}w`).join(', '),
        original: sources.at(-1).src, width, height, sources };
    }
    const key = id || 'upload-' + crypto.randomUUID();
    const edit = input.upload ? { added: !base, source } : { ...previous, source };
    state[category][key] = { ...edit, added: !base, alt: input.alt.trim() || base?.alt || 'Photograph', deleted: false,
      [mode === 'backdrop' ? 'backdropMedia' : 'cardMedia']: media,
      [mode === 'backdrop' ? 'backdropCrop' : 'crop']: crop };
    // New uploads need a filmstrip / slider image even when the first saved view is the backdrop.
    if ((!base || input.upload) && !state[category][key].cardMedia) state[category][key].cardMedia = media;
  } else throw fail('Unknown action');
  await writeState(state);
  return catalog(state);
}

module.exports = async function mediaManager(req, res) {
  const reply = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  const host = req.headers.host;
  if (!/^(?:localhost|127\.0\.0\.1):\d+$/.test(host || '') || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return reply(403, { error: 'The image manager is local only' });
  if (req.method === 'GET') { try { return reply(200, await catalog(await readState())); } catch { return reply(500, { error: 'Could not load the image library' }); } }
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (req.headers.origin !== `http://${host}` || !/^application\/json\b/.test(req.headers['content-type'] || '')) return reply(403, { error: 'Open the local image manager to save changes' });
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 29 * 1024 * 1024) { reply(413, { error: 'Image must be smaller than 20 MB' }); return; }
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail('Invalid request');
    const operation = queue.then(() => mutate(input));
    queue = operation.catch(() => {});
    reply(200, await operation);
  } catch (error) {
    reply(error.status || 400, { error: error.status ? error.message : 'Could not save this image. Use a JPEG, PNG or WebP under 20 MB and 40 megapixels.' });
  }
};
