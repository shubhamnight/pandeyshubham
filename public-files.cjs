const fs = require('node:fs');
const path = require('node:path');
const { composePage } = require('./apps/portfolio/compose.cjs');

const extension = '(?:html|m?js|css|json|webmanifest|webp|avif|jpe?g|png|ico|svg|woff2?|mp4|webm|glb|gltf)';
const assetPath = new RegExp(String.raw`(?:assets|PHOTOGRAPHY|TRAVEL)/[^\s"'<>?,;]+?\.${extension}(?=[\s"'<>?,;)]|$)`, 'gi');
const localPath = new RegExp(String.raw`["']((?:\./|\.\./|/)?[\w][\w./%-]*?\.${extension})["']`, 'gi');
const cssPath = new RegExp(String.raw`url\(\s*([\w./% -]+?\.${extension})\s*\)`, 'gi');

function publicFiles(root) {
  const files = new Map();
  const sections = 'apps/portfolio/sections';
  const sources = new Map([['index.html', composePage()]]);
  const sourcePath = name => fs.existsSync(path.join(root, sections, name))
    ? path.join(root, sections, name) : path.join(root, name);
  function add(name, parent = 'release') {
    if (path.isAbsolute(name) || name.startsWith('../') || name.includes('\\') || name.includes(':')) {
      throw new Error(`Invalid public path ${name} referenced by ${parent}`);
    }
    if (files.has(name) || /^(?:node_modules|vendor)\//.test(name)) return;
    const source = sourcePath(name);
    if (!sources.has(name) && !fs.statSync(source, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`Missing public file ${name} referenced by ${parent}`);
    }
    const content = sources.get(name) ?? (/\.(?:html|m?js|css|json|webmanifest)$/.test(name) ? fs.readFileSync(source, 'utf8') : null);
    files.set(name, { source, content });
    if (!content || name === 'mobile-media-data.json') return;
    const from = path.posix.dirname(name);
    const addReference = value => add(path.posix.normalize(decodeURIComponent(value.startsWith('/') ? value.slice(1) : path.posix.join(from, value))), name);
    // Data modules use document-relative media URLs, including encoded original names.
    for (const [value] of content.replace(/https?:\/\/(?!www\.pandeyshubham\.in\/)[^\s"'<>]+/g, '').matchAll(assetPath)) add(decodeURIComponent(value), name);
    for (const [, value] of content.matchAll(localPath)) {
      if (/^(?:\.?\.?\/)?(?:assets|PHOTOGRAPHY|TRAVEL)\//.test(value)) continue;
      // Ignore bare string literals in bundled JS unless they are explicit paths.
      if (value.startsWith('-')) continue;
      if (from !== '.' && /\.m?js$/.test(name) && !/^[./]/.test(value)) continue;
      addReference(value);
    }
    if (name.endsWith('.css')) for (const [, value] of content.matchAll(cssPath)) addReference(value);
  }
  for (const name of [
    'index.html', '404.html', 'offline.html', 'offline-sw.js', 'robots.txt', 'sitemap.xml', 'favicon.ico',
    'image-shub-2.jpeg', 'shub ka photo.png', 'travel-locations.json',
    'assets/fonts/Imbue-OFL.txt', 'assets/fonts/Odibee-Sans-OFL.txt',
    'assets/React-Bits-LICENSE.txt',
    // Hobby module names and island recovery URLs are assembled at runtime.
    'photography-camera.js', 'travel-plane.js', 'gaming-controller.js', 'music-walkman.js',
    'photography-media.js', 'travel-media.js', 'gaming-media.js', 'music-records.js',
    ...['connect-page', 'photography-carousel', 'travel-overlay', 'gaming-overlay', 'music-overlay']
      .map(name => 'assets/ui/' + name + '-recovery.js'),
  ]) add(name);

  for (const folder of ['PHOTOGRAPHY', 'TRAVEL']) {
    for (const original of fs.readdirSync(path.join(root, folder), { withFileTypes: true, recursive: true })) {
      if (original.isFile()) add(path.relative(root, path.join(original.parentPath, original.name)).split(path.sep).join('/'));
    }
  }
  const manifest = files.get('mobile-media-data.json');
  if (manifest) {
    // Keep variants of shipped media. The former background preview loop is gone.
    const { files: variants } = JSON.parse(manifest.content);
    const needed = Object.fromEntries(Object.entries(variants).filter(([original]) => files.has(decodeURIComponent(original))));
    for (const variant of Object.values(needed)) add(variant, 'mobile-media-data.json');
    manifest.content = JSON.stringify({ files: needed });
  }
  return files;
}

module.exports = publicFiles;
