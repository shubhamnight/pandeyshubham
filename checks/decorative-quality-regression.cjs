// Source-module lifecycle checks; no browser, physical-device or GPU claims.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const read = name => process.env.DECORATIVE_REFERENCE
  ? require('node:child_process').execFileSync('git', ['show', process.env.DECORATIVE_REFERENCE + ':' + name], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(path.join(root, name), 'utf8');
function events(extra = {}) {
  const listeners = new Map();
  return Object.assign({ addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type, extra = {}) { for (const fn of [...(listeners.get(type) || [])]) fn({ type, ...extra }); }
  }, extra);
}
function environment(initialDensity = 1.5) {
  let density = initialDensity, next = 0, randomCalls = 0;
  const frames = new Map(), listeners = new Set(), images = [], canvases = [];
  const policy = {
    graphicsPixelRatio(kind) { assert.equal(kind, 'decorative'); return density; },
    observeGraphicsQuality(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reportGraphicsFrame() {},
  };
  const classes = () => ({ add() {}, remove() {}, contains: () => true });
  function canvas() {
    const context = { positions: [], draws: [], transform: [],
      clearRect() { this.positions = []; this.draws = []; }, setTransform(...args) { this.transform = args; },
      translate(...args) { this.positions.push(args); }, drawImage(image) { this.draws.push(image); }, save() {}, restore() {}, scale() {} };
    const value = events({ width: 300, height: 150, clientWidth: 800, clientHeight: 250, context,
      style: {}, setAttribute() {}, getContext: () => context, remove() {} });
    canvases.push(value); return value;
  }
  const document = events({ hidden: false, createElement: () => canvas() }), window = events();
  const preference = events({ matches: false }), observers = [];
  const stage = { clientWidth: 420, clientHeight: 250, classList: classes(), prepend(value) { this.canvas = value; }, append(value) { this.canvas = value; } };
  const math = Object.create(Math); math.random = () => (++randomCalls % 10) / 10;
  const globals = { window, document, policy, devicePixelRatio: 3, Math: math, AbortController, console,
    requestAnimationFrame(fn) { frames.set(++next, fn); return next; }, cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe() {} disconnect() {} },
    IntersectionObserver: class { constructor(fn) { this.fn = fn; } observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} }, matchMedia: () => preference,
    Image: class { constructor() { images.push(this); } removeAttribute(name) { delete this[name]; } },
    fetch: async () => ({ ok: true, json: async () => ({ sprites: [{ x: 0, y: 0, width: 100, height: 160 }, { x: 100, y: 0, width: 90, height: 140 }] }) }),
  };
  return { globals, stage, frames, listeners, images, canvases, observers, policy,
    randomCalls: () => randomCalls,
    quality(value) { density = value; for (const fn of [...listeners]) fn(); },
    step(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(time)); } };
}
async function crowd(importResult = 'Promise.resolve(policy)', density = 1.5) {
  const env = environment(density);
  const source = read('intro-crowd.js').replace("import('./graphics-quality.js')", importResult);
  vm.runInNewContext(source, env.globals, { filename: 'intro-crowd.js' });
  assert.equal(typeof env.globals.window.startIntroCrowd, 'function', 'classic entry registers synchronously');
  const stop = env.globals.window.startIntroCrowd({ ...env.stage, classList: { contains: () => true } });
  await env.images[0].onload(); await Promise.resolve();
  env.step(100); env.step(116);
  return { ...env, stop };
}

