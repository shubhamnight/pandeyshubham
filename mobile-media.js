import { touchPerformance } from './touch-performance.js';

// Native controllers and the bundled React island share one request and map.
const key = Symbol.for('portfolio.mobile-media');
const state = globalThis[key] || (globalThis[key] = { files: null, ready: null });
// Fine-pointer desktop clients do not request the mobile manifest or copies.
// A missing manifest preserves the existing media, including new editor uploads.
// This optional optimization must never gate a gallery mount or preview image.
function loadMobileMedia(){
  if(state.files||state.disposed)return Promise.resolve();
  if(state.pending)return state.pending;
  const controller=new AbortController();state.controller=controller;
  const deadline=setTimeout(()=>controller.abort(),8000);state.deadline=deadline;
  const request=fetch(new URL('/mobile-media-data.json', location.href), { cache: 'no-cache', signal:controller.signal })
    .then(response => response.ok ? response.json() : null)
    .then(data => {if(!controller.signal.aborted&&!state.disposed){state.files=data?.files||null;state.previews=data?.previews||null;}}).catch(() => {})
    .finally(()=>{clearTimeout(deadline);if(state.pending===request){state.pending=null;state.controller=null;state.deadline=0;}});
  state.pending=request;return request;
}
export const mobileMediaReady = state.ready || (state.ready = touchPerformance?loadMobileMedia():Promise.resolve());

// A failed optional manifest must not force full-size phone downloads for the
// rest of the visit. Share one event-driven retry across native/React islands;
// never replace already displayed media or poll in the background.
if(touchPerformance&&typeof window!=='undefined'&&!state.recoveryDetach&&!state.disposed){
  const retry=()=>{if(!document.hidden&&navigator.onLine!==false&&!state.files)void loadMobileMedia();};
  const dispose=event=>{
    if(event.persisted)return;
    state.disposed=true;state.controller?.abort();clearTimeout(state.deadline);
    state.recoveryDetach?.();delete state.recoveryDetach;
  };
  state.recoveryDetach=()=>{
    window.removeEventListener('online',retry);window.removeEventListener('pageshow',retry);
    document.removeEventListener('visibilitychange',retry);window.removeEventListener('pagehide',dispose);
  };
  window.addEventListener('online',retry);window.addEventListener('pageshow',retry);
  document.addEventListener('visibilitychange',retry);window.addEventListener('pagehide',dispose);
}

export function mobileMediaSource(source) {
  return state.files?.[source] || source;
}
// These copies retain the preview canvas's existing centered cover framing.
// Full overlay videos always use mobileMediaSource and keep their resolution.
export function mobilePreviewSource(source,maximumWidth=536) {
  const variants=state.previews?.[source];
  if(typeof variants==='string')return variants;
  return (maximumWidth<=384?variants?.[384]:null)||variants?.[536]||mobileMediaSource(source);
}
export function mobileMediaSrcset(srcset) {
  if (!state.files || !srcset) return srcset;
  return srcset.split(',').map(candidate => {
    const [source, descriptor] = candidate.trim().split(/\s+/);
    return [mobileMediaSource(source), descriptor].filter(Boolean).join(' ');
  }).join(', ');
}
export function mobileMediaSources(sources) {
  return state.files && sources ? sources.map(source => ({ ...source, src: mobileMediaSource(source.src) })) : sources;
}
