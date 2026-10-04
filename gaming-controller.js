import { connectHobbyGallery } from './hobby-gallery.js';
import { deferHobbyModel, connectHobbyMotion } from './hobby-model-runtime.js';
import * as THREE from './node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from './node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { fillGamingGallery } from './gaming-media.js';

const button = document.querySelector('#gaming-controller');
const gallery = document.querySelector('#gaming-gallery');
connectHobbyGallery(button, gallery, fillGamingGallery);

// Initialize once near the viewport, staggered across idle frames.
deferHobbyModel(button, buildController);

function buildController() {
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
  // A straight-on resting view keeps the camera face centered.
  view.position.set(0, -.12, 8.0); view.lookAt(0, -.12, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x353d50, 1.8));
  const light = new THREE.DirectionalLight(0xfff5ed, 2.6); light.position.set(-3, 5, 5); scene.add(light);
  const rim = new THREE.DirectionalLight(0xc5d8ff, 2); rim.position.set(4, 1, -2); scene.add(rim);
  const model = new THREE.Group(); scene.add(model);
  const material = (color, roughness = .5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const shell = material(0x12366b,.52), seam = material(0x081c38,.65);
  const rubber = material(0x363940,.87), buttonMat = material(0x24272e,.38);
  const grain=new Uint8Array(64*64*4);let seed=43;
  for(let i=0;i<grain.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;grain[i]=grain[i+1]=grain[i+2]=100+(seed>>>27);grain[i+3]=255;}
  const grainMap=new THREE.DataTexture(grain,64,64);
  grainMap.wrapS=grainMap.wrapT=THREE.RepeatWrapping;
  grainMap.magFilter=grainMap.minFilter=THREE.LinearFilter;
  grainMap.repeat.set(9,9);grainMap.needsUpdate=true;
  shell.bumpMap=grainMap;shell.bumpScale=.004;
  rubber.bumpMap=grainMap;rubber.bumpScale=.012;
  function box(w,h,d,x,y,z,mat,r=.06){
    const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,r),mat);
    mesh.position.set(x,y,z);model.add(mesh);return mesh;
  }
  const sphereGeometry=new THREE.SphereGeometry(1,40,24);
  function oval(x,y,z,sx,sy,sz,mat){
    const mesh=new THREE.Mesh(sphereGeometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);model.add(mesh);return mesh;
  }
  function disc(radius,depth,x,y,z,mat){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,48),mat);
    mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);model.add(mesh);return mesh;
  }
  function line(points,x,y,z,color){
    const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p[0]+x,p[1]+y,z)));
    const mat=new THREE.LineBasicMaterial({color});model.add(new THREE.Line(geometry,mat));
  }
  function label(text,x,y,z,width,color='#d4d5da',font='Arial',weight='500'){
    const canvas=document.createElement('canvas');canvas.height=128;
    const ctx=canvas.getContext('2d');const type=weight+' 76px '+font;
    ctx.font=type;canvas.width=Math.ceil(ctx.measureText(text).width)+24;
    ctx.fillStyle=color;ctx.font=type;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,67);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*canvas.height/canvas.width),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
    mesh.position.set(x,y,z);model.add(mesh);return mesh;
  }
  // A compact classic center bridge joins two round control pods and long grips.
  box(2.75,1.20,.66,0,.17,-.08,shell,.18);
  // Tapered molded handles: a broad shoulder, slimmer lower grip and rounded
  // end. The previous ellipsoids also angled inward instead of outward.
  const gripProfile = [
    [0,-1.04],[.20,-1.02],[.34,-.93],[.405,-.79],
    [.445,-.60],[.47,-.35],[.49,-.06],[.51,.25],
    [.52,.48],[.46,.70],[.30,.86],[0,.92]
  ];
  const gripCurve = new THREE.SplineCurve(gripProfile.map(([r,y])=>new THREE.Vector2(r,y)));
  const gripGeometry = new THREE.LatheGeometry(gripCurve.getPoints(64).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),48);
  [-1,1].forEach(side=>{
    const grip=new THREE.Mesh(gripGeometry,shell);
    grip.position.set(side*1.46,-.44,-.14);
    grip.scale.z=.78;
    grip.rotation.z=side*.20;
    model.add(grip);
    grip.updateMatrix();
    // The join follows the handle surface so it cannot float beside the grip.
    const gripJoin=new THREE.CatmullRomCurve3(gripProfile.slice(2,10).map(([r,y])=>new THREE.Vector3(side*r,y,0).applyMatrix4(grip.matrix)));
    model.add(new THREE.Mesh(new THREE.TubeGeometry(gripJoin,36,.006,5,false),seam));
    oval(side*1.23,.35,-.02,.87,.83,.32,shell);
    const front=disc(.744,.085,side*1.23,.35,.26,shell);
    // A fine concentric join separates each molded face from the lower shell.
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.75,.012,8,64),seam);
    rim.position.set(side*1.23,.35,.292);model.add(rim);
    const shoulder=box(.55,.24,.4,side*1.21,1.12,-.17,seam,.085);
    shoulder.rotation.z=-side*.10;
    const trigger=box(.54,.26,.34,side*1.21,1.02,-.44,seam,.09);
    trigger.rotation.x=-.25;
    label(side<0?'L':'R',side*1.21,1.14,.044,.07,'#5b5f66');
    // The sticks sit in separate circular housings beneath the control pods.
    oval(side*.64,-.35,.03,.51,.51,.3,shell);
    disc(.352,.04,side*.64,-.35,.307,seam);
    disc(.27,.14,side*.64,-.35,.40,seam);
    const cap=oval(side*.64,-.35,.485,.276,.276,.055,rubber);
    const edge=new THREE.Mesh(new THREE.TorusGeometry(.266,.017,10,48),rubber);
    edge.position.set(side*.64,-.35,.492);model.add(edge);
  });
  // Four graphite direction keys inset into the left circular pad.
  const dpadSurround=material(0x555759,.67);
  box(.46,1.14,.025,-1.23,.35,.322,dpadSurround,.055);
  box(1.14,.46,.025,-1.23,.35,.323,dpadSurround,.055);
  box(.31,.89,.025,-1.23,.35,.345,seam,.036);
  box(.89,.31,.025,-1.23,.35,.346,seam,.036);
  const arrow=new THREE.Shape();
  arrow.moveTo(-.125,.12);arrow.lineTo(-.12,.39);arrow.quadraticCurveTo(0,.42,.12,.39);
  arrow.lineTo(.125,.12);arrow.lineTo(0,.025);arrow.closePath();
  const arrowGeometry=new THREE.ExtrudeGeometry(arrow,{depth:.04,bevelEnabled:true,bevelSegments:4,bevelSize:.025,bevelThickness:.018,curveSegments:16});
  for(let i=0;i<4;i++){
    const t=i*Math.PI/2;const key=new THREE.Mesh(arrowGeometry,rubber);
    key.position.set(-1.23,.35,.365);key.rotation.z=t;model.add(key);
    const x=-1.23-Math.sin(t)*.51,y=.35+Math.cos(t)*.51;
    const marks=[[0,.03],[-.022,-.017],[.022,-.017],[0,.03]].map(([px,py])=>[px*Math.cos(t)-py*Math.sin(t),px*Math.sin(t)+py*Math.cos(t)]);
    line(marks,x,y,.344,0x090b0f);
  }
  // The supplied controller uses patterned third-party symbols and a P3
  // button. These decals are drawn once, rather than animated each frame.
  function symbolDecal(symbol,color,x,y,z) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const c=canvas.getContext('2d');c.translate(128,128);c.strokeStyle=color;c.lineWidth=11;c.lineJoin='round';c.lineCap='round';
    const stroke=points=>{c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();};
    if(symbol==='triangle') {
      stroke([[0,-82],[-27,-47],[27,-47],[0,-82]]);
      stroke([[0,-36],[-50,43],[50,43],[0,-36]]);
      stroke([[-55,-15],[-78,-15],[-78,14]]);stroke([[55,-15],[78,-15],[78,14]]);
      stroke([[-19,19],[-19,69]]);stroke([[19,19],[19,69]]);
    }
    if(symbol==='square') {
      stroke([[-42,-42],[42,-42],[42,42],[-42,42],[-42,-42]]);
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx,dy])=>{
        stroke([[dx*79-dy*15,dy*79-dx*15],[dx*53-dy*15,dy*53-dx*15],[dx*53+dy*15,dy*53+dx*15],[dx*79+dy*15,dy*79+dx*15]]);
      });
      stroke([[0,-67],[0,-27]]);stroke([[0,27],[0,67]]);stroke([[-67,0],[-27,0]]);stroke([[27,0],[67,0]]);
    }
    if(symbol==='circle') {
      c.beginPath();c.arc(0,0,64,0,Math.PI*2);c.stroke();
      stroke([[0,-82],[0,-38]]);stroke([[0,38],[0,82]]);stroke([[-82,0],[-38,0]]);stroke([[38,0],[82,0]]);
      stroke([[-16,-67],[0,-82],[16,-67]]);stroke([[-16,67],[0,82],[16,67]]);
    }
    if(symbol==='cross') {
      [[0,0],[-47,-47],[47,-47],[-47,47],[47,47]].forEach(([dx,dy])=>{
        stroke([[dx-17,dy-17],[dx+17,dy+17]]);stroke([[dx+17,dy-17],[dx-17,dy+17]]);
      });
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.245,.245),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
    face.position.set(x,y,z);model.add(face);
  }
  const buttons=[[1.23,.79,'triangle','#54ccc8'],[1.67,.35,'circle','#db7496'],[1.23,-.09,'cross','#99bbf8'],[.79,.35,'square','#d990bc']];
  buttons.forEach(([x,y,symbol,color])=>{
    disc(.172,.025,x,y,.323,seam);
    disc(.148,.052,x,y,.359,buttonMat);
    oval(x,y,.389,.144,.144,.021,buttonMat);
    symbolDecal(symbol,color,x,y,.414);
  });
  label('SELECT',-.36,.40,.267,.31);
  label('START',.36,.40,.267,.29);
  box(.20,.11,.035,-.36,.25,.27,buttonMat,.02);
  const startShape=new THREE.Shape();startShape.moveTo(-.09,-.053);startShape.lineTo(.105,0);startShape.lineTo(-.09,.053);startShape.closePath();
  const start=new THREE.Mesh(new THREE.ExtrudeGeometry(startShape,{depth:.025,bevelEnabled:true,bevelSegments:2,bevelSize:.009,bevelThickness:.008}),buttonMat);start.position.set(.36,.25,.266);model.add(start);
  disc(.116,.045,0,-.12,.27,seam);
  disc(.099,.025,0,-.12,.303,material(0x454952,.3));
  label('P3',0,-.12,.333,.12,'#f0f0f1','Arial','700');
  // Rear shell seam and screw heads become visible as the model follows the pointer.
  [-1,1].forEach(side=>{
    const screw=disc(.027,.012,side*1.41,-.71,-.55,buttonMat);screw.rotation.x=-Math.PI/2;
  });
  connectHobbyMotion({ button, renderer, scene, view, model });
}
