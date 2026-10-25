import assert from 'node:assert/strict';
import { BoxGeometry, Group, Matrix3, Mesh, MeshBasicMaterial, Vector3 } from './node_modules/three/build/three.module.js';
import { batchRigidModel } from './hobby-model-batching.js';

function vertices(model){
  model.updateWorldMatrix(true,true);
  const result=[];
  model.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;
    const geometry=mesh.geometry,index=geometry.index,position=geometry.attributes.position;
    const normalMatrix=new Matrix3().getNormalMatrix(mesh.matrixWorld);
    for(let i=0;i<(index?.count??position.count);i++){
      const vertex=index?index.getX(i):i;
      const value=new Vector3().fromBufferAttribute(position,vertex).applyMatrix4(mesh.matrixWorld);
      const normal=new Vector3().fromBufferAttribute(geometry.attributes.normal,vertex).applyNormalMatrix(normalMatrix);
      const uv=geometry.attributes.uv;
      result.push(`${mesh.material.id}:${[value.x,value.y,value.z,normal.x,normal.y,normal.z,uv.getX(vertex),uv.getY(vertex)].map(n=>Math.round(n*1e4)).join(',')}`);
    }
  });
  return result.sort();
}
const root=new Group(),nested=new Group();root.add(nested);
root.position.set(4,2,-3);root.rotation.set(.2,-.3,.1);root.scale.setScalar(1.2);
nested.rotation.set(.1,.4,-.2);nested.position.set(1,2,0);
const material=new MeshBasicMaterial(),glass=new MeshBasicMaterial({transparent:true,opacity:.2});
const shared=new BoxGeometry();let disposed=0;shared.addEventListener('dispose',()=>disposed++);
for(let i=0;i<4;i++){
  const mesh=new Mesh(shared,material);mesh.position.set(i*.2,i*.3,i*.4);mesh.rotation.z=i*.1;nested.add(mesh);
}
const transparent=new Mesh(shared,glass);root.add(transparent);
const mirrored=new Mesh(shared,material);mirrored.scale.x=-1;root.add(mirrored);
const custom=new Mesh(shared,material);custom.onBeforeRender=()=>{};root.add(custom);
const hidden=new Mesh(shared,material);hidden.visible=false;root.add(hidden);
const original=vertices(root),stats=batchRigidModel(root);
assert.deepEqual(stats,{before:7,after:4});
const combined=root.children.find(node=>node.isMesh&&node!==transparent&&node!==mirrored&&node!==custom&&node!==hidden);
assert.ok(combined.geometry.index,'compatible indexed pieces keep their index buffer');
assert.equal(combined.geometry.attributes.position.count,shared.attributes.position.count*4,
  'shared vertices are not expanded into one vertex per triangle corner');
assert.deepEqual(vertices(root),original,'world-space vertices, normals and texture coordinates are unchanged');
assert.equal(transparent.parent,root);assert.equal(mirrored.parent,root);assert.equal(custom.parent,root);
assert.equal(hidden.visible,false);assert.equal(disposed,0,'shared geometry remains available');
root.rotation.y+=.7;
assert.equal(vertices(root).length,original.length,'all geometry follows root motion');
// Mixed buckets still merge into exactly one draw with identical triangle data.
const mixed=new Group();
mixed.add(new Mesh(new BoxGeometry(),material),new Mesh(new BoxGeometry().toNonIndexed(),material));
const mixedOriginal=vertices(mixed);
assert.deepEqual(batchRigidModel(mixed),{before:2,after:1});
assert.deepEqual(vertices(mixed),mixedOriginal);
let constructions=0;
class CountedBox extends BoxGeometry{constructor(...args){super(...args);constructions++;}}
const procedural=new Group();
procedural.add(new Mesh(new CountedBox(2,3,4),material),new Mesh(new CountedBox(3,2,1),material));
const proceduralOriginal=vertices(procedural);
batchRigidModel(procedural);
assert.equal(constructions,2,'batch copies do not rebuild procedural geometry');
assert.deepEqual(vertices(procedural),proceduralOriginal);
console.log('Rigid model batching: geometry, transforms, transparency, exclusions and shared resources passed.');
