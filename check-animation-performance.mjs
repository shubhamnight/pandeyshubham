import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

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
  videoLifecycleCases:2}));
