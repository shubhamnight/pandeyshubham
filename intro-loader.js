// The first-load screen uses the supplied CSS waves; no WebGL model is needed.
import { morphLoadingIntoPlay } from './intro-liquid.js';
export function createMessageLoader(intro){
  intro.classList.add('play-css-surface');
  const loading=intro.querySelector('.intro-loading');
  const mount=intro.querySelector('.message-loading-mount');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const controller=new AbortController();
  let disposed=false,suspended=false,finishPromise=null;
  function sync(){
    // Continue the original waves through the morph; pause only when hidden,
    // disposed or reduced motion is requested.
    mount.classList.toggle('intro-loader-paused',disposed||document.hidden||suspended||preference.matches||loading.hidden);
  }
  const suspend=()=>{suspended=true;sync();};
  const resume=()=>{suspended=false;sync();};
  document.addEventListener('visibilitychange',sync);
  preference.addEventListener('change',sync);
  window.addEventListener('pagehide',suspend);
  window.addEventListener('pageshow',resume);
  sync();
  function dispose(){
    if(disposed)return;
    disposed=true;controller.abort();sync();
    document.removeEventListener('visibilitychange',sync);
    preference.removeEventListener('change',sync);
    window.removeEventListener('pagehide',suspend);
    window.removeEventListener('pageshow',resume);
  }
  return {dispose,finish(){
    if(disposed)return Promise.resolve();
    if(!finishPromise){
      finishPromise=morphLoadingIntoPlay(intro,preference,controller.signal).catch(error=>{
        console.warn('Loading transition unavailable; opening PLAY.',error);
        if(!disposed){
          intro.classList.add('show-play','play-morphed');
          intro.classList.remove('play-morphing','message-loader-transition');
          intro.querySelector('.flow-play').inert=false;
        }
      }).finally(()=>{
        loading.hidden=true;sync();mount.replaceChildren();
      });
    }
    return finishPromise;
  }};
}
