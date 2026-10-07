import { createVideoCard } from './hobby-video-card.js';
import { createTravelVideoPlayer, travelVideoFrameRatio } from './travel-video-player.js';
import { travelImages as originalTravelImages } from './travel-data.js';
import { applyMediaEdits } from './media-library.js';
import { observeTravelFrame } from './overlay-frame-metrics.js';
const travelImages=applyMediaEdits('travel',originalTravelImages);
import { locationLabel, locationsReady, travelLocations } from './travel-location-label.js';

function shuffle(items) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
const order=shuffle(travelImages);
const photos=travelImages.filter(item=>item.type==='image'),videos=travelImages.filter(item=>item.type==='video');
const previewPools=[photos,videos].map(items=>({items,deck:shuffle(items),previous:null}));
let previewCount=0;
function nextMedia(){
  // Keep a video among each three orbit previews, rather than hiding all four
  // videos behind a randomly shuffled run of photographs.
  const videoTurn=previewCount++%3===1;
  const pool=previewPools[(videoTurn&&videos.length)||!photos.length?1:0];
  if(!pool.deck.length){pool.deck=shuffle(pool.items);if(pool.deck[0]===pool.previous&&pool.deck.length>1)[pool.deck[0],pool.deck[1]]=[pool.deck[1],pool.deck[0]];}
  pool.previous=pool.deck.shift();return pool.previous;
}
function mediaElement(item,gallery=false){
  if(item.type==='video'){
    if(!gallery)return createVideoCard(item);
    return createTravelVideoPlayer(item);
  }
  const image=document.createElement('img');image.alt=item.alt;image.decoding='async';
  image.width=item.width;image.height=item.height;
  image.loading=gallery?'lazy':'eager';
  image.fetchPriority=gallery?'low':'auto';
  if(gallery){
    // Use the untouched source at full resolution, previews at smaller sizes.
    const previews=item.srcset.split(', ').filter(source=>Number(source.split(' ').at(-1).slice(0,-1))<item.width);
    image.srcset=[...previews,item.original+' '+item.width+'w'].join(', ');
    image.sizes='(max-width:600px) 42vw, (max-width:1100px) 28vw, 300px';
    image.loading='lazy';
  }
  image.src=gallery?item.original:item.src;
  return image;
}

const section=document.querySelector('#projects');
const slots=[...section.querySelectorAll('.hobby-travel .hobby-image-placeholder')].slice(0,3);
const visible=new Set();
const players=new WeakMap(),surfaces=new Map(slots.map(slot=>[slot,slot.querySelector('.hobby-image-surface')]));
let disposed=false,previousAllowed=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function playbackAllowed(){return !disposed&&!document.body.classList.contains('hobbies-intro-active')&&!document.hidden&&!reduced.matches&&!document.body.classList.contains('motion-paused')&&!document.body.classList.contains('photography-gallery-open');}
function playback(){
  const allowed=playbackAllowed();
  for(const slot of slots){const video=players.get(slot);if(!video)continue;
    if(allowed&&visible.has(slot))video.play().catch(()=>{});else video.pause();
  }
}
function syncPlayback(){const next=playbackAllowed();if(next!==previousAllowed){previousAllowed=next;playback();}}
async function fill(slot){
  await locationsReady;
  if(disposed)return;
  const item=nextMedia();if(!item)return;
  const version=(slot.mediaVersion||0)+1;slot.mediaVersion=version;
  const element=mediaElement(item);
  if(item.type==='image'){try{await element.decode();}catch{return;}}
  if(disposed||slot.mediaVersion!==version){element.videoPlayback?.dispose();return;}
  players.get(slot)?.dispose();
  const surface=surfaces.get(slot);surface.replaceChildren(element);
  players.set(slot,element.videoPlayback);element.videoPlayback?.resize();
  playback();
}
let started=false;
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
document.addEventListener('visibilitychange',syncPlayback);
reduced.addEventListener('change',syncPlayback);
const playbackObserver=new MutationObserver(syncPlayback);playbackObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pageshow',playback);
window.addEventListener('pagehide',event=>{
  slots.forEach(slot=>players.get(slot)?.pause());
  if(event.persisted)return;
  disposed=true;startup.disconnect();observer.disconnect();playbackObserver.disconnect();visible.clear();
  slots.forEach(slot=>{slot.mediaVersion=(slot.mediaVersion||0)+1;players.get(slot)?.dispose();slot.removeEventListener('hobby-cycle',cycleHandlers.get(slot));});
  document.removeEventListener('visibilitychange',syncPlayback);reduced.removeEventListener('change',syncPlayback);window.removeEventListener('pageshow',playback);
  galleryVersion++;overlayAbort?.abort();disposeOverlay?.();
});

