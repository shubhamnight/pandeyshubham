import { createHobbyMedia } from './hobby-media-runtime.js';
import { createMediaDeck } from './media-deck.js';
import { photographyPhotos as originalPhotos } from './photography-data.js';
import { applyMediaEdits } from './media-library.js';
import { importPortfolioModule } from './module-loader.js';
const photographyPhotos=applyMediaEdits('photography',originalPhotos);

const {order}=createMediaDeck(photographyPhotos);

let carouselModule=null;
export async function fillPhotographyGallery(gallery,signal){
  if(signal.aborted)return;
  const content=gallery.querySelector('.hobby-gallery-content');
  const status=content.querySelector('.photography-gallery-status');
  const mount=content.querySelector('.photography-carousel-mount');
  const grid=content.querySelector('.photography-gallery-grid');
  status.hidden=false;status.textContent='Opening photography…';
  gallery.classList.remove('photo-carousel-fallback');
  grid.replaceChildren();
  if(!order.length){status.textContent='No photographs yet. Add images in the local image studio.';return;}
  try{
    // Load React and Motion only when the camera gallery is actually opened.
    carouselModule??=importPortfolioModule('./assets/ui/photography-carousel.js').catch(error=>{carouselModule=null;throw error;});
    const {mountPhotographyCarousel}=await carouselModule;
    if(signal.aborted||!gallery.open)return;
    const dispose=await mountPhotographyCarousel(mount,order,signal);
    if(signal.aborted||!gallery.open){dispose();return;}
    signal.addEventListener('abort',dispose,{once:true});status.hidden=true;
  }catch(error){
    if(signal.aborted||!gallery.open)return;
    console.error('Photography carousel could not open',error);
    gallery.classList.add('photo-carousel-fallback');
    status.textContent='Photography';
    fillPhotographyFallback(gallery);
  }
}
function fillPhotographyFallback(gallery){
  const fragment=document.createDocumentFragment();
  for(const item of order){
    const frame=document.createElement('figure'),element=createHobbyMedia(item);
    if(item.type==='image'){
      const link=document.createElement('a');link.href=item.original;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label','Open '+item.alt+' at original resolution');link.append(element);frame.append(link);
    }else frame.append(element);
    fragment.append(frame);
  }
  gallery.querySelector('.photography-gallery-grid').replaceChildren(fragment);
}
