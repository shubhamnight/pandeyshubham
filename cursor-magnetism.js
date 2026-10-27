// Magnetic interactions shared by the native-page Batman follower. Target
// transforms are additive animations, leaving existing Motion/GSAP/CSS poses intact.
export const magneticDefaults = Object.freeze({ magneticFactor:.2,
  speedMultiplier:.02, maxScaleX:.16, maxScaleY:.08 });
const selector = '[data-magnetic],.skill-shiny-button,.hobby-orbit-center>button,.hobby-image-placeholder:not([hidden]),.gaming-marquee-card,.photo-card button,[data-travel-index],.dcc-slide,.social-link,.floating-nav a,.flow-play,dialog>header>button,.dcc-btn,.dcc-menubtn';
export function magneticTarget(path) {
  for(const element of path)if(element instanceof HTMLElement&&
    (element.inert||element.matches('input,textarea,select,video,[contenteditable=true],.badge')||element.closest('[inert]')))return null;
  for(const element of path)if(element instanceof HTMLElement){const target=element.closest(selector);if(target&&!target.matches(':disabled,[aria-disabled=true]'))return target;}
  return null;
}
export function pointerPath(x,y) {
  let element=document.elementFromPoint(x,y);
  while(element?.shadowRoot){const child=element.shadowRoot.elementFromPoint(x,y);if(!child||child===element)break;element=child;}
  const path=[];
  while(element){path.push(element);element=element.parentElement||element.getRootNode()?.host;}
  return path;
}
export function createMagnetism() {
  const records=new Map();let current=null;
  const state={element:null,rect:null,moving:false};
  function cancel(record){record.animation?.cancel();records.delete(record.element);}
  function select(element) {
    if(element===current?.element)return;
    if(current)current.leaving=true;
    current=null;state.element=null;state.rect=null;
    if(!element)return;
    let record=records.get(element);
    if(!record){
      record={element,animation:null,x:0,y:0,vx:0,vy:0,leaving:false,holding:false,paintX:NaN,paintY:NaN,previous:null};
      // The WebGL PLAY mesh and its accessible button must stay aligned.
      if(!element.matches('.flow-play')){
        try{record.animation=element.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,0,0)'}],{duration:1,fill:'both',composite:'add'});
          record.animation.id='batman-magnet';record.animation.pause();record.animation.currentTime=0;
          if(record.animation.effect.composite!=='add'){record.animation.cancel();record.animation=null;}
        }catch{record.animation=null;}
      }
      records.set(element,record);
    }
    record.leaving=false;current=record;state.element=element;
    // Bound transient release effects during very fast traversal of a gallery.
    if(records.size>8)for(const old of records.values())if(old!==current){cancel(old);break;}
  }
  function advance(dt,px,py) {
    state.moving=false;state.rect=null;
    for(const record of records.values()){
      const {element}=record;
      if(!element.isConnected||element.closest('dialog:not([open])')||element.closest('[inert]')){if(record===current){current=null;state.element=null;}cancel(record);continue;}
      // Keep a pressed target under the real pointer until its native click
      // has been dispatched. Releasing its offset on pointerdown can miss an edge click.
      if(record.holding){record.vx=record.vy=0;continue;}
      let tx=0,ty=0;
      if(record===current){
        const rect=element.getBoundingClientRect();
        if(!rect.width||!rect.height){select(null);}
        else{
          state.rect=rect;
          const previous=record.previous;
          if(!previous||Math.abs(rect.x-previous.x)+Math.abs(rect.y-previous.y)+Math.abs(rect.width-previous.width)+Math.abs(rect.height-previous.height)>.02)state.moving=true;
          record.previous=rect;
          tx=Math.max(-18,Math.min(18,(px-(rect.x+rect.width/2-record.x))*magneticDefaults.magneticFactor));
          ty=Math.max(-18,Math.min(18,(py-(rect.y+rect.height/2-record.y))*magneticDefaults.magneticFactor));
        }
      }
      const omega=record.leaving?20:32,damping=record.leaving ? .74 : .9;
      const decay=Math.exp(-damping*omega*dt),frequency=omega*Math.sqrt(1-damping*damping);
      const cosine=Math.cos(frequency*dt),sine=Math.sin(frequency*dt),dx=record.x-tx,dy=record.y-ty;
      const oldVX=record.vx,oldVY=record.vy;
      record.x=tx+decay*(dx*cosine+(oldVX+damping*omega*dx)/frequency*sine);
      record.y=ty+decay*(dy*cosine+(oldVY+damping*omega*dy)/frequency*sine);
      record.vx=decay*(oldVX*cosine-(damping*omega*oldVX+omega*omega*dx)/frequency*sine);
      record.vy=decay*(oldVY*cosine-(damping*omega*oldVY+omega*omega*dy)/frequency*sine);
      const settled=Math.abs(record.x-tx)<.02&&Math.abs(record.y-ty)<.02&&Math.abs(record.vx)<.3&&Math.abs(record.vy)<.3;
      if(settled){record.x=tx;record.y=ty;record.vx=record.vy=0;if(record.leaving){cancel(record);continue;}}
      else state.moving=true;
      if(record.animation&&(Math.abs(record.paintX-record.x)>.005||Math.abs(record.paintY-record.y)>.005||!Number.isFinite(record.paintX))){
        const transform=`translate3d(${record.x.toFixed(3)}px,${record.y.toFixed(3)}px,0)`;
        record.animation.effect.setKeyframes([{transform},{transform}]);record.paintX=record.x;record.paintY=record.y;
      }
    }
    return state;
  }
  function clear(){for(const record of records.values())cancel(record);current=null;state.element=null;state.rect=null;state.moving=false;}
  return {select,advance,clear,
    hold(){if(current)current.holding=true;},
    release(){for(const record of records.values())record.holding=false;},
    get element(){return current?.element||null;}};
}
