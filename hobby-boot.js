// Keep Three.js and the model builders out of the initial loading screen.
import { touchPerformance } from './touch-performance.js';
const section=document.querySelector('#projects');
function prepareModels(){
  if(!section)return;
  let approaching=false,started=false,frame=0;
  const rig=document.querySelector('.badge-rig');
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
    Promise.all([
      import('./photography-camera.js'),import('./gaming-controller.js'),
      import('./travel-plane.js'),import('./music-walkman.js'),
    ]).catch(error=>console.error('Hobby models could not load',error));
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
  window.addEventListener('pagehide',event=>{if(!event.persisted)detach();});
}
// The pinned scene sits near the viewport while the intro covers it. Wait for
// PLAY to finish before allocating four additional WebGL contexts.
if(document.querySelector('.portfolio-intro')){
  window.addEventListener('portfolio-ready',prepareModels,{once:true});
}else prepareModels();
