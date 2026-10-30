import { touchPerformance } from './touch-performance.js';

// Native controllers and the bundled React island share one request and map.
const key = Symbol.for('portfolio.mobile-media');
const state = globalThis[key] || (globalThis[key] = { files: null, ready: null });
// Fine-pointer desktop clients do not request the mobile manifest or copies.
// A missing manifest preserves the existing media, including new editor uploads.
// This optional optimization must never gate a gallery mount or preview image.
export const mobileMediaReady = state.ready || (state.ready = touchPerformance
  ? fetch(new URL('/mobile-media-data.json', location.href), { cache: 'no-cache' })
    .then(response => response.ok ? response.json() : null)
    .then(data => { state.files = data?.files || null; state.previews = data?.previews || null; }).catch(() => {})
  : Promise.resolve());

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
