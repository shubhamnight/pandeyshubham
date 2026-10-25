import { BoxGeometry, BufferGeometry, BufferAttribute, Vector3 } from './node_modules/three/build/three.module.js';

// The unit grid, normals and arc angles depend only on subdivision count.
// Reuse them across the existing boxes; dimensions/radius retain their exact
// original arithmetic. This avoids rebuilding grids and thousands of acos calls.
const templates=new Map();
const axesNames=['x','y','z'];
const faces=[['z','y',0,'y','z',1,1,0,0],['z','y',1,'y','z',1,-1,0,0],
  ['x','z',1,'z','x',0,0,1,0],['x','z',1,'z','x',1,0,-1,0],
  ['x','y',1,'y','x',1,0,0,1],['x','y',0,'y','x',1,0,0,-1]];
const axisIndex={x:0,y:1,z:2};
function templateFor(segments){
  if(templates.has(segments))return templates.get(segments);
  const total=segments*2+1,box=new BoxGeometry(1,1,1,total,total,total),grid=box.toNonIndexed();
  const positions=grid.attributes.position.array,vertices=positions.length/3;
  const normal64=new Float64Array(positions.length),normal32=new Float32Array(positions.length);
  const signs=new Int8Array(positions.length),angles=new Float64Array(vertices*2);
  const uvSigns=new Int8Array(vertices*2),axes=new Uint8Array(vertices*2),flips=new Uint8Array(vertices*2);
  const normal=new Vector3(),projected=new Vector3(),direction=new Vector3();
  const faceSize=positions.length/6,half=.5/total;
  for(let i=0,j=0;i<positions.length;i+=3,j+=2){
    normal.fromArray(positions,i);
    for(let a=0;a<3;a++){
      const axis=axesNames[a];signs[i+a]=Math.sign(normal[axis]);normal[axis]-=signs[i+a]*half;
    }
    normal.normalize();normal.toArray(normal64,i);normal.toArray(normal32,i);
    const face=faces[Math.floor(i/faceSize)];direction.set(face[6],face[7],face[8]);
    for(let k=0;k<2;k++){
      const axis=face[k*3],projection=face[k*3+1];
      projected.copy(normal);projected[projection]=0;projected.normalize();
      angles[j+k]=1-(projected.angleTo(direction)/(Math.PI/4));
      uvSigns[j+k]=Math.sign(projected[axis]);axes[j+k]=axisIndex[axis];flips[j+k]=face[k*3+2];
    }
  }
  const data={normal64,normal32,signs,angles,uvSigns,axes,flips,groups:grid.groups.map(group=>({...group}))};
  grid.dispose();box.dispose();templates.set(segments,data);return data;
}
export function FastRoundedBoxGeometry(width=1,height=1,depth=1,segments=2,radius=.1){
  radius=Math.min(width/2,height/2,depth/2,radius);
  if(segments===0){
    const geometry=new BoxGeometry(1,1,1,1,1,1);
    geometry.type='RoundedBoxGeometry';geometry.parameters={width,height,depth,segments,radius};return geometry;
  }
  const data=templateFor(segments),geometry=new BufferGeometry();
  geometry.type='RoundedBoxGeometry';geometry.parameters={width,height,depth,segments,radius};
  const dimensions=[width,height,depth],half=dimensions.map(value=>value/2-radius);
  const arc=2*Math.PI*radius/4;
  const arcRatios=new Float64Array(3),lengthRatios=new Float64Array(3);
  for(let axis=0;axis<3;axis++){
    const length=Math.max(dimensions[axis]-2*radius,0);
    arcRatios[axis]=.5*arc/(arc+length);lengthRatios[axis]=length/(arc+length);
  }
  const positions=new Float32Array(data.normal64.length),uv=new Float32Array(data.angles.length);
  for(let i=0;i<positions.length;i+=3){
    positions[i]=half[0]*data.signs[i]+data.normal64[i]*radius;
    positions[i+1]=half[1]*data.signs[i+1]+data.normal64[i+1]*radius;
    positions[i+2]=half[2]*data.signs[i+2]+data.normal64[i+2]*radius;
  }
  for(let j=0;j<uv.length;j++){
    const axis=data.axes[j],arcRatio=arcRatios[axis],lengthRatio=lengthRatios[axis],angle=data.angles[j];
    const value=data.uvSigns[j]===1?angle*arcRatio:lengthRatio+arcRatio+arcRatio*(1-angle);
    uv[j]=data.flips[j]?1-value:value;
  }
  geometry.setAttribute('position',new BufferAttribute(positions,3));
  geometry.setAttribute('normal',new BufferAttribute(data.normal32.slice(),3));
  geometry.setAttribute('uv',new BufferAttribute(uv,2));geometry.groups=data.groups.map(group=>({...group}));
  return geometry;
}