(async () => {
  const THREE = await import('three'), outline = { exports: {} };
  vm.runInNewContext(transformSync(read('batman-emblem.js'), { format: 'cjs' }).code, { module: outline, exports: outline.exports });
  const { batmanOutline } = outline.exports;
  const running = await crowd(), canvas = running.canvases[0];
  assert.equal(canvas.width, 1200, 'normal crowd keeps its original 1.5 DPR cap');
  const positions = canvas.context.positions, sprites = canvas.context.draws;
  const randomCalls = running.randomCalls(), queued = running.frames.size;
  running.quality(1);
  assert.equal(canvas.width, 800, 'crowd downshift updates only backing density');
  assert.deepEqual(canvas.context.positions, positions, 'quality change preserves every crowd position and gait phase');
  assert.deepEqual(canvas.context.draws, sprites, 'crowd source sprites stay identical');
  assert.equal(running.randomCalls(), randomCalls, 'quality update must not reshuffle the crowd');
  assert.equal(running.frames.size, queued, 'quality update cannot add or reset the animation clock');
  running.stop(); assert.equal(running.listeners.size, 0); assert.equal(running.frames.size, 0);
  const width = canvas.width; running.quality(.75); assert.equal(canvas.width, width, 'stopped crowd is detached');

  const weak = await crowd('Promise.resolve(policy)', 1);
  assert.equal(weak.canvases[0].width, 800, 'early low tier uses the same crowd assets'); weak.stop();
  const unavailable = await crowd('Promise.reject(Error("Injected optional import failure"))');
  assert.equal(unavailable.canvases[0].width, 1200); assert.ok(unavailable.frames.size, 'optional policy failure cannot gate crowd readiness'); unavailable.stop();
  const pending = environment(); let release;
  pending.globals.pendingPolicy = new Promise(resolve => { release = resolve; });
  vm.runInNewContext(read('intro-crowd.js').replace("import('./graphics-quality.js')", 'pendingPolicy'), pending.globals);
  const stopPending = pending.globals.window.startIntroCrowd({ ...pending.stage, classList: { contains: () => true } });
  await pending.images[0].onload(); pending.step(100); stopPending(); release(pending.policy); await Promise.resolve();
  assert.equal(pending.listeners.size, 0, 'late optional import cannot subscribe after cleanup');

  const env = environment(), module = { exports: {} }; let renderer;
  class Renderer {
    constructor(options) { this.options = options; this.domElement = env.globals.document.createElement('canvas'); this.ratio = 1; this.renders = 0; this.disposals = 0; renderer = this; }
    setPixelRatio(value) { this.ratio = value; } setClearColor() {}
    setDrawingBufferSize(width, height, ratio) { this.ratio = ratio; this.domElement.width = width * ratio; this.domElement.height = height * ratio; }
    setSize(width, height) { this.setDrawingBufferSize(width, height, this.ratio); }
    render(scene) { this.renders++; this.mesh = scene.children.find(child => child.isMesh); }
    dispose() { this.disposals++; } forceContextLoss() {}
  }
  const requireFixture = name => name === 'three' ? { ...THREE, WebGLRenderer: Renderer } : name.endsWith('graphics-quality.js') ? env.policy : { batmanOutline };
  vm.runInNewContext(transformSync(read('lib/offline-batman.js'), { format: 'cjs' }).code,
    { ...env.globals, module, exports: module.exports, require: requireFixture }, { filename: 'offline-batman.js' });
  const dispose = module.exports.mountOfflineBatman(env.stage);
  env.step(100); env.step(150);
  assert.equal(renderer.ratio, 1.5); assert.equal(renderer.options.antialias, true);
  const geometry = renderer.mesh.geometry, material = renderer.mesh.material, angle = renderer.mesh.rotation.y;
  const vertices = geometry.attributes.position.count, frameCount = env.frames.size;
  env.quality(1);
  assert.equal(renderer.ratio, 1, 'offline emblem updates density without a CSS resize');
  assert.equal(renderer.mesh.rotation.y, angle, 'offline downshift does not reset or advance rotation');
  assert.equal(renderer.mesh.geometry, geometry); assert.equal(renderer.mesh.material, material); assert.equal(geometry.attributes.position.count, vertices);
  assert.equal(env.frames.size, frameCount, 'offline density update preserves the existing clock');
  renderer.domElement.emit('webglcontextlost', { preventDefault() {} });
  const draws = renderer.renders; env.quality(.75);
  assert.equal(renderer.ratio, 1); assert.equal(renderer.renders, draws, 'lost WebGL context defers density changes');
  renderer.domElement.emit('webglcontextrestored'); assert.equal(renderer.ratio, .75);
  dispose(); dispose(); assert.equal(renderer.disposals, 1); assert.equal(env.listeners.size, 0); assert.equal(env.frames.size, 0);
  env.quality(1); assert.equal(renderer.ratio, .75, 'disposed offline renderer cannot resize');
  console.log('Decorative source contracts passed: crowd density/phase/readiness/late-import cleanup and offline density/geometry/rotation/context-loss/disposal. No browser/GPU/device claims.');
})().catch(error => { console.error(error); process.exitCode = 1; });
