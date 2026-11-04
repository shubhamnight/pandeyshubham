import { mobileMediaSource, mobileMediaSrcset } from './mobile-media.js';

function galleryVideo(item) {
  const video=document.createElement('video');
  video.src=mobileMediaSource(item.src);
  if(item.poster)video.poster=mobileMediaSource(item.poster);
  video.preload='none';video.playsInline=true;video.controls=true;
  video.width=item.width;video.height=item.height;video.setAttribute('aria-label',item.alt);
  return video;
}

export function createHobbyMedia(item,createVideo=galleryVideo) {
  if(item.type==='video')return createVideo(item);
  const image=document.createElement('img');
  image.alt=item.alt;image.decoding='async';image.loading='lazy';
  image.width=item.width;image.height=item.height;
  if(item.srcset){
    image.srcset=mobileMediaSrcset(item.srcset);
    image.sizes='(max-width:600px) 42vw, (max-width:1100px) 28vw, 300px';
  }
  image.src=mobileMediaSource(item.src);
  return image;
}
