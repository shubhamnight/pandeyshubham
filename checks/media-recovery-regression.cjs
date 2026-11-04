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
  console.log(JSON.stringify({ evidence: 'source-module VM; no browser/device claims', results }, null, 2));
  if (results.some(result => !result.pass)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
