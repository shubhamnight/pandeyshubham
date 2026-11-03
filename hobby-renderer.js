// Start with the actual physical buffer. The default 300x150 canvas followed
// by setPixelRatio and an observer resize creates unnecessary GPU reallocations.
import { graphicsPixelRatio } from './graphics-quality.js';
const settings=new WeakMap();
export function createHobbyRenderer(Renderer,button,pixelRatio){
  const maximum=pixelRatio;
  pixelRatio=graphicsPixelRatio('model',pixelRatio);
  const width=Math.max(1,button.clientWidth),height=Math.max(1,button.clientHeight);
  const canvas=document.createElement('canvas');canvas.style.display='block';
  canvas.width=Math.floor(width*pixelRatio);canvas.height=Math.floor(height*pixelRatio);
  const renderer=new Renderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  // Driver diagnostic reads synchronously stall first use on Android. The
  // same shaders still compile; context loss and model failures retain their
  // existing recovery/fallback handling. Desktop diagnostics are unchanged.
  const touch=globalThis.matchMedia?.('(pointer: coarse)').matches ||
    (globalThis.navigator?.platform==='MacIntel'&&globalThis.navigator.maxTouchPoints>1);
  if(touch&&renderer.debug)renderer.debug.checkShaderErrors=false;
  renderer.setDrawingBufferSize(width,height,pixelRatio);
  settings.set(renderer,{maximum,width,height,pixelRatio});
  return renderer;
}

/** Resize only the backing buffer; CSS dimensions and model detail stay intact. */
export function resizeHobbyRenderer(renderer,width,height){
  const current=settings.get(renderer),pixelRatio=graphicsPixelRatio('model',current.maximum);
  if(current.width===width&&current.height===height&&current.pixelRatio===pixelRatio)return false;
  renderer.setDrawingBufferSize(width,height,pixelRatio);
  Object.assign(current,{width,height,pixelRatio});return true;
}
