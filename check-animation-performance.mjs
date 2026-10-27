import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import * as THREE from './node_modules/three/build/three.module.js';
import { transformSync } from 'esbuild';
import { batmanOutline } from './batman-emblem.js';
import { createContourSearch } from './contour-nearest.js';

const ts=fs.readFileSync('lib/travel-motion.ts','utf8');
const scope={module:{exports:{}}};
vm.runInNewContext(transformSync(ts,{loader:'ts',format:'cjs'}).code,scope);
const {advanceTravelMotion}=scope.module.exports;
const legacy=(s,drag=false,reduce=false)=>{
  if(!reduce&&!drag&&Math.abs(s.velocity)>.1){s.target+=s.velocity;s.velocity*=.92;}
  else if(!drag)s.velocity=0;
  s.current+=(s.target-s.current)*(reduce?1:drag?.22:.08);
};
let comparisons=0;
for(const velocity of [-35,-.11,0,.11,35])for(const dragging of [false,true])for(const reduced of [false,true]){
  const a={current:-70,target:250,velocity},b={...a};
  for(let i=0;i<240;i++){
    legacy(a,dragging,reduced);advanceTravelMotion(b,1,dragging,reduced);
    for(const key of ['current','target','velocity'])assert.ok(Math.abs(a[key]-b[key])<1e-9,`${key}: 60 Hz recurrence`);
    comparisons++;
  }
}
for(const hz of [30,60,75,90,120,144,165,240]){
  const s={current:0,target:600,velocity:0};
  for(let i=0;i<hz;i++)advanceTravelMotion(s,60/hz,false,false);
  assert.ok(Math.abs(s.current-600*(1-Math.pow(.92,60)))<1e-9,'refresh-independent scroll easing');
  const moving={current:0,target:600,velocity:35};
  for(let i=0;i<hz/3;i++)advanceTravelMotion(moving,60/hz,false,false);
  const reference={current:0,target:600,velocity:35};
  const steps=Math.ceil(hz/3)*60/hz;
  advanceTravelMotion(reference,steps,false,false);
  assert.ok(Math.abs(moving.current-reference.current)<1e-8,'refresh-independent momentum');
}

// Reconstruct the actual dense intro contour and the actual vertex samples.
const shape=new THREE.Shape(),x=v=>(v-84)/28,y=v=>(73-v)/28;
for(const [command,...v]of batmanOutline){
  if(command==='M')shape.moveTo(x(v[0]),y(v[1]));
  else if(command==='L')shape.lineTo(x(v[0]),y(v[1]));
  else if(command==='C')shape.bezierCurveTo(x(v[0]),y(v[1]),x(v[2]),y(v[3]),x(v[4]),y(v[5]));
  else shape.closePath();
}
const outline=shape.getPoints(24);if(outline[0].distanceToSquared(outline.at(-1))<1e-10)outline.pop();
const contour=[];
for(let i=0;i<outline.length;i++){
  const from=outline[i],to=outline[(i+1)%outline.length],steps=Math.max(1,Math.ceil(from.distanceTo(to)/.045));
  for(let j=0;j<steps;j++)contour.push(from.clone().lerp(to,j/steps));
}
const geometry=new THREE.ExtrudeGeometry(new THREE.Shape(contour),{depth:.2646,bevelEnabled:true,
  bevelThickness:.0315,bevelSize:.045,bevelSegments:3,steps:1,curveSegments:24});
const source=fs.readFileSync('batman-loader.js','utf8');
const cap=source.slice(source.indexOf('function preserveCapBoundary'),source.indexOf('// Match the upper'));
new Function('THREE','geometry','contour',cap+'\npreserveCapBoundary(geometry,contour);')(THREE,geometry,contour);
geometry.computeBoundingBox();const origin=geometry.boundingBox.getCenter(new THREE.Vector3());
geometry.translate(-origin.x,-origin.y,-origin.z);contour.forEach(p=>{p.x-=origin.x;p.y-=origin.y;});
const segments=contour.map((from,i)=>{const to=contour[(i+1)%contour.length],dx=to.x-from.x,dy=to.y-from.y;return {from,dx,dy,squared:dx*dx+dy*dy,length:Math.hypot(dx,dy)};});
function brute(px,py){
  const result={index:-1,fraction:0,squared:Infinity};
  segments.forEach(({from,dx,dy,squared},index)=>{
    const fraction=Math.max(0,Math.min(1,((px-from.x)*dx+(py-from.y)*dy)/Math.max(squared,1e-12)));
    const ex=px-from.x-dx*fraction,ey=py-from.y-dy*fraction,distance=ex*ex+ey*ey;
    if(distance<result.squared){result.index=index;result.fraction=fraction;result.squared=distance;}
  });return result;
}
const points=new Map(),position=geometry.attributes.position;
for(let i=0;i<position.count;i++)points.set(position.getX(i)+','+position.getY(i),[position.getX(i),position.getY(i)]);
const lookup=createContourSearch(segments),result={index:0,fraction:0,squared:0},expected=[];
const start=performance.now();for(const [px,py]of points.values())expected.push(brute(px,py));const before=performance.now()-start;
let index=0;const started=performance.now();
for(const [px,py]of points.values()){lookup(px,py,result);assert.deepEqual(result,expected[index++],'exact projection and original tie order');}
const after=performance.now()-started;
// Include cell boundaries, ties, intersections and queries beyond the outline.
for(const [px,py]of [[0,0],[-20,-10],[20,10],...[...points.values()].slice(0,40).map(([px,py])=>[px+.09,py-.09])]){
  lookup(px,py,result);assert.deepEqual(result,brute(px,py));
}
geometry.dispose();
// Video slides must resume only playback that was active before suspension.
const photo=fs.readFileSync('components/ui/hero-carousel.tsx','utf8');
const videoStart=photo.indexOf("    const video = stageRef.current?.querySelector('video')");
const videoBody=photo.slice(videoStart,photo.indexOf('  }, [active?.videoSrc])',videoStart));
for(const initiallyPaused of [true,false]){
  const docEvents=new Map(),winEvents=new Map();let plays=0,loads=0;
  const video={paused:initiallyPaused,ended:false,pause(){this.paused=true;},play(){plays++;this.paused=false;return Promise.resolve();},removeAttribute(){},load(){loads++;}};
  const document={hidden:false,addEventListener:(k,f)=>docEvents.set(k,f),removeEventListener:k=>docEvents.delete(k)};
  const window={addEventListener:(k,f)=>winEvents.set(k,f),removeEventListener:k=>winEvents.delete(k)};
  const cleanup=new Function('stageRef','document','window',videoBody)({current:{querySelector:()=>video}},document,window);
  document.hidden=true;docEvents.get('visibilitychange')();winEvents.get('pagehide')();
  assert.equal(video.paused,true);
  document.hidden=false;docEvents.get('visibilitychange')();winEvents.get('pageshow')();
  assert.equal(plays,initiallyPaused?0:1,'manual pause is respected and active playback resumes once');
  cleanup();assert.equal(docEvents.size+winEvents.size,0);assert.equal(loads,1);
}
console.log(JSON.stringify({travelRecurrenceComparisons:comparisons,refreshRates:[30,60,75,90,120,144,165,240],
  contourSegments:segments.length,uniqueVertexQueries:points.size,bruteMs:before,indexedMs:after,speedup:before/after}));
