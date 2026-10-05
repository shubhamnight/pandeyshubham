// Bake the existing sprite cleanup once instead of flood-filling 105 figures
// on a visitor's main thread. Motion and original illustration pixels remain.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
async function buildIntroCrowd() {
  const folder = path.join(__dirname, 'assets');
  const input = await fs.readFile(path.join(folder, 'intro-crowd.png'));
  const fingerprint = createHash('sha256').update('sprite-cleanup-v1').update(input).digest('hex');
  const manifestPath = path.join(folder, 'intro-crowd-sprites.json');
  const cached = JSON.parse(await fs.readFile(manifestPath, 'utf8').catch(() => '{}'));
  const outputPath = path.join(folder, 'intro-crowd.webp');
  if (cached.fingerprint === fingerprint && (await fs.stat(outputPath).catch(() => null))?.size) return;
  const { data: atlas, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sw = info.width / 15, sh = info.height / 7;
  if (!Number.isInteger(sw) || !Number.isInteger(sh)) throw new Error('Crowd atlas must contain 15 × 7 equal tiles.');
  const sprites = [];
  for (let index = 0; index < 105; index++) {
    const ox = index % 15 * sw, oy = Math.floor(index / 15) * sh;
    const data = Buffer.alloc(sw * sh * 4);
    for (let row = 0; row < sh; row++) atlas.copy(data, row * sw * 4, ((oy + row) * info.width + ox) * 4, ((oy + row) * info.width + ox + sw) * 4);
    const seen = new Uint8Array(sw * sh), queue = new Int32Array(sw * sh);
    let largest = [];
    const components = [];
    for (let start = 0; start < seen.length; start++) {
      if (seen[start] || data[start * 4 + 3] < 32) continue;
      let head = 0, tail = 1; queue[0] = start; seen[start] = 1;
      while (head < tail) {
        const p = queue[head++], x = p % sw;
        for (const n of [x > 0 ? p - 1 : -1, x < sw - 1 ? p + 1 : -1, p - sw, p + sw]) {
          if (n < 0 || n >= seen.length || seen[n] || data[n * 4 + 3] < 32) continue;
          seen[n] = 1; queue[tail++] = n;
        }
      }
      const component = queue.slice(0, tail); components.push(component);
      if (component.length > largest.length) largest = component;
    }
    for (const component of components) if (component.length < Math.max(48, largest.length * .003)) for (const p of component) data[p * 4 + 3] = 0;
    seen.fill(0); let head = 0, tail = 0;
    const add = p => { if (!seen[p] && data[p * 4 + 3] < 32) { seen[p] = 1; queue[tail++] = p; } };
    for (let x = 0; x < sw; x++) { add(x); add((sh - 1) * sw + x); }
    for (let y = 0; y < sh; y++) { add(y * sw); add(y * sw + sw - 1); }
    while (head < tail) {
      const p = queue[head++], x = p % sw;
      if (x > 0) add(p - 1); if (x < sw - 1) add(p + 1); if (p >= sw) add(p - sw); if (p < sw * (sh - 1)) add(p + sw);
    }
    let left = sw, top = sh, right = 0, bottom = 0;
    for (let p = 0; p < seen.length; p++) {
      const offset = p * 4;
      if (!seen[p] && data[offset + 3] < 255) {
        if (data[offset + 3] < 32) data[offset] = data[offset + 1] = data[offset + 2] = 255;
        data[offset + 3] = 255;
      }
      if (data[offset + 3] >= 32) { left = Math.min(left, p % sw); right = Math.max(right, p % sw); top = Math.min(top, Math.floor(p / sw)); bottom = Math.max(bottom, Math.floor(p / sw)); }
    }
    for (let row = 0; row < sh; row++) data.copy(atlas, ((oy + row) * info.width + ox) * 4, row * sw * 4, (row + 1) * sw * 4);
    if (right > left && bottom > top) sprites.push({ x: ox + left, y: oy + top, width: right - left + 1, height: bottom - top + 1 });
  }
  await sharp(atlas, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ lossless: true, effort: 6 }).toFile(outputPath);
  await fs.writeFile(manifestPath, JSON.stringify({ fingerprint, sprites }) + '\n');
  console.log('Prepared ' + sprites.length + ' intro figures at build time.');
}
module.exports = buildIntroCrowd;
if (require.main === module) buildIntroCrowd().catch(error => { console.error(error); process.exitCode = 1; });
