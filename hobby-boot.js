// Keep Three.js and the model builders out of the initial loading screen.
const section=document.querySelector('#projects');
function prepareModels(){
  if(!section)return;
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    observer.disconnect();
    Promise.all([
      import('./photography-camera.js'),import('./gaming-controller.js'),
      import('./travel-plane.js'),import('./music-walkman.js'),
    ]).catch(error=>console.error('Hobby models could not load',error));
  },{rootMargin:'650px'});
  observer.observe(section);
  window.addEventListener('pagehide',event=>{if(!event.persisted)observer.disconnect();});
}
// The pinned scene sits near the viewport while the intro covers it. Wait for
// PLAY to finish before allocating four additional WebGL contexts.
if(document.querySelector('.portfolio-intro')){
  window.addEventListener('portfolio-ready',prepareModels,{once:true});
}else prepareModels();
