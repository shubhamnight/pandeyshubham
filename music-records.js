import { musicImages } from './music-data.js';

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
    const title=document.createElement('strong'),artist=document.createElement('span');title.textContent=song.title;artist.textContent=song.artist;caption.append(title,artist);surface.append(caption);slot.title=song.title+' — '+song.artist;}
}
slots.forEach((slot,index)=>{fillRecord(slot,index);slot.addEventListener('hobby-cycle',()=>fillRecord(slot,index));});

export function fillMusicGallery(gallery){
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
