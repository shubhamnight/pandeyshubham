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
