// Exercise the optional packager without owner credentials or publishing.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const buildShare=require('../build-share.cjs'),root=fs.realpathSync(path.join(__dirname,'..'));
assert.throws(()=>buildShare({identity:{project_id:'local-test'},outputRoot:path.dirname(root)}),/inside the workspace/);
const parent=path.join(root,'tmp');fs.mkdirSync(parent,{recursive:true});
const checkout=fs.mkdtempSync(path.join(parent,'legacy-share-check-'));
try{
 const dist=buildShare({identity:{project_id:'local-test'},outputRoot:checkout,build:()=>path.join(root,'dist')});
 for(const name of ['index.html','intro.js','hobby-preparation.js','offline.html','offline-sw.js','social-links.json','mobile-media-data.json','vendor/three/examples/jsm/utils/BufferGeometryUtils.js','assets/ui/photography-carousel-recovery.js']){
  assert.deepEqual(fs.readFileSync(path.join(dist,name)),fs.readFileSync(path.join(root,'dist',name)),name+' stays current in the shared package');
 }
 for(const name of ['batman-loader.js','contour-nearest.js','vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js'])assert.equal(fs.existsSync(path.join(dist,name)),false,'retired code is not repackaged');
 assert.equal(JSON.parse(fs.readFileSync(path.join(checkout,'.openai/hosting.json'))).project_id,'local-test');
 console.log('Share packaging: current runtime, offline/recovery assets, metadata, vendor dependencies and output containment passed. No publishing performed.');
}finally{
 assert.ok(checkout.startsWith(parent+path.sep+'legacy-share-check-'));
 assert.equal(fs.realpathSync(checkout),checkout);
 assert.ok(!fs.lstatSync(checkout).isSymbolicLink());
 fs.rmSync(checkout,{recursive:true,force:true});
}
