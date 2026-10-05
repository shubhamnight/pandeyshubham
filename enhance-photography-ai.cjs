// Optional local preparation. Neural inference is never run by Vercel or visitors.
// Download the official Real-ESRGAN Windows bundle and pass its extracted folder:
// node enhance-photography-ai.cjs --runtime tmp/ai-upscale/runtime --gpu 0
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const sharp = require('sharp');

const recipe = 'realesrgan-x4plus-v1-original-blend20-webp95';

async function enhance() {
  const args = process.argv.slice(2);
  const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const runtime = path.resolve(option('--runtime', 'tmp/ai-upscale/runtime'));
  const executable = path.join(runtime, 'realesrgan-ncnn-vulkan.exe');
  const gpu = option('--gpu', '0');
  await fs.access(executable);
  const root = __dirname;
  const cache = path.join(root, 'tmp', 'ai-upscale', 'masters');
  const output = path.join(root, 'assets', 'photography', 'hero');
  const indexPath = path.join(output, 'ai-index.json');
  await fs.mkdir(cache, { recursive: true });
  await fs.mkdir(output, { recursive: true });
  const index = JSON.parse(await fs.readFile(indexPath, 'utf8').catch(() => '{}'));
  const files = (await fs.readdir(path.join(root, 'PHOTOGRAPHY'))).filter(name => /\.(jpe?g|png|webp)$/i.test(name)).sort();
  sharp.concurrency(2);
  sharp.cache({ memory: 64, files: 8, items: 24 });
  let completed = 0;
  for (const name of files) {
    const input = await fs.readFile(path.join(root, 'PHOTOGRAPHY', name));
    const hash = createHash('sha256').update(input).digest('hex');
    const fingerprint = createHash('sha256').update(recipe).update(input).digest('hex').slice(0, 16);
    const original = 'PHOTOGRAPHY/' + encodeURIComponent(name);
    const existing = index[original];
    if (existing?.hash === hash && existing?.recipe === recipe &&
      (await Promise.all(existing.sources.map(source => fs.stat(path.join(root, source.src)).catch(() => null)))).every(file => file?.size)) {
      console.log(++completed + '/' + files.length + ' cached: ' + name);
      continue;
    }
    const normalized = path.join(cache, fingerprint + '-input.png');
    const master = path.join(cache, fingerprint + '-4x.png');
    const info = await sharp(input).rotate().png().toFile(normalized);
    if (!(await fs.stat(master).catch(() => null))?.size) {
      console.log('AI restoring: ' + name);
      await new Promise((resolve, reject) => {
        const run = spawn(executable, ['-i', normalized, '-o', master, '-m', path.join(runtime, 'models'), '-n', 'realesrgan-x4plus', '-s', '4', '-t', '256', '-g', gpu, '-j', '1:1:1'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        let diagnostic = '';
        run.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-3000); });
        run.on('error', reject);
        run.on('close', code => code === 0 ? resolve() : reject(new Error('AI restoration failed: ' + diagnostic)));
      });
    }
    const aiInfo = await sharp(master).metadata();
    if (aiInfo.width !== info.width * 4 || aiInfo.height !== info.height * 4) throw new Error('Unexpected AI output size: ' + name);
    // High-resolution copies remain within an 8192px long-edge budget. The
    // widest version also covers landscape screens displaying portrait photos.
    const largest = Math.floor(Math.min(info.width * 4, 8192 * info.width / info.height));
    const widths = [...new Set([Math.min(1280, largest), Math.min(1920, largest), Math.min(2560, largest), largest])].sort((a, b) => a - b);
    const sources = [];
    for (const width of widths) {
      const resize = { width, kernel: sharp.kernel.lanczos3 };
      const ai = await sharp(master).resize(resize).removeAlpha().toColorspace('srgb').raw().toBuffer({ resolveWithObject: true });
      const base = await sharp(normalized).resize({ ...resize, kernel: sharp.kernel.mks2021 }).removeAlpha().toColorspace('srgb').raw().toBuffer();
      if (base.length !== ai.data.length) throw new Error('Source dimensions do not match: ' + name);
      // Preserve a little of the source texture instead of applying a brittle
      // extra sharpening pass to AI-reconstructed details.
      for (let pixel = 0; pixel < base.length; pixel++) ai.data[pixel] = Math.round(ai.data[pixel] * .8 + base[pixel] * .2);
      const filename = 'ai-' + fingerprint + '-' + width + '.webp';
      const target = path.join(output, filename);
      await sharp(ai.data, { raw: ai.info }).webp({ quality: 95, effort: 5, smartSubsample: true }).toFile(target + '.tmp');
      await fs.rename(target + '.tmp', target);
      sources.push({ src: 'assets/photography/hero/' + filename, width });
    }
    index[original] = { hash, recipe, width: info.width, height: info.height, sources };
    // Save after every photograph so an interrupted run can resume safely.
    await fs.writeFile(indexPath + '.tmp', JSON.stringify(index, null, 2) + '\n');
    await fs.rename(indexPath + '.tmp', indexPath);
    console.log(++completed + '/' + files.length + ' enhanced: ' + name + ' (' + aiInfo.width + '×' + aiInfo.height + ')');
  }
  await require('./build-photography-hero.cjs')();
}
enhance().catch(error => { console.error(error); process.exitCode = 1; });
