import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { graphicsPixelRatio } from '../graphics-quality.js';
const previous=Object.fromEntries(['matchMedia','navigator','devicePixelRatio'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
let checks=0;const results=[];
const scaled=ratio=>ratio*Math.sqrt(.70);
function test(name,run){try{run();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}}
try{
 test('30% fewer pixels across normal device and caller limits',()=>{
 for(const [coarse,platform,points,touch]of [[false,'Win32',0,false],[true,'Linux',5,true],[false,'MacIntel',5,true],[false,'MacIntel',0,false]]){
  Object.defineProperty(globalThis,'matchMedia',{configurable:true,value:()=>({matches:coarse})});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{platform,maxTouchPoints:points}});
  for(const dpr of [.75,1,1.25,1.5,2,3,4]){
   Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:dpr});
   for(const [kind,limit]of Object.entries(touch?{model:1.25,background:1.25,preview:1.5}:{model:1.5,background:1.35,preview:1.75})){
    assert.equal(graphicsPixelRatio(kind),scaled(Math.min(dpr,limit)));
    assert.equal(graphicsPixelRatio(kind,1),scaled(Math.min(dpr,1)));checks+=2;
   }
  }
 }
 });
 // Only corroborated low-capacity hints reduce initial decorative density.
 // A missing/clamped single hint must not classify a capable device as weak.
 test('corroborated weak hardware only',()=>{for(const [memory,cores,low]of [[2,2,true],[4,4,true],[8,4,false],[4,8,false],
   [undefined,4,false],[4,undefined,false],[0,0,false],[-1,2,false],[NaN,2,false]]){
  for(const coarse of [false,true]){
   Object.defineProperty(globalThis,'matchMedia',{configurable:true,value:()=>({matches:coarse})});
   Object.defineProperty(globalThis,'navigator',{configurable:true,value:{deviceMemory:memory,hardwareConcurrency:cores}});
   Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:3});
   const limits=low?{model:1,background:1,preview:1.25}:coarse?
     {model:1.25,background:1.25,preview:1.5}:{model:1.5,background:1.35,preview:1.75};
   for(const [kind,limit]of Object.entries(limits)){
    assert.equal(graphicsPixelRatio(kind),scaled(limit),`${kind}: memory=${memory}, cores=${cores}, touch=${coarse}`);
    assert.equal(graphicsPixelRatio(kind,.75),scaled(.75),'the global reduction also applies below the tier cap');checks+=2;
   }
  }
 }});
}finally{
 for(const [key,descriptor]of Object.entries(previous))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
}
const source=fs.readFileSync(new URL('../graphics-quality.js',import.meta.url),'utf8').replace(/\bexport (?=(?:function|const))/g,'');
function fixture(){
 const events=new Map(),classes=new Set(),errors=[];
 const document={hidden:false,body:{classList:{contains:name=>classes.has(name)}}};
 const window={
  addEventListener(name,callback){if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);},
  removeEventListener(name,callback){events.get(name)?.delete(callback);},
 };
 document.addEventListener=window.addEventListener;document.removeEventListener=window.removeEventListener;
 const context=vm.createContext({window,document,Symbol,Number,devicePixelRatio:3,
  matchMedia:()=>({matches:false}),navigator:{deviceMemory:8,hardwareConcurrency:8},console:{error:error=>errors.push(error)}});
 const load=()=>vm.runInContext('(()=>{'+source+';return {graphicsPixelRatio,reportGraphicsFrame:typeof reportGraphicsFrame==="function"?reportGraphicsFrame:null,observeGraphicsQuality:typeof observeGraphicsQuality==="function"?observeGraphicsQuality:null};})()',context);
 const api=load();
 assert.equal(typeof api.reportGraphicsFrame,'function','runtime feedback API is available');
 assert.equal(typeof api.observeGraphicsQuality,'function','shared density subscription API is available');
 let time=0;
 return {api,load,context,document,classes,errors,events,
  emit:(name,event={})=>{for(const callback of [...(events.get(name)||[])])callback(event);},
  frame(delta=50,active=true){time+=delta;return api.reportGraphicsFrame(time,active);},
  frames(count,delta=50,active=true){for(let i=0;i<count;i++)this.frame(delta,active);},
  ratio:()=>api.graphicsPixelRatio('model'),
 };
}
test('sustained pressure needs two complete windows; quality latches once',()=>{
 const f=fixture();let changes=0;f.api.observeGraphicsQuality(()=>changes++);
 f.frame();f.frames(79);assert.equal(f.ratio(),scaled(1.5));assert.equal(changes,0);
 assert.equal(f.frame(),true);assert.equal(f.ratio(),scaled(1));assert.equal(changes,1);
 f.frames(200,16.67);f.frames(200,50);assert.equal(f.ratio(),scaled(1));assert.equal(changes,1);
});
test('decorative caps, invalid feedback and caller bounds remain safe',()=>{
 const f=fixture();assert.equal(f.api.graphicsPixelRatio('decorative'),scaled(1.5));
 f.context.matchMedia=()=>({matches:true});assert.equal(f.api.graphicsPixelRatio('decorative'),scaled(1.5));
 f.context.navigator={deviceMemory:4,hardwareConcurrency:4};assert.equal(f.api.graphicsPixelRatio('decorative'),scaled(1));
 assert.equal(f.api.graphicsPixelRatio('decorative',.75),scaled(.75));
 f.context.navigator={};f.frame();f.frames(40);
 for(const time of [NaN,Infinity,-1,undefined])assert.equal(f.api.reportGraphicsFrame(time),false);
 f.frames(41);assert.equal(f.api.graphicsPixelRatio('model'),scaled(1.25));
 for(const dpr of [0,-1,NaN,Infinity]){f.context.devicePixelRatio=dpr;assert.equal(f.api.graphicsPixelRatio('model'),scaled(1));}
 assert.ok(Number.isFinite(f.api.graphicsPixelRatio('unknown',NaN)));
});
test('healthy 30Hz/24fps, transient stall and duplicate timestamps keep full quality',()=>{
 const f=fixture();f.frames(180,1000/30);f.frames(180,1000/24);f.frame(700);f.frames(180,16.67);
 const stamp=25000;f.api.reportGraphicsFrame(stamp);for(let i=0;i<200;i++)f.api.reportGraphicsFrame(stamp);
 f.api.reportGraphicsFrame(stamp-1);assert.equal(f.ratio(),scaled(1.5));
});
test('severe sustained 4fps pressure adapts; idle/occlusion gaps do not',()=>{
 const f=fixture();f.frames(40,2000);assert.equal(f.ratio(),scaled(1.5));
 f.frame(250);f.frames(24,250);assert.equal(f.ratio(),scaled(1));
});
test('hidden, inactive, loading and paused windows never accumulate pressure',()=>{
 const f=fixture();f.frame();f.frames(39);f.document.hidden=true;f.frames(100);f.document.hidden=false;
 f.frames(41);assert.equal(f.ratio(),scaled(1.5));f.frames(100,50,false);
 for(const name of ['intro-active','badge-entering','hobbies-intro-active','photography-gallery-open','motion-paused']){
  f.classes.add(name);f.frames(100);f.classes.delete(name);assert.equal(f.ratio(),scaled(1.5));
 }
 f.frames(41);assert.equal(f.ratio(),scaled(1.5));
});
test('visibility changes reset pressure even while existing clocks are stopped',()=>{
 const f=fixture();f.frame();f.frames(40);
 f.document.hidden=true;f.emit('visibilitychange');f.document.hidden=false;f.emit('visibilitychange');
 f.frame(100);f.frames(39);assert.equal(f.ratio(),scaled(1.5),'a brief hidden interval separates pressure windows');
});
test('native and bundled copies share one latch, notify once and isolate subscribers',()=>{
 const f=fixture(),second=f.load();let changes=0;
 const stop=f.api.observeGraphicsQuality(()=>{throw Error('Injected subscriber failure');});
 const off=second.observeGraphicsQuality(()=>changes++);
 f.api.reportGraphicsFrame(0);
 for(let i=1;i<=80;i++){f.api.reportGraphicsFrame(i*50);second.reportGraphicsFrame(i*50);}
 assert.equal(second.graphicsPixelRatio('background'),scaled(1));assert.equal(changes,1);
 assert.equal(f.errors.length,1);assert.equal(f.events.get('pagehide').size,1);
 stop();off();off();f.frames(100);assert.equal(changes,1);
});
test('subscriber re-registration cannot repeat a density notification',()=>{
 const f=fixture();let changes=0,off;
 const callback=()=>{if(++changes===1){off();f.api.observeGraphicsQuality(callback);}};
 off=f.api.observeGraphicsQuality(callback);f.frame();f.frames(80);assert.equal(changes,1);
});
test('unsubscribe and permanent disposal prevent callbacks; persisted hide resets only evidence',()=>{
 const f=fixture();let changes=0;const off=f.api.observeGraphicsQuality(()=>changes++);off();
 f.frame();f.frames(39);f.emit('pagehide',{persisted:true});f.frames(41);assert.equal(f.ratio(),scaled(1.5));
 f.api.observeGraphicsQuality(()=>changes++);f.emit('pagehide',{persisted:false});f.frames(200);
 assert.equal(f.ratio(),scaled(1.5));assert.equal(changes,0);assert.equal(f.events.get('pagehide').size,0);
 assert.equal(f.events.get('visibilitychange').size,0);
});
console.log(JSON.stringify({densityAssertions:checks,results},null,2));
if(results.some(result=>!result.pass))process.exitCode=1;
