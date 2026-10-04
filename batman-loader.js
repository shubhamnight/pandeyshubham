import * as THREE from './node_modules/three/build/three.module.js';
import { batmanOutline } from './batman-emblem.js';

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>value*value*value*(value*(value*6-15)+10);
const fullTurn=Math.PI*2;

// Continue the loading angle and velocity, accelerate, then brake to an exact
// upright turn. PLAY gets more than a full rotation after its shape resolves.
function createRevealSpin(startAngle,initialSpeed){
  const acceleration=900,braking=1800,velocity=4.2/1000,initial=initialSpeed/1000;
  // Two extra Batman turns preserve the edge-on change and PLAY's braking
  // curve, shortening the previous three-turn extension by about 1.5 seconds.
  const extraTurns=2;
  const endAngle=(Math.ceil((startAngle+fullTurn*1.5)/fullTurn)+extraTurns)*fullTurn;
  const accelerationDistance=(initial+velocity)*acceleration/2;
  const cruise=(endAngle-startAngle-accelerationDistance-velocity*braking/2)/velocity;
  const duration=acceleration+cruise+braking;
  function angleAt(elapsed){
    if(elapsed<=0)return startAngle;
    if(elapsed>=duration)return endAngle;
    if(elapsed<acceleration){
      const t=elapsed/acceleration;
      return startAngle+initial*elapsed+(velocity-initial)*acceleration*(t*t*t-.5*t*t*t*t);
    }
    if(elapsed<=duration-braking)return startAngle+accelerationDistance+velocity*(elapsed-acceleration);
    const t=(elapsed-duration+braking)/braking;
    return startAngle+accelerationDistance+velocity*(cruise+braking*(t-t*t*t+.5*t*t*t*t));
  }
  function timeAt(angle){
    let low=0,high=duration;
    for(let step=0;step<24;step++){
      const middle=(low+high)/2;
      if(angleAt(middle)<angle)low=middle;else high=middle;
    }
    return (low+high)/2;
  }
  return {duration,endAngle,angleAt,timeAt};
}

function playBounds(button){
  const bounds=button.parentElement.getBoundingClientRect(),width=button.offsetWidth,height=button.offsetHeight;
  // The centered container is stable even while the button is hovered or
  // pressed; its canvas supplies those same interaction offsets separately.
  return {width,height,left:bounds.left+(bounds.width-width)/2,top:bounds.top+(bounds.height-height)/2};
}

