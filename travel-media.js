import { createVideoCard } from './hobby-video-card.js';
import { createTravelVideoPlayer } from './travel-video-player.js';
import { travelImages } from './travel-data.js';
import { locationLabel, locationsReady } from './travel-location-label.js';

function shuffle(items) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
const order=shuffle(travelImages);
let deck=[...order],previous=null;
function nextMedia(){
  if(!deck.length){deck=shuffle(travelImages);if(deck[0]===previous&&deck.length>1)[deck[0],deck[1]]=[deck[1],deck[0]];}
  previous=deck.shift();return previous;
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
  const label=locationLabel(item);if(label)surface.append(label);
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
});

let galleryFilled=false;
export async function fillTravelGallery(gallery){
  await locationsReady;
  if(galleryFilled)return;galleryFilled=true;
  const fragment=document.createDocumentFragment();
  for(const item of order){
    const frame=document.createElement('figure'),element=mediaElement(item,true);
    if(item.type==='image'){
      const link=document.createElement('a');link.href=item.original;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label','Open '+item.alt+' at original resolution');link.append(element);frame.append(link);
    }else frame.append(element);
    const label=locationLabel(item);if(label)frame.append(label);
    fragment.append(frame);
  }
  gallery.querySelector('.travel-gallery-grid').replaceChildren(fragment);
  gallery.querySelector('p').hidden=true;
  gallery.addEventListener('close',()=>gallery.querySelectorAll('video').forEach(video=>video.pause()));
}
