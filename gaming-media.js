import { createHobbyMedia } from './hobby-media-runtime.js';
import { createMediaDeck } from './media-deck.js';
import { gamingImages } from './gaming-data.js';
import { mobileMediaSource, mobileMediaSrcset } from './mobile-media.js';
import { importPortfolioModule } from './module-loader.js';

const {order}=createMediaDeck(gamingImages);

let galleryFilled=false;
function fillGamingFallback(gallery){
  if(galleryFilled)return;galleryFilled=true;
  const fragment=document.createDocumentFragment();
  for(const item of order){
    const frame=document.createElement('figure'),element=createHobbyMedia(item);
    frame.append(element);
    fragment.append(frame);
  }
  gallery.querySelector('.gaming-gallery-grid').replaceChildren(fragment);
  gallery.querySelector('p').hidden=true;
}

let overlayModule=null;
export async function fillGamingGallery(gallery,signal){
  if(signal.aborted)return;
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
  try{
    overlayModule??=importPortfolioModule('./assets/ui/gaming-overlay.js').catch(error=>{overlayModule=null;throw error;});
    const {mountGamingOverlay}=await overlayModule;
    if(signal.aborted||!gallery.open)return;
    const media=order.filter(item=>item.type==='image').map(item=>({
      ...item,original:item.sourceOriginal||item.original,src:mobileMediaSource(item.src),srcset:mobileMediaSrcset(item.srcset),
    }));
    const dispose=await mountGamingOverlay(mount,media,signal);
    if(signal.aborted||!gallery.open){dispose();return;}
    signal.addEventListener('abort',dispose,{once:true});
    status.hidden=true;
    grid.replaceChildren();galleryFilled=false;
  }catch(error){
    if(signal.aborted||!gallery.open)return;
    gallery.classList.remove('gaming-tilted-active');mount.hidden=true;
    grid.hidden=false;fillGamingFallback(gallery);status.hidden=true;
    console.error('Gaming animation could not load; showing the artwork grid.',error);
  }
}
