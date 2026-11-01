// Reduce supersampling of decorative surfaces, never layout or motion detail.
// Keep touch selection independent of viewport width (including iPad desktop mode).
/** @param {'model'|'background'|'preview'} kind */
export function graphicsPixelRatio(kind,maximum=Infinity){
  const touch=globalThis.matchMedia?.('(pointer: coarse)').matches ||
    (globalThis.navigator?.platform==='MacIntel'&&globalThis.navigator.maxTouchPoints>1);
  const limits=touch?{model:1.25,background:1.25,preview:1.5}:{model:1.5,background:1.35,preview:1.75};
  return Math.min(globalThis.devicePixelRatio||1,maximum,limits[kind]);
}
