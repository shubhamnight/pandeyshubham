import { musicImages } from './music-data.js';
import { musicTitleStyles } from './music-title-data.js';

// Load the existing local fonts when the music previews initialize. The overlay
// shares the font link, and both surfaces use the same title treatment rules.
for(const [id,path] of [
  ['music-title-fonts','./assets/fonts/music/fonts.css'],
  ['music-caption-title-styles','./music-title-styles.css'],
]){
  if(document.getElementById(id))continue;
  const link=document.createElement('link');link.id=id;link.rel='stylesheet';
  link.href=new URL(path,import.meta.url).href;link.onerror=()=>link.remove();
  document.head.append(link);
}

export function createRecord(song,index=0,gallery=false){
  const record=document.createElement('div');record.className='music-record';
  record.style.setProperty('--record-label', ['#183f73','#102b52','#4577b5'][index%3]);
  record.setAttribute('role','img');record.setAttribute('aria-label',song?.title?`${song.title}${song.artist?' — '+song.artist:''}`:'Vinyl record, awaiting song artwork');
  const label=document.createElement('div');label.className='music-record-label';
  if(song?.src){const image=document.createElement('img');image.src=gallery?song.fullSrc||song.src:song.src;image.alt='';image.loading=gallery?'lazy':'eager';image.decoding='async';label.append(image);}
  const hole=document.createElement('span');hole.className='music-record-hole';
  record.append(label,hole);
  return record;
}

function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
let deck=shuffle(musicImages),previous=null;
function nextSong(){if(!deck.length){deck=shuffle(musicImages);if(deck[0]===previous&&deck.length>1)[deck[0],deck[1]]=[deck[1],deck[0]];}previous=deck.shift();return previous;}
const slots=[...document.querySelectorAll('.hobby-music .hobby-image-placeholder')].slice(0,3);
async function fillRecord(slot,index){
  const song=nextSong(),version=(slot.recordVersion||0)+1;slot.recordVersion=version;
  const record=createRecord(song,index),image=record.querySelector('img');
  if(image){try{await image.decode();}catch{}}
  if(slot.recordVersion!==version)return;
  const surface=slot.querySelector('.hobby-image-surface');surface.replaceChildren(record);
  if(song){const caption=document.createElement('span');caption.className='music-record-caption';
    const title=document.createElement('strong'),artist=document.createElement('span');
    title.className='music-title';title.dataset.titleStyle=musicTitleStyles[song.title]||'plain';title.dataset.songTitle=song.title;
    title.textContent=song.title;artist.textContent=song.artist;caption.append(title,artist);surface.append(caption);slot.title=song.title+' — '+song.artist;}
}
slots.forEach((slot,index)=>{fillRecord(slot,index);slot.addEventListener('hobby-cycle',()=>fillRecord(slot,index));});

function fillMusicFallback(gallery){
  if(gallery.dataset.recordsFilled)return;gallery.dataset.recordsFilled='true';
  const fragment=document.createDocumentFragment();
  for(let i=0;i<Math.max(6,musicImages.length);i++){
    const song=musicImages[i],frame=document.createElement('figure');frame.className='music-record-frame';
    frame.append(createRecord(song,i,true));
    if(song?.title){const caption=document.createElement('figcaption');caption.textContent=song.title+(song.artist?' — '+song.artist:'');frame.append(caption);}
    fragment.append(frame);
  }
  gallery.querySelector('.music-gallery-grid').replaceChildren(fragment);
  const description=gallery.querySelector('.hobby-gallery-content>p');
  if(!musicImages.length)description.textContent='Your songs and artists will be added to these records soon.';
  else description.hidden=true;
}

let overlayModule=null,overlayData=null,disposeOverlay=null,overlayAbort=null;
let galleryVersion=0,galleryConnected=false,disposed=false;
export async function fillMusicGallery(gallery){
  const version=++galleryVersion;
  overlayAbort?.abort();
  const controller=new AbortController();overlayAbort=controller;
  disposeOverlay?.();disposeOverlay=null;
  const content=gallery.querySelector('.hobby-gallery-content');
  const status=content.querySelector(':scope>p'),grid=content.querySelector('.music-gallery-grid');
  status.textContent='Opening music…';status.hidden=false;grid.hidden=true;
  let mount=content.querySelector('.music-cascade-mount');
  if(!mount){mount=document.createElement('div');mount.className='music-cascade-mount';mount.hidden=true;content.append(mount);}
  if(!galleryConnected){
    galleryConnected=true;
    gallery.addEventListener('close',()=>{
      galleryVersion++;overlayAbort?.abort();overlayAbort=null;
      disposeOverlay?.();disposeOverlay=null;
    });
  }
  try{
    overlayModule??=import('./assets/ui/music-overlay.js').catch(error=>{overlayModule=null;throw error;});
    overlayData??=import('./music-overlay-data.js').catch(error=>{overlayData=null;throw error;});
    const [{mountMusicOverlay},{musicCards}]=await Promise.all([overlayModule,overlayData]);
    if(disposed||version!==galleryVersion||!gallery.open)return;
    const dispose=await mountMusicOverlay(mount,musicCards,controller.signal);
    if(disposed||version!==galleryVersion||!gallery.open){dispose();return;}
    disposeOverlay=dispose;status.hidden=true;
    grid.replaceChildren();delete gallery.dataset.recordsFilled;
  }catch(error){
    if(disposed||version!==galleryVersion||!gallery.open)return;
    gallery.classList.remove('music-cascade-active');mount.hidden=true;grid.hidden=false;
    fillMusicFallback(gallery);status.hidden=true;
    console.error('Music disc carousel could not load; showing the record grid.',error);
  }
}
window.addEventListener('pagehide',event=>{
  if(event.persisted)return;
  disposed=true;galleryVersion++;overlayAbort?.abort();disposeOverlay?.();
});
