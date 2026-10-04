import { connectHobbyGallery } from './hobby-gallery.js';
import { deferHobbyModel, connectHobbyMotion } from './hobby-model-runtime.js';
import * as THREE from './node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from './node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { fillMusicGallery } from './music-records.js';

const button = document.querySelector('#music-walkman');
const gallery = document.querySelector('#music-gallery');
connectHobbyGallery(button, gallery, fillMusicGallery);

// Initialize once near the viewport, staggered across idle frames.
deferHobbyModel(button, buildWalkman);

function buildWalkman() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { button.dataset.hobbyModelFailed='true'; return; } // The existing icon remains a clickable gallery fallback.
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0, 0);
  button.append(renderer.domElement);
  button.classList.add('camera-ready');
  const scene = new THREE.Scene();
  const view = new THREE.PerspectiveCamera(34, 1, .1, 30);
  // A near-frontal, level view keeps the player upright with a little depth.
  view.position.set(0, .34, 7.2); view.lookAt(0, .19, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x353d50, 1.8));
  const light = new THREE.DirectionalLight(0xfff5ed, 2.6); light.position.set(-3, 5, 5); scene.add(light);
  const rim = new THREE.DirectionalLight(0xc5d8ff, 2); rim.position.set(4, 1, -2); scene.add(rim);
  const model = new THREE.Group(); scene.add(model);
  const material = (color, roughness = .5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const navy=material(0x182441,.5), black=material(0x11151a,.55), gray=material(0x69716f,.57,.2);
  const metal=material(0xb1b8b6,.28,.65), orange=material(0xf2a020,.94), cassette=material(0xaaa996,.74);
  // Static grain gives the pads and enclosure their fabric/plastic surface.
  const grain=new Uint8Array(128*128*4);let seed=23;
  for(let i=0;i<grain.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;grain[i]=grain[i+1]=grain[i+2]=90+(seed>>>25);grain[i+3]=255;}
  const grainMap=new THREE.DataTexture(grain,128,128);grainMap.wrapS=grainMap.wrapT=THREE.RepeatWrapping;grainMap.repeat.set(6,6);grainMap.needsUpdate=true;
  orange.bumpMap=grainMap;orange.bumpScale=.023;gray.bumpMap=grainMap;gray.bumpScale=.006;
  function box(w,h,d,x,y,z,mat,r=.025){
    const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),mat);mesh.position.set(x,y,z);model.add(mesh);return mesh;
  }
  function disc(radius,depth,x,y,z,mat){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,40),mat);
    mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);model.add(mesh);return mesh;
  }
  function tube(points,r,mat,segments=48){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,r,8,false),mat);model.add(mesh);return mesh;
  }
  function text(value,x,y,z,width,color='#d3d6cf',font='Arial',weight='600'){
    const canvas=document.createElement('canvas');canvas.height=128;
    const c=canvas.getContext('2d'),type=weight+' 76px '+font;c.font=type;canvas.width=Math.ceil(c.measureText(value).width)+20;
    c.font=type;c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(value,canvas.width/2,66);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*128/canvas.width),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));mesh.position.set(x,y,z);model.add(mesh);return mesh;
  }
  // The player has a separate front lid, silver edge and darker rear enclosure.
  box(1.62,2.56,.66,-.12,-.28,0,gray,.055);
  box(1.35,2.51,.055,-.28,-.28,.357,navy,.018);
  box(1.35,.45,.059,-.28,.745,.36,navy,.014);
  box(1.32,.014,.008,-.28,.518,.396,black,.003);
  box(.22,2.51,.08,.51,-.28,.375,metal,.012);
  box(.105,2.5,.64,.68,-.28,.004,gray,.015);
  text('SONY',-.49,.32,.40,.61,'#c2c6c0','Georgia','700');
  text('WALKMAN',-.38,-1.32,.40,.68,'#bac0ba','Arial','700');
  // A real cassette under a clear cover: colored label, tape reels and hubs.
  box(.49,1.48,.014,-.46,-.57,.400,metal,.017);
  box(.441,1.425,.009,-.46,-.57,.412,cassette,.012);
  box(.061,1.37,.012,-.635,-.57,.421,material(0xb46c6b,.8),.004);
  const tape=material(0x655d4c,.8),hubMat=material(0xd0d0bc,.6);
  const teeth=new THREE.InstancedMesh(new THREE.BoxGeometry(.013,.032,.012),hubMat,24);
  const pose=new THREE.Object3D();let toothIndex=0;
  [-.13,-1.01].forEach(y=>{
    disc(.144,.009,-.44,y,.423,tape);
    disc(.098,.012,-.44,y,.434,hubMat);
    disc(.059,.013,-.44,y,.444,gray);
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2;pose.position.set(-.44+Math.cos(a)*.068,y+Math.sin(a)*.068,.453);pose.rotation.z=a-Math.PI/2;pose.updateMatrix();teeth.setMatrixAt(toothIndex++,pose.matrix);
    }
  });model.add(teeth);
  box(.11,.52,.009,-.44,-.57,.428,tape,.012);
  const tapeLabel=text('STEREO CASSETTE',-.635,-.59,.439,.89,'#e6ddd3','Arial','500');tapeLabel.rotation.z=Math.PI/2;
  const cover=new THREE.MeshPhysicalMaterial({color:0xcbd8da,roughness:.19,transparent:true,opacity:.13,depthWrite:false,clearcoat:1});
  box(.454,1.43,.007,-.46,-.57,.469,cover,.012);
  // Molded eject arrow on the front lid.
  const arrow=new THREE.Shape();arrow.moveTo(-.021,-.12);arrow.lineTo(.021,-.12);arrow.lineTo(.021,.035);arrow.lineTo(.052,.035);arrow.lineTo(0,.12);arrow.lineTo(-.052,.035);arrow.lineTo(-.021,.035);arrow.closePath();
  const eject=new THREE.Mesh(new THREE.ShapeGeometry(arrow),metal);eject.position.set(.075,-.60,.405);model.add(eject);
  disc(.020,.009,.525,-.82,.427,material(0xb8ba8d,.5));
  // Top stop control, headphone plug, tape transport switches and right-side ribs.
  box(.29,.11,.19,-.52,1.035,.09,material(0xf2af28,.65),.007);
  for(let i=0;i<6;i++)box(.26,.009,.006,-.52,1.00+i*.012,.19,material(0xd99013,.7),.002);
  const plug=disc(.055,.31,-.06,1.16,0,black);plug.rotation.x=0;
  disc(.036,.10,-.06,1.34,0,black).rotation.x=0;
  for(let i=0;i<4;i++){
    const key=box(.075,.12,.27,.774,.83-i*.21,-.04,metal,.015);
    box(.013,.09,.23,.819,.83-i*.21,-.04,gray,.004);
  }
  const sideRibs=new THREE.InstancedMesh(new THREE.BoxGeometry(.013,.006,.50),black,52);
  for(let i=0;i<52;i++){pose.position.set(.739,-1.46+i*.045,-.04);pose.rotation.set(0,0,0);pose.updateMatrix();sideRibs.setMatrixAt(i,pose.matrix);}model.add(sideRibs);
  box(.012,.85,.16,.76,-.24,.09,material(0x9ca96a,.8),.003);
  for(let i=0;i<15;i++)box(.018,.006,.16,.771,-.65+i*.054,.09,gray,.002);
  const port=disc(.055,.02,.778,-1.17,-.14,black);port.rotation.y=Math.PI/2;
  // Headphones sit behind the Walkman: flat padded band, sprung steel rails.
  const bandShape=new THREE.Shape();
  for(let i=0;i<=64;i++){const a=i/64*Math.PI;const x=Math.cos(a)*1.40,y=.28+Math.sin(a)*1.60;if(i===0)bandShape.moveTo(x,y);else bandShape.lineTo(x,y);}
  for(let i=64;i>=0;i--){const a=i/64*Math.PI;bandShape.lineTo(Math.cos(a)*1.33,.28+Math.sin(a)*1.52);}bandShape.closePath();
  const band=new THREE.Mesh(new THREE.ExtrudeGeometry(bandShape,{depth:.12,bevelEnabled:true,bevelSize:.013,bevelThickness:.012,bevelSegments:2,curveSegments:16}),black);band.position.z=-.36;model.add(band);
  [-1,1].forEach(side=>{
    tube([[side*1.04,1.85,-.28],[side*1.34,1.08,-.29],[side*1.39,.12,-.31],[side*1.25,-.60,-.18]],.021,metal);
    const slider=box(.15,.47,.19,side*1.37,.52,-.30,black,.027);slider.rotation.z=side*.12;
    const yoke=box(.13,.33,.18,side*1.22,-.63,-.13,metal,.025);yoke.rotation.z=-side*.12;
    const cup=disc(.35,.15,side*1.21,-.85,-.04,metal);cup.rotation.set(0,0,Math.PI/2);
    const cupBack=disc(.285,.018,side*1.30,-.85,-.04,gray);cupBack.rotation.set(0,0,Math.PI/2);
    const pad=new THREE.Mesh(new THREE.TorusGeometry(.265,.115,18,56),orange);
    pad.rotation.y=Math.PI/2;pad.position.set(side*1.10,-.85,-.04);model.add(pad);
    const padCenter=disc(.207,.046,side*1.095,-.85,-.04,material(0x7f5e25,.94));padCenter.rotation.set(0,0,Math.PI/2);
  });
  // A single continuous cable loops from the jack to the right earcup, with
  // a short second branch for the left earcup. It follows the model as a unit.
  tube([[-.06,1.38,0],[-.04,1.78,-.02],[.12,1.72,-.02],[.14,.65,-.30],[.73,-1.45,-.40],[1.42,-1.50,-.1],[1.30,-1.03,-.03]],.015,black,80);
  tube([[-1.21,-1.10,-.04],[-1.25,-1.22,-.04],[-.90,-1.30,-.28],[-.55,-.85,-.36]],.014,black);
  // A critically damped spring follows movement with restrained, symmetric
  // sway. There is no permanent roll offset or decorative leftward lean.
  const axes=['x','y','z'],velocity=new Float64Array(3);
  const targets=new Float64Array(3),angles=new Float64Array(3);
  function orientModel(orbiting,motion,x,y,z,blend,dt){
    targets[0]=orbiting?(motion?.pitch||0)*.55:x;
    targets[1]=orbiting?(motion?.yaw||0)*.65:y;
    targets[2]=orbiting?(motion?.roll||0)*.35:z;
    const frequency=orbiting?8:12,decay=Math.exp(-frequency*dt);
    let errorSum=0;
    for(let i=0;i<3;i++){
      const error=model.rotation[axes[i]]-targets[i];
      const impulse=velocity[i]+frequency*error;
      angles[i]=targets[i]+(error+impulse*dt)*decay;
      velocity[i]=(velocity[i]-frequency*impulse*dt)*decay;
      errorSum+=Math.abs(angles[i]-targets[i])+Math.abs(velocity[i]);
    }
    const settled=errorSum<.0004;
    if(settled){angles.set(targets);velocity.fill(0);}
    model.rotation.set(angles[0],angles[1],angles[2]);
    return settled;
  }
  connectHobbyMotion({ button, renderer, scene, view, model, orientModel });
}
