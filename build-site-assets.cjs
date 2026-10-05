// Derive delivery assets from the original photographs; never overwrite them.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function buildSiteAssets() {
  const root = __dirname;
  const profile = path.join(root, 'assets/profile');
  const brand = path.join(root, 'assets/brand');
  await fs.mkdir(profile, { recursive: true });
  await fs.mkdir(brand, { recursive: true });
  for (const size of [64, 480, 640, 960]) {
    await sharp(path.join(root, 'shub ka photo.png')).resize({ width: size }).webp({ lossless: true, effort: 6 })
      .toFile(path.join(profile, `shubham-pandey-portrait-${size}.webp`));
  }
  for (const size of [480, 960]) {
    await sharp(path.join(root, 'image-shub-2.jpeg')).rotate().resize({ width: size }).webp({ quality: 94, effort: 5 })
      .toFile(path.join(profile, `shubham-pandey-cafe-${size}.webp`));
  }
  for (const size of [160, 320]) {
    await sharp(path.join(root, 'assets/photography-camera-blue.png')).resize({ width: size }).webp({ lossless: true, effort: 6 })
      .toFile(path.join(root, `assets/photography-camera-${size}.webp`));
  }
  await require('./build-intro-crowd.cjs')();
  // A compact initial favicon uses the existing Batman silhouette.
  const cursor = await fs.readFile(path.join(root, 'assets/batman/cursor.svg'), 'utf8');
  await fs.writeFile(path.join(brand, 'favicon.svg'), cursor);
  for (const [filename, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    await sharp(Buffer.from(cursor)).resize(size, size, { fit: 'contain', background: '#0c0d10' }).flatten({ background: '#0c0d10' }).png()
      .toFile(path.join(brand, filename));
  }
  // Favicon.ico supports browsers that still request the conventional URL.
  const png = await fs.readFile(path.join(brand, 'favicon-32.png'));
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); ico[6] = 32; ico[7] = 32;
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
  await fs.writeFile(path.join(root, 'favicon.ico'), Buffer.concat([ico, png]));
  const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="#10233d"/><stop offset="1" stop-color="#0c0d10"/></linearGradient><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#5685c1" stroke-opacity=".12"/></pattern></defs><rect width="1200" height="630" fill="url(#b)"/><rect width="1200" height="630" fill="url(#g)"/><rect x="66" y="75" width="5" height="475" rx="2" fill="#5685c1"/><g fill="#e7ebf0" font-family="sans-serif"><text x="105" y="145" font-size="19" letter-spacing="4" fill="#96b7df">DEVELOPER / DESIGNER</text><text x="100" y="280" font-size="76" font-weight="700">Shubham</text><text x="100" y="365" font-size="76" font-weight="700">Pandey</text><text x="105" y="437" font-size="24">BCA (Honours) student</text><text x="105" y="480" font-size="21" fill="#b3c0d2">Software · Web development · Cybersecurity interest</text><text x="105" y="548" font-size="19" fill="#96b7df">pandeyshubham.in</text></g></svg>`;
  const portrait = await sharp(path.join(root, 'shub ka photo.png')).resize({ height: 540 }).grayscale().toBuffer();
  await sharp(Buffer.from(social)).composite([{ input: portrait, left: 784, top: 90 }]).jpeg({ quality: 94, mozjpeg: true })
    .toFile(path.join(brand, 'shubham-pandey-portfolio-og.jpg'));
  console.log('Responsive portraits, original crowd pixels, icons and social preview prepared.');
}
module.exports = buildSiteAssets;
if (require.main === module) buildSiteAssets().catch(error => { console.error(error); process.exitCode = 1; });