let gridMode=null;
function populateTravelGrid(gallery,videosOnly=false){
  const mode=videosOnly?'videos':'all';
  if(gridMode===mode)return;gridMode=mode;
  const grid=gallery.querySelector('.travel-gallery-grid');
  grid.querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});
  const fragment=document.createDocumentFragment();
  for(const item of order){
    if(videosOnly&&item.type!=='video')continue;
    const frame=document.createElement('figure'),element=mediaElement(item,true);
    if(item.type==='video')frame.style.aspectRatio=String(travelVideoFrameRatio(item));
    frame.append(element);
    const label=locationLabel(item);if(label)frame.append(label);
    fragment.append(frame);
  }
  grid.replaceChildren(fragment);
}

let overlayModule=null,disposeOverlay=null,galleryVersion=0,galleryConnected=false,overlayAbort=null;
export async function fillTravelGallery(gallery){
  const version=++galleryVersion;
  overlayAbort?.abort();
  const controller=new AbortController();overlayAbort=controller;
  disposeOverlay?.();disposeOverlay=null;
  const content=gallery.querySelector('.hobby-gallery-content');
  const status=content.querySelector('p'),grid=content.querySelector('.travel-gallery-grid');
  status.textContent='Opening travel photographs and videos…';status.hidden=false;grid.hidden=true;
  let mount=content.querySelector('.travel-zoom-mount');
  if(!mount){
    mount=document.createElement('div');mount.className='travel-zoom-mount';mount.hidden=true;
    content.insertBefore(mount,grid);
  }
  if(!galleryConnected){
    galleryConnected=true;
    gallery.addEventListener('close',()=>{
      galleryVersion++;overlayAbort?.abort();overlayAbort=null;
      disposeOverlay?.();disposeOverlay=null;
      gallery.querySelectorAll('video').forEach(video=>video.pause());
      content.scrollTop=0;
    });
  }
  try{
    overlayModule??=import('./assets/ui/travel-overlay.js').catch(error=>{overlayModule=null;throw error;});
    const [{mountTravelOverlay}]=await Promise.all([overlayModule,locationsReady]);
    if(disposed||version!==galleryVersion||!gallery.open)return;
    const media=order.map((item,index)=>({
      number:String(index+1).padStart(2,'0'),type:item.type,
      src:item.type==='video'?(item.gallerySrc||item.preview||item.src):item.src,
      srcSet:item.srcset,original:item.original,alt:item.alt,poster:item.poster,
      width:item.width,height:item.height,
      videoFrameRatio:item.type==='video'?travelVideoFrameRatio(item):undefined,
      title:(travelLocations[decodeURIComponent((item.sourceOriginal||item.original).split('/').pop())]||'').trim(),desc:'',
    }));
    if(!media.length){
      gallery.classList.remove('travel-zoom-active');mount.hidden=true;
      status.textContent='No travel photographs yet. Add images in the local image studio.';
      populateTravelGrid(gallery,true);grid.hidden=false;return;
    }
    const dispose=await mountTravelOverlay(mount,media,controller.signal);
    if(disposed||version!==galleryVersion||!gallery.open){dispose();return;}
    const stopFrameObserver=observeTravelFrame(mount);
    disposeOverlay=()=>{stopFrameObserver();dispose();};status.hidden=true;
    // Videos share the navigable strip; no unreachable second grid below it.
    grid.querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});
    grid.replaceChildren();gridMode=null;grid.hidden=true;content.scrollTop=0;
  }catch(error){
    if(disposed||version!==galleryVersion||!gallery.open)return;
    gallery.classList.remove('travel-zoom-active');mount.hidden=true;
    populateTravelGrid(gallery);grid.hidden=false;status.hidden=true;
    console.error('Travel slider could not load; showing the original media grid.',error);
  }
}
