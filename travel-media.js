import { createVideoCard } from './hobby-video-card.js';
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
    const video=document.createElement('video');
    video.src=item.gallerySrc||item.src;video.poster=item.poster;video.preload='metadata';video.playsInline=true;
    video.controls=gallery;video.muted=!gallery;video.loop=!gallery;
    video.width=item.width;video.height=item.height;video.setAttribute('aria-label',item.alt);
    return video;
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
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function playback(){
  const allowed=!document.body.classList.contains('hobbies-intro-active')&&!document.hidden&&!reduced.matches&&!document.body.classList.contains('motion-paused')&&!document.body.classList.contains('photography-gallery-open');
  for(const slot of slots){const video=slot.querySelector('.hobby-video-canvas')?.videoPlayback;if(!video)continue;
    if(allowed&&visible.has(slot))video.play().catch(()=>{});else video.pause();
  }
}
async function fill(slot){
  await locationsReady;
  const item=nextMedia();if(!item)return;
  const version=(slot.mediaVersion||0)+1;slot.mediaVersion=version;
  const element=mediaElement(item);
  if(item.type==='image'){try{await element.decode();}catch{return;}}
  if(slot.mediaVersion!==version){element.videoPlayback?.dispose();return;}
  slot.querySelector('.hobby-video-canvas')?.videoPlayback.dispose();
  slot.querySelector('.hobby-image-surface').replaceChildren(element);
  const label=locationLabel(item);if(label)slot.querySelector('.hobby-image-surface').append(label);
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
