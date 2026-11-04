import { createHobbyMedia } from './hobby-media-runtime.js';
import { shuffle } from './media-deck.js';
import { createTravelVideoPlayer, travelVideoFrameRatio } from './travel-video-player.js';
import { travelImages as originalTravelImages } from './travel-data.js';
import { applyMediaEdits } from './media-library.js';
import { mobileMediaSource, mobileMediaSrcset } from './mobile-media.js';
import { importPortfolioModule } from './module-loader.js';
import { observeTravelFrame } from './overlay-frame-metrics.js';
const travelImages=applyMediaEdits('travel',originalTravelImages);
import { locationLabel, travelLocations } from './travel-location-label.js';

const order=shuffle(travelImages);
const mediaElement=item=>createHobbyMedia(item,createTravelVideoPlayer);

let gridMode=null;
function populateTravelGrid(gallery,videosOnly=false){
  const mode=videosOnly?'videos':'all';
  if(gridMode===mode)return;gridMode=mode;
  const grid=gallery.querySelector('.travel-gallery-grid');
  grid.querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});
  const fragment=document.createDocumentFragment();
  for(const item of order){
    if(videosOnly&&item.type!=='video')continue;
    const frame=document.createElement('figure'),element=mediaElement(item);
    if(item.type==='video')frame.style.aspectRatio=String(travelVideoFrameRatio(item));
    frame.append(element);
    const label=locationLabel(item);if(label)frame.append(label);
    fragment.append(frame);
  }
  grid.replaceChildren(fragment);
}

let overlayModule=null;
export async function fillTravelGallery(gallery,signal){
  if(signal.aborted)return;
  const content=gallery.querySelector('.hobby-gallery-content');
  const status=content.querySelector('p'),grid=content.querySelector('.travel-gallery-grid');
  status.textContent='Opening travel photographs and videos…';status.hidden=false;grid.hidden=true;
  let mount=content.querySelector('.travel-zoom-mount');
  if(!mount){
    mount=document.createElement('div');mount.className='travel-zoom-mount';mount.hidden=true;
    content.insertBefore(mount,grid);
  }
  try{
    overlayModule??=importPortfolioModule('./assets/ui/travel-overlay.js').catch(error=>{overlayModule=null;throw error;});
    const {mountTravelOverlay}=await overlayModule;
    if(signal.aborted||!gallery.open)return;
    const media=order.map((item,index)=>({
      number:String(index+1).padStart(2,'0'),type:item.type,
      src:mobileMediaSource(item.type==='video'?(item.gallerySrc||item.preview||item.src):item.src),
      srcSet:mobileMediaSrcset(item.srcset),original:item.sourceOriginal||item.original,alt:item.alt,poster:mobileMediaSource(item.poster),
      width:item.width,height:item.height,
      videoFrameRatio:item.type==='video'?travelVideoFrameRatio(item):undefined,
      title:(travelLocations[decodeURIComponent((item.sourceOriginal||item.original).split('/').pop())]||'').trim(),desc:'',
    }));
    if(!media.length){
      gallery.classList.remove('travel-zoom-active');mount.hidden=true;
      status.textContent='No travel photographs yet. Add images in the local image studio.';
      populateTravelGrid(gallery,true);grid.hidden=false;return;
    }
    const dispose=await mountTravelOverlay(mount,media,signal);
    if(signal.aborted||!gallery.open){dispose();return;}
    const stopFrameObserver=observeTravelFrame(mount);
    signal.addEventListener('abort',()=>{stopFrameObserver();dispose();},{once:true});status.hidden=true;
    // Videos share the navigable strip; no unreachable second grid below it.
    grid.querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});
    grid.replaceChildren();gridMode=null;grid.hidden=true;content.scrollTop=0;
  }catch(error){
    if(signal.aborted||!gallery.open)return;
    gallery.classList.remove('travel-zoom-active');mount.hidden=true;
    populateTravelGrid(gallery);grid.hidden=false;status.hidden=true;
    console.error('Travel slider could not load; showing the original media grid.',error);
  }
}
