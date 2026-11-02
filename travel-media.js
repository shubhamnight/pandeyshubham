import { createHobbyMedia, connectHobbyPreviews } from './hobby-media-runtime.js';
import { createMediaDeck, shuffle } from './media-deck.js';
import { createTravelVideoPlayer, travelVideoFrameRatio } from './travel-video-player.js';
import { travelImages as originalTravelImages } from './travel-data.js';
import { applyMediaEdits } from './media-library.js';
import { mobileMediaSource, mobileMediaSrcset } from './mobile-media.js';
import { importPortfolioModule } from './module-loader.js';
import { observeTravelFrame } from './overlay-frame-metrics.js';
const travelImages=applyMediaEdits('travel',originalTravelImages);
import { locationLabel, travelLocations } from './travel-location-label.js';

const order=shuffle(travelImages);
const photos=travelImages.filter(item=>item.type==='image'),videos=travelImages.filter(item=>item.type==='video');
const previewPools=[photos,videos].map(items=>createMediaDeck(items));
let previewCount=0;
function nextMedia(){
  // Keep one video among every three orbit previews.
  const videoTurn=previewCount++%3===1;
  return previewPools[(videoTurn&&videos.length)||!photos.length?1:0].next();
}
const mediaElement=(item,gallery=false)=>createHobbyMedia(item,gallery,createTravelVideoPlayer);
let disposed=false;
connectHobbyPreviews('.hobby-travel',nextMedia,mediaElement,()=>{
  disposed=true;galleryVersion++;overlayAbort?.abort();disposeOverlay?.();
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
    overlayModule??=importPortfolioModule('./assets/ui/travel-overlay.js').catch(error=>{overlayModule=null;throw error;});
    const {mountTravelOverlay}=await overlayModule;
    if(disposed||version!==galleryVersion||!gallery.open)return;
    const media=order.map((item,index)=>({
      number:String(index+1).padStart(2,'0'),type:item.type,
      src:mobileMediaSource(item.type==='video'?(item.gallerySrc||item.preview||item.src):item.src),
      srcSet:mobileMediaSrcset(item.srcset),original:item.original,alt:item.alt,poster:mobileMediaSource(item.poster),
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
