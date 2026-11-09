const fs = require('node:fs');
const path = require('node:path');
const { buildSync, transformSync } = require('esbuild');
const { renderSeo } = require('./build-seo.cjs');
const publicFiles = require('./public-files.cjs');

function packStyles(files) {
  const index = files.get('index.html');
  const css = [];
  index.content = index.content.replace(/<link rel="stylesheet" href="([^"]+\.css)">/g, (link, name, offset, html) => {
    if (offset > html.indexOf('<noscript>')) return link;
    const source = files.get(name).content;
    const folder = path.posix.dirname(name);
    css.push(folder === '.' ? source : source.replace(/url\(([\w.-]+)\)/g, (_, value) => 'url(' + folder + '/' + value + ')'));
    // Offline and 404 load the shared theme and fonts as standalone sheets.
    if (name !== 'assets/fonts/fonts.css' && name !== 'public-theme.css') files.delete(name);
    return css.length === 1 ? '<link rel="stylesheet" href="site.css">' : '';
  });
  files.set('site.css', { content: css.join('\n') });
}

function buildVercel() {
  const root = fs.realpathSync(__dirname);
  const dist = path.join(root, 'dist');
  const files = publicFiles(root);
  packStyles(files);
  if (fs.lstatSync(dist, { throwIfNoEntry: false })?.isSymbolicLink()) {
    throw new Error('Build output must not be a symbolic link.');
  }
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  const production = process.env.VERCEL_ENV === 'production';
  if (production) {
    const config = JSON.stringify(process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG || '');
    buildSync({
      stdin: {
        contents: `import { inject } from '@vercel/analytics'; inject({ mode: 'production' }, ${config});`,
        resolveDir: root,
      },
      bundle: true,
      minify: true,
      target: 'es2020',
      outfile: path.join(dist, 'web-analytics.js'),
    });
  }

  for (const [name, file] of files) {
    const target = path.join(dist, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (file.content === null) {
      fs.copyFileSync(file.source, target);
      continue;
    }
    let content = file.content;
    if (!name.includes('/')) {
      content = content.replaceAll('node_modules/', 'vendor/');
      if (name === 'index.html') {
        content = renderSeo(content, { preview: process.env.VERCEL_ENV === 'preview' });
        if (production) content = content.replace('</head>', '<script defer src="/web-analytics.js"></script>\n</head>');
      }
      if (name === 'travel-location-label.js') {
        const localEndpoint = "fetch('/api/travel-locations'";
        if (content.includes(localEndpoint)) content = content.replace(localEndpoint, "fetch('./travel-locations.json'");
      }
      if (/\.(?:js|css)$/.test(name)) {
        const moduleScript = name.endsWith('.js') && /^\s*(?:import\s+(?!\()|export\s+)/m.test(content);
        content = transformSync(content, {
          loader: name.endsWith('.css') ? 'css' : 'js',
          target: 'es2020', minifyWhitespace: true, minifySyntax: true,
          // Classic scripts share globals, so only ES modules can rename bindings.
          ...(moduleScript ? { format: 'esm', minifyIdentifiers: true } : {}),
          legalComments: 'eof',
        }).code;
      }
    }
    fs.writeFileSync(target, content);
  }
  const vendor = [
    'three/build/three.module.js',
    'three/build/three.core.js',
    'three/examples/jsm/utils/BufferGeometryUtils.js',
  ];
  for (const name of vendor) {
    const target = path.join(dist, 'vendor', name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const content = fs.readFileSync(path.join(root, 'node_modules', name), 'utf8');
    fs.writeFileSync(target, transformSync(content, {
      target: 'es2020', minify: true, keepNames: true, legalComments: 'eof',
    }).code);
  }
  fs.writeFileSync(path.join(dist, 'public-files.json'), JSON.stringify([...files.keys(), ...vendor.map(name => 'vendor/' + name), ...(production ? ['web-analytics.js'] : [])].sort()));
  console.log('Vercel portfolio build ready: ' + dist);
  return dist;
}

module.exports = buildVercel;
if (require.main === module) buildVercel();
