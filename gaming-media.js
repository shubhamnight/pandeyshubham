import { createVideoCard } from './hobby-video-card.js';
import { gamingImages } from './gaming-data.js';

function shuffle(items) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
const order=shuffle(gamingImages);
let deck=[...order],previous=null;
function nextMedia(){
  if(!deck.length){deck=shuffle(gamingImages);if(deck[0]===previous&&deck.length>1)[deck[0],deck[1]]=[deck[1],deck[0]];}
  previous=deck.shift();return previous;
}
function mediaElement(item,gallery=false){
  if(item.type==='video'){
    if(!gallery)return createVideoCard(item);
    const video=document.createElement('video');
    video.src=item.src;video.poster=item.poster;video.preload='none';video.playsInline=true;
    video.controls=gallery;video.muted=!gallery;video.loop=!gallery;
    video.width=item.width;video.height=item.height;video.setAttribute('aria-label',item.alt);
    return video;
  }
  const image=document.createElement('img');image.alt=item.alt;image.decoding='async';
  image.width=item.width;image.height=item.height;
  image.loading=gallery?'lazy':'eager';
  image.fetchPriority=gallery?'low':'auto';
  if(gallery){
    // Use responsive 4:3 artwork cards in the gallery.
    const previews=item.srcset.split(', ').filter(source=>Number(source.split(' ').at(-1).slice(0,-1))<item.width);
    image.srcset=[...previews,item.original+' '+item.width+'w'].join(', ');
    image.sizes='(max-width:600px) 42vw, (max-width:1100px) 28vw, 300px';
    image.loading='lazy';
  }
  image.src=gallery?item.original:item.src;
  return image;
}

const section=document.querySelector('#projects');
const slots=[...section.querySelectorAll('.hobby-gaming .hobby-image-placeholder')].slice(0,3);
const visible=new Set();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function playback(){
  const allowed=!document.body.classList.contains('hobbies-intro-active')&&!document.hidden&&!reduced.matches&&!document.body.classList.contains('motion-paused')&&!document.body.classList.contains('photography-gallery-open');
  for(const slot of slots){const video=slot.querySelector('.hobby-video-canvas')?.videoPlayback;if(!video)continue;
    if(allowed&&visible.has(slot))video.play().catch(()=>{});else video.pause();
  }
}
async function fill(slot){
  const item=nextMedia();if(!item)return;
  const version=(slot.mediaVersion||0)+1;slot.mediaVersion=version;
  const element=mediaElement(item);
  if(item.type==='image'){try{await element.decode();}catch{return;}}
  if(slot.mediaVersion!==version)return;
  slot.querySelector('.hobby-video-canvas')?.videoPlayback.dispose();
  slot.querySelector('.hobby-image-surface').replaceChildren(element);
  playback();
}
let started=false;
const startup=new IntersectionObserver(entries=>{
  if(started||!entries.some(e=>e.isIntersecting))return;
  started=true;startup.disconnect();slots.forEach(slot=>fill(slot));
},{rootMargin:'350px'});startup.observe(section);
slots.forEach(slot=>slot.addEventListener('hobby-cycle',()=>fill(slot)));
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);
  playback();
},{threshold:0});slots.forEach(slot=>observer.observe(slot));
document.addEventListener('visibilitychange',playback);
reduced.addEventListener('change',playback);
new MutationObserver(playback).observe(document.body,{attributes:true,attributeFilter:['class']});

let galleryFilled=false;
function fillGamingFallback(gallery){
  if(galleryFilled)return;galleryFilled=true;
  const fragment=document.createDocumentFragment();
  for(const item of order){
    const frame=document.createElement('figure'),element=mediaElement(item,true);
    frame.append(element);
    fragment.append(frame);
  }
  gallery.querySelector('.gaming-gallery-grid').replaceChildren(fragment);
  gallery.querySelector('p').hidden=true;
}

let overlayModule=null,disposeOverlay=null,galleryVersion=0,galleryConnected=false,overlayAbort=null;
export async function fillGamingGallery(gallery){
  const version=++galleryVersion;
  overlayAbort?.abort();
  const controller=new AbortController();overlayAbort=controller;
  disposeOverlay?.();disposeOverlay=null;
  const content=gallery.querySelector('.hobby-gallery-content');
  const status=content.querySelector('p');
  const grid=content.querySelector('.gaming-gallery-grid');
  // Avoid downloading a second set of thumbnails while the animated island loads.
  status.textContent='Opening games…';status.hidden=false;grid.hidden=true;
  let mount=content.querySelector('.gaming-tilted-mount');
  if(!mount){
    mount=document.createElement('div');mount.className='gaming-tilted-mount';mount.hidden=true;
    content.append(mount);
  }
  if(!galleryConnected){
    galleryConnected=true;
    gallery.addEventListener('close',()=>{
      galleryVersion++;
      overlayAbort?.abort();overlayAbort=null;
      disposeOverlay?.();disposeOverlay=null;
      gallery.querySelectorAll('video').forEach(video=>video.pause());
    });
  }
  try{
    overlayModule??=import('./assets/ui/gaming-overlay.js').catch(error=>{overlayModule=null;throw error;});
    const {mountGamingOverlay}=await overlayModule;
    if(version!==galleryVersion||!gallery.open)return;
    const dispose=await mountGamingOverlay(mount,order.filter(item=>item.type==='image'),controller.signal);
    if(version!==galleryVersion||!gallery.open){dispose();return;}
    disposeOverlay=dispose;
    status.hidden=true;
    grid.replaceChildren();galleryFilled=false;
  }catch(error){
    if(version!==galleryVersion||!gallery.open)return;
    gallery.classList.remove('gaming-tilted-active');mount.hidden=true;
    grid.hidden=false;fillGamingFallback(gallery);status.hidden=true;
    console.error('Gaming animation could not load; showing the artwork grid.',error);
  }
}
