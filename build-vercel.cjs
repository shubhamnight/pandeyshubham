// Package the existing portfolio as a static Vercel deployment.
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('esbuild');
const { renderSeo } = require('./build-seo.cjs');
const root = fs.realpathSync(__dirname);
const dist = path.resolve(root, 'dist');

// Only replace this project's generated output, never a linked directory.
if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') {
  throw new Error('Build output must be the project dist directory.');
}
if (fs.lstatSync(dist, { throwIfNoEntry: false })?.isSymbolicLink()) {
  throw new Error('Build output must not be a symbolic link.');
}
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const name of fs.readdirSync(root)) {
  if (name === 'travel-locations-editor.js') continue;
  if (!/\.(?:js|css)$/.test(name) && ![
    'index.html', '404.html', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'favicon.ico',
    'image-shub-2.jpeg', 'shub ka photo.png', 'travel-locations.json'
  ].includes(name)) continue;
  const source = path.join(root, name);
  if (!fs.statSync(source).isFile()) continue;
  const target = path.join(dist, name);
  if (/\.(?:html|js|css)$/.test(name)) {
    // Vercel excludes node_modules from public assets. Publish only the
    // required browser modules under vendor, retaining their directory layout.
    let content = fs.readFileSync(source, 'utf8').replaceAll('node_modules/', 'vendor/');
    if (name === 'index.html') content = renderSeo(content, { preview: process.env.VERCEL_ENV === 'preview' });
    if (name === 'travel-location-label.js') {
      const localEndpoint = "fetch('/api/travel-locations')";
      if (!content.includes(localEndpoint)) throw new Error('Travel location endpoint changed; update the static build.');
      content = content.replace(localEndpoint, "fetch('./travel-locations.json')");
    }
    if (/\.(?:js|css)$/.test(name)) content = transformSync(content, {
      loader: name.endsWith('.css') ? 'css' : 'js', target: 'es2020',
      minifyWhitespace: true, minifySyntax: true,
      // Classic scripts share globals (including reducedMotion). Keep names.
      minifyIdentifiers: false, legalComments: 'eof',
    }).code;
    fs.writeFileSync(target, content);
  } else fs.copyFileSync(source, target);
}

// Keep original media and the existing optimized assets without re-encoding.
for (const folder of ['assets', 'PHOTOGRAPHY', 'TRAVEL']) {
  fs.cpSync(path.join(root, folder), path.join(dist, folder), { recursive: true });
}
for (const name of [
  'three/build/three.module.js', 'three/build/three.core.js',
  'three/examples/jsm/geometries/RoundedBoxGeometry.js',
  'lenis/dist/lenis.mjs', 'lenis/dist/lenis.css'
]) {
  const target = path.join(dist, 'vendor', name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = fs.readFileSync(path.join(root, 'node_modules', name), 'utf8');
  fs.writeFileSync(target, transformSync(content, {
    loader: name.endsWith('.css') ? 'css' : 'js', target: 'es2020',
    minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, legalComments: 'eof',
  }).code);
}
console.log('Vercel portfolio build ready: ' + dist);
