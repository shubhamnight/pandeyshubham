// Create a read-only public snapshot without changing the local portfolio.
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const checkout = path.join(root, 'output', 'share-site');
const dist = path.join(checkout, 'dist');
fs.mkdirSync(dist, { recursive: true });
const identity = JSON.parse(fs.readFileSync(path.join(root, '.openai', 'hosting.json'), 'utf8'));
fs.mkdirSync(path.join(checkout, '.openai'), { recursive: true });
fs.writeFileSync(path.join(checkout, '.openai', 'hosting.json'), JSON.stringify({
  project_id: identity.project_id,
  static: { directory: 'dist', not_found_handling: 'none' }
}, null, 2));
fs.writeFileSync(path.join(checkout, '.gitignore'), '.sites-runtime/\n');
for (const name of fs.readdirSync(root)) {
  if (name === 'travel-locations-editor.js') continue;
  if (!/\.(?:js|css)$/.test(name) && !['index.html', 'image-shub-2.jpeg', 'shub ka photo.png', 'travel-locations.json'].includes(name)) continue;
  const source = path.join(root, name);
  if (!fs.statSync(source).isFile()) continue;
  if (name === 'travel-location-label.js') {
    fs.writeFileSync(path.join(dist, name), fs.readFileSync(source, 'utf8').replace("fetch('/api/travel-locations')", "fetch('./travel-locations.json')"));
  } else fs.copyFileSync(source, path.join(dist, name));
}
for (const folder of ['assets', 'PHOTOGRAPHY', 'TRAVEL']) {
  fs.cpSync(path.join(root, folder), path.join(dist, folder), { recursive: true });
}
// Only the browser dependencies used by the existing models and scrolling.
for (const name of [
  'three/build/three.module.js', 'three/build/three.core.js',
  'three/examples/jsm/geometries/RoundedBoxGeometry.js',
  'lenis/dist/lenis.mjs', 'lenis/dist/lenis.css'
]) {
  const target = path.join(dist, 'node_modules', name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, 'node_modules', name), target);
}
console.log('Shareable portfolio snapshot: ' + checkout);
