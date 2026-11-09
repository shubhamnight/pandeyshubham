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
  // Keep saved travel captions available without blocking media on an API.
  const locations=JSON.parse(await fs.readFile(path.join(root,'travel-locations.json'),'utf8'));
  await fs.writeFile(path.join(root,'travel-location-data.js'),
    '// Generated from the user-saved travel-locations.json.\nexport const travelLocationDefaults = '+JSON.stringify(locations,null,2)+';\n');
  for (const size of [64, 480, 640, 960]) {
    const portrait = sharp(path.join(root, 'shub ka photo.png')).resize({ width: size });
    await portrait.clone().webp({ lossless: true, effort: 6 })
      .toFile(path.join(profile, `shubham-pandey-portrait-${size}.webp`));
    if (size > 64) {
      await portrait.webp({ quality: 94, alphaQuality: 100, smartSubsample: true, effort: 5 })
        .toFile(path.join(profile, `shubham-pandey-hero-${size}.webp`));
    }
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
    await sharp(Buffer.from(cursor)).resize(size, size, { fit: 'contain', background: '#02070a' }).flatten({ background: '#02070a' }).png()
      .toFile(path.join(brand, filename));
  }
  // Favicon.ico supports browsers that still request the conventional URL.
  const png = await fs.readFile(path.join(brand, 'favicon-32.png'));
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); ico[6] = 32; ico[7] = 32;
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
  await fs.writeFile(path.join(root, 'favicon.ico'), Buffer.concat([ico, png]));
  console.log('Responsive portraits, original crowd pixels, and icons prepared.');
}
module.exports = buildSiteAssets;
if (require.main === module) buildSiteAssets().catch(error => { console.error(error); process.exitCode = 1; });
