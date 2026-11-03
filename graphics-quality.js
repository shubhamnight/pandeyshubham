// Quality changes only decorative backing stores, never source media or motion.
// Pixel area scales with the square of the density.
export const renderScale=Math.sqrt(.70);
const normal={model:1.5,background:1.35,preview:1.75,decorative:1.5};
const touchLimits={model:1.25,background:1.25,preview:1.5,decorative:1.5};
const lowLimits={model:1,background:1,preview:1.25,decorative:1};
const key=Symbol.for('portfolio.graphics-quality');
const state=globalThis[key]||(globalThis[key]={reduced:false,last:null,duration:0,samples:0,slow:0,poor:0,listeners:new Set(),disposed:false});
const pauseClasses=['intro-active','badge-entering','hobbies-intro-active','photography-gallery-open','motion-paused'];
const positive=value=>Number.isFinite(value)&&value>0;
function weakHardware(){
  const memory=globalThis.navigator?.deviceMemory,cores=globalThis.navigator?.hardwareConcurrency;
  return positive(memory)&&memory<=4&&positive(cores)&&cores<=4;
}
function resetEvidence(){state.last=null;state.duration=state.samples=state.slow=state.poor=0;}
// Native modules and separately bundled React/recovery islands share one latch.
if(!state.listening&&!state.disposed&&globalThis.window?.addEventListener){
  const leave=event=>{
    resetEvidence();if(event.persisted)return;
    state.disposed=true;state.listeners.clear();window.removeEventListener('pagehide',leave);
    globalThis.document?.removeEventListener?.('visibilitychange',resetEvidence);
  };
  state.listening=true;window.addEventListener('pagehide',leave);
  globalThis.document?.addEventListener?.('visibilitychange',resetEvidence);
}
/** @param {'model'|'background'|'preview'|'decorative'} kind */
export function graphicsPixelRatio(kind,maximum=Infinity){
  const touch=globalThis.matchMedia?.('(pointer: coarse)').matches ||
    (globalThis.navigator?.platform==='MacIntel'&&globalThis.navigator.maxTouchPoints>1);
  const limits=state.reduced||weakHardware()?lowLimits:touch?touchLimits:normal;
  const density=globalThis.devicePixelRatio,limit=limits[kind];
  return Math.min(positive(density)?density:1,positive(maximum)?maximum:Infinity,Number.isFinite(limit)?limit:1)*renderScale;
}

/** Subscribe to the one runtime downshift; initial density comes from the query. */
export function observeGraphicsQuality(callback){
  if(state.disposed||typeof callback!=='function')return ()=>{};
  state.listeners.add(callback);return ()=>state.listeners.delete(callback);
}

// Called only by existing visible animation clocks. No sampler, timer or storage.
export function reportGraphicsFrame(time,active=true){
  if(state.disposed||state.reduced)return false;
  const document=globalThis.document,classes=document?.body?.classList;
  let paused=!active||document?.hidden;
  for(const name of pauseClasses)if(classes?.contains(name)){paused=true;break;}
  if(paused||!Number.isFinite(time)||time<0||weakHardware()){resetEvidence();return false;}
  if(state.last!==null&&time<=state.last)return false;
  const previous=state.last;state.last=time;
  if(previous===null)return false;
  const delta=time-previous;
  if(delta>1000){resetEvidence();state.last=time;return false;}
  state.duration+=delta;state.samples++;if(delta>45)state.slow++;
  if(state.duration<2000||state.samples<12)return false;
  state.poor=state.slow>state.samples/2?state.poor+1:0;
  state.duration=state.samples=state.slow=0;
  if(state.poor<2)return false;
  state.reduced=true;resetEvidence();
  for(const callback of [...state.listeners])if(state.listeners.has(callback)){
    try{callback();}catch(error){console.error('Decorative graphics resize failed',error);}
  }
  return true;
}
