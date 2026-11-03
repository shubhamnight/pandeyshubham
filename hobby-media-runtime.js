import { createVideoCard } from './hobby-video-card.js';
import { mobileMediaSource, mobileMediaSrcset } from './mobile-media.js';

function galleryVideo(item) {
  const video=document.createElement('video');
  video.src=mobileMediaSource(item.src);video.poster=mobileMediaSource(item.poster);
  video.preload='none';video.playsInline=true;video.controls=true;video.muted=false;video.loop=false;
  video.width=item.width;video.height=item.height;video.setAttribute('aria-label',item.alt);
  return video;
}

export function createHobbyMedia(item,gallery=false,createGalleryVideo=galleryVideo) {
  if(item.type==='video')return gallery?createGalleryVideo(item):createVideoCard(item);
  const image=document.createElement('img');image.alt=item.alt;image.decoding='async';
  image.width=item.width;image.height=item.height;
  image.loading=gallery?'lazy':'eager';image.fetchPriority=gallery?'low':'auto';
  if(gallery){
    const previews=item.srcset.split(', ').filter(source=>Number(source.split(' ').at(-1).slice(0,-1))<item.width);
    image.srcset=mobileMediaSrcset([...previews,item.original+' '+item.width+'w'].join(', '));
    image.sizes='(max-width:600px) 42vw, (max-width:1100px) 28vw, 300px';
  }
  image.src=mobileMediaSource(gallery?item.original:item.src);
  return image;
}

/** Keep the existing three-slot cycle, decode handoff and video visibility lifecycle. */
export function connectHobbyPreviews(selector,nextMedia,mediaElement,onDispose) {
  const section=document.querySelector('#projects');
  const slots=[...section.querySelectorAll(selector+' .hobby-image-placeholder')].slice(0,3);
  const visible=new Set(),players=new WeakMap(),failures=new Map(),pendingLoads=new Map();
  const surfaces=new Map(slots.map(slot=>[slot,slot.querySelector('.hobby-image-surface')]));
  let disposed=false,previousAllowed=null,started=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const playbackAllowed=()=>!disposed&&!document.hidden&&!reduced.matches&&
    !document.body.classList.contains('hobbies-intro-active')&&
    !document.body.classList.contains('motion-paused')&&
    !document.body.classList.contains('photography-gallery-open');
  function playback(){
    const allowed=playbackAllowed();
    for(const slot of slots){const video=players.get(slot);if(!video)continue;
      if(allowed&&visible.has(slot))video.play().catch(()=>{});else video.pause();
    }
  }
  function retryFailed(){
    if(disposed||document.hidden||navigator.onLine===false)return;
    for(const [slot,failure] of failures){
      if(failure.timer||failure.attempt>2)continue;
      failure.timer=setTimeout(()=>{
        failure.timer=0;
        if(!disposed&&!document.hidden&&navigator.onLine!==false&&failures.get(slot)===failure)
          void fill(slot,failure.item,failure.attempt);
      },failure.attempt===1?250:1000);
    }
  }
  function syncPlayback(){const next=playbackAllowed();if(next!==previousAllowed){previousAllowed=next;playback();}retryFailed();}
  function recover(){
    // A real reconnect/restore renews an exhausted budget; animation/class
    // changes only resume pending attempts and cannot create a polling loop.
    for(const failure of failures.values())if(failure.attempt>2)failure.attempt=1;
    playback();retryFailed();
  }
  async function fill(slot,item=nextMedia(),attempt=0){
    if(disposed)return;
    pendingLoads.get(slot)?.();
    clearTimeout(failures.get(slot)?.timer);failures.delete(slot);
    if(!item)return;
    const version=(slot.mediaVersion||0)+1;slot.mediaVersion=version;
    const element=mediaElement(item);
    if(item.type==='image'){
      if(attempt&&element.src){
        const source=new URL(element.src,location.href);
        if(source.origin===location.origin){source.searchParams.set('preview-retry',String(attempt));element.src=source.href;}
      }
      try{await new Promise((resolve,reject)=>{
        let finished=false,timer;
        const finish=error=>{
          if(finished)return;finished=true;clearTimeout(timer);
          if(pendingLoads.get(slot)===cancel)pendingLoads.delete(slot);
          if(error){element.removeAttribute?.('srcset');element.removeAttribute?.('src');reject(error);}
          else resolve();
        };
        const cancel=()=>finish(new DOMException('Preview load cancelled','AbortError'));
        pendingLoads.set(slot,cancel);timer=setTimeout(cancel,8000);
        Promise.resolve().then(()=>element.decode()).then(()=>finish(),finish);
      });}catch{
        if(!disposed&&slot.mediaVersion===version&&!surfaces.get(slot).children.length){
          failures.set(slot,{item,attempt:attempt+1,timer:0});retryFailed();
        }
        return;
      }
    }
    if(disposed||slot.mediaVersion!==version){element.videoPlayback?.dispose();return;}
    players.get(slot)?.dispose();surfaces.get(slot).replaceChildren(element);
    players.set(slot,element.videoPlayback);element.videoPlayback?.resize();playback();
  }
  const startup=new IntersectionObserver(entries=>{
    if(started||!entries.some(e=>e.isIntersecting))return;
    started=true;startup.disconnect();slots.forEach(slot=>fill(slot));
  },{rootMargin:'350px'});startup.observe(section);
  const cycleHandlers=new Map();
  slots.forEach(slot=>{const cycle=()=>fill(slot);cycleHandlers.set(slot,cycle);slot.addEventListener('hobby-cycle',cycle);});
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);
    playback();
  },{threshold:0});slots.forEach(slot=>observer.observe(slot));
  document.addEventListener('visibilitychange',syncPlayback);reduced.addEventListener('change',syncPlayback);
  const playbackObserver=new MutationObserver(syncPlayback);playbackObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',recover);window.addEventListener('online',recover);
  window.addEventListener('pagehide',event=>{
    slots.forEach(slot=>players.get(slot)?.pause());if(event.persisted)return;
    disposed=true;startup.disconnect();observer.disconnect();playbackObserver.disconnect();visible.clear();
    pendingLoads.forEach(cancel=>cancel());pendingLoads.clear();
    failures.forEach(failure=>clearTimeout(failure.timer));failures.clear();
    slots.forEach(slot=>{slot.mediaVersion=(slot.mediaVersion||0)+1;players.get(slot)?.dispose();slot.removeEventListener('hobby-cycle',cycleHandlers.get(slot));});
    document.removeEventListener('visibilitychange',syncPlayback);reduced.removeEventListener('change',syncPlayback);
    window.removeEventListener('pageshow',recover);window.removeEventListener('online',recover);
    onDispose();
  });
}
