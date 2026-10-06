import * as THREE from 'three';
import { batmanOutline } from '../batman-emblem.js';

/** Same extruded emblem, finish, and lighting as the portfolio's intro model. */
export function mountOfflineBatman(stage) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch { return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3.2, 3.2, 2.1, -2.1, .1, 30);
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xd5dfec, 0x2c3440, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-4, 5, 6); scene.add(key);
  const edge = new THREE.DirectionalLight(0x8a9fb9, 3);
  edge.position.set(4, 2, -3); scene.add(edge);

  const shape = new THREE.Shape();
  const x = value => (value - 84) / 28, y = value => (73 - value) / 28;
  for (const [command, ...values] of batmanOutline) {
    if (command === 'M') shape.moveTo(x(values[0]), y(values[1]));
    else if (command === 'L') shape.lineTo(x(values[0]), y(values[1]));
    else if (command === 'C') shape.bezierCurveTo(x(values[0]), y(values[1]), x(values[2]), y(values[3]), x(values[4]), y(values[5]));
    else shape.closePath();
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .2646, bevelEnabled: true, bevelThickness: .0315, bevelSize: .045,
    bevelSegments: 3, steps: 1, curveSegments: 24,
  });
  geometry.center();
  const face = new THREE.MeshStandardMaterial({ color: 0x4b6584, metalness: .72, roughness: .28 });
  const side = new THREE.MeshStandardMaterial({ color: 0x344b68, metalness: .8, roughness: .24 });
  const model = new THREE.Mesh(geometry, [face, side]);
  scene.add(model);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, last = 0, lastDraw = 0, angle = 0;
  let disposed = false, visible = true, lost = false;
  let width = 0, height = 0;
  function stop() { cancelAnimationFrame(frame); frame = 0; last = lastDraw = 0; }
  function draw() {
    if (disposed || lost || document.hidden || !visible || !width || !height) return;
    model.rotation.y = reduced.matches ? 0 : angle;
    renderer.render(scene, camera);
    stage.classList.add('offline-batman-ready');
  }
  function tick(time) {
    frame = 0;
    if (disposed || lost || document.hidden || !visible || reduced.matches) return;
    angle = (angle + (last ? Math.min((time - last) / 1000, .05) : 0) * 2.1) % (Math.PI * 2);
    last = time;
    // This small emblem only needs 30 GPU draws per second.
    if (time - lastDraw >= 1000 / 30) { draw(); lastDraw = time; }
    frame = requestAnimationFrame(tick);
  }
  function wake() {
    stop(); draw();
    if (!disposed && !lost && !document.hidden && visible && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (disposed) return;
    const nextWidth = stage.clientWidth, nextHeight = stage.clientHeight;
    if (!nextWidth || !nextHeight || nextWidth === width && nextHeight === height) return;
    width = nextWidth; height = nextHeight;
    renderer.setSize(width, height, false);
    camera.top = 3.2 * height / width; camera.bottom = -camera.top;
    camera.updateProjectionMatrix(); draw();
  }
  function contextLost(event) { event.preventDefault(); lost = true; stop(); stage.classList.remove('offline-batman-ready'); }
  function contextRestored() { lost = false; wake(); }
  function pageHide(event) { if (event.persisted) stop(); else dispose(); }
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; wake(); });
  function dispose() {
    if (disposed) return;
    disposed = true; stop();
    resizeObserver.disconnect(); intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', wake);
    window.removeEventListener('pageshow', wake); window.removeEventListener('pagehide', pageHide);
    reduced.removeEventListener('change', wake);
    canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
    geometry.dispose(); face.dispose(); side.dispose(); renderer.dispose(); renderer.forceContextLoss();
    canvas.remove(); stage.classList.remove('offline-batman-ready');
  }
  resizeObserver.observe(stage); intersectionObserver.observe(stage);
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pageshow', wake); window.addEventListener('pagehide', pageHide);
  reduced.addEventListener('change', wake);
  canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', contextRestored);
  resize(); wake();
  return dispose;
}
