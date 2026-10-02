// Composite decoded frames into the card itself. Native video overlays can
// round their position separately from a card moving at fractional pixels.
const liveCards=new Set();
function cardResolution(){
  const width=innerWidth<=900?Math.max(79.2,Math.min(132,innerWidth*.228)):Math.max(132,Math.min(211.2,innerWidth*.156));
  return Math.ceil(Math.min(536,width*1.265*Math.min(devicePixelRatio||1,2))/4)*4;
}
window.addEventListener('resize',()=>{for(const player of liveCards)player.resize();},{passive:true});
window.addEventListener('pagehide',event=>{
  for(const player of [...liveCards])if(event.persisted)player.pause();else player.dispose();
});
export function createVideoCard(item) {
  const canvas=document.createElement('canvas');
  canvas.className='hobby-video-canvas';canvas.width=cardResolution();canvas.height=canvas.width*3/4;
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label',item.alt);
  const context=canvas.getContext('2d',{alpha:false});
  context.imageSmoothingQuality='high';
  const video=document.createElement('video');
  video.src=item.preview||item.src;video.preload='metadata';
  video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
  let playing=false,disposed=false,callback=null,lastFrame=-1;
  const nativeFrames='requestVideoFrameCallback' in video;
  function paint(source,w,h) {
    if(disposed||!w||!h)return;
    const ratio=canvas.width/canvas.height;
    const cropWidth=Math.min(w,h*ratio),cropHeight=cropWidth/ratio;
    context.drawImage(source,(w-cropWidth)/2,(h-cropHeight)/2,cropWidth,cropHeight,0,0,canvas.width,canvas.height);
  }
  const poster=new Image();poster.onload=()=>{if(lastFrame<0)paint(poster,poster.naturalWidth,poster.naturalHeight);};poster.src=item.poster;
  function update() {
    callback=null;
    if(!playing||disposed)return;
    if(video.readyState>=2 && video.currentTime!==lastFrame){
      paint(video,video.videoWidth,video.videoHeight);lastFrame=video.currentTime;
    }
    schedule();
  }
  function schedule(){
    if(callback!==null||!playing||disposed)return;
    callback=nativeFrames?video.requestVideoFrameCallback(update):requestAnimationFrame(update);
  }
  function cancel(){
    if(callback===null)return;
    if(nativeFrames)video.cancelVideoFrameCallback(callback);else cancelAnimationFrame(callback);
    callback=null;
  }
  canvas.videoPlayback={
    resize(){
      if(disposed)return;
      const size=cardResolution();if(canvas.width===size)return;
      canvas.width=size;canvas.height=size*3/4;context.imageSmoothingQuality='high';
      if(video.readyState>=2)paint(video,video.videoWidth,video.videoHeight);
      else if(poster.complete)paint(poster,poster.naturalWidth,poster.naturalHeight);
    },
    play(){
      if(playing||disposed)return Promise.resolve();
      playing=true;schedule();
      return video.play().catch(()=>{playing=false;cancel();});
    },
    pause(){if(!playing)return;playing=false;video.pause();cancel();},
    dispose(){playing=false;disposed=true;cancel();video.pause();video.removeAttribute('src');video.load();poster.onload=null;canvas.width=canvas.height=1;liveCards.delete(canvas.videoPlayback);}
  };
  liveCards.add(canvas.videoPlayback);
  return canvas;
}