// Triangulators may discard points that are collinear in the bat but curved
// in the button. Keep those points on the cap as well as on the side walls.
function preserveCapBoundary(geometry,contour){
  const cap=geometry.groups.find(group=>group.materialIndex===0);
  const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
  const uv=geometry.getAttribute('uv'),positions=[],normals=[],uvs=[];
  const indices=new Map(),chains=new Map(),count=contour.length;
  function indexAt(offset){
    const x=position.array[offset],y=position.array[offset+1],key=`${x},${y}`;
    if(indices.has(key))return indices.get(key);
    let nearest=0,best=Infinity;
    for(let i=0;i<count;i++){
      const dx=x-contour[i].x,dy=y-contour[i].y,distance=dx*dx+dy*dy;
      if(distance<best){best=distance;nearest=i;}
    }
    indices.set(key,nearest);return nearest;
  }
  function boundaryChain(a,b){
    if(a===b)return null;
    const key=`${a}:${b}`;
    if(chains.has(key))return chains.get(key);
    const from=contour[a],to=contour[b],dx=to.x-from.x,dy=to.y-from.y;
    const lengthSquared=dx*dx+dy*dy;
    for(const direction of [1,-1]){
      const path=[a];let i=a;
      while(path.length<=count){
        i=(i+direction+count)%count;
        if(i===b){path.push(b);break;}
        const ex=contour[i].x-from.x,ey=contour[i].y-from.y;
        const along=(ex*dx+ey*dy)/lengthSquared,cross=ex*dy-ey*dx;
        if(along<=0||along>=1||cross*cross>lengthSquared*1e-12)break;
        path.push(i);
      }
      if(path.at(-1)===b&&path.length>2){chains.set(key,path);return path;}
    }
    chains.set(key,null);return null;
  }
  // A cap can only need a bounded number of additional boundary triangles.
  // If numerical degeneracies exceed that budget, retain the original mesh.
  const triangleBudget=cap.count+count*12;
  let processed=0;
  for(let vertex=cap.start;vertex<cap.start+cap.count;vertex+=3){
    const offset=vertex*3,z=position.array[offset+2],nz=normal.array[offset+2];
    const pending=[[indexAt(offset),indexAt(offset+3),indexAt(offset+6)]];
    while(pending.length){
      if(++processed>triangleBudget)return;
      const triangle=pending.pop();let split=false;
      for(let edge=0;edge<3;edge++){
        const path=boundaryChain(triangle[edge],triangle[(edge+1)%3]);
        // Collinear cap triangles may contain the opposite vertex on this
        // boundary chain. Splitting them recreates the parent indefinitely.
        if(!path||path.includes(triangle[(edge+2)%3]))continue;
        for(let i=1;i<path.length;i++)pending.push([path[i-1],path[i],triangle[(edge+2)%3]]);
        split=true;break;
      }
      if(split)continue;
      for(const index of triangle){
        const point=contour[index];positions.push(point.x,point.y,z);
        normals.push(0,0,nz);uvs.push(point.x,point.y);
      }
    }
  }
  const capCount=positions.length/3,sideStart=cap.start+cap.count;
  for(let i=sideStart;i<position.count;i++){
    positions.push(position.array[i*3],position.array[i*3+1],position.array[i*3+2]);
    normals.push(normal.array[i*3],normal.array[i*3+1],normal.array[i*3+2]);
    uvs.push(uv.array[i*2],uv.array[i*2+1]);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.clearGroups();geometry.addGroup(0,capCount,0);
  geometry.addGroup(capCount,positions.length/3-capCount,1);
}

// Match the upper and lower silhouettes independently. A single perimeter
// fraction made the right wing drift past the button's right edge mid-morph.
// Bake contour projection during loading; resizing only scales these samples.
function bakeMorphCorrespondence(contour,position,bounds){
  const segments=[],distances=new Float64Array(contour.length);
  let length=0,right=0;
  for(let index=0;index<contour.length;index++){
    const from=contour[index],to=contour[(index+1)%contour.length];
    const dx=to.x-from.x,dy=to.y-from.y,squared=dx*dx+dy*dy;
    const segmentLength=Math.sqrt(squared);
    if(from.x>contour[right].x)right=index;
    distances[index]=length;length+=segmentLength;
    segments.push({from,dx,dy,squared,length:segmentLength});
  }
  const upperLength=distances[right],lowerLength=length-upperLength;
  const samples=new Float64Array(position.count*3),mapped=new Map(),source=position.array;
  const depth=bounds.max.z-bounds.min.z;
  for(let index=0;index<position.count;index++){
    const offset=index*3,key=`${source[offset]},${source[offset+1]}`;
    let point=mapped.get(key);
    if(!point){
      let along=0,best=Infinity;
      for(let segment=0;segment<segments.length;segment++){
        const {from,dx,dy,squared,length:segmentLength}=segments[segment];
        const fraction=clamp(((source[offset]-from.x)*dx+(source[offset+1]-from.y)*dy)/Math.max(squared,1e-12));
        const ex=source[offset]-from.x-dx*fraction,ey=source[offset+1]-from.y-dy*fraction;
        const distance=ex*ex+ey*ey;
        if(distance<best){best=distance;along=distances[segment]+segmentLength*fraction;}
      }
      const phase=along<=upperLength?along/upperLength*.5:.5+(along-upperLength)/lowerLength*.5;
      point=[phase,clamp(Math.sqrt(best)/.045)];mapped.set(key,point);
    }
    samples[offset]=point[0];samples[offset+1]=point[1];
    samples[offset+2]=clamp((bounds.max.z-source[offset+2])/depth);
  }
  return samples;
}

// One ready-triggered spin owns the shape change and the background reveal.
// The text rotates with the finished face, then retains its existing behavior.
export async function spinBatmanIntoPlay(intro,reduced,prepareMesh,signal,startAngle=0,initialSpeed=.7){
  if(signal?.aborted)return;
  const loading=intro.querySelector('.intro-loading');
  const stage=intro.querySelector('.batman-loader-stage');
  const play=intro.querySelector('.intro-play'),button=play.querySelector('button');
  const details=[...button.querySelectorAll('.flow-label,.flow-arrow')];
  details.forEach(detail=>{detail.style.opacity='0';});
  button.inert=true;play.hidden=false;
  intro.classList.add('play-morphing');
  intro.classList.remove('play-preparing');
  const buttonBounds=playBounds(button),stageBounds=stage.getBoundingClientRect();
  const drawMesh=prepareMesh?.(buttonBounds,stageBounds);
  const keepsMesh=Boolean(drawMesh);
  if(keepsMesh)intro.classList.add('play-webgl');
  const bloom=document.createElement('div');bloom.className='intro-blue-bloom';
  bloom.setAttribute('aria-hidden','true');
  bloom.style.left='50%';bloom.style.top='50%';
  intro.prepend(bloom);
  const complete=()=>{
    // Commit the exact endpoint before removing transition styles. The GPU
    // surface, label and background must already match their resting state.
    drawMesh?.(1);
    loading.hidden=!keepsMesh;intro.classList.add('show-play','play-morphed');
    intro.classList.remove('play-morphing');
    button.style.removeProperty('rotate');
    intro.style.removeProperty('--play-detail-opacity');
    details.forEach(detail=>{detail.style.removeProperty('opacity');detail.style.removeProperty('translate');});
    button.inert=false;bloom.remove();
  };
  if(reduced){drawMesh?.(1);complete();return;}
  const spin=createRevealSpin(startAngle,initialSpeed),spinDuration=spin.duration;
  const switchAngle=spin.endAngle-fullTurn*1.25,switchHalfWidth=.12;
  const bloomDelay=spin.timeAt(switchAngle+switchHalfWidth);
  const bloomDuration=Math.min(1000,spinDuration-bloomDelay);
  const detailStart=bloomDelay+100,detailDuration=320,totalDuration=spinDuration+160;
  const startScale=buttonBounds.height/64;
  let bloomScale=Math.hypot(innerWidth,innerHeight)/64*1.08;
  let elapsed=0,last=0,surfaceDone=false,frame=0,lastDetail=-1,lastBloom=-1,done=false;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  await new Promise((resolve,reject)=>{
    function cleanup(){
      done=true;cancelAnimationFrame(frame);frame=0;
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('resize',resizeBloom);
      window.removeEventListener('pagehide',suspend);
      window.removeEventListener('pageshow',resume);
      preference.removeEventListener('change',preferenceChanged);
      signal?.removeEventListener('abort',abort);
    }
    function abort(){
      cleanup();bloom.remove();
      button.style.removeProperty('rotate');
      details.forEach(detail=>{detail.style.removeProperty('opacity');detail.style.removeProperty('translate');});
      resolve();
    }
    function resizeBloom(){bloomScale=Math.hypot(innerWidth,innerHeight)/64*1.08;lastBloom=-1;}
    function preferenceChanged(){if(preference.matches){elapsed=totalDuration;resume();}}
    function suspend(){cancelAnimationFrame(frame);frame=0;last=0;}
    function resume(){
      suspend();
      if(!done&&!document.hidden)frame=requestAnimationFrame(tick);
    }
    function tick(time){
      frame=0;
      // Resume from the same visual state if the tab is temporarily hidden.
      if(document.hidden){last=0;return;}
      try{
        elapsed+=last?Math.min(time-last,50):0;last=time;
        const angle=spin.angleAt(elapsed);
        if(!surfaceDone){
          const shape=clamp((angle-switchAngle+switchHalfWidth)/(switchHalfWidth*2));
          // Complete the shape change while the surface is nearly edge-on.
          const rotation=elapsed>=spinDuration?0:angle;
          drawMesh?.(shape,rotation);
          button.style.rotate=`0 1 0 ${rotation}rad`;
          surfaceDone=elapsed>=spinDuration;
        }
        // The HTML face uses the same orthographic rotation as the mesh, so
        // lettering is attached to PLAY throughout its spin and deceleration.
        const detailProgress=smooth(clamp((elapsed-detailStart)/detailDuration));
        if(detailProgress!==lastDetail){
          lastDetail=detailProgress;
          details.forEach(detail=>{
            detail.style.opacity=String(detailProgress);
          });
        }
        const reveal=clamp((elapsed-bloomDelay)/bloomDuration);
        const scale=reveal>0?startScale+(bloomScale-startScale)*smooth(reveal):0;
        if(scale!==lastBloom){lastBloom=scale;bloom.style.transform=`translate(-50%,-50%) scale(${scale})`;}
        if(elapsed>=totalDuration){
          cleanup();complete();resolve();
        }
        else frame=requestAnimationFrame(tick);
      }catch(error){
        button.style.removeProperty('rotate');
        cleanup();details.forEach(detail=>{detail.style.removeProperty('opacity');detail.style.removeProperty('translate');});
        reject(error);
      }
    }
    document.addEventListener('visibilitychange',resume);
    window.addEventListener('resize',resizeBloom,{passive:true});
    window.addEventListener('pagehide',suspend);
    window.addEventListener('pageshow',resume);
    preference.addEventListener('change',preferenceChanged);resume();
    signal?.addEventListener('abort',abort,{once:true});
  });
}

export function createBatmanLoader(intro){
  const stage=intro.querySelector('.batman-loader-stage');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const transition=new AbortController();
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  }catch{
    return {finish:()=>spinBatmanIntoPlay(intro,reduced.matches)};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  renderer.domElement.setAttribute('aria-hidden','true');
  stage.append(renderer.domElement);
  const scene=new THREE.Scene();
  const view=new THREE.OrthographicCamera(-3.2,3.2,2.1,-2.1,.1,30);
  view.position.set(0,0,12);view.lookAt(0,0,0);
  const ambient=new THREE.HemisphereLight(0xd5dfec,0x2c3440,2.2);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-4,5,6);scene.add(key);
  const edge=new THREE.DirectionalLight(0x8a9fb9,3);edge.position.set(4,2,-3);scene.add(edge);
  // Reveal the lower-left bevel on PLAY without changing the loading bat.
  const playRim=new THREE.DirectionalLight(0xffffff,0);
  playRim.position.set(-3,-4,5);scene.add(playRim);
  // One small, reusable contact shadow, rather than a live shadow-map pass.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=96;
  const shadowContext=shadowCanvas.getContext('2d');
  const shadowGradient=shadowContext.createRadialGradient(48,48,0,48,48,48);
  shadowGradient.addColorStop(0,'rgba(0,0,0,.32)');
  shadowGradient.addColorStop(.45,'rgba(0,0,0,.15)');
  shadowGradient.addColorStop(1,'rgba(0,0,0,0)');
  shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,96,96);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  const shadowGeometry=new THREE.PlaneGeometry(1,1);
  const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,color:0x000000,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);
  // Compile and upload it during loading at zero opacity, avoiding a shader
  // compilation or texture upload midway through the visible morph.
  shadow.renderOrder=-1;scene.add(shadow);
  const shape=new THREE.Shape();
  const x=value=>(value-84)/28,y=value=>(73-value)/28;
  for(const [command,...values] of batmanOutline){
    if(command==='M')shape.moveTo(x(values[0]),y(values[1]));
    else if(command==='L')shape.lineTo(x(values[0]),y(values[1]));
    else if(command==='C')shape.bezierCurveTo(x(values[0]),y(values[1]),x(values[2]),y(values[3]),x(values[4]),y(values[5]));
    else shape.closePath();
  }
  // Curves alone leave the wing's long straight edges under-sampled. Subdivide
  // every edge so no part of the capsule can become a large diagonal chord.
  const outline=shape.getPoints(24);
  if(outline[0].distanceToSquared(outline.at(-1))<1e-10)outline.pop();
  const contour=[];
  for(let i=0;i<outline.length;i++){
    const from=outline[i],to=outline[(i+1)%outline.length];
    const steps=Math.max(1,Math.ceil(from.distanceTo(to)/.045));
    for(let j=0;j<steps;j++)contour.push(from.clone().lerp(to,j/steps));
  }
  const denseShape=new THREE.Shape(contour);
  const geometry=new THREE.ExtrudeGeometry(denseShape,{
    depth:.2646,bevelEnabled:true,bevelThickness:.0315,bevelSize:.045,
    bevelSegments:3,steps:1,curveSegments:24
  });
  preserveCapBoundary(geometry,contour);
  geometry.computeBoundingBox();
  const origin=geometry.boundingBox.getCenter(new THREE.Vector3());
  geometry.translate(-origin.x,-origin.y,-origin.z);
  for(const point of contour){point.x-=origin.x;point.y-=origin.y;}
  const position=geometry.getAttribute('position');
  const correspondence=bakeMorphCorrespondence(contour,position,geometry.boundingBox);
  const playPosition=position.clone();
  geometry.setAttribute('playPosition',playPosition);
  const playNormal=geometry.getAttribute('normal').clone();
  geometry.setAttribute('playNormal',playNormal);
  const face=new THREE.MeshStandardMaterial({color:0x4b6584,metalness:.72,roughness:.28,transparent:false,opacity:1});
  const side=new THREE.MeshStandardMaterial({color:0x344b68,metalness:.8,roughness:.24,transparent:false,opacity:1});
  // Upload the target once; the GPU interpolates vertices and bevel normals.
  // Both materials share uniform blends, with no per-frame buffer uploads.
  const morph={value:0};
  const faceBounds={value:new THREE.Vector2(0,1)};
  for(const material of [face,side]){
    material.onBeforeCompile=shader=>{
      shader.uniforms.playMorph=morph;
      shader.uniforms.playFaceBounds=faceBounds;
      shader.vertexShader='attribute vec3 playPosition;\nattribute vec3 playNormal;\nuniform float playMorph;\nuniform vec2 playFaceBounds;\nvarying float vPlayFaceHeight;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader
        .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed = mix(transformed, playPosition, playMorph);\nvPlayFaceHeight = (transformed.y - playFaceBounds.x) / playFaceBounds.y + 0.5;')
        .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal = mix(objectNormal, playNormal, playMorph);');
      shader.fragmentShader='uniform float playMorph;\nvarying float vPlayFaceHeight;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb *= mix(1.0, 0.88 + 0.12 * smoothstep(0.0, 1.0, vPlayFaceHeight), playMorph);');
    };
    material.customProgramCacheKey=()=> 'batman-play-morph-v6';
  }
  const model=new THREE.Mesh(geometry,[face,side]);scene.add(model);
  // A straight-on resting pose: lighting and bevels retain the model's depth.
  const restPitch=0,restYaw=0;
  model.rotation.set(restPitch,restYaw,0);
  let mode='loading',disposed=false,finishPromise;
  const loadingSpeed=.7,minimumLoadingSpin=1.4;
  let loadingFrame=0,loadingLast=0,loadingElapsed=0,loadingAngle=0,readyRequested=false,resolveFinish;
  let renderWidth=0,renderHeight=0;
  let targetSignature='',morphStarted=false,currentMorph=0,currentRotation=0,lastPaint=-1,lastRotation=-1;
  const faceStart=face.color.clone(),sideStart=side.color.clone();
  const graphite=new THREE.Color(0x242424),edgeGraphite=new THREE.Color(0x101010);
  const skyStart=ambient.color.clone(),groundStart=ambient.groundColor.clone(),edgeStart=edge.color.clone();
  const neutralLight=new THREE.Color(0xffffff),neutralGround=new THREE.Color(0x252525);
  const playButton=intro.querySelector('.flow-play');
  playButton.inert=true;intro.classList.add('play-preparing');
  function resize(){
    if(disposed||intro.classList.contains('is-zooming'))return;
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height)return;
    const buttonBounds=playBounds(playButton),stageBounds=stage.getBoundingClientRect();
    if(width!==renderWidth||height!==renderHeight){
      renderWidth=width;renderHeight=height;renderer.setSize(width,height,false);
      view.top=3.2*height/width;view.bottom=-view.top;view.updateProjectionMatrix();
    }
    // Warm both target attributes during loading. Fonts and viewport changes
    // can refresh them, but starting the spin normally reuses these buffers.
    prepareMeshMorph(buttonBounds,stageBounds);
    if(morphStarted){
      paintMorph(currentMorph,currentRotation);
      return;
    }
    renderer.render(scene,view);
  }
  function prepareMeshMorph(buttonBounds,stageBounds){
    if(!buttonBounds.width||!buttonBounds.height||!stageBounds.width)return paintMorph;
    const signature=[buttonBounds.width,buttonBounds.height,buttonBounds.left,buttonBounds.top,
      stageBounds.width,stageBounds.height,stageBounds.left,stageBounds.top].join(':');
    if(signature===targetSignature)return paintMorph;
    targetSignature=signature;lastPaint=-1;
    const target=playPosition.array;
    const units=6.4/stageBounds.width;
    const radius=buttonBounds.height*units/2;
    const sourceFront=geometry.boundingBox.max.z,sourceDepth=sourceFront-geometry.boundingBox.min.z;
    // Keep the extrusion symmetric around its spin axis. Diagonal rear-face
    // offsets made the button look skewed even with a zero-tilt resting pose.
    const depth=sourceDepth;
    const rim=1.8*units;
    const straight=Math.max(0,buttonBounds.width*units/2-radius);
    const arc=Math.PI*radius/2,flat=straight*2,perimeter=4*arc+2*flat;
    const centerX=(buttonBounds.left+buttonBounds.width/2-stageBounds.left-stageBounds.width/2)*units;
    const centerY=-(buttonBounds.top+buttonBounds.height/2-stageBounds.top-stageBounds.height/2)*units;
    faceBounds.value.set(centerY,radius*2);
    // The HTML lettering sits on the mesh's front plane during the spin.
    // Orthographic projection keeps its size unchanged by this depth offset.
    playButton.style.setProperty('--play-face-depth',`${sourceFront/units}px`);
    shadow.scale.set(buttonBounds.width*units*1.35,buttonBounds.height*units*.45,1);
    shadow.position.set(centerX,centerY-radius-8*units,-depth-1);
    function capsule(distance,point){
      let cx,cy,nx,ny;
      if(distance<arc){
        const angle=Math.PI-distance/radius;nx=Math.cos(angle);ny=Math.sin(angle);
        cx=-straight+nx*radius;cy=ny*radius;
      }else if((distance-=arc)<flat){cx=-straight+distance;cy=radius;nx=0;ny=1;}
      else if((distance-=flat)<arc*2){
        const angle=Math.PI/2-distance/radius;nx=Math.cos(angle);ny=Math.sin(angle);
        cx=straight+nx*radius;cy=ny*radius;
      }else if((distance-=arc*2)<flat){cx=straight-distance;cy=-radius;nx=0;ny=-1;}
      else{
        distance-=flat;const angle=-Math.PI/2-distance/radius;
        nx=Math.cos(angle);ny=Math.sin(angle);cx=-straight+nx*radius;cy=ny*radius;
      }
      point[0]=cx+centerX;point[1]=cy+centerY;point[2]=nx;point[3]=ny;
    }
    const point=new Float64Array(4);
    for(let i=0;i<position.count;i++){
      const offset=i*3,bevel=correspondence[offset+1]*rim,back=correspondence[offset+2];
      capsule(correspondence[offset]*perimeter,point);
      target[offset]=point[0]+point[2]*bevel;
      target[offset+1]=point[1]+point[3]*bevel;
      target[offset+2]=sourceFront-depth*back;
    }
    playPosition.needsUpdate=true;
    // Calculate the finished extrusion's normals once, rather than rebuilding
    // a mesh or its normals at any point in the animation loop.
    const targetGeometry=new THREE.BufferGeometry();
    targetGeometry.setAttribute('position',playPosition.clone());
    targetGeometry.computeVertexNormals();
    playNormal.array.set(targetGeometry.getAttribute('normal').array);
    playNormal.needsUpdate=true;targetGeometry.dispose();
    return paintMorph;
  }
  function paintMorph(progress,rotation=0){
      if(disposed||(progress===lastPaint&&rotation===lastRotation))return;
      lastPaint=currentMorph=progress;
      lastRotation=currentRotation=rotation;
      model.rotation.set(restPitch,rotation,0);
      // The same extrusion changes shape only during its edge-on pass.
      morph.value=progress===1?1:smooth(progress);
      const materialProgress=progress===1?1:smooth(clamp((progress-.16)/.84));
      face.color.copy(faceStart).lerp(graphite,materialProgress);
      side.color.copy(sideStart).lerp(edgeGraphite,materialProgress);
      face.metalness=.72-.54*materialProgress;side.metalness=.8-.55*materialProgress;
      face.roughness=.28+.12*materialProgress;side.roughness=.24+.11*materialProgress;
      ambient.color.copy(skyStart).lerp(neutralLight,materialProgress);
      ambient.groundColor.copy(groundStart).lerp(neutralGround,materialProgress);
      edge.color.copy(edgeStart).lerp(neutralLight,materialProgress);
      playRim.intensity=1.6*materialProgress;
      const shadowProgress=smooth(clamp((progress-.52)/.48))*smooth(clamp(Math.cos(rotation)));
      shadow.visible=shadowProgress>0;shadowMaterial.opacity=shadowProgress;
      renderer.render(scene,view);
  }
  function dispose(){
    if(disposed)return;disposed=true;
    cancelAnimationFrame(loadingFrame);loadingFrame=0;
    transition.abort();resizeObserver.disconnect();
    resolveFinish?.();
    document.removeEventListener('visibilitychange',wakeLoading);
    reduced.removeEventListener('change',wakeLoading);
    window.removeEventListener('pagehide',onPageHide);
    window.removeEventListener('pageshow',wakeLoading);
    geometry.dispose();face.dispose();side.dispose();
    shadowGeometry.dispose();shadowMaterial.dispose();shadowTexture.dispose();
    renderer.dispose();
    renderer.domElement.remove();stage.classList.remove('batman-model-ready');
    playButton.style.removeProperty('--play-face-depth');
    intro.classList.remove('play-webgl','play-preparing');
  }
  async function exit(){
    if(mode==='exit'||disposed)return;
    mode='exit';cancelAnimationFrame(loadingFrame);loadingFrame=0;
    let keepSurface=false;
    try{
      await spinBatmanIntoPlay(intro,reduced.matches,(buttonBounds,stageBounds)=>{
        prepareMeshMorph(buttonBounds,stageBounds);morphStarted=true;return paintMorph;
      },transition.signal,loadingAngle,loadingSpeed);
      keepSurface=true;
    }
    catch(error){
      console.warn('Loader transition unavailable; opening PLAY.',error);
      intro.querySelector('.intro-loading').hidden=true;
      intro.querySelector('.intro-play').hidden=false;
      intro.querySelector('.intro-play button').inert=false;
      intro.querySelector('.intro-play button').style.removeProperty('rotate');
      intro.classList.add('show-play','play-morphed');
      intro.classList.remove('play-morphing');
      intro.style.removeProperty('--play-detail-opacity');
      intro.querySelectorAll('.flow-label,.flow-arrow').forEach(detail=>{detail.style.removeProperty('opacity');detail.style.removeProperty('translate');});
      intro.querySelector('.intro-blue-bloom')?.remove();
    }finally{
      // The settled PLAY is one frozen GPU surface, with no ongoing draw loop.
      if(!keepSurface)dispose();resolveFinish?.();
    }
  }
  function tickLoading(time){
    loadingFrame=0;
    if(disposed||mode!=='loading'||document.hidden)return;
    const dt=loadingLast?Math.min((time-loadingLast)/1000,.05):0;loadingLast=time;
    loadingElapsed+=dt;loadingAngle=(loadingAngle+loadingSpeed*dt)%fullTurn;
    paintMorph(0,loadingAngle);
    if(readyRequested&&loadingElapsed>=minimumLoadingSpin){exit();return;}
    loadingFrame=requestAnimationFrame(tickLoading);
  }
  function wakeLoading(){
    if(disposed||mode!=='loading')return;
    if(document.hidden||reduced.matches){
      cancelAnimationFrame(loadingFrame);loadingFrame=0;loadingLast=0;
      if(reduced.matches){loadingAngle=0;paintMorph(0,0);if(readyRequested)exit();}
      return;
    }
    if(readyRequested&&loadingElapsed>=minimumLoadingSpin){exit();return;}
    if(!loadingFrame){loadingLast=0;loadingFrame=requestAnimationFrame(tickLoading);}
  }
  function onPageHide(event){
    if(!event.persisted)dispose();
    else{cancelAnimationFrame(loadingFrame);loadingFrame=0;loadingLast=0;}
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  resizeObserver.observe(intro.querySelector('.flow-play'));
  window.addEventListener('pagehide',onPageHide);
  window.addEventListener('pageshow',wakeLoading);
  document.addEventListener('visibilitychange',wakeLoading);
  reduced.addEventListener('change',wakeLoading);
  resize();stage.classList.add('batman-model-ready');wakeLoading();
  return {dispose,finish(){
    if(disposed)return Promise.resolve();
    if(!finishPromise)finishPromise=new Promise(resolve=>{
      resolveFinish=resolve;readyRequested=true;wakeLoading();
    });
    return finishPromise;
  }};
}
