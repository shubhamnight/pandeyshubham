// Read-only regressions for the edited media pipeline and Travel playback.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Readable } = require('node:stream');
const { transformSync } = require('esbuild');
const root = __dirname;
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function moduleFrom(name, globals = {}) {
  const module = { exports: {} };
  const code = transformSync(fs.readFileSync(path.join(root, name), 'utf8'), { loader: 'js', format: 'cjs' }).code;
  vm.runInNewContext(code, { module, exports: module.exports, ...globals }, { filename: name });
  return module.exports;
}
function asset(url) {
  if (!url || /^(?:https?:|data:)/.test(url)) return;
  check(fs.existsSync(path.join(root, decodeURIComponent(url))), 'Media exists: ' + url);
}
function media(items) {
  for (const item of items) {
    for (const field of ['src', 'original', 'preview', 'poster', 'gallerySrc', 'fullSrc', 'overlayImage']) asset(item[field]);
    for (const source of (item.srcset || item.srcSet || '').split(',').filter(Boolean)) asset(source.trim().split(/\s+/)[0]);
    for (const source of item.sources || item.overlaySources || []) asset(source.src);
  }
}
async function run() {
  const travel = moduleFrom('travel-data.js').travelImages;
  media(travel); media(moduleFrom('photography-data.js').photographyPhotos);
  media(moduleFrom('gaming-data.js').gamingImages); media(moduleFrom('music-overlay-data.js').musicCards);
  const state = JSON.parse(fs.readFileSync(path.join(root, 'media-library.json'), 'utf8'));
  const merge = moduleFrom('media-library.js', { require: () => ({ mediaLibrary: state }) }).applyMediaEdits;
  const mergedTravel = merge('travel', travel);
  check(mergedTravel.filter(item => item.type === 'video').length === 4, 'All four Travel videos survive image edits');
  media(mergedTravel); media(merge('photography', moduleFrom('photography-data.js').photographyPhotos));
  for (const category of ['photography', 'travel']) {
    for (const edit of Object.values(state[category])) {
      for (const name of ['crop', 'backdropCrop']) {
        const crop = edit[name]; if (!crop) continue;
        check(crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0 && crop.x + crop.width <= 1.000001 && crop.y + crop.height <= 1.000001, 'Saved crop stays inside its source');
      }
    }
  }
  const document = { createElement(tag) { return { tag, children: [], attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener() {}, append(...nodes) { this.children.push(...nodes); } }; } };
  const player = moduleFrom('travel-video-player.js', { document });
  for (const item of travel.filter(item => item.type === 'video')) {
    const ratio = player.travelVideoFrameRatio(item);
    check(ratio === (item.poster === 'assets/travel/15-poster.webp' ? 4 / 3 : 9 / 16), 'Correct Travel video frame ratio');
    const native = player.createTravelVideoPlayer(item);
    check(native.children.length === 1 && native.children[0].tag === 'video', 'No playback control elements');
    const video = native.children[0];
    check(video.loop && video.muted && video.playsInline && !video.controls, 'Silent inline looping playback');
    check(!player.createTravelVideoPlayer(item, { deferSource: true }).children[0].src, 'Distant video sources stay deferred');
  }
  const calls = [];
  const labels = moduleFrom('travel-location-label.js', { fetch: async url => {
    calls.push(url); return { ok: url !== '/api/travel-locations', json: async () => ({ named: 'New Delhi', unnamed: '', invalid: 12 }) };
  } });
  await labels.locationsReady;
  check(calls.includes('./travel-locations.json') && labels.travelLocations.named === 'New Delhi', 'Location labels recover from an unavailable API');
  check(!Object.hasOwn(labels.travelLocations, 'unnamed') && !Object.hasOwn(labels.travelLocations, 'invalid'), 'Only explicit valid location names are retained');
  // Invalid requests must not alter the user's image library.
  const before = fs.readFileSync(path.join(root, 'media-library.json'), 'utf8');
  const req = Readable.from([JSON.stringify({ category: 'travel', id: travel[0].original, action: 'save', alt: 'Test', crop: { x: 0, y: 0, width: 2, height: 1 } })]);
  req.method = 'POST'; req.headers = { host: 'localhost:3000', origin: 'http://localhost:3000', 'content-type': 'application/json' }; req.socket = { remoteAddress: '127.0.0.1' };
  const res = { writeHead(status) { this.status = status; }, end(value) { this.body = value; } };
  await require('./lib/media-manager.cjs')(req, res);
  check(res.status === 400, 'Out-of-bounds crops are rejected');
  check(fs.readFileSync(path.join(root, 'media-library.json'), 'utf8') === before, 'Rejected edits leave the library untouched');
  const handlers = {}, offlinePage = { offline: true };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'lib/offline-worker.js'), 'utf8'), {
    self: { location: { origin: 'http://localhost:3000' }, addEventListener: (name, handler) => { handlers[name] = handler; } },
    CACHE_NAME: 'test-only', OFFLINE_ASSETS: ['/offline.html'], URL, AbortController, setTimeout, clearTimeout,
    fetch: async () => { throw Error('Offline'); }, caches: { open: async () => ({ match: async () => offlinePage }) },
    Response: { error: () => null },
  });
  let fallback;
  handlers.fetch({ request: { method: 'GET', url: 'http://localhost:3000/', mode: 'navigate' }, respondWith: value => { fallback = value; } });
  check(await fallback === offlinePage, 'Offline navigation falls back to the cached page');
  let intercepted = false;
  handlers.fetch({ request: { method: 'POST', url: 'http://localhost:3000/api/media-manager', mode: 'cors' }, respondWith: () => { intercepted = true; } });
  check(!intercepted, 'Offline worker does not intercept image saves');
  console.log(checks + ' media assets, crop, caption and silent-playback checks passed.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
