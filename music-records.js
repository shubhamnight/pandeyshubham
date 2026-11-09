import { musicImages } from './music-data.js';
import { mobileMediaSource } from './mobile-media.js';
import { importPortfolioModule } from './module-loader.js';

function createRecord(song){
  const record=document.createElement('div');record.className='music-record';
  record.setAttribute('role','img');record.setAttribute('aria-label',song?.title?`${song.title}${song.artist?' — '+song.artist:''}`:'Vinyl record, awaiting song artwork');
  const label=document.createElement('div');label.className='music-record-label';
  if(song?.src){const image=document.createElement('img');image.src=mobileMediaSource(song.src);image.alt='';image.loading='lazy';image.decoding='async';label.append(image);}
  const hole=document.createElement('span');hole.className='music-record-hole';
  record.append(label,hole);
  return record;
}

function fillMusicFallback(gallery){
  if(gallery.dataset.recordsFilled)return;gallery.dataset.recordsFilled='true';
  const fragment=document.createDocumentFragment();
  for(let i=0;i<Math.max(6,musicImages.length);i++){
    const song=musicImages[i],frame=document.createElement('figure');frame.className='music-record-frame';
    frame.append(createRecord(song));
    if(song?.title){const caption=document.createElement('figcaption');caption.textContent=song.title+(song.artist?' — '+song.artist:'');frame.append(caption);}
    fragment.append(frame);
  }
  gallery.querySelector('.music-gallery-grid').replaceChildren(fragment);
  const description=gallery.querySelector('.hobby-gallery-content>p');
  if(!musicImages.length)description.textContent='Your songs and artists will be added to these records soon.';
  else description.hidden=true;
}

let overlayModule=null,overlayData=null;
export async function fillMusicGallery(gallery,signal){
  if(signal.aborted)return;
  const content=gallery.querySelector('.hobby-gallery-content');
  const status=content.querySelector(':scope>p'),grid=content.querySelector('.music-gallery-grid');
  status.textContent='Opening music…';status.hidden=false;grid.hidden=true;
  let mount=content.querySelector('.music-cascade-mount');
  if(!mount){mount=document.createElement('div');mount.className='music-cascade-mount';mount.hidden=true;content.append(mount);}
  try{
    overlayModule??=importPortfolioModule('./assets/ui/music-overlay.js').catch(error=>{overlayModule=null;throw error;});
    overlayData??=importPortfolioModule('./music-overlay-data.js').catch(error=>{overlayData=null;throw error;});
    const [{mountMusicOverlay},{musicCards}]=await Promise.all([overlayModule,overlayData]);
    if(signal.aborted||!gallery.open)return;
    const songs=musicCards.map(song=>({...song,src:mobileMediaSource(song.src),fullSrc:song.fullSrc,artworkSrc:mobileMediaSource(song.fullSrc)}));
    const dispose=await mountMusicOverlay(mount,songs,signal);
    if(signal.aborted||!gallery.open){dispose();return;}
    signal.addEventListener('abort',dispose,{once:true});status.hidden=true;
    grid.replaceChildren();delete gallery.dataset.recordsFilled;
  }catch(error){
    if(signal.aborted||!gallery.open)return;
    gallery.classList.remove('music-cascade-active');mount.hidden=true;grid.hidden=false;
    fillMusicFallback(gallery);status.hidden=true;
    console.error('Music disc carousel could not load; showing the record grid.',error);
  }
}
