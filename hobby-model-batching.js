import { Matrix4, Mesh } from './node_modules/three/build/three.module.js';
import { mergeGeometries } from './node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

// These models move as rigid units. Submit their opaque pieces together,
// retaining every vertex, normal, UV, material and the model's root motion.
// Transparent labels and glass keep their separate depth-sorted draws.
export function batchRigidModel(model) {
  model.updateWorldMatrix(true,true);
  const inverse=new Matrix4().copy(model.matrixWorld).invert();
  const relative=new Matrix4(),buckets=new Map(),removedGeometry=new Set();
  let before=0;
  model.traverseVisible(node=>{
    if(!node.isMesh)return;
    before++;
    const geometry=node.geometry,material=node.material;
    if(node.children.length||node.isSkinnedMesh||node.isInstancedMesh||Array.isArray(material)||
      material.transparent||!material.depthWrite||node.onBeforeRender!==Mesh.prototype.onBeforeRender||
      Object.keys(geometry.morphAttributes).length||geometry.drawRange.start!==0||
      geometry.drawRange.count!==Infinity)return;
    relative.multiplyMatrices(inverse,node.matrixWorld);
    if(relative.determinant()<=0)return;
    const attributes=Object.entries(geometry.attributes).map(([name,attribute])=>
      `${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`).sort().join('|');
    const key=`${material.id}:${node.renderOrder}:${node.castShadow}:${node.receiveShadow}:${node.layers.mask}:${attributes}`;
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push({node,matrix:relative.clone()});
  });
  let after=before;
  for(const pieces of buckets.values()){
    if(pieces.length<2)continue;
    const geometries=pieces.map(({node,matrix})=>{
      const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();
      return geometry.applyMatrix4(matrix);
    });
    const geometry=mergeGeometries(geometries,false);
    geometries.forEach(part=>part.dispose());
    if(!geometry)continue;
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const original=pieces[0].node,mesh=new Mesh(geometry,original.material);
    mesh.renderOrder=original.renderOrder;mesh.castShadow=original.castShadow;
    mesh.receiveShadow=original.receiveShadow;mesh.layers.mask=original.layers.mask;
    for(const {node} of pieces){removedGeometry.add(node.geometry);node.removeFromParent();}
    model.add(mesh);after-=pieces.length-1;
  }
  // Shared geometry that is still used by a label or an unbatched piece stays.
  model.traverse(node=>{if(node.geometry)removedGeometry.delete(node.geometry);});
  removedGeometry.forEach(geometry=>geometry.dispose());
  return {before,after};
}
