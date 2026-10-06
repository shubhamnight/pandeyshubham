// Travel galleries intentionally offer no audio controls.
export function createTravelVideoPlayer(item){
  const player=document.createElement('div');player.className='travel-video-player';
  const video=document.createElement('video');
  video.src=item.gallerySrc||item.preview;video.poster=item.poster;video.preload='metadata';
  video.playsInline=true;video.muted=true;video.defaultMuted=true;video.volume=0;
  video.width=item.width;video.height=item.height;video.setAttribute('aria-label',item.alt);
  const controls=document.createElement('div');controls.className='travel-video-controls';
  controls.setAttribute('role','group');controls.setAttribute('aria-label','Travel video playback');
  const play=document.createElement('button');play.type='button';play.textContent='▶';play.setAttribute('aria-label','Play video');
  const seek=document.createElement('input');seek.type='range';seek.min='0';seek.max='1000';seek.step='1';seek.value='0';
  seek.disabled=true;seek.setAttribute('aria-label','Seek video');
  const time=document.createElement('span');time.textContent='0:00';time.className='travel-video-time';
  const full=document.createElement('button');full.type='button';full.textContent='⛶';full.setAttribute('aria-label','Enter fullscreen');
  if(!player.requestFullscreen)full.hidden=true;
  const format=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
  let lastPlaying=null,lastValid=null,lastSeek=null,lastTime='',lastValueText='';
  const sync=()=>{
    const playing=!video.paused&&!video.ended;
    if(playing!==lastPlaying){
      lastPlaying=playing;player.classList.toggle('is-playing',playing);play.textContent=playing?'Ⅱ':'▶';
      play.setAttribute('aria-label',playing?'Pause video':'Play video');
    }
    const duration=video.duration,valid=Number.isFinite(duration)&&duration>0;
    if(valid!==lastValid){lastValid=valid;seek.disabled=!valid;}
    const seekValue=valid?String(Math.round(video.currentTime/duration*1000)):'0';
    if(seekValue!==lastSeek){lastSeek=seekValue;seek.value=seekValue;}
    const timestamp=format(video.currentTime),valueText=timestamp+(valid?' of '+format(duration):'');
    if(valueText!==lastValueText){lastValueText=valueText;seek.setAttribute('aria-valuetext',valueText);}
    if(timestamp!==lastTime){lastTime=timestamp;time.textContent=timestamp;}
  };
  play.addEventListener('click',()=>{
    if(video.paused||video.ended)video.play().catch(sync);else video.pause();
  });
  seek.addEventListener('input',()=>{
    if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=Number(seek.value)/1000*video.duration;
  });
  full.addEventListener('click',()=>{
    if(document.fullscreenElement===player)document.exitFullscreen?.().catch(()=>{});
    else player.requestFullscreen?.().catch(()=>{});
  });
  player.addEventListener('fullscreenchange',()=>full.setAttribute('aria-label',document.fullscreenElement===player?'Exit fullscreen':'Enter fullscreen'));
  for(const event of ['play','pause','ended','timeupdate','loadedmetadata','durationchange'])video.addEventListener(event,sync);
  controls.append(play,time,seek,full);player.append(video,controls);return player;
}
