import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import * as THREE from './node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from './node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FastRoundedBoxGeometry } from './rounded-box-geometry.js';

// Execute the unchanged model builders with DOM/renderer stubs to obtain every
// real rounded-box parameter tuple, without WebGL or substituting geometry.
const parameters=[];
class Recorded extends RoundedBoxGeometry{constructor(...args){super(...args);parameters.push(args);}}
class Renderer{constructor(){this.domElement={};}setPixelRatio(){}setClearColor(){}}
const context=new Proxy({measureText:text=>({width:text.length*46}),createLinearGradient:()=>({addColorStop(){}})},
  {get:(target,key)=>target[key]||(()=>{})});
const document={createElement:()=>({width:128,height:128,getContext:()=>context})};
const button={append(){},classList:{add(){}},dataset:{}};
for(const [file,name]of [['photography-camera.js','buildCamera'],['gaming-controller.js','buildController'],['travel-plane.js','buildPlane'],['music-walkman.js','buildWalkman']]){
  const source=fs.readFileSync(file,'utf8'),body=source.slice(source.indexOf('function '+name+'('));
  new Function('THREE','RoundedBoxGeometry','document','button','connectHobbyMotion','devicePixelRatio','createHobbyRenderer',body+'\n'+name+'();')(
    {...THREE,WebGLRenderer:Renderer},Recorded,document,button,()=>{},2,()=>new Renderer());
}
for(const args of parameters){
  const before=new RoundedBoxGeometry(...args),after=new FastRoundedBoxGeometry(...args);
  assert.deepEqual(after.parameters,before.parameters);assert.deepEqual(after.groups,before.groups);
  assert.deepEqual(after.index?.array,before.index?.array);
  for(const key of Object.keys(before.attributes))assert.deepEqual(after.attributes[key].array,before.attributes[key].array,`${key}: ${args}`);
  const clone=after.clone();for(const key of Object.keys(before.attributes))assert.deepEqual(clone.attributes[key].array,before.attributes[key].array);
  clone.dispose();before.dispose();after.dispose();
}
const unrounded=new FastRoundedBoxGeometry(2,3,4,0,.2),referenceUnrounded=new RoundedBoxGeometry(2,3,4,0,.2);
assert.deepEqual(unrounded.parameters,referenceUnrounded.parameters);
for(const key of Object.keys(referenceUnrounded.attributes))assert.deepEqual(unrounded.attributes[key].array,referenceUnrounded.attributes[key].array);
assert.deepEqual(unrounded.index.array,referenceUnrounded.index.array);unrounded.dispose();referenceUnrounded.dispose();
const measure=Constructor=>{const start=performance.now();for(let i=0;i<3;i++)for(const args of parameters)new Constructor(...args).dispose();return performance.now()-start;};
console.log(JSON.stringify({boxes:parameters.length,exactAttributes:true,nativeMs:measure(RoundedBoxGeometry),cachedMs:measure(FastRoundedBoxGeometry)}));
