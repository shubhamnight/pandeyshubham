// Prepare photo viewing copies locally; no AI runtime is shipped to visitors.
// Real-ESRGAN model reference: https://github.com/xinntao/Real-ESRGAN
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const masterRecipe = 'realesrgan-x4plus-v1-original-blend20-webp95';
const exportRecipe = 'photo-crop-4k-v2-ai80-source20-edge-clarity-webp98';
const cache = path.join(root, 'tmp/ai-upscale/masters');
const runtime = path.join(root, 'tmp/ai-upscale/runtime');
const exists = async file => Boolean((await fs.stat(file).catch(() => null))?.size);
let inferenceQueue = Promise.resolve();

async function prepareMaster(input, dimensions) {
  const hash = createHash('sha256').update(masterRecipe).update(input).digest('hex').slice(0, 16);
  const normalized = path.join(cache, hash + '-input.png'), master = path.join(cache, hash + '-4x.png');
  // Sources already large enough do not need neural reconstruction.
  if (!await exists(master)) {
    const executable = path.join(runtime, 'realesrgan-ncnn-vulkan.exe');
    if (!await exists(executable) || dimensions.width * dimensions.height > 8000000) return null;
    await fs.mkdir(cache, { recursive: true });
    await sharp(input).rotate().png().toFile(normalized);
    const temporary = path.join(cache, hash + '-pending.png');
    const operation = inferenceQueue.then(() => new Promise((resolve, reject) => {
      const run = spawn(executable, ['-i', normalized, '-o', temporary, '-m', path.join(runtime, 'models'),
        '-n', 'realesrgan-x4plus', '-s', '4', '-t', '256', '-g', '0', '-j', '1:1:1'],
      { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      let diagnostic = '';
      const timeout = setTimeout(() => { run.kill(); reject(Error('Photo enhancement timed out')); }, 180000);
      run.stderr.on('data', data => { diagnostic = (diagnostic + data).slice(-1500); });
      run.on('error', error => { clearTimeout(timeout); reject(error); });
      run.on('close', code => { clearTimeout(timeout); code === 0 ? resolve() : reject(Error('Photo enhancement failed: ' + diagnostic)); });
    })).then(async () => {
      const info = await sharp(temporary).metadata();
      if (info.width !== dimensions.width * 4 || info.height !== dimensions.height * 4) throw Error('Unexpected enhancement dimensions');
      await fs.rename(temporary, master);
    });
    inferenceQueue = operation.catch(() => {});
    try { await operation; } catch (error) {
      await fs.unlink(temporary).catch(() => {});
      console.warn('Using high-quality resize for this photo:', error.message);
      return null;
    }
  }
  const info = await sharp(master).metadata();
  return info.width === dimensions.width * 4 && info.height === dimensions.height * 4 ? master : null;
}

function cropRect(crop, w, h) {
  const left = Math.min(w - 1, Math.round(crop.x * w)), top = Math.min(h - 1, Math.round(crop.y * h));
  return { left, top, width: Math.max(1, Math.min(w - left, Math.round(crop.width * w))),
    height: Math.max(1, Math.min(h - top, Math.round(crop.height * h))) };
}

async function enhancePhotographyCrop(file, crop) {
  const input = await fs.readFile(file);
  const base = await sharp(input, { limitInputPixels: 40000000 }).rotate().removeAlpha().toColorspace('srgb').png().toBuffer({ resolveWithObject: true });
  const rect = cropRect(crop, base.info.width, base.info.height);
  const nativeWidth = rect.width;
  const largest = Math.max(1, Math.min(3840, Math.floor(8192 * rect.width / rect.height)));
  const master = nativeWidth < largest ? await prepareMaster(input, base.info) : null;
  const token = createHash('sha256').update(exportRecipe + (master ? '-neural' : '-resize')).update(input).update(JSON.stringify(rect)).digest('hex').slice(0, 20);
  const widths = [...new Set([Math.min(480, largest), Math.min(960, largest), Math.min(1280, largest),
    Math.min(1920, largest), Math.min(2560, largest), largest])].sort((a, b) => a - b);
  const directory = path.join(root, 'assets/media-edits/4k');
  await fs.mkdir(directory, { recursive: true });
  const sources = [];
  const baseline = await sharp(base.data).extract(rect).png().toBuffer();
  const enhancedRect = Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, value * 4]));
  for (const width of widths) {
    const url = `assets/media-edits/4k/${token}-${width}.webp`, destination = path.join(root, url);
    if (!await exists(destination)) {
      const resize = { width, kernel: sharp.kernel.mks2021, fastShrinkOnLoad: false };
      let output;
      if (master) {
        const ai = await sharp(master).extract(enhancedRect).resize({ ...resize, kernel: sharp.kernel.lanczos3 }).removeAlpha().toColorspace('srgb').raw().toBuffer({ resolveWithObject: true });
        const natural = await sharp(baseline).resize(resize).raw().toBuffer();
        if (natural.length !== ai.data.length) throw Error('Crop enhancement dimensions do not match');
        for (let pixel = 0; pixel < natural.length; pixel++) ai.data[pixel] = Math.round(ai.data[pixel] * .8 + natural[pixel] * .2);
        output = sharp(ai.data, { raw: ai.info });
      } else output = sharp(baseline).resize(resize);
      // Recover edge contrast lost during resizing without a CSS sharpening
      // filter, extra color grading, or amplifying noise in flat areas.
      const temporary = destination + '-' + randomUUID() + '.tmp';
      await output.sharpen({ sigma: .8, m1: 0, m2: 1.1, x1: 2, y2: 4, y3: 4 })
        .webp({ quality: 98, effort: 5, smartSubsample: true }).toFile(temporary);
      await fs.rename(temporary, destination);
    }
    sources.push({ src: url, width });
  }
  const full = await sharp(path.join(root, sources.at(-1).src)).metadata();
  return { type: 'image', src: sources[0].src, srcset: sources.map(s => `${s.src} ${s.width}w`).join(', '),
    original: sources.at(-1).src, width: full.width, height: full.height, sources,
    enhancement: { recipe: exportRecipe, method: master ? 'Real-ESRGAN x4 with original texture blend' : 'High-quality resize', nativeWidth, exportWidth: full.width } };
}
module.exports = { enhancePhotographyCrop };
