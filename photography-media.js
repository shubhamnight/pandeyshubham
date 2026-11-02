import { createHobbyMedia, connectHobbyPreviews } from './hobby-media-runtime.js';
import { createMediaDeck } from './media-deck.js';
import { photographyPhotos as originalPhotos } from './photography-data.js';
import { applyMediaEdits } from './media-library.js';
import { importPortfolioModule } from './module-loader.js';
const photographyPhotos=applyMediaEdits('photography',originalPhotos);

const {order,next:nextMedia}=createMediaDeck(photographyPhotos);
connectHobbyPreviews('.hobby-photography',nextMedia,createHobbyMedia,()=>{
  carouselAbort?.abort();disposeCarousel?.();
});

let carouselModule=null,disposeCarousel=null,galleryVersion=0,galleryConnected=false,carouselAbort=null;
export async function fillPhotographyGallery(gallery){
  const version=++galleryVersion;
  carouselAbort?.abort();
  const controller=new AbortController();carouselAbort=controller;
  disposeCarousel?.();disposeCarousel=null;
  const content=gallery.querySelector('.hobby-gallery-content');
  const status=content.querySelector('.photography-gallery-status');
  const mount=content.querySelector('.photography-carousel-mount');
  const grid=content.querySelector('.photography-gallery-grid');
  status.hidden=false;status.textContent='Opening photography…';
  gallery.classList.remove('photo-carousel-fallback');
  grid.replaceChildren();
  if(!order.length){status.textContent='No photographs yet. Add images in the local image studio.';return;}
  if(!galleryConnected){
    galleryConnected=true;
    gallery.addEventListener('close',()=>{
      galleryVersion++;
      carouselAbort?.abort();carouselAbort=null;
      disposeCarousel?.();disposeCarousel=null;
      gallery.querySelectorAll('video').forEach(video=>video.pause());
    });
  }
  try{
    // Load React and Motion only when the camera gallery is actually opened.
    carouselModule??=importPortfolioModule('./assets/ui/photography-carousel.js').catch(error=>{carouselModule=null;throw error;});
    const {mountPhotographyCarousel}=await carouselModule;
    if(version!==galleryVersion||!gallery.open)return;
    const dispose=await mountPhotographyCarousel(mount,order,controller.signal);
    if(version!==galleryVersion||!gallery.open){dispose();return;}
    disposeCarousel=dispose;status.hidden=true;
  }catch(error){
    if(version!==galleryVersion||!gallery.open)return;
    console.error('Photography carousel could not open',error);
    gallery.classList.add('photo-carousel-fallback');
    status.textContent='Photography';
    fillPhotographyFallback(gallery);
  }
}
function fillPhotographyFallback(gallery){
  const fragment=document.createDocumentFragment();
  for(const item of order){
    const frame=document.createElement('figure'),element=createHobbyMedia(item,true);
    if(item.type==='image'){
      const link=document.createElement('a');link.href=item.original;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label','Open '+item.alt+' at original resolution');link.append(element);frame.append(link);
    }else frame.append(element);
    fragment.append(frame);
  }
  gallery.querySelector('.photography-gallery-grid').replaceChildren(fragment);
}
