import assert from 'node:assert/strict';
import {createHobbyRenderer} from './hobby-renderer.js';
const previous=globalThis.document;
globalThis.document={createElement:()=>({style:{}})};
try{
 for(const ratio of [1,1.25,1.5,2])for(const [width,height]of [[70,59],[126,106],[151,127]]){
  const calls=[];
  class Renderer{
   constructor(options){this.options=options;calls.push(['initial',options.canvas.width,options.canvas.height]);}
   setDrawingBufferSize(w,h,dpr){calls.push(['buffer',w,h,dpr]);}
  }
  const renderer=createHobbyRenderer(Renderer,{clientWidth:width,clientHeight:height},ratio);
  const density=Math.min(globalThis.devicePixelRatio||1,ratio,1.5);
  assert.deepEqual(calls,[['initial',Math.floor(width*density),Math.floor(height*density)],['buffer',width,height,density]]);
  assert.equal(renderer.options.alpha,true);assert.equal(renderer.options.antialias,true);
  assert.equal(renderer.options.powerPreference,'low-power');
 }
 console.log('Model renderer: bounded DPR, retained antialiasing, dimensions and one-step buffer configuration passed.');
}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
