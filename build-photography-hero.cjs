// Use prepared AI viewing copies when available; originals stay untouched.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');

const recipe = 'hero-v1-cubic-lab-sharpen-0.6-0-0.5-webp95';

async function buildPhotographyHero() {
  const root = __dirname;
  const sourceFolder = path.join(root, 'PHOTOGRAPHY');
  const output = path.join(root, 'assets', 'photography', 'hero');
  await fs.mkdir(output, { recursive: true });
  const enhanced = JSON.parse(await fs.readFile(path.join(output, 'ai-index.json'), 'utf8').catch(() => '{}'));
  const files = (await fs.readdir(sourceFolder)).filter(name => /\.(jpe?g|png|webp)$/i.test(name)).sort();
  const manifest = {};
  // Bound the CPU and memory used while the local website is running.
  sharp.concurrency(2);
  for (const name of files) {
    const input = await fs.readFile(path.join(sourceFolder, name));
    const metadata = await sharp(input).metadata();
    const rotated = [5, 6, 7, 8].includes(metadata.orientation);
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    if (!width || !height) throw new Error('Photography dimensions unavailable: ' + name);
    const original = 'PHOTOGRAPHY/' + encodeURIComponent(name);
    const hash = createHash('sha256').update(input).digest('hex');
    const ai = enhanced[original];
    if (ai?.hash === hash && ai.sources?.length &&
      (await Promise.all(ai.sources.map(source => fs.stat(path.join(root, source.src)).catch(() => null)))).every(file => file?.size)) {
      manifest[original] = ai.sources;
      // These fallback files belong to this generator's exact recipe. Once AI
      // copies replace them, omit the unused duplicates from static hosting.
      const oldFingerprint = createHash('sha256').update(recipe).update(input).digest('hex').slice(0, 16);
      for (const filename of await fs.readdir(output)) {
        if (new RegExp('^' + oldFingerprint + '-[0-9]+\\.webp$').test(filename)) {
          await fs.unlink(path.join(output, filename));
        }
      }
      console.log('Photography hero: AI viewing sources ready for ' + name);
      continue;
    }
    const fingerprint = createHash('sha256').update(recipe).update(input).digest('hex').slice(0, 16);
    // At most 4× the source; the long edge stays within a 4096px texture budget.
    const largest = Math.max(width, Math.floor(Math.min(3840, width * 4, 4096 * width / height)));
    const widths = [...new Set([Math.min(1280, largest), Math.min(1920, largest), largest])].filter(size => size > width).sort((a, b) => a - b);
    const sources = [{ src: original, width }];
    for (const size of widths) {
      const filename = fingerprint + '-' + size + '.webp';
      const destination = path.join(output, filename);
      const cached = await fs.stat(destination).catch(() => null);
      if (!cached?.size) {
        const temporary = destination + '.tmp';
        try {
          await sharp(input)
            .rotate()
            .resize({ width: size, kernel: sharp.kernel.mks2021, fastShrinkOnLoad: false })
            // Sharpen luminance edges gently; leave flat areas and colors alone.
            .sharpen({ sigma: .6, m1: 0, m2: .5, x1: 3, y2: 2, y3: 2 })
            .toColorspace('srgb')
            .webp({ quality: 95, effort: 4, smartSubsample: true })
            .toFile(temporary);
          await fs.rename(temporary, destination);
        } catch (error) {
          await fs.unlink(temporary).catch(() => {});
          throw error;
        }
      }
      sources.push({ src: 'assets/photography/hero/' + filename, width: size });
    }
    manifest[original] = sources;
    console.log('Photography hero: ' + name + ' → ' + sources.at(-1).width + 'px wide');
  }
  await fs.writeFile(path.join(root, 'photography-hero-data.js'),
    '// Prepared responsive viewing copies; original photographs remain untouched.\n' +
    'export const photographyHeroSources = ' + JSON.stringify(manifest, null, 2) + ';\n');
  console.log('Prepared high-resolution viewing sources for ' + files.length + ' photographs.');
}

module.exports = buildPhotographyHero;
if (require.main === module) buildPhotographyHero().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
