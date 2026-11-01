// Keep native contact content visible while optional enhancements load/recover.
import { importPortfolioModule } from './module-loader.js';
const loadComponent=()=>importPortfolioModule('./assets/ui/connect-page.js');

function mountOnApproach(target,mount,label){
  const controller=new AbortController(),{signal}=controller;
  let near=false,pending=null,complete=false,disposed=false,cleanup=null;
  const detachRetry=()=>{
    window.removeEventListener('online',attempt);
    document.removeEventListener('visibilitychange',attempt);
    window.removeEventListener('pageshow',attempt);
  };
  function attempt(){
    if(!near||pending||complete||disposed||document.hidden||navigator.onLine===false)return;
    pending=Promise.resolve().then(()=>mount(signal)).then(dispose=>{
      if(disposed){dispose?.();return;}
      cleanup=dispose;complete=true;observer.disconnect();detachRetry();
    }).catch(error=>{
      if(!disposed&&error.name!=='AbortError'&&navigator.onLine!==false)
        console.warn(`${label} could not load; keeping the native contact content.`,error);
    }).finally(()=>{pending=null;});
  }
  const observer=new IntersectionObserver(entries=>{
    near=entries.some(entry=>entry.isIntersecting);if(near)attempt();
  },{rootMargin:'450px 0px'});
  observer.observe(target);
  window.addEventListener('online',attempt);
  document.addEventListener('visibilitychange',attempt);
  window.addEventListener('pageshow',attempt);
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    disposed=true;observer.disconnect();detachRetry();controller.abort();cleanup?.();
  },{signal});
}

const contactStage=document.querySelector('#contact');
const backgroundHost=contactStage?.querySelector('.connect-aether-mount');
if(contactStage&&backgroundHost)mountOnApproach(contactStage,async signal=>{
  const module=await loadComponent();
  if(signal.aborted)return;
  return module.mountConnectBackground(backgroundHost,signal);
},'Contact background');

const socialStage=document.querySelector('.footer-socials');
const socialHost=socialStage?.querySelector('.social-icons-mount');
if(socialStage&&socialHost)mountOnApproach(socialStage,async signal=>{
  const [module,links]=await Promise.all([
    loadComponent(),fetch('./social-links.json',{signal}).then(response=>{
      if(!response.ok)throw new Error('Social links could not load.');return response.json();
    }),
  ]);
  if(signal.aborted)return;
  return module.mountSocialIcons(socialHost,links,signal);
},'Social links');
