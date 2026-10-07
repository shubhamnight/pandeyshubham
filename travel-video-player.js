// Silent, looping travel media; selecting a card never toggles playback.
export function travelVideoFrameRatio(item){
  // This night scene has landscape footage inside a letterboxed source.
  return item.videoFrameRatio??(item.poster==='assets/travel/15-poster.webp'?4/3:9/16);
}
export function createTravelVideoPlayer(item,{deferSource=false}={}){
  const player=document.createElement('div');player.className='travel-video-player';
  const video=document.createElement('video');
  if(!deferSource)video.src=item.gallerySrc||item.preview||item.src;
  if(item.poster)video.poster=item.poster;video.preload=deferSource?'none':'metadata';
  video.playsInline=true;video.muted=true;video.defaultMuted=true;video.volume=0;
  video.loop=true;video.autoplay=!deferSource;video.controls=false;
  video.disablePictureInPicture=true;video.disableRemotePlayback=true;
  video.width=item.width;video.height=item.height;video.setAttribute('aria-label',item.alt);
  video.addEventListener('contextmenu',event=>event.preventDefault());
  player.append(video);return player;
}
