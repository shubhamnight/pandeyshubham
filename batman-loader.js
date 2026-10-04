import * as THREE from './node_modules/three/build/three.module.js';
import { batmanOutline } from './batman-emblem.js';

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>value*value*value*(value*(value*6-15)+10);

function playBounds(button){
  const bounds=button.getBoundingClientRect(),width=button.offsetWidth,height=button.offsetHeight;
  // Measure the unscaled face so interaction transforms cannot stretch it.
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

// The mesh and the actual control share one position and one silhouette.
// A separate compositor layer carries blue outward from that same center.
export async function morphBatmanIntoPlay(intro,reduced,prepareMesh){
  const loading=intro.querySelector('.intro-loading');
  const stage=intro.querySelector('.batman-loader-stage');
  const play=intro.querySelector('.intro-play'),button=play.querySelector('button');
  button.inert=true;play.hidden=false;
  intro.classList.add('play-morphing');
  intro.style.setProperty('--play-detail-opacity','0');
  const buttonBounds=playBounds(button),stageBounds=stage.getBoundingClientRect();
  const drawMesh=prepareMesh?.(buttonBounds,stageBounds);
  const keepsMesh=Boolean(drawMesh);
  if(keepsMesh)intro.classList.add('play-webgl');
  const bloom=document.createElement('div');bloom.className='intro-blue-bloom';
  bloom.setAttribute('aria-hidden','true');
  bloom.style.left=`${buttonBounds.left+buttonBounds.width/2}px`;
  bloom.style.top=`${buttonBounds.top+buttonBounds.height/2}px`;
  intro.prepend(bloom);
  const complete=()=>{
    loading.hidden=!keepsMesh;intro.classList.add('show-play','play-morphed');
    intro.classList.remove('play-morphing');
    intro.style.removeProperty('--play-detail-opacity');
    button.inert=false;bloom.remove();
  };
  if(reduced){drawMesh?.(1);complete();return;}
  const morphDuration=1700,bloomDelay=900,bloomDuration=1050;
  const bloomScale=Math.hypot(innerWidth,innerHeight)/64*1.05;
  let elapsed=0,last=0,meshDone=false,frame=0;
  await new Promise((resolve,reject)=>{
    function resume(){
      cancelAnimationFrame(frame);frame=0;last=0;
      if(!document.hidden)frame=requestAnimationFrame(tick);
    }
    function tick(time){
      frame=0;
      // Resume from the same visual state if the tab is temporarily hidden.
      if(document.hidden){last=0;return;}
      try{
        elapsed+=last?Math.min(time-last,50):0;last=time;
        const progress=clamp(elapsed/morphDuration);
        if(!meshDone){
          const deformation=smooth(progress);
          drawMesh?.(deformation);
          intro.style.setProperty('--play-detail-opacity',String(smooth(clamp((elapsed-1100)/600))));
          if(progress===1){
            // Keep the actual extrusion in place; the HTML only supplies its
            // lettering, keyboard focus and click target.
            intro.classList.add('play-morphed');loading.hidden=!keepsMesh;meshDone=true;
          }
        }
        const reveal=clamp((elapsed-bloomDelay)/bloomDuration);
        const scale=bloomScale*(1-(1-reveal)**3);
        bloom.style.transform=`translate(-50%,-50%) scale(${scale})`;
        if(elapsed>=bloomDelay+bloomDuration){
          document.removeEventListener('visibilitychange',resume);complete();resolve();
        }
        else frame=requestAnimationFrame(tick);
      }catch(error){
        document.removeEventListener('visibilitychange',resume);
        cancelAnimationFrame(frame);reject(error);
      }
    }
    document.addEventListener('visibilitychange',resume);resume();
  });
}

export function createBatmanLoader(intro){
  const stage=intro.querySelector('.batman-loader-stage');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  }catch{
    return {finish:()=>morphBatmanIntoPlay(intro,reduced.matches)};
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
  const playPosition=position.clone();
  geometry.setAttribute('playPosition',playPosition);
  const playNormal=geometry.getAttribute('normal').clone();
  geometry.setAttribute('playNormal',playNormal);
  const face=new THREE.MeshStandardMaterial({color:0x4b6584,metalness:.72,roughness:.28,transparent:false,opacity:1});
  const side=new THREE.MeshStandardMaterial({color:0x344b68,metalness:.8,roughness:.24,transparent:false,opacity:1});
  // Upload the target once; the GPU interpolates vertices and bevel normals.
  // Both materials share the same scalar, with no per-frame buffer uploads.
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
    material.customProgramCacheKey=()=> 'batman-play-morph-v4';
  }
  const model=new THREE.Mesh(geometry,[face,side]);scene.add(model);
  // A straight-on resting pose: lighting and bevels retain the model's depth.
  const restPitch=0,restYaw=0;
  model.rotation.set(restPitch,restYaw,0);
  let frame=0,last=0,angle=restYaw,spinTime=0,mode='spin',requested=false,disposed=false;
  let settleFrom=0,settleTo=0,settleTime=0,settleDuration=1;
  let finishPromise,resolveFinish;
  let renderWidth=0,renderHeight=0;
  const spinSpeed=2.1;
  function resize(){
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height||disposed)return;
    if(width!==renderWidth||height!==renderHeight){
      renderWidth=width;renderHeight=height;renderer.setSize(width,height,false);
      view.top=3.2*height/width;view.bottom=-view.top;view.updateProjectionMatrix();
    }
    if(mode==='exit'&&morph.value===1&&intro.classList.contains('play-webgl')&&!intro.classList.contains('is-zooming')){
      prepareMeshMorph(playBounds(intro.querySelector('.flow-play')),stage.getBoundingClientRect())(1);
      return;
    }
    renderer.render(scene,view);
  }
  function prepareMeshMorph(buttonBounds,stageBounds){
    const source=position.array,target=playPosition.array;
    // Project onto contour segments, preserving the original ordering and all
    // subdivisions, including those on the originally straight wing edges.
    const distances=new Float64Array(contour.length),segments=[];let length=0;
    for(let i=0;i<contour.length;i++){
      const from=contour[i],to=contour[(i+1)%contour.length];
      const dx=to.x-from.x,dy=to.y-from.y,squared=dx*dx+dy*dy;
      const segmentLength=Math.sqrt(squared);
      distances[i]=length;length+=segmentLength;
      segments.push({from,dx,dy,squared,length:segmentLength});
    }
    const units=6.4/stageBounds.width;
    const radius=buttonBounds.height*units/2;
    const sourceFront=geometry.boundingBox.max.z,sourceDepth=sourceFront-geometry.boundingBox.min.z;
    // The finished button inherits the bat's complete depth, including bevels.
    const depth=sourceDepth,rearX=-sourceDepth*.18,rearY=-sourceDepth*.45;
    const rim=1.8*units;
    const straight=Math.max(0,buttonBounds.width*units/2-radius);
    const arc=Math.PI*radius/2,flat=straight*2,perimeter=4*arc+2*flat;
    const centerX=(buttonBounds.left+buttonBounds.width/2-stageBounds.left-stageBounds.width/2)*units;
    const centerY=-(buttonBounds.top+buttonBounds.height/2-stageBounds.top-stageBounds.height/2)*units;
    faceBounds.value.set(centerY,radius*2);
    shadow.scale.set(buttonBounds.width*units*1.35,buttonBounds.height*units*.45,1);
    shadow.position.set(centerX+rearX*.5,centerY-radius+rearY-8*units,-depth-1);
    function capsule(distance){
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
      return [cx+centerX,cy+centerY,nx,ny];
    }
    const mapped=new Map();
    for(let i=0;i<position.count;i++){
      const offset=i*3,key=`${source[offset]},${source[offset+1]}`;
      let point=mapped.get(key);
      if(!point){
        let along=0,best=Infinity;
        for(let j=0;j<contour.length;j++){
          const {from,dx,dy,squared,length:segmentLength}=segments[j];
          const fraction=clamp(((source[offset]-from.x)*dx+(source[offset+1]-from.y)*dy)/squared);
          const ex=source[offset]-from.x-dx*fraction,ey=source[offset+1]-from.y-dy*fraction;
          const distance=ex*ex+ey*ey;
          if(distance<best){best=distance;along=distances[j]+segmentLength*fraction;}
        }
        point=capsule(along/length*perimeter);
        // Preserve the rounded bevel layers instead of flattening the walls.
        point.push(clamp(Math.sqrt(best)/.045)*rim);mapped.set(key,point);
      }
      const back=clamp((sourceFront-source[offset+2])/sourceDepth);
      target[offset]=point[0]+point[2]*point[4]+rearX*back;
      target[offset+1]=point[1]+point[3]*point[4]+rearY*back;
      target[offset+2]=-depth*back;
    }
    playPosition.needsUpdate=true;
    // Calculate the finished extrusion's normals once, rather than rebuilding
    // a mesh or its normals at any point in the animation loop.
    const targetGeometry=new THREE.BufferGeometry();
    targetGeometry.setAttribute('position',playPosition.clone());
    targetGeometry.computeVertexNormals();
    playNormal.array.set(targetGeometry.getAttribute('normal').array);
    playNormal.needsUpdate=true;targetGeometry.dispose();
    const faceStart=face.color.clone(),sideStart=side.color.clone();
    const graphite=new THREE.Color(0x242424),edgeGraphite=new THREE.Color(0x101010);
    const skyStart=ambient.color.clone(),groundStart=ambient.groundColor.clone(),edgeStart=edge.color.clone();
    const neutralLight=new THREE.Color(0xffffff),neutralGround=new THREE.Color(0x252525);
    return progress=>{
      morph.value=progress;
      // The outline leads; material and depth resolve into graphite without
      // a late color snap or the previous flat-button replacement.
      const materialProgress=smooth(clamp((progress-.08)/.82));
      face.color.copy(faceStart).lerp(graphite,materialProgress);
      side.color.copy(sideStart).lerp(edgeGraphite,materialProgress);
      face.metalness=.72-.54*materialProgress;side.metalness=.8-.55*materialProgress;
      face.roughness=.28+.12*materialProgress;side.roughness=.24+.11*materialProgress;
      ambient.color.copy(skyStart).lerp(neutralLight,materialProgress);
      ambient.groundColor.copy(groundStart).lerp(neutralGround,materialProgress);
      edge.color.copy(edgeStart).lerp(neutralLight,materialProgress);
      playRim.intensity=1.6*materialProgress;
      const shadowProgress=smooth(clamp((progress-.4)/.6));
      shadow.visible=shadowProgress>0;shadowMaterial.opacity=shadowProgress;
      renderer.render(scene,view);
    };
  }
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);
    resizeObserver.disconnect();document.removeEventListener('visibilitychange',wake);
    reduced.removeEventListener('change',onReduced);window.removeEventListener('pagehide',onPageHide);
    geometry.dispose();face.dispose();side.dispose();
    shadowGeometry.dispose();shadowMaterial.dispose();shadowTexture.dispose();
    renderer.dispose();
    renderer.domElement.remove();stage.classList.remove('batman-model-ready');
    intro.classList.remove('play-webgl');
  }
  async function exit(){
    if(mode==='exit'||disposed)return;
    mode='exit';cancelAnimationFrame(frame);frame=0;
    // Let the stopped, upright silhouette read before its outline deforms.
    if(!reduced.matches)await new Promise(resolve=>setTimeout(resolve,180));
    if(disposed)return;
    let keepSurface=false;
    try{
      await morphBatmanIntoPlay(intro,reduced.matches,prepareMeshMorph);
      keepSurface=true;
    }
    catch(error){
      console.warn('Loader transition unavailable; opening PLAY.',error);
      intro.querySelector('.intro-loading').hidden=true;
      intro.querySelector('.intro-play').hidden=false;
      intro.querySelector('.intro-play button').inert=false;
      intro.classList.add('show-play','play-morphed');
      intro.classList.remove('play-morphing');
      intro.style.removeProperty('--play-detail-opacity');
      intro.querySelector('.intro-blue-bloom')?.remove();
    }finally{
      // The settled PLAY is one frozen GPU surface, with no ongoing draw loop.
      if(!keepSurface)dispose();resolveFinish?.();
    }
  }
  function tick(time){
    frame=0;
    if(disposed||document.hidden||mode==='exit')return;
    const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;
    if(mode==='spin'){
      spinTime+=dt;angle+=dt*spinSpeed;
      if(requested&&spinTime>=1.2){
        mode='settle';settleFrom=angle;
        settleTo=Math.ceil((angle-restYaw)/(Math.PI*2))*Math.PI*2+restYaw;
        // Give a nearly completed turn enough room to brake without reversing.
        if(settleTo-settleFrom<.5)settleTo+=Math.PI*2;
        settleDuration=Math.max(.65,Math.min(1.4,(settleTo-settleFrom)/spinSpeed*1.15));
      }
    }else if(mode==='settle'){
      settleTime+=dt;
      const t=Math.min(1,settleTime/settleDuration),t2=t*t,t3=t2*t;
      // Match the running spin at the start and reach zero velocity upright.
      angle=settleFrom+(3*t2-2*t3)*(settleTo-settleFrom)+(t3-2*t2+t)*spinSpeed*settleDuration;
      if(t===1){
        model.rotation.set(restPitch,restYaw,0);renderer.render(scene,view);exit();return;
      }
    }
    model.rotation.y=angle;renderer.render(scene,view);wake();
  }
  function wake(){
    if(disposed||mode==='exit')return;
    if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;return;}
    if(reduced.matches){
      cancelAnimationFrame(frame);frame=0;last=0;
      model.rotation.set(restPitch,restYaw,0);renderer.render(scene,view);
      if(requested)exit();return;
    }
    if(!frame)frame=requestAnimationFrame(tick);
  }
  function onReduced(){wake();}
  function onPageHide(event){if(!event.persisted)dispose();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  resizeObserver.observe(intro.querySelector('.flow-play'));
  document.addEventListener('visibilitychange',wake);
  reduced.addEventListener('change',onReduced);window.addEventListener('pagehide',onPageHide);
  resize();stage.classList.add('batman-model-ready');wake();
  return {dispose,finish(){
    if(!finishPromise)finishPromise=new Promise(resolve=>{resolveFinish=resolve;requested=true;wake();});
    return finishPromise;
  }};
}
