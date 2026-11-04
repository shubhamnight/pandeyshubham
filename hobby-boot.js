import { importPortfolioModule } from './module-loader.js';
import { connectHobbyGallery } from './hobby-gallery.js';

const entries=[
  ['photography-camera','photography-media.js','fillPhotographyGallery','photography'],
  ['gaming-controller','gaming-media.js','fillGamingGallery','gaming'],
  ['travel-plane','travel-media.js','fillTravelGallery','travel'],
  ['music-walkman','music-records.js','fillMusicGallery','music'],
];
let active=null;

function dismissModel() {
  const session=active;
  if(!session)return;
  active=null;
  clearTimeout(session.timeout);
  session.controller.abort();
  session.toggle.setAttribute('aria-pressed','false');
  session.setLabel();
}

for(const [id,media,fill,galleryName] of entries){
  const button=document.getElementById(id);
  const gallery=document.getElementById(galleryName+'-gallery');
  const toggle=document.querySelector('[data-hobby-model="'+id+'"]');
  if(!button||!gallery)continue;
  connectHobbyGallery(button,gallery,async signal=>{
    const module=await importPortfolioModule('./'+media);
    if(!signal.aborted&&gallery.open)await module[fill](gallery,signal);
  },{autoplayVideos:galleryName==='travel'});
  if(!toggle)continue;

  const label=toggle.textContent;
  const accessibleLabel=toggle.getAttribute('aria-label');
  const name=gallery.querySelector('h2').textContent;
  function setLabel(text=label){
    toggle.textContent=text;
    toggle.setAttribute('aria-label',text===label&&accessibleLabel?accessibleLabel:text+' — '+name);
  }
  let status;
  toggle.setAttribute('aria-pressed','false');
  toggle.addEventListener('click',async()=>{
    status?.remove();
    if(active?.toggle===toggle){dismissModel();return;}
    dismissModel();
    const controller=new AbortController();
    const session={toggle,setLabel,controller,timeout:0};
    active=session;
    toggle.setAttribute('aria-pressed','true');
    setLabel('Cancel 3D');
    delete button.dataset.hobbyModelFailed;
    const fail=()=>{
      if(active!==session)return;
      dismissModel();
      button.dataset.hobbyModelFailed='true';
      setLabel('Retry 3D');
      status=document.createElement('span');
      status.setAttribute('role','status');
      status.textContent='3D is unavailable. You can still open the gallery.';
      toggle.after(status);
    };
    session.timeout=setTimeout(fail,20000);
    try {
      const {buildHobbyModel}=await importPortfolioModule('./'+id+'.js');
      if(active!==session)return;
      await buildHobbyModel(button,controller.signal,fail);
      if(active===session)setLabel('Close 3D');
    } catch {
      fail();
    } finally {
      clearTimeout(session.timeout);
    }
  });
}

window.addEventListener('pagehide',event=>{
  if(!event.persisted)dismissModel();
});

if(['localhost','127.0.0.1'].includes(location.hostname)){
  const key='shub-media-revision';
  const read=()=>{try{return localStorage.getItem(key);}catch{return null;}};
  const revision=read(),channel=window.BroadcastChannel?new BroadcastChannel('shub-media-library'):null;
  let reloading=false;
  const update=value=>{
    if(!reloading&&value&&value!==revision){reloading=true;location.reload();}
  };
  const events=new AbortController(),options={signal:events.signal};
  channel?.addEventListener('message',event=>update(event.data?.revision),options);
  window.addEventListener('storage',event=>{if(event.key===key)update(event.newValue);},options);
  window.addEventListener('pageshow',event=>{if(event.persisted)update(read());},options);
  window.addEventListener('pagehide',event=>{
    if(!event.persisted){channel?.close();events.abort();}
  },options);
}
