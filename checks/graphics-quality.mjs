import assert from 'node:assert/strict';
import { graphicsPixelRatio } from '../graphics-quality.js';
const previous=Object.fromEntries(['matchMedia','navigator','devicePixelRatio'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
let checks=0;
try{
 for(const [coarse,platform,points,touch]of [[false,'Win32',0,false],[true,'Linux',5,true],[false,'MacIntel',5,true],[false,'MacIntel',0,false]]){
  Object.defineProperty(globalThis,'matchMedia',{configurable:true,value:()=>({matches:coarse})});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{platform,maxTouchPoints:points}});
  for(const dpr of [.75,1,1.25,1.5,2,3,4]){
   Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:dpr});
   for(const [kind,limit]of Object.entries(touch?{model:1.25,background:1.25,preview:1.5}:{model:1.5,background:1.35,preview:1.75})){
    assert.equal(graphicsPixelRatio(kind),Math.min(dpr,limit));
    assert.equal(graphicsPixelRatio(kind,1),Math.min(dpr,1));checks+=2;
   }
  }
 }
}finally{
 for(const [key,descriptor]of Object.entries(previous))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
}
console.log(`${checks} graphics density checks passed, including desktop-mode iPad and zoomed-out displays.`);
