const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {transformSync}=require('esbuild');
const scope={module:{exports:{}}};
vm.runInNewContext(transformSync(fs.readFileSync('intro-liquid.js','utf8'),{format:'cjs',target:'es2020'}).code,scope);
const {capsuleContour,interpolateContour}=scope.module.exports;
function area(points){
  const vertices=[points.slice(0,2)];let previous=vertices[0];
  for(let index=2;index<points.length;index+=6){
    const segment=points.slice(index,index+6);
    for(let n=1;n<=128;n++){
      const t=n/128,a=1-t;
      vertices.push([0,1].map(k=>a*a*a*previous[k]+3*a*a*t*segment[k]+3*a*t*t*segment[k+2]+t*t*t*segment[k+4]));
    }
    previous=segment.slice(4);
  }
  return Math.abs(vertices.reduce((sum,v,i)=>{const next=vertices[(i+1)%vertices.length];return sum+v[0]*next[1]-next[0]*v[1];},0)/2);
}
let shapes=0;
for(const [w,h]of [[18.475,18.475],[218.5,76.5],[250,86],[45,100]]){
  const frame=capsuleContour(w,h),r=Math.min(w,h)/2;
  assert.equal(frame.length,50);assert.ok(frame.every(Number.isFinite));
  assert.ok(Math.abs(frame[0]-frame.at(-2))<1e-9&&Math.abs(frame[1]-frame.at(-1))<1e-9,'closed contour');
  const expected=Math.abs(w-h)*Math.min(w,h)+Math.PI*r*r;
  assert.ok(Math.abs(area(frame)-expected)/expected<.001,'matches the independently calculated capsule area');
  const circle=capsuleContour(18.475,18.475);
  for(let i=0;i<=60;i++)assert.ok(!/NaN|Infinity/.test(interpolateContour(circle,frame,i/60)));
  const path=interpolateContour(circle,frame,1),values=path.match(/-?[\d.]+/g).map(Number);
  assert.ok(values.every((v,i)=>Math.abs(v-frame[i])<=.000501),'morph endpoint matches actual button geometry to subpixel precision');
  shapes++;
}
console.log(JSON.stringify({shapes,closedContours:true,independentAreaCheck:true,finiteIntermediatePaths:true,preciseButtonEndpoint:true}));
