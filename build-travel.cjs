const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { execFileSync } = require('node:child_process');
(async () => {
  const root=path.join(__dirname,'TRAVEL');
  const output=path.join(__dirname,'assets','travel');
  await fs.mkdir(output,{recursive:true});
  const files=(await fs.readdir(root)).filter(name=>/\.(jpe?g|png|webp|mp4|mov)$/i.test(name)).sort();
  const media=[];
  for(let i=0;i<files.length;i++){
    const name=files[i],source=path.join(root,name),id=String(i+1).padStart(2,'0');
    const original='TRAVEL/'+encodeURIComponent(name);
    if(/\.(mp4|mov)$/i.test(name)){
      const poster=path.join(output,id+'-poster.jpg');
      execFileSync('ffmpeg',['-y','-loglevel','error','-ss','0.5','-i',source,'-frames:v','1','-q:v','2',poster]);
      await sharp(poster).resize({width:640,withoutEnlargement:true}).webp({quality:90}).toFile(path.join(output,id+'-poster.webp'));
      const info=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate','-of','json',source],{encoding:'utf8'})).streams[0];
      const [fpsN,fpsD]=info.r_frame_rate.split('/').map(Number);
      const fps=Math.min(30,fpsN/fpsD||30);
      const preview=id+'-preview.mp4';
      execFileSync('ffmpeg',['-y','-loglevel','error','-i',source,'-map','0:v:0','-vf',"scale=w='min(640,iw)':h=-2,fps="+fps,'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-an','-movflags','+faststart',path.join(output,preview)]);
      const gallerySrc='assets/travel/'+id+'-gallery-silent.mp4';
      if(name==='WhatsApp Video 2026-10-01 at 5.05.04 AM.mp4'){
        execFileSync('ffmpeg',['-y','-loglevel','error','-i',source,'-map','0:v:0','-vf','fps=24','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-an','-movflags','+faststart',path.join(__dirname,gallerySrc)]);
      }else{
        // Preserve the full-resolution picture bit for bit; discard audio.
        execFileSync('ffmpeg',['-y','-loglevel','error','-i',source,'-map','0:v:0','-c:v','copy','-an','-movflags','+faststart',path.join(__dirname,gallerySrc)]);
      }
      media.push({type:'video',src:original,original,...(gallerySrc?{gallerySrc}:{}),preview:'assets/travel/'+preview,poster:'assets/travel/'+id+'-poster.webp',width:info.width,height:info.height,alt:'Travel video'});
      await fs.unlink(poster);
    }else{
      const image=sharp(source).rotate(),metadata=await image.metadata();
      const portrait=[5,6,7,8].includes(metadata.orientation);
      const width=portrait?metadata.height:metadata.width,height=portrait?metadata.width:metadata.height;
      const variants=[];
      for(const size of [...new Set([Math.min(480,width),Math.min(960,width),width])]){
        const preview=id+'-'+size+'.webp';
        await sharp(source).rotate().resize({width:size,withoutEnlargement:true}).webp({quality:94,effort:5}).toFile(path.join(output,preview));
        variants.push({src:'assets/travel/'+preview,width:size});
      }
      media.push({type:'image',src:variants[0].src,srcset:variants.map(v=>v.src+' '+v.width+'w').join(', '),original,width,height,alt:'Travel photograph '+(i+1)});
      console.log(name+': '+width+' × '+height);
    }
  }
  await fs.writeFile(path.join(__dirname,'travel-data.js'),'// Generated from TRAVEL. Originals are preserved.\nexport const travelImages = '+JSON.stringify(media,null,2)+';\n');
  console.log('Prepared '+media.length+' travel items.');
})();
