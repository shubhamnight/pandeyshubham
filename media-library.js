import { mediaLibrary } from './media-library-data.js';

export function applyMediaEdits(category, originals) {
  const edits = mediaLibrary[category] || {};
  const result = [];
  const append = (item, id) => {
    const edit = edits[id];
    if (edit?.deleted) return;
    const card = edit?.cardMedia;
    const backdrop = edit?.backdropMedia || card;
    result.push({ ...item, ...card, libraryId: id, sourceOriginal: item.original,
      ...(edit?.alt ? { alt: edit.alt } : {}),
      ...(backdrop ? { overlayImage: backdrop.original, overlaySources: backdrop.sources, overlayWidth: backdrop.width, overlayHeight: backdrop.height } : {}),
      edited: Boolean(card) });
  };
  originals.forEach(item => append(item, item.original));
  Object.entries(edits).forEach(([id, edit]) => {
    if (edit.added && edit.cardMedia) append({ type: 'image', original: edit.source, alt: edit.alt || 'Photograph' }, id);
  });
  return result;
}

// Refresh an already open local portfolio after saving in its separate editor tab.
if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
  let reloading = false;
  const update = revision => {
    if (revision && revision !== mediaLibrary.revision && !reloading) {
      reloading = true;
      location.reload();
    }
  };
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('shub-media-library');
    channel.onmessage = event => update(event.data?.revision);
    window.addEventListener('pagehide', event => { if (!event.persisted) channel.close(); }, { once: true });
  }
  window.addEventListener('storage', event => { if (event.key === 'shub-media-revision') update(event.newValue); });
  window.addEventListener('pageshow', event => {
    if (event.persisted) fetch('./media-library.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => update(data?.revision)).catch(() => {});
  });
}
