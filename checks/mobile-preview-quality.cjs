// Optional FFmpeg/FFprobe check for the committed, mobile-only orbit encodes.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync,spawnSync}=require('node:child_process');
const {transformSync}=require('esbuild');
const manifest=JSON.parse(fs.readFileSync('mobile-media-data.json','utf8'));
function meta(file){return JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=width,height,r_frame_rate,nb_read_frames,duration','-of','json',file],{encoding:'utf8',windowsHide:true})).streams[0];}
async function resolver(touch,failed=false){
  let requests=0;const module={exports:{}};
  const code=transformSync(fs.readFileSync('mobile-media.js','utf8'),{format:'cjs'}).code;
  vm.runInNewContext(code,{module,Symbol,URL,location:{href:'http://localhost/'},
    require:()=>({touchPerformance:touch}),fetch:async()=>{requests++;if(failed)throw Error('offline');return {ok:true,json:async()=>manifest};}});
  await module.exports.mobileMediaReady;return {api:module.exports,requests};
}
(async()=>{
  const report=[],desktop=await resolver(false),phone=await resolver(true),offline=await resolver(true,true);
  assert.equal(desktop.requests,0,'desktop never downloads the mobile manifest');
  for(const [source,variants]of Object.entries(manifest.previews||{})){
    assert.equal(desktop.api.mobilePreviewSource(source,334),source,'desktop keeps its existing video');
    assert.equal(offline.api.mobilePreviewSource(source,334),source,'a failed manifest does not block previews');
    assert.equal(phone.api.mobilePreviewSource(source,334),variants[384]||variants[536]||manifest.files[source]||source);
    assert.equal(phone.api.mobilePreviewSource(source,536),variants[536]||manifest.files[source]||source);
    const reference=meta(source);
    for(const [width,target]of Object.entries(variants)){
      const encoded=meta(target);
      assert.equal(encoded.nb_read_frames,reference.nb_read_frames,'all frames retained');
      assert.equal(encoded.r_frame_rate,reference.r_frame_rate,'original cadence retained');
      assert.ok(Math.abs(Number(encoded.duration)-Number(reference.duration))<.002,'container duration remains within 2ms');
      const cropWidth=Math.floor(Math.min(reference.width,reference.height*4/3)/2)*2;
      assert.equal(encoded.width,Math.min(Number(width),cropWidth));
      const filter=`crop='trunc(min(iw,ih*4/3)/2)*2':'trunc(min(ih,iw*3/4)/2)*2',scale='min(${width},iw)':-2:flags=lanczos`;
      const result=spawnSync('ffmpeg',['-hide_banner','-nostats','-i',source,'-i',target,'-lavfi',`[0:v]${filter}[ref];[ref][1:v]ssim`,'-an','-f','null','-'],{encoding:'utf8',windowsHide:true});
      assert.equal(result.status,0,result.stderr);
      const ssim=Number(result.stderr.match(/All:([\d.]+)/)?.[1]);
      assert.ok(ssim>=.99,'high quality relative to the same centered/scaled reference');
      const before=fs.statSync(manifest.files[source]||source).size,after=fs.statSync(target).size;
      assert.ok(after<before*.95,'only encodes saving at least 5% are selected');
      report.push({source,target,width:Number(width),reference,encoded,ssim,before,after});
    }
  }
  fs.mkdirSync('output/visibility-compression',{recursive:true});
  fs.writeFileSync('output/visibility-compression/preview-quality.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({variants:report.length,minimumSSIM:Math.min(...report.map(r=>r.ssim)),originalCadence:true,desktopUnchanged:true,manifestFailureFallback:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
