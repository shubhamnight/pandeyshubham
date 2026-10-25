// Keep Three.js and the model builders out of the initial loading screen.
import { touchPerformance } from './touch-performance.js';
import { importPortfolioModule } from './module-loader.js';
import { connectHobbyGallery } from './hobby-gallery.js';
const section=document.querySelector('#projects');
function prepareModels(){
  if(!section)return;
  let approaching=false,started=false,frame=0;
  const rig=document.querySelector('.badge-rig');
  let disposed=false;
  const entries=[['photography-camera','photography-camera.js','photography-media.js','fillPhotographyGallery','photography'],
    ['gaming-controller','gaming-controller.js','gaming-media.js','fillGamingGallery','gaming'],
    ['travel-plane','travel-plane.js','travel-media.js','fillTravelGallery','travel'],
    ['music-walkman','music-walkman.js','music-records.js','fillMusicGallery','music']].map(([id,path,media,fill,gallery])=>({
      button:document.getElementById(id),path,media,fill,gallery,loaded:false,mediaReady:false,pending:null,mediaPending:null,
    }));
  const detachRetry=entry=>{if(entry.loaded&&entry.mediaReady)entry.button.removeEventListener('click',entry.retryClick,true);};
  function loadMedia(entry){
    if(disposed||entry.mediaReady)return Promise.resolve(entry.mediaReady);
    if(entry.mediaPending)return entry.mediaPending;
    entry.mediaPending=importPortfolioModule('./'+entry.media).then(module=>{
      if(disposed)return false;
      connectHobbyGallery(entry.button,document.getElementById(entry.gallery+'-gallery'),module[entry.fill],
        {autoplayVideos:entry.gallery==='travel'});
      entry.mediaReady=true;detachRetry(entry);return true;
    }).catch(error=>{console.error('Hobby media could not load: '+entry.media,error);return false;})
      .finally(()=>{entry.mediaPending=null;});
    return entry.mediaPending;
  }
  function load(entry){
    if(disposed||entry.loaded)return Promise.resolve(entry.loaded);
    if(entry.pending)return entry.pending;
    entry.pending=importPortfolioModule('./'+entry.path).then(()=>{
      entry.loaded=true;detachRetry(entry);return true;
    }).catch(error=>{
      // One unavailable model must not keep the other three and the whole
      // heading/media sequence permanently invisible. Its native icon remains.
      entry.button.dataset.hobbyModelFailed='true';
      console.error('Hobby module could not load: '+entry.path,error);return false;
    }).finally(()=>{entry.pending=null;});
    return entry.pending;
  }
  entries.forEach(entry=>{
    entry.retryClick=event=>{
      if(disposed)return;
      if(!entry.loaded)void load(entry);
      if(entry.mediaReady)return;
      event.preventDefault();event.stopImmediatePropagation();
      loadMedia(entry).then(loaded=>{if(loaded&&!disposed)entry.button.click();});
    };
    entry.button.addEventListener('click',entry.retryClick,true);
  });
  const retryFailed=()=>{if(started&&!disposed)entries.forEach(entry=>{void load(entry);void loadMedia(entry);});};
  window.addEventListener('online',retryFailed);
  const detach=()=>{
    observer.disconnect();cancelAnimationFrame(frame);frame=0;
    rig?.removeEventListener('badge-entrance-complete',queue);
    window.removeEventListener('scroll',queue);
  };
  const attempt=()=>{
    frame=0;
    if(started||!approaching)return;
    if(touchPerformance&&document.body.classList.contains('badge-entering')&&
      !document.querySelector('#home')?.classList.contains('hero-covered'))return;
    started=true;detach();
    // Media/gallery access is independent of the 3D module's network or GPU
    // readiness. Keep the original native icons usable if a model is unavailable.
    importPortfolioModule('./hobby-intro.js').catch(error=>console.error('Hobby positioning could not load',error));
    entries.forEach(entry=>{void loadMedia(entry);void load(entry);});
  };
  const queue=()=>{if(approaching&&!started&&!frame)frame=requestAnimationFrame(attempt);};
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    approaching=true;
    // Delay the import as well as geometry work: parsing Three.js must not
    // interrupt the unchanged entrance on phone/tablet CPUs.
    if(touchPerformance)queue();else attempt();
  },{rootMargin:'650px'});
  if(touchPerformance){
    rig?.addEventListener('badge-entrance-complete',queue);
    window.addEventListener('scroll',queue,{passive:true});
  }
  observer.observe(section);
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    disposed=true;detach();window.removeEventListener('online',retryFailed);
    entries.forEach(entry=>entry.button.removeEventListener('click',entry.retryClick,true));
  });
}
// The pinned scene sits near the viewport while the intro covers it. Wait for
// PLAY to finish before allocating four additional WebGL contexts.
if(document.querySelector('.portfolio-intro')){
  window.addEventListener('portfolio-ready',prepareModels,{once:true});
}else prepareModels();
