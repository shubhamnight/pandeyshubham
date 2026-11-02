import { createHobbyMedia, connectHobbyPreviews } from './hobby-media-runtime.js';
import { createMediaDeck } from './media-deck.js';
import { gamingImages } from './gaming-data.js';
import { mobileMediaSource, mobileMediaSrcset } from './mobile-media.js';
import { importPortfolioModule } from './module-loader.js';

const {order,next:nextMedia}=createMediaDeck(gamingImages);
connectHobbyPreviews('.hobby-gaming',nextMedia,createHobbyMedia,()=>{
  overlayAbort?.abort();disposeOverlay?.();
});

let galleryFilled=false;
function fillGamingFallback(gallery){
  if(galleryFilled)return;galleryFilled=true;
  const fragment=document.createDocumentFragment();
  for(const item of order){
    const frame=document.createElement('figure'),element=createHobbyMedia(item,true);
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
    overlayModule??=importPortfolioModule('./assets/ui/gaming-overlay.js').catch(error=>{overlayModule=null;throw error;});
    const {mountGamingOverlay}=await overlayModule;
    if(version!==galleryVersion||!gallery.open)return;
    const media=order.filter(item=>item.type==='image').map(item=>({
      ...item,src:mobileMediaSource(item.src),srcset:mobileMediaSrcset(item.srcset),
    }));
    const dispose=await mountGamingOverlay(mount,media,controller.signal);
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
