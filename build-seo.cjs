const fs = require('node:fs');
const path = require('node:path');
const config = require('./site.config.cjs');

function productionOrigin(env = process.env) {
  const value = env.SITE_URL || config.siteUrl || (env.VERCEL_PROJECT_PRODUCTION_URL && 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || /^(localhost|127\.|0\.|\[::1\])/.test(url.hostname)) {
    throw new Error('SITE_URL must be a public HTTPS origin, without a path, query or fragment.');
  }
  return url.origin + '/';
}
const htmlEscape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function metadata({ preview = false, env = process.env } = {}) {
  const url = productionOrigin(env);
  const personId = url + '#person', websiteId = url + '#website', pageId = url + '#webpage';
  const sameAs = [config.github, config.linkedin].filter(Boolean);
  const graph = [
    { '@type': 'Person', '@id': personId, name: config.name, url, image: url + config.profileImage, description: config.personDescription, knowsAbout: config.knowsAbout, sameAs },
    { '@type': 'WebSite', '@id': websiteId, name: config.siteName, url, inLanguage: 'en', publisher: { '@id': personId } },
    { '@type': 'ProfilePage', '@id': pageId, name: config.title, url, description: config.description, inLanguage: 'en', isPartOf: { '@id': websiteId }, mainEntity: { '@id': personId }, primaryImageOfPage: { '@type': 'ImageObject', url: url + config.socialImage, width: 1200, height: 630 } },
  ];
  // Current students are not marked as alumni, and no unverified school is added.
  const verification = env.GOOGLE_SITE_VERIFICATION || config.searchConsoleVerification;
  const imageAlt = 'Shubham Pandey — BCA (Honours) student and aspiring IT and software professional';
  const tags = [
    ['name', 'description', config.description], ['name', 'author', config.name],
    ['name', 'robots', preview ? 'noindex, follow' : 'index, follow, max-image-preview:large'],
    ['name', 'application-name', config.siteName],
    ['property', 'og:title', config.title], ['property', 'og:description', config.description],
    ['property', 'og:type', 'website'], ['property', 'og:url', url], ['property', 'og:site_name', config.siteName],
    ['property', 'og:locale', 'en_US'], ['property', 'og:image', url + config.socialImage],
    ['property', 'og:image:type', 'image/jpeg'], ['property', 'og:image:width', '1200'], ['property', 'og:image:height', '630'], ['property', 'og:image:alt', imageAlt],
    ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', config.title],
    ['name', 'twitter:description', config.description], ['name', 'twitter:image', url + config.socialImage], ['name', 'twitter:image:alt', imageAlt],
  ];
  if (verification) tags.push(['name', 'google-site-verification', verification]);
  return [
    '<!-- SEO:START -->', '<title>' + htmlEscape(config.title) + '</title>',
    ...tags.map(([attribute, name, content]) => `<meta ${attribute}="${name}" content="${htmlEscape(content)}">`),
    `<link rel="canonical" href="${url}">`,
    '<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/assets/brand/favicon-32.png" type="image/png" sizes="32x32">',
    '<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png" sizes="180x180">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') + '</script>',
    '<!-- SEO:END -->',
  ].join('\n');
}
function renderSeo(html, options) {
  const block = metadata(options);
  if (!/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/.test(html)) throw new Error('SEO metadata slot is missing.');
  return html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, block);
}
function generate() {
  const root = __dirname, origin = productionOrigin();
  const indexPath = path.join(root, 'index.html');
  fs.writeFileSync(indexPath, renderSeo(fs.readFileSync(indexPath, 'utf8')));
  const mediaSource = fs.readFileSync(path.join(root, 'photography-data.js'), 'utf8');
  const photos = JSON.parse(mediaSource.slice(mediaSource.indexOf('['), mediaSource.lastIndexOf(']') + 1));
  const fallback = '<div class="photo-fallback" aria-label="Photography without JavaScript">' + photos.filter(item => item.type === 'image').map(item =>
    `<figure><a href="${htmlEscape(item.original)}"><img src="${htmlEscape(item.src)}" width="${item.width}" height="${item.height}" loading="lazy" alt="${htmlEscape(item.alt)}"><figcaption>${htmlEscape(item.alt)}</figcaption></a></figure>`).join('\n') + '</div>';
  fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8').replace(/<!-- PHOTO-FALLBACK:START -->[\s\S]*?<!-- PHOTO-FALLBACK:END -->/, '<!-- PHOTO-FALLBACK:START -->' + fallback + '<!-- PHOTO-FALLBACK:END -->'));
  fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /travel-locations.html\n\nSitemap: ${origin}sitemap.xml\n`);
  // There is one indexable document. Section fragments and gallery dialogs are
  // not separate URLs; no fabricated project pages or misleading lastmod dates.
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}</loc></url></urlset>\n`);
  fs.writeFileSync(path.join(root, 'manifest.webmanifest'), JSON.stringify({ name: config.siteName, short_name: 'Shubham', description: config.description, start_url: '/', scope: '/', display: 'browser', lang: 'en', background_color: config.themeColor, theme_color: config.themeColor, icons: [{ src: '/assets/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/assets/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] }, null, 2) + '\n');
  fs.writeFileSync(path.join(root, '404.html'), `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, follow"><meta name="theme-color" content="${config.themeColor}"><title>Page not found | ${config.name}</title><link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml"><style>html{color-scheme:dark}body{margin:0;background:#0c0d10;color:#e7ebf0;font:18px/1.6 system-ui,sans-serif}main{max-width:680px;margin:15vh auto;padding:32px}h1{font-size:clamp(36px,6vw,60px);line-height:1.1}p{color:#a4aab3}a{display:inline-block;color:#96b7df;margin:8px 24px 8px 0}a:focus-visible{outline:2px solid #96b7df;outline-offset:5px}</style></head><body><main><p>404</p><h1>This page could not be found.</h1><p>You can return to Shubham Pandey’s portfolio or explore his skills.</p><nav aria-label="Return to the portfolio"><a href="/">Back to the portfolio</a><a href="/#about">Skills</a><a href="/#contact">Contact</a></nav></main></body></html>\n`);
  console.log('SEO metadata and sitemap prepared for ' + origin);
}
module.exports = { productionOrigin, metadata, renderSeo, generate };
if (require.main === module) generate();
