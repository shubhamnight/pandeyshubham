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
  const visible=new Set(),players=new WeakMap();
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
  function syncPlayback(){const next=playbackAllowed();if(next!==previousAllowed){previousAllowed=next;playback();}}
  async function fill(slot){
    if(disposed)return;
    const item=nextMedia();if(!item)return;
    const version=(slot.mediaVersion||0)+1;slot.mediaVersion=version;
    const element=mediaElement(item);
    if(item.type==='image'){try{await element.decode();}catch{return;}}
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
  window.addEventListener('pageshow',playback);
  window.addEventListener('pagehide',event=>{
    slots.forEach(slot=>players.get(slot)?.pause());if(event.persisted)return;
    disposed=true;startup.disconnect();observer.disconnect();playbackObserver.disconnect();visible.clear();
    slots.forEach(slot=>{slot.mediaVersion=(slot.mediaVersion||0)+1;players.get(slot)?.dispose();slot.removeEventListener('hobby-cycle',cycleHandlers.get(slot));});
    document.removeEventListener('visibilitychange',syncPlayback);reduced.removeEventListener('change',syncPlayback);window.removeEventListener('pageshow',playback);
    onDispose();
  });
}
