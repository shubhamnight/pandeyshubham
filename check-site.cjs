// Dependency-free assertions plus the project's existing esbuild parser.
// Run after npm run build. These checks do not claim external Google validation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('esbuild');
const { metadata, productionOrigin } = require('./build-seo.cjs');
const config = require('./site.config.cjs');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
for (const folder of ['.', 'dist']) {
  const html = fs.readFileSync(path.join(__dirname, folder, 'index.html'), 'utf8');
  check((html.match(/<title>/g) || []).length === 1, folder + ': one title');
  check((html.match(/<h1\b/g) || []).length === 1, folder + ': one primary heading');
  check((html.match(/<main\b/g) || []).length === 1, folder + ': one main landmark');
  check((html.match(/rel="canonical"/g) || []).length === 1, folder + ': one canonical');
  check(html.includes('href="' + config.siteUrl + '"'), folder + ': canonical uses public preferred origin');
  check(html.includes('BCA (Honours)') && html.includes('Shubham Pandey'), folder + ': identity in HTML');
  check(/<dialog id="music-gallery"[\s\S]*?<div class="hobby-gallery-content" tabindex="0"/.test(html), folder + ': music gallery scroll region keyboard accessible');
  check(!html.includes('fonts.googleapis.com'), folder + ': fonts self-hosted');
  check(html.includes('max-image-preview:large'), folder + ': production indexable');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  check(new Set(ids).size === ids.length, folder + ': unique IDs');
  for (const image of html.matchAll(/<img\b[^>]*>/g)) check(/\balt="/.test(image[0]), folder + ': image alternative');
  for (const reference of html.matchAll(/\b(?:src|href)="([^"#]+)"/g)) {
    const value = reference[1];
    if (/^(?:https?:|data:|mailto:|tel:|#)/.test(value)) continue;
    const file = path.resolve(__dirname, folder, '.' + (value.startsWith('/') ? value : '/' + value));
    check(fs.existsSync(decodeURIComponent(file)), folder + ': asset/link exists: ' + value);
  }
  const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
  check(graph['@context'] === 'https://schema.org', folder + ': Schema.org context');
  check(graph['@graph'].map(item => item['@type']).join(',') === 'Person,WebSite,ProfilePage', folder + ': schema matches this portfolio');
  check(graph['@graph'][0].name === config.name, folder + ': consistent identity');
  check(graph['@graph'][0].sameAs[0] === config.github, folder + ': verified GitHub');
  check(!graph['@graph'][0].alumniOf, folder + ': no invented alumni records');
  const sitemap = fs.readFileSync(path.join(__dirname, folder, 'sitemap.xml'), 'utf8');
  check(sitemap.includes('<loc>' + config.siteUrl + '</loc>') && (sitemap.match(/<loc>/g) || []).length === 1, folder + ': only canonical document in sitemap');
  check(fs.readFileSync(path.join(__dirname, folder, 'robots.txt'), 'utf8').includes(config.siteUrl + 'sitemap.xml'), folder + ': sitemap discoverable');
  check(fs.readFileSync(path.join(__dirname, folder, '404.html'), 'utf8').includes('noindex, follow'), folder + ': error page not indexable');
}
check(metadata({ preview: true }).includes('noindex, follow'), 'Preview output excluded from indexing');
check(metadata({ preview: true }).includes(config.siteUrl), 'Preview canonical still points to production');
assert.throws(() => productionOrigin({ SITE_URL: 'http://localhost:3000/' })); checks++;
check(productionOrigin({ SITE_URL: 'https://example.org/' }) === 'https://example.org/', 'Origin override supported');
check(config.description.length >= 140 && config.description.length <= 160, 'Natural description length');
for (const name of fs.readdirSync(__dirname).filter(name => /\.(?:c?js|css)$/.test(name))) {
  const result = transformSync(fs.readFileSync(path.join(__dirname, name), 'utf8'), { loader: name.endsWith('.css') ? 'css' : 'js', logLevel: 'silent' });
  check(result.warnings.length === 0, 'No parser warnings: ' + name);
}
const sprites = JSON.parse(fs.readFileSync('assets/intro-crowd-sprites.json', 'utf8'));
check(sprites.sprites.length === 105, 'All original crowd figures retained');
for (const item of sprites.sprites) check(item.width > 0 && item.height > 0 && item.x >= 0 && item.y >= 0, 'Valid sprite bounds');
console.log(checks + ' source/build SEO, links, metadata, syntax and sprite checks passed.');
