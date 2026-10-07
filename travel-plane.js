import { connectHobbyGallery } from './hobby-gallery.js';
import { deferHobbyModel, connectHobbyMotion } from './hobby-model-runtime.js';
import * as THREE from './node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from './node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { fillTravelGallery } from './travel-media.js';

const button = document.querySelector('#travel-plane');
const gallery = document.querySelector('#travel-gallery');
connectHobbyGallery(button, gallery, fillTravelGallery, { autoplayVideos:true });

// Initialize once near the viewport, staggered across idle frames.
deferHobbyModel(button, buildPlane);

function buildPlane() {
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
  // Preserve the reference's three-quarter resting view.
  view.position.set(6.5, 4.4, 8.0); view.lookAt(0, .14, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303846, 1.8));
  const light = new THREE.DirectionalLight(0xfff5ed, 2.6); light.position.set(-3, 5, 5); scene.add(light);
  const rim = new THREE.DirectionalLight(0xd5dfec, 2); rim.position.set(4, 1, -2); scene.add(rim);
  const model = new THREE.Group(); scene.add(model);
  const material = (color, roughness = .5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const white=material(0x454649,.32,.12), silver=material(0xb0b7be,.27,.55);
  const navy=material(0x17181c,.4), red=material(0x183f73,.4), glass=material(0x16232d,.19,.3), dark=material(0x171c23,.6);
  const bodyProfile=[[-3.02,0],[-2.83,.075],[-2.48,.19],[-2.0,.29],[-1.45,.33],[1.62,.33],[2.05,.31],[2.42,.24],[2.69,.14],[2.83,.045],[2.86,0]];
  const curve=new THREE.SplineCurve(bodyProfile.map(([x,r])=>new THREE.Vector2(r,x)));
  const fuselageGeometry=new THREE.LatheGeometry(curve.getPoints(110).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),48);
  const fuselage=new THREE.Mesh(fuselageGeometry,white);fuselage.rotation.z=-Math.PI/2;model.add(fuselage);
  function box(w,h,d,x,y,z,mat,r=.025){
    const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,r),mat);mesh.position.set(x,y,z);model.add(mesh);return mesh;
  }
  function panel(points,depth,mat){
    const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
    return new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.013,bevelThickness:.009,curveSegments:12}),mat);
  }
  // Swept wings, narrow upturned tips, tailplanes and two underwing turbofans.
  [-1,1].forEach(side=>{
    const wing=panel([[.46,.22],[-.97,2.70],[-1.25,2.85],[-1.59,2.82],[-1.03,.20]],.045,white);
    wing.rotation.x=side*Math.PI/2;wing.position.y=-.11;model.add(wing);
    const tip=panel([[-1.25,0],[-1.20,.33],[-1.49,.15],[-1.58,0]],.027,red);
    tip.position.set(0,-.09,side*2.82);model.add(tip);
    const tail=panel([[-2.02,.12],[-2.50,1.16],[-2.86,1.14],[-2.65,.1]],.024,white);
    tail.rotation.x=side*Math.PI/2;tail.position.y=.10;model.add(tail);
    const pylon=box(.35,.28,.065,-.30,-.28,side*.99,white);
    // The front intake is an open annular mesh rather than a painted disk.
    const engineShape=[new THREE.Vector2(.195,-.42),new THREE.Vector2(.235,-.30),new THREE.Vector2(.245,.16),new THREE.Vector2(.212,.36),new THREE.Vector2(.164,.37),new THREE.Vector2(.155,.20),new THREE.Vector2(.14,-.35)];
    const engine=new THREE.Mesh(new THREE.LatheGeometry(engineShape,48),white);
    engine.rotation.z=-Math.PI/2;engine.position.set(-.19,-.46,side*1.0);model.add(engine);
    const intake=new THREE.Mesh(new THREE.TorusGeometry(.187,.025,8,48),silver);
    intake.rotation.y=Math.PI/2;intake.position.set(.18,-.46,side*1.0);model.add(intake);
    const fan=new THREE.Mesh(new THREE.CylinderGeometry(.154,.154,.015,40),dark);
    fan.rotation.z=-Math.PI/2;fan.position.set(.10,-.46,side*1.0);model.add(fan);
    const hub=new THREE.Mesh(new THREE.SphereGeometry(.05,16,10),silver);
    hub.scale.x=1.4;hub.position.set(.13,-.46,side*1.0);model.add(hub);
    const fanBlades=new THREE.InstancedMesh(new THREE.BoxGeometry(.009,.012,.124),silver,18);
    const pose=new THREE.Object3D();
    for(let i=0;i<18;i++){
      const t=i/18*Math.PI*2;pose.position.set(.116,-.46+Math.sin(t)*.091,side*1.0+Math.cos(t)*.091);
      pose.rotation.set(-t,.20,0);pose.updateMatrix();fanBlades.setMatrixAt(i,pose.matrix);
    }
    model.add(fanBlades);
    // Cabin windows are instanced, avoiding dozens of separate draw calls.
    const windowGeometry=new RoundedBoxGeometry(.065,.12,.012,2,.025);
    const windows=new THREE.InstancedMesh(windowGeometry,glass,28);
    for(let i=0;i<28;i++){
      pose.position.set(-1.70+i*.126,.11,side*.313);pose.rotation.set(-side*.33,0,0);pose.updateMatrix();windows.setMatrixAt(i,pose.matrix);
    }
    model.add(windows);
    const stripe=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.57,-.05,side*.155),new THREE.Vector3(-1.7,-.16,side*.29),
      new THREE.Vector3(.6,-.20,side*.263),new THREE.Vector3(2.40,-.10,side*.219)
    ]);
    model.add(new THREE.Mesh(new THREE.TubeGeometry(stripe,64,.015,5,false),navy));
    // Door outlines and a dark angular cockpit glazing section.
    const door=panel([[-.072,-.12],[.072,-.12],[.072,.12],[-.072,.12]],.007,silver);
    door.position.set(1.99,.035,side*.303);model.add(door);
    box(.039,.065,.012,1.99,.09,side*.316,glass,.014);
    const cockpit=panel([[2.10,.145],[2.17,.259],[2.43,.202],[2.49,.08]],.008,glass);
    cockpit.position.z=side*.232;cockpit.rotation.x=side*.22;model.add(cockpit);
    // Static flap joins on the wing surface.
    const flap=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-.97,-.102,side*.50),new THREE.Vector3(-1.37,-.102,side*2.4)
    ]);
    model.add(new THREE.Line(flap,new THREE.LineBasicMaterial({color:0xa3abb5})));
  });
  const fin=panel([[-2.59,.16],[-2.76,1.45],[-2.53,1.45],[-1.94,.15]],.043,navy);
  fin.position.z=-.0215;model.add(fin);
  // The reference's red, white and navy tail motif, generated as a static decal.
  const art=document.createElement('canvas');art.width=256;art.height=384;
  const c=art.getContext('2d');c.fillStyle='#17181c';c.fillRect(0,0,256,384);
  c.strokeStyle='#dedbd3';c.lineWidth=60;c.beginPath();c.moveTo(0,0);c.lineTo(256,384);c.moveTo(256,0);c.lineTo(0,384);c.stroke();
  c.strokeStyle='#183f73';c.lineWidth=24;c.stroke();
  c.fillStyle='#dedbd3';c.fillRect(95,0,66,384);c.fillRect(0,154,256,76);
  c.fillStyle='#183f73';c.fillRect(110,0,36,384);c.fillRect(0,174,256,36);
  const tailMap=new THREE.CanvasTexture(art);tailMap.colorSpace=THREE.SRGBColorSpace;
  const finSurface=panel([[-2.59,.17],[-2.76,1.43],[-2.53,1.43],[-1.94,.17]],.003,new THREE.MeshStandardMaterial({map:tailMap,roughness:.5}));
  // ExtrudeGeometry's XY UVs are remapped to the actual fin bounds.
  const uv=finSurface.geometry.attributes.uv,positions=finSurface.geometry.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(positions.getX(i)+2.78)/.86,(positions.getY(i)-.15)/1.30);
  finSurface.position.z=.035;model.add(finSurface);
  // Map the screen tangent onto a horizontal flight plane. Heading rotates
  // about world UP, so a complete orbit never rolls the aircraft upside down.
  const right=new THREE.Vector3(1,0,0).applyQuaternion(view.quaternion);
  const up=new THREE.Vector3(0,1,0).applyQuaternion(view.quaternion);
  const determinant=right.x*up.z-right.z*up.x;
  const targetPose=new THREE.Quaternion(),bankPose=new THREE.Quaternion();
  const yawAxis=new THREE.Vector3(0,1,0),bankAxis=new THREE.Vector3(1,0,0);
  const hoverPose=new THREE.Euler(),hoverQuaternion=new THREE.Quaternion();
  const limit=(value,max)=>Math.max(-max,Math.min(max,value));
  const angleDelta=value=>Math.atan2(Math.sin(value),Math.cos(value));
  let yaw=0,turnRate=0,bank=0,previousDesiredYaw=null;
  function orientModel(orbiting,motion,x,y,z,blend,dt){
    let desiredYaw=0;
    if(orbiting&&motion){
      const dx=Math.cos(motion.heading),dy=Math.sin(motion.heading);
      const worldX=(dx*up.z-right.z*dy)/determinant;
      const worldZ=(right.x*dy-dx*up.x)/determinant;
      desiredYaw=Math.atan2(-worldZ,worldX);
    }
    const desiredRate=orbiting&&previousDesiredYaw!==null?limit(angleDelta(desiredYaw-previousDesiredYaw)/dt,2.4):0;
    previousDesiredYaw=orbiting?desiredYaw:null;
    // Damped angular dynamics, with bounded acceleration and turn rate.
    // Small integration steps keep the response stable at varying frame rates.
    const steps=Math.max(1,Math.ceil(dt*120)),step=dt/steps;
    for(let i=0;i<steps;i++){
      const acceleration=limit(36*angleDelta(desiredYaw-yaw)+12*(desiredRate-turnRate),8);
      turnRate=limit(turnRate+acceleration*step,2.4);
      yaw=angleDelta(yaw+turnRate*step);
    }
    // Coordinated-turn relation tan(bank)=speed*turnRate/gravity, using
    // a scaled flight speed for this orbit. Limit bank to 12 degrees.
    const speed=orbiting?Math.min(8,(motion?.speed||0)*5):0;
    const desiredBank=limit(-Math.atan(speed*turnRate/9.81),Math.PI/15);
    bank+=(desiredBank-bank)*(1-Math.exp(-6*dt));
    targetPose.setFromAxisAngle(yawAxis,yaw);
    bankPose.setFromAxisAngle(bankAxis,bank);targetPose.multiply(bankPose);
    if(!orbiting)targetPose.multiply(hoverQuaternion.setFromEuler(hoverPose.set(x,y,z)));
    model.quaternion.slerp(targetPose,blend);
    const settled=Math.abs(angleDelta(desiredYaw-yaw))+Math.abs(turnRate)+Math.abs(desiredBank-bank)<.0004&&model.quaternion.angleTo(targetPose)<.0004;
    if(settled)model.quaternion.copy(targetPose);
    return settled;
  }
  connectHobbyMotion({ button, renderer, scene, view, model, orientModel });
}
