// Phone/tablet orbit videos only. Keep the full gallery videos and all originals.
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile),root=__dirname;
// 536 is the preview canvas's existing maximum backing width, including hover
// enlargement and its 2x DPR cap. Large landscape tablets retain that detail.
const recipe=width=>`orbit-cover-4x3-${width}-lanczos-h264-crf16-original-timestamps-v1`;
const filter=width=>`crop='trunc(min(iw,ih*4/3)/2)*2':'trunc(min(ih,iw*3/4)/2)*2',scale='min(${width},iw)':-2:flags=lanczos`;
function data(text){return JSON.parse(text.slice(text.indexOf('=',text.indexOf('export const'))+1).trim().replace(/;\s*$/,''));}
async function build(){
  const manifestPath=path.join(root,'mobile-media-data.json');
  const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
  const cachePath=path.join(root,'output/visibility-compression/preview-encode-cache.json');
  const cache=JSON.parse(await fs.readFile(cachePath,'utf8').catch(()=>'{}'));
  const sources=new Set();
  function collect(value){
    if(!value||typeof value!=='object')return;
    if(value.type==='video'){
      const source=value.preview||value.src;
      if(/^assets\/.*\.mp4$/i.test(source))sources.add(source);
    }
    Object.values(value).forEach(collect);
  }
  for(const file of ['photography-data.js','travel-data.js','gaming-data.js'])collect(data(await fs.readFile(path.join(root,file),'utf8')));
  collect(JSON.parse(await fs.readFile(path.join(root,'media-library.json'),'utf8')));
  const previews={},report=[];
  await fs.mkdir(path.join(root,'assets/mobile'),{recursive:true});
  for(const source of sources){
    const input=path.resolve(root,decodeURIComponent(source));
    if(!input.startsWith(root+path.sep))throw new Error('Invalid preview path');
    const content=await fs.readFile(input);
    const prior=path.join(root,manifest.files[source]||source);
    const before=(await fs.stat(prior)).size;
    for(const width of [384,536]){
    const hash=createHash('sha256').update(recipe(width)).update(content).digest('hex').slice(0,20);
    const relative=`assets/mobile/preview-${hash}.mp4`,output=path.join(root,relative);
    const key=source+':'+width;
    if(cache[key]?.hash===hash&&cache[key].before===before&&cache[key].selected===false){report.push(cache[key]);continue;}
    if(!await fs.stat(output).catch(()=>null)){
      const temporary=output+'.tmp';
      try{
        await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-map','0:v:0','-an',
          '-vf',filter(width),'-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p',
          '-fps_mode','passthrough','-enc_time_base','demux','-movflags','+faststart','-threads','2','-f','mp4',temporary],
          {windowsHide:true,maxBuffer:1024*1024});
        await fs.rename(temporary,output);
      }finally{await fs.unlink(temporary).catch(()=>{});}
    }
    const after=(await fs.stat(output)).size;
    const selected=after<before*.95;
    if(selected){previews[source]||={};previews[source][width]=relative;}
    else await fs.unlink(output);
    cache[key]={source,width,hash,selected,before,after};
    report.push(cache[key]);
    }
  }
  manifest.previews=previews;
  await fs.writeFile(manifestPath,JSON.stringify(manifest)+'\n');
  // Retain previous hashed copies, like shared JS chunks: an open page may
  // still hold an earlier manifest while a new release is being prepared.
  await fs.mkdir(path.join(root,'output/visibility-compression'),{recursive:true});
  await fs.writeFile(cachePath,JSON.stringify(cache));
  await fs.writeFile(path.join(root,'output/visibility-compression/preview-bytes.json'),JSON.stringify(report,null,2));
  console.log('Mobile orbit previews:',JSON.stringify(report));
}
module.exports=build;
if(require.main===module)build().catch(error=>{console.error(error);process.exitCode=1;});
