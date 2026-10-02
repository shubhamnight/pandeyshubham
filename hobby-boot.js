// Keep Three.js and the model builders out of the initial loading screen.
const section=document.querySelector('#projects');
if(section){
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
