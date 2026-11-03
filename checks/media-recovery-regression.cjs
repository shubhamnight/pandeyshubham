// Deterministic source-module contracts, not browser or physical-device evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function events(extra = {}) {
  const listeners = new Map();
  return Object.assign({
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type, detail = {}) {
      for (const fn of [...(listeners.get(type) || [])]) fn({ type, ...detail });
    }
  }, extra);
}
function clock() {
  let now = 0, next = 0;
  const timers = new Map();
  return {
    pending: () => timers.size,
    setTimeout(fn, delay = 0) { const id = ++next; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    async tick(ms) {
      const end = now + ms;
      for (let i = 0; i < 100; i++) {
        const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) { now = end; await flush(); return; }
        now = due[1].at; timers.delete(due[0]); due[1].fn(); await flush();
      }
      throw Error('Unexpected retry loop');
    }
  };
}
function load(file, globals, names) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/\bexport (const|function)/g, '$1');
  return vm.runInNewContext(source + '\n;({' + names.join(',') + '})', globals, { filename: file });
}
function environment() {
  const timers = clock(), classes = new Set();
  const document = events({ hidden: false, body: { classList: { contains: name => classes.has(name) } } });
  return { ...timers, timers, document, window: events(), navigator: { onLine: true },
    URL, Symbol, AbortController, DOMException, classes,
    location: { href: 'https://portfolio.example/', origin: 'https://portfolio.example' } };
}
function reconnect(env) {
  env.window.emit('online'); env.window.emit('pageshow'); env.document.emit('visibilitychange');
}
async function manifest(stall, touchPerformance = true) {
  const env = environment(), requests = [], aborted = [];
  let release;
  const retryGate = new Promise(resolve => { release = resolve; });
  env.touchPerformance = touchPerformance;
  env.fetch = async (url, options = {}) => {
    const index = requests.length;
    requests.push(String(url));
    const pending = () => new Promise((resolve, reject) => {
      const abort = () => { aborted.push(index); reject(new DOMException('Timed out', 'AbortError')); };
      if (options.signal?.aborted) abort();
      else options.signal?.addEventListener('abort', abort, { once: true });
    });
    if (index === 0 && stall === 'fetch') return pending();
    if (index > 0) await retryGate;
    return { ok: true, json: () => index === 0 && stall === 'json' ? pending() :
      Promise.resolve({ files: { 'image.webp': 'mobile.webp' }, previews: {} }) };
  };
  const api = load('mobile-media.js', env, ['mobileMediaReady', 'mobileMediaSource']);
  await flush();
  return { env, requests, aborted, api, release };
}
function previews(mediaElement) {
  const env = environment(), observers = [], mutations = [], slots = Array.from({ length: 3 }, () => events({
    surface: { children: [], replaceChildren(element) { this.children = [element]; } },
    querySelector() { return this.surface; }
  }));
  const section = { querySelectorAll: () => slots };
  env.document.querySelector = () => section;
  env.matchMedia = () => events({ matches: false });
  env.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {} disconnect() {}
  };
  env.MutationObserver = class {
    constructor(callback) { this.callback = callback; mutations.push(this); }
    observe() {} disconnect() {}
  };
  const api = load('hobby-media-runtime.js', env, ['connectHobbyPreviews']);
  let next = 0;
  api.connectHobbyPreviews('.test', () => ({ type: 'image', id: ++next }), mediaElement, () => {});
  observers[0].callback([{ isIntersecting: true }]);
  const count = () => slots.map(slot => slot.surface.children.length);
  return { env, slots, observers, mutations, count };
}
const results = [];
async function check(name, run) {
  try { await run(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, error: error.message }); }
}
(async () => {
  for (const stall of ['fetch', 'json']) await check('mobile hung ' + stall + ' expires and recovers once', async () => {
    const { env, requests, aborted, api, release } = await manifest(stall);
    reconnect(env); await flush();
    assert.equal(requests.length, 1, 'pending recovery events must deduplicate');
    await env.timers.tick(7999);
    assert.equal(aborted.length, 0, 'manifest request remains active before its 8s deadline');
    assert.equal(requests.length, 1);
    await env.timers.tick(1);
    assert.equal(aborted.length, 1, 'manifest fetch or JSON body expires at exactly 8s');
    reconnect(env); await flush();
    assert.equal(requests.length, 2, 'expired manifest request permits recovery');
    assert.equal(aborted.length, 1, 'deadline cancels the stalled fetch or JSON body');
    reconnect(env); reconnect(env); await flush();
    assert.equal(requests.length, 2, 'recovery events share the pending retry');
    release(); await flush();
    assert.equal(api.mobileMediaSource('image.webp'), 'mobile.webp');
    reconnect(env); await flush();
    assert.equal(requests.length, 2, 'recovered mapping must not refetch');
    await api.mobileMediaReady;
  });
  await check('desktop never requests mobile manifest', async () => {
    const { env, requests, api } = await manifest('fetch', false);
    reconnect(env); await env.timers.tick(30000); await api.mobileMediaReady;
    assert.equal(requests.length, 0);
    assert.equal(api.mobileMediaSource('image.webp'), 'image.webp');
  });
  await check('leaving permanently aborts manifest work and detaches recovery', async () => {
    const { env, requests, aborted } = await manifest('fetch');
    env.window.emit('pagehide', { persisted: false }); await flush();
    reconnect(env); await env.timers.tick(30000);
    assert.equal(aborted.length, 1, 'permanent pagehide aborts the active manifest request');
    assert.equal(requests.length, 1, 'disposed page cannot start a recovery request');
  });
  await check('failed initial preview recovers without orbit and retains loaded nodes', async () => {
    let first = true;
    const harness = previews(item => ({ item, src: 'https://portfolio.example/photo.webp',
      decode: () => first ? (first = false, Promise.reject(Error('Injected image 503'))) : Promise.resolve()
    }));
    await flush();
    assert.deepEqual(harness.count(), [0, 1, 1]);
    const kept = harness.slots.slice(1).map(slot => slot.surface.children[0]);
    reconnect(harness.env); await harness.env.timers.tick(5000); await flush();
    assert.deepEqual(harness.count(), [1, 1, 1], 'failed empty preview must recover without hobby-cycle');
    kept.forEach((element, index) => assert.equal(harness.slots[index + 1].surface.children[0], element));
    assert.equal(harness.slots[0].surface.children[0].item.id, 1, 'retry retains the selected preview');
    assert.equal(new URL(harness.slots[0].surface.children[0].src).searchParams.get('preview-retry'), '1');
  });
  await check('hung initial decode expires and recovers without a late overwrite', async () => {
    let first = true, release;
    const images = [];
    const harness = previews(item => {
      const image = { item, src: 'https://portfolio.example/photo.webp', removed: [],
        removeAttribute(name) { this.removed.push(name); delete this[name]; },
        decode: () => first ? (first = false, new Promise(resolve => { release = resolve; })) : Promise.resolve()
      };
      images.push(image); return image;
    });
    await flush(); const kept = harness.slots.slice(1).map(slot => slot.surface.children[0]);
    await harness.env.timers.tick(7999);
    assert.deepEqual(harness.count(), [0, 1, 1]);
    assert.deepEqual(images[0].removed, [], 'pending decode is retained before its 8s deadline');
    await harness.env.timers.tick(1);
    assert.ok(images[0].removed.includes('src'), 'pending decode is cancelled at exactly 8s');
    await harness.env.timers.tick(250);
    assert.deepEqual(harness.count(), [1, 1, 1], 'hung detached image must expire and recover');
    const recovered = harness.slots[0].surface.children[0];
    assert.equal(recovered.item.id, 1, 'decode timeout retries the same selected image');
    assert.ok(images[0].removed.includes('src'), 'expired detached image request is released');
    release(); await flush();
    assert.equal(harness.slots[0].surface.children[0], recovered);
    kept.forEach((image, index) => assert.equal(harness.slots[index + 1].surface.children[0], image));
    assert.equal(harness.env.pending(), 0, 'successful recovery clears decode and retry timers');
  });
  for (const action of ['cycle', 'dispose']) await check(action + ' cancels pending decode deadline and detached request', async () => {
    let release, hung;
    const harness = previews(item => {
      const image = { item, released: false, removeAttribute() { this.released = true; },
        decode: () => item.id === 1 ? new Promise(resolve => { release = resolve; }) : Promise.resolve()
      };
      if (item.id === 1) hung = image;
      return image;
    });
    await flush();
    if (action === 'cycle') harness.slots[0].emit('hobby-cycle');
    else harness.env.window.emit('pagehide', { persisted: false });
    await flush();
    assert.ok(hung.released, 'superseded/disposed pending request must be released');
    assert.equal(harness.env.pending(), 0, 'pending decode deadline is cancelled');
    const selected = harness.slots[0].surface.children[0];
    release(); await flush(); await harness.env.timers.tick(30000);
    assert.equal(harness.slots[0].surface.children[0], selected, 'late decode cannot write after cancellation');
  });
  await check('permanent image failures have bounded retries without a polling loop', async () => {
    let calls = 0;
    const harness = previews(() => { calls++; return { decode: () => Promise.reject(Error('503')) }; });
    await flush(); await harness.env.timers.tick(10000);
    assert.equal(calls, 9, 'three initial images have at most two retries each');
    harness.mutations[0].callback(); await harness.env.timers.tick(10000);
    assert.equal(calls, 9, 'body-class wakeups cannot restart an exhausted retry loop');
  });
  await check('later online recovery restarts exhausted preview budget for the same item', async () => {
    let outage = true, calls = 0;
    const harness = previews(item => { calls++; return { item,
      decode: () => item.id === 1 && outage ? Promise.reject(Error('Extended outage')) : Promise.resolve()
    }; });
    await flush(); await harness.env.timers.tick(10000);
    assert.equal(calls, 5, 'only the failed image consumes two bounded retries');
    const kept = harness.slots.slice(1).map(slot => slot.surface.children[0]);
    outage = false; harness.mutations[0].callback(); await harness.env.timers.tick(10000);
    assert.equal(calls, 5, 'class changes cannot poll an exhausted image');
    harness.env.window.emit('online'); await harness.env.timers.tick(5000);
    assert.deepEqual(harness.count(), [1, 1, 1], 'a later connection recovery repairs the empty preview');
    assert.equal(harness.slots[0].surface.children[0].item.id, 1);
    kept.forEach((element, index) => assert.equal(harness.slots[index + 1].surface.children[0], element));
  });
  await check('failed replacement preserves decoded media', async () => {
    let fail = false;
    const harness = previews(item => ({ item, decode: () => fail ? Promise.reject(Error('503')) : Promise.resolve() }));
    await flush(); const kept = harness.slots[0].surface.children[0]; fail = true;
    harness.slots[0].emit('hobby-cycle'); await flush();
    assert.equal(harness.slots[0].surface.children[0], kept);
  });
  await check('late preview decode cannot overwrite a newer cycle', async () => {
    let release;
    const harness = previews(item => ({ item, decode: () => item.id === 1 ?
      new Promise(resolve => { release = resolve; }) : Promise.resolve() }));
    await flush(); harness.slots[0].emit('hobby-cycle'); await flush();
    const newer = harness.slots[0].surface.children[0];
    release(); await flush();
    assert.equal(harness.slots[0].surface.children[0], newer);
    assert.equal(newer.item.id, 4);
  });
  await check('stale preview failure cannot schedule recovery over a newer cycle', async () => {
    let reject;
    const harness = previews(item => ({ item, decode: () => item.id === 1 ?
      new Promise((resolve, failure) => { reject = failure; }) : Promise.resolve() }));
    await flush(); harness.slots[0].emit('hobby-cycle'); await flush();
    const newer = harness.slots[0].surface.children[0]; reject(Error('Late failed request')); await flush();
    reconnect(harness.env); await harness.env.timers.tick(5000);
    assert.equal(harness.slots[0].surface.children[0], newer);
  });
  await check('failed previews do not retry while hidden or after disposal', async () => {
    let calls = 0;
    const harness = previews(() => { calls++; return { decode: () => Promise.reject(Error('503')) }; });
    await flush(); harness.env.document.hidden = true;
    reconnect(harness.env); await harness.env.timers.tick(5000);
    assert.equal(calls, 3, 'hidden page must not fetch retry images');
    harness.env.document.hidden = false; reconnect(harness.env);
    harness.env.window.emit('pagehide', { persisted: false });
    await harness.env.timers.tick(5000); reconnect(harness.env); await harness.env.timers.tick(5000);
    assert.equal(calls, 3, 'permanent pagehide cancels pending retry timers and recovery listeners');
  });
  await check('hidden and modal-covered previews cannot play videos', async () => {
    const players = [];
    const harness = previews(() => {
      const player = { playing: false, play() { this.playing = true; return Promise.resolve(); },
        pause() { this.playing = false; }, resize() {}, dispose() {} };
      players.push(player); return { decode: () => Promise.resolve(), videoPlayback: player };
    });
    await flush();
    harness.observers[1].callback(harness.slots.map(target => ({ target, isIntersecting: true })));
    assert.ok(players.every(player => player.playing));
    harness.env.document.hidden = true; harness.env.document.emit('visibilitychange');
    assert.ok(players.every(player => !player.playing));
    harness.env.document.hidden = false; harness.env.classes.add('photography-gallery-open'); reconnect(harness.env);
    assert.ok(players.every(player => !player.playing));
    harness.env.classes.clear(); reconnect(harness.env);
    assert.ok(players.every(player => player.playing));
  });
  console.log(JSON.stringify({ evidence: 'source-module VM; no browser/device claims', results }, null, 2));
  if (results.some(result => !result.pass)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
