// Separate delivery copies. Desktop URLs and all source media stay untouched.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const sharp = require('sharp');
const run = promisify(execFile);
const recipe = 'mobile-webp90-alpha100-v1-h264-crf20-original-fps';
const root = __dirname;

function moduleData(text) {
  const start = text.indexOf('=', text.indexOf('export const')) + 1;
  return JSON.parse(text.slice(start).trim().replace(/;\s*$/, ''));
}
async function buildMobileMedia() {
  const requested = new Set();
  const collect = value => {
    if (typeof value === 'string') {
      for (const candidate of value.split(',')) {
        const url = candidate.trim().replace(/\s+\d+w$/, '');
        if (/^(?:assets|PHOTOGRAPHY|TRAVEL)\/.*\.(?:webp|png|jpe?g|mp4)$/i.test(url)) requested.add(url);
      }
    } else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  for (const name of ['photography-data.js', 'photography-hero-data.js', 'travel-data.js', 'gaming-data.js', 'music-data.js']) {
    collect(moduleData(await fs.readFile(path.join(root, name), 'utf8')));
  }
  collect(JSON.parse(await fs.readFile(path.join(root, 'media-library.json'), 'utf8')));
  for (const name of await fs.readdir(path.join(root, 'assets/profile'))) collect('assets/profile/' + name);
  const cachePath = path.join(root, 'output/mobile-media-build-cache.json');
  const cache = JSON.parse(await fs.readFile(cachePath, 'utf8').catch(() => '{}'));
  const entries = {}, files = {}, totals = { images: 0, videos: 0, before: 0, after: 0 };
  const imageFiles = [], videoFiles = [];
  for (const source of requested) (/\.mp4$/i.test(source) ? videoFiles : imageFiles).push(source);
  // Video originals remain available for downloads. Only the playback URLs
  // already used by the site need alternate encodings.
  const playback = videoFiles.filter(source => source.startsWith('assets/'));
  const work = [...imageFiles, ...playback].sort();
  sharp.concurrency(2);
  let position = 0;
  const pending = new Map();
  async function worker() {
    while (position < work.length) {
      const source = work[position++], video = /\.mp4$/i.test(source);
      const inputPath = path.resolve(root, decodeURIComponent(source));
      if (!inputPath.startsWith(root + path.sep)) throw new Error('Invalid media path');
      const input = await fs.readFile(inputPath);
      const hash = createHash('sha256').update(recipe + (video ? '-v2-demux-timestamps' : '')).update(input).digest('hex').slice(0, 20);
      const relative = source.startsWith('assets/profile/')
        ? 'assets/mobile/profile/' + path.basename(source)
        : `assets/mobile/${hash}.${video ? 'mp4' : 'webp'}`;
      const destination = path.join(root, relative);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      const existing = cache[source];
      if (existing?.hash === hash && existing.kept === false) {
        entries[source] = existing;
        continue;
      }
      let size = existing?.hash === hash || !source.startsWith('assets/profile/')
        ? (await fs.stat(destination).catch(() => null))?.size : 0;
      if (!size) {
        let encoding = pending.get(destination);
        if (!encoding) {
          encoding = (async () => {
            const temporary = destination + '.tmp';
            try {
              if (video) {
                await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath,
                  '-map', '0:v:0', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
                  '-fps_mode', 'passthrough', '-enc_time_base', 'demux',
                  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-threads', '2', '-f', 'mp4', temporary],
                  { windowsHide: true, maxBuffer: 1024 * 1024 });
              } else {
                await sharp(input).rotate().webp({ quality: 90, alphaQuality: 100, effort: 5, smartSubsample: true }).toFile(temporary);
              }
              await fs.rename(temporary, destination);
              return (await fs.stat(destination)).size;
            } finally { await fs.unlink(temporary).catch(() => {}); }
          })();
          pending.set(destination, encoding);
        }
        size = await encoding;
      }
      // Do not send a second encoding if it is not actually smaller.
      // Profile paths are also used declaratively by <picture>.
      const kept = size < input.length * .95 || source.startsWith('assets/profile/');
      if (kept) {
        files[source] = relative;
        totals[video ? 'videos' : 'images']++;
        totals.before += input.length; totals.after += size;
      } else { await fs.unlink(destination).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
      entries[source] = { hash, size, originalSize: input.length, kept };
    }
  }
  await Promise.all([worker(), worker()]);
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(path.join(root, 'mobile-media-data.json'), JSON.stringify({ files: sorted }) + '\n');
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(entries));
  console.log('Phone/tablet media copies:', JSON.stringify({ ...totals, savedPercent: +(100 * (1 - totals.after / totals.before)).toFixed(1) }));
}
module.exports = buildMobileMedia;
if (require.main === module) buildMobileMedia().catch(error => { console.error(error); process.exitCode = 1; });
