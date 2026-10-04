import { connectHobbyGallery } from './hobby-gallery.js';
import { deferHobbyModel, connectHobbyMotion } from './hobby-model-runtime.js';
import * as THREE from './node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from './node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { fillPhotographyGallery } from './photography-media.js';

const button = document.querySelector('#photography-camera');
const gallery = document.querySelector('#photography-gallery');
connectHobbyGallery(button, gallery, fillPhotographyGallery);

// Initialize once near the viewport, staggered across idle frames.
deferHobbyModel(button, buildCamera);

function buildCamera() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { button.dataset.hobbyModelFailed='true'; return; } // The existing icon remains a clickable gallery fallback.
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0, 0);
  button.append(renderer.domElement);
  button.classList.add('camera-ready');
  const scene = new THREE.Scene();
  const view = new THREE.PerspectiveCamera(34, 1, .1, 30);
  // A straight-on resting view keeps the camera face centered.
  view.position.set(0, .14, 6.8); view.lookAt(0, .14, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555b72, 2.4));
  const light = new THREE.DirectionalLight(0xffeee0, 3.2); light.position.set(-3, 5, 5); scene.add(light);
  const rim = new THREE.DirectionalLight(0x99bcff, 1.6); rim.position.set(4, 1, -2); scene.add(rim);
  const model = new THREE.Group(); scene.add(model);
  const material = (color, roughness = .5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const cream = material(0xf2dfc7), black = material(0x17191d), trim = material(0x36383b), silver = material(0xb7b5ae, .3, .5);
  function box(w, h, d, x, y, z, mat, radius = .05) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), mat);
    mesh.position.set(x, y, z); model.add(mesh); return mesh;
  }
  function disc(radius, depth, x, y, z, mat) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 40), mat);
    mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); model.add(mesh); return mesh;
  }
  box(2.5, .4, 1.65, 0, -.64, 0, black);
  box(2.45, .12, 1.6, 0, -.38, .02, cream);
  box(2.2, 1.45, .5, 0, .38, -.42, cream, .09);
  box(1.98, 1.35, .36, 0, .44, -.79, black);
  box(2.1, .12, .48, 0, 1.13, -.42, trim);
  box(1.95, .1, .025, 0, -.61, .84, trim, .01);
  box(.48, .77, .06, -.74, .51, -.12, silver);
  for (let i = 0; i < 7; i++) box(.39, .025, .012, -.74, .22 + i * .09, -.08, trim, .003);
  box(.43, .48, .08, .76, .77, -.11, black);
  box(.28, .32, .035, .76, .77, -.055, silver);
  disc(.52, .22, .05, .52, .015, black);
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.46 - i * .058, .023, 8, 48), i % 2 ? black : trim);
    ring.position.set(.05, .52, .15 + i * .024); model.add(ring);
  }
  disc(.19, .025, .05, .52, .28, material(0x171d30, .12, .45));
  disc(.065, .01, -.005, .59, .297, material(0x6b9470, .2, .3));
  disc(.17, .05, -.76, -.08, -.10, silver);
  disc(.125, .06, -.76, -.08, -.06, material(0xdf442e, .3));
  [0xe94542, 0xee8d35, 0xecd348, 0x69a367, 0x5681b8].forEach((color, i) => {
    const mat = material(color);
    box(.055, .42, .014, -.07 + i * .057, -.16, -.157, mat, .003);
    box(.055, .012, 1.12, -.07 + i * .057, -.307, .32, mat, .003);
  });
  box(.62, .2, .09, .34, -.32, .7, black);
  disc(.065, .025, .52, -.33, .76, trim);
  connectHobbyMotion({ button, renderer, scene, view, model });
}
