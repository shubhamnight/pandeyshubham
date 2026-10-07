const $ = selector => document.querySelector(selector);
const status = $('#status'), list = $('#image-list'), controls = $('#editor-controls');
const canvas = $('#crop-canvas'), context = canvas.getContext('2d');
const zoom = $('#zoom'), ratioSelect = $('#ratio'), modeSelect = $('#crop-mode');
let library, category = 'photography', selected = null, image = null, crop = null;
let upload = null, objectUrl = null, busy = false, loading = false, imageVersion = 0;
let canvasWidth = 0, canvasHeight = 0, statusTimer, dragging = null, savedCrop = null;
let drawFrame = 0;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('shub-media-library') : null;

function message(text, error = false) {
  clearTimeout(statusTimer); status.textContent = text; status.classList.toggle('error', error);
  if (!error) statusTimer = setTimeout(() => { status.textContent = ''; }, 8000);
}
function notify(revision) {
  channel?.postMessage({ revision });
  try { localStorage.setItem('shub-media-revision', revision); } catch {}
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button,select,input').forEach(element => { element.disabled = value; });
  $('#save-image').disabled = value || loading || !image;
  ratioSelect.querySelector('[value=saved]').disabled = !savedCrop;
}
async function request(input) {
  const response = await fetch('/api/media-manager', input ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  } : { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Could not save changes');
  return result;
}
function button(text, action, extra = '') {
  const element = document.createElement('button');
  element.type = 'button'; element.className = 'button ' + extra; element.textContent = text;
  element.disabled = busy; element.addEventListener('click', action); return element;
}
function renderLibrary() {
  if (!library) return;
  const query = $('#search').value.trim().toLowerCase(), showDeleted = $('#show-deleted').checked;
  const items = library[category];
  const filtered = items.filter(item => (showDeleted || !item.deleted) &&
    (item.alt + ' ' + decodeURIComponent(item.id)).toLowerCase().includes(query));
  $('#image-count').textContent = `${items.filter(item => !item.deleted).length} images · ${items.filter(item => item.deleted).length} deleted`;
  list.replaceChildren();
  if (!filtered.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No images here. Add one, change your search, or show deleted images.'; list.append(p); }
  for (const item of filtered) {
    const article = document.createElement('article');
    article.className = 'image-card' + (selected?.id === item.id ? ' selected' : '') + (item.deleted ? ' deleted' : '');
    const thumbnail = document.createElement('img'); thumbnail.src = item.preview; thumbnail.alt = item.alt;
    thumbnail.loading = 'lazy'; thumbnail.decoding = 'async'; thumbnail.width = 240; thumbnail.height = 160;
    const copy = document.createElement('div'); copy.className = 'image-card-copy';
    const title = document.createElement('h3'); title.textContent = item.alt;
    const filename = document.createElement('p'); filename.className = 'filename';
    filename.textContent = item.added ? 'Uploaded image' : decodeURIComponent(item.id.split('/').pop());
    const actions = document.createElement('div'); actions.className = 'card-actions';
    if (item.deleted) actions.append(button('Restore image', () => mutate(item, 'restore')));
    else {
      actions.append(button('Crop / update', () => selectImage(item)), button('Delete', () => mutate(item, 'delete'), 'danger'));
      if (item.edited && !item.added) actions.append(button('Restore original', () => mutate(item, 'reset'), 'secondary'));
    }
    copy.append(title, filename, actions); article.append(thumbnail, copy); list.append(article);
  }
}
function closeEditor() {
  imageVersion++; image = null; crop = null; selected = null; upload = null; savedCrop = null;
  loading = false; dragging = null; $('#loading-image').hidden = true;
  cancelAnimationFrame(drawFrame); drawFrame = 0; $('#save-image').disabled = true;
  if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null;
  controls.hidden = true; $('#empty-editor').hidden = false; $('#editor-title').textContent = 'Choose an image to begin';
  if (library) renderLibrary();
}
async function mutate(item, action) {
  if (busy) return;
  setBusy(true); message('Updating the website…');
  try {
    library = await request({ category, id: item.id, action });
    if (selected?.id === item.id) closeEditor();
    notify(library.revision); renderLibrary();
    message(action === 'delete' ? 'Image removed. Turn on Show deleted to restore it.' : action === 'reset' ? 'Original image restored on the website.' : 'Image restored on the website.');
  } catch (error) { message(error.message, true); }
  finally { setBusy(false); }
}
function screenSize() {
  return { laptop: [1440, 900], tablet: [768, 1024], phone: [390, 844], current: [window.innerWidth, window.innerHeight] }[$('#screen-size').value];
}
function placeholderRatio() {
  const [w, h] = screenSize();
  if (category === 'photography') return modeSelect.value === 'card' ? 3 / 4 : w <= 700 ? w / h : (w - 34) / (h - 34);
  // The slider's largest frame uses the same width breakpoints and height factors as ZoomSliderComp.
  // Prefer measurements from the actual open overlay when previewing this screen.
  if ($('#screen-size').value === 'current') {
    try { const metrics = JSON.parse(localStorage.getItem('shub-travel-frame')); if (metrics?.ratio > 0 && metrics.screenWidth === w && metrics.screenHeight === h) return metrics.ratio; } catch {}
  }
  const fitted = w <= 1100 || w / h <= 4 / 5;
  const galleryWidth = Math.min(1060, w - (fitted ? 24 : 40)) - 2;
  const galleryHeight = Math.min(780, fitted ? h - 24 : h * .88) - 2;
  // Header typography is fluid. This is a screen preset; live overlay measurements supersede it.
  const short = fitted && h <= 550;
  const headingHeight = (short ? 24 : Math.max(28, Math.min(42, w * .04))) * 1.1;
  const headerHeight = (fitted ? short ? 24 : 36 : 48) + 8 + 16 * 1.5 + headingHeight + 1;
  const stageHeight = Math.max(100, galleryHeight - headerHeight);
  const frameHeight = Math.max(1, Math.min(Math.round(stageHeight * (galleryWidth < 640 ? .6 : .82)), stageHeight - 32));
  return Math.min(galleryWidth, galleryWidth < 640 ? 260 : galleryWidth < 1025 ? 500 : 680) / frameHeight;
}
function chosenRatio() {
  if (!image) return 3 / 4;
  const natural = image.naturalWidth / image.naturalHeight;
  if (ratioSelect.value === 'saved' && savedCrop) return savedCrop.width * natural / savedCrop.height;
  return { placeholder: placeholderRatio(), portrait: 3 / 4, landscape: 4 / 3, wide: 16 / 9, square: 1, original: natural }[ratioSelect.value] || natural;
}
function baseCrop() {
  const natural = image.naturalWidth / image.naturalHeight, target = chosenRatio();
  return natural > target ? { width: target / natural, height: 1 } : { width: 1, height: natural / target };
}
const clamp = (value, max) => Math.min(Math.max(0, value), Math.max(0, max));
function updateCrop(reset = false) {
  if (!image || loading) return;
  const base = baseCrop(), amount = Number(zoom.value);
  const width = base.width / amount, height = base.height / amount;
  const cx = !reset && crop ? crop.x + crop.width / 2 : .5;
  const cy = !reset && crop ? crop.y + crop.height / 2 : .5;
  crop = { x: clamp(cx - width / 2, 1 - width), y: clamp(cy - height / 2, 1 - height), width, height };
  $('#zoom-value').textContent = amount.toFixed(2) + '×';
  draw();
}
function draw() {
  // Pointer, resize and zoom updates share one paint; keep the latest crop.
  if (!drawFrame) drawFrame = requestAnimationFrame(() => { drawFrame = 0; paintCrop(); });
}
function paintCrop() {
  if (!image || !crop || loading) return;
  const target = crop.width * image.naturalWidth / (crop.height * image.naturalHeight);
  const stage = $('#crop-stage');
  const maxWidth = Math.max(80, stage.clientWidth - 26), maxHeight = Math.max(160, Math.min(500, innerHeight * .48));
  canvasWidth = Math.min(maxWidth, maxHeight * target); canvasHeight = canvasWidth / target;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(canvasWidth * dpr), pixelHeight = Math.round(canvasHeight * dpr);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  canvas.style.width = `${canvasWidth}px`; canvas.style.height = `${canvasHeight}px`;
  context.setTransform(pixelWidth / canvasWidth, 0, 0, pixelHeight / canvasHeight, 0, 0);
  context.drawImage(image, crop.x * image.naturalWidth, crop.y * image.naturalHeight,
    crop.width * image.naturalWidth, crop.height * image.naturalHeight, 0, 0, canvasWidth, canvasHeight);
  context.strokeStyle = '#ffffff50'; context.lineWidth = 1;
  context.beginPath();
  for (const third of [1 / 3, 2 / 3]) {
    context.moveTo(canvasWidth * third, 0); context.lineTo(canvasWidth * third, canvasHeight);
    context.moveTo(0, canvasHeight * third); context.lineTo(canvasWidth, canvasHeight * third);
  }
  context.stroke();
  const pixels = `${Math.round(crop.width * image.naturalWidth)} × ${Math.round(crop.height * image.naturalHeight)} px`;
  const detail = category === 'travel' ? 'Travel frames change shape while scrolling. This matches the enlarged frame; smaller frames may crop further.' :
    modeSelect.value === 'card' ? 'Matches the 3:4 filmstrip card. Crop the background separately using View.' : 'Matches the selected screen. Other screen shapes may crop further.';
  const description = `${pixels} · ${target.toFixed(3)}:1. ${detail}`;
  if ($('#frame-description').textContent !== description) $('#frame-description').textContent = description;
}
async function loadImage(src, initialCrop) {
  const version = ++imageVersion; loading = true; image = null; crop = null;
  $('#loading-image').hidden = false; $('#save-image').disabled = true;
  try {
    const next = new Image(); next.decoding = 'async'; next.src = src; await next.decode();
    if (version !== imageVersion) return;
    image = next; loading = false;
    savedCrop = initialCrop || null; ratioSelect.querySelector('[value=saved]').disabled = !savedCrop;
    ratioSelect.value = savedCrop ? 'saved' : 'placeholder'; zoom.value = '1';
    if (savedCrop) {
      crop = { ...savedCrop }; const base = baseCrop();
      const amount = base.width / crop.width; zoom.max = String(Math.max(5, amount)); zoom.value = String(amount);
      $('#zoom-value').textContent = amount.toFixed(2) + '×'; draw();
    } else { zoom.max = '5'; updateCrop(true); }
    $('#save-image').disabled = busy;
  } catch { if (version === imageVersion) message('Could not open this image. Try replacing it with a JPEG, PNG or WebP.', true); }
  finally { if (version === imageVersion) { loading = false; $('#loading-image').hidden = true; } }
}
async function selectImage(item) {
  if (busy) return;
  upload = null; if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null;
  selected = item; controls.hidden = false; $('#empty-editor').hidden = true;
  modeSelect.value = 'card'; modeSelect.options[0].textContent = category === 'photography' ? 'Filmstrip card' : 'Travel slider';
  modeSelect.options[1].hidden = category !== 'photography';
  $('#editor-title').textContent = item.alt; $('#image-description').value = item.alt;
  renderLibrary(); if (innerWidth <= 700) $('.editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  await loadImage(item.source, item.crop);
}
async function pickFile(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) { message('Choose a JPEG, PNG or WebP smaller than 20 MB.', true); return; }
  upload = file; savedCrop = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = URL.createObjectURL(file);
  if (!selected) selected = { id: null, alt: file.name, added: true };
  $('#editor-title').textContent = selected.id ? 'Replace: ' + selected.alt : 'New image';
  $('#image-description').value = selected.id ? selected.alt : file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  controls.hidden = false; $('#empty-editor').hidden = true;
  modeSelect.value = 'card'; modeSelect.options[0].textContent = category === 'photography' ? 'Filmstrip card' : 'Travel slider';
  modeSelect.options[1].hidden = category !== 'photography';
  await loadImage(objectUrl, null);
  if (image && image.naturalWidth * image.naturalHeight > 40000000) { image = null; $('#save-image').disabled = true; message('Choose an image smaller than 40 megapixels.', true); }
  if (innerWidth <= 700) $('.editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function uploadData(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Could not read the selected file')); reader.readAsDataURL(file); });
}
$('#save-image').addEventListener('click', async () => {
  if (!selected || !image || !crop || busy || loading) return;
  setBusy(true); message('Saving crop and preparing website images…');
  const editingId = selected.id;
  try {
    library = await request({ action: 'save', category, id: editingId, mode: modeSelect.value, crop,
      alt: $('#image-description').value, ...(upload ? { upload: await uploadData(upload) } : {}) });
    notify(library.revision); closeEditor();
    message('Saved. The local website has been updated. Choose another image to continue.');
  } catch (error) { message(error.message, true); }
  finally { setBusy(false); }
});
$('#add-image').addEventListener('click', () => { closeEditor(); $('#file-picker').value = ''; $('#file-picker').click(); });
$('#replace-image').addEventListener('click', () => { $('#file-picker').value = ''; $('#file-picker').click(); });
$('#file-picker').addEventListener('change', event => pickFile(event.target.files[0]));
$('#cancel-edit').addEventListener('click', closeEditor);
$('#center-crop').addEventListener('click', () => { zoom.value = '1'; updateCrop(true); });
zoom.addEventListener('input', () => updateCrop());
ratioSelect.addEventListener('change', () => { zoom.value = '1'; updateCrop(true); });
$('#screen-size').addEventListener('change', () => { ratioSelect.value = 'placeholder'; zoom.value = '1'; updateCrop(true); });
modeSelect.addEventListener('change', () => {
  if (!selected || !image || loading) return;
  const remembered = !upload && selected[modeSelect.value === 'card' ? 'crop' : 'backdropCrop'];
  savedCrop = remembered || null; ratioSelect.querySelector('[value=saved]').disabled = !savedCrop;
  if (remembered) {
    crop = { ...remembered }; ratioSelect.value = 'saved';
    const amount = baseCrop().width / crop.width; zoom.max = String(Math.max(5, amount)); zoom.value = String(amount);
    $('#zoom-value').textContent = amount.toFixed(2) + '×'; draw();
  } else { ratioSelect.value = 'placeholder'; zoom.value = '1'; updateCrop(true); }
});
$('#search').addEventListener('input', renderLibrary); $('#show-deleted').addEventListener('change', renderLibrary);
document.querySelectorAll('[data-category]').forEach(tab => tab.addEventListener('click', () => {
  if (busy || !library) return;
  closeEditor(); category = tab.dataset.category; $('#search').value = '';
  document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button === tab)));
  renderLibrary();
}));
canvas.addEventListener('pointerdown', event => {
  if (!crop || busy || loading || !event.isPrimary || event.button !== 0) return;
  event.preventDefault(); canvas.focus(); canvas.setPointerCapture(event.pointerId);
  dragging = { id: event.pointerId, x: event.clientX, y: event.clientY, crop: { ...crop } };
});
canvas.addEventListener('pointermove', event => {
  if (!dragging || dragging.id !== event.pointerId || busy) return;
  crop.x = clamp(dragging.crop.x - (event.clientX - dragging.x) / canvasWidth * crop.width, 1 - crop.width);
  crop.y = clamp(dragging.crop.y - (event.clientY - dragging.y) / canvasHeight * crop.height, 1 - crop.height);
  draw();
});
const endDrag = () => { dragging = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
canvas.addEventListener('keydown', event => {
  if (!crop || busy || loading || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault(); const step = event.shiftKey ? .05 : .005;
  crop.x = clamp(crop.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0) * crop.width, 1 - crop.width);
  crop.y = clamp(crop.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) * crop.height, 1 - crop.height);
  draw();
});
new ResizeObserver(() => draw()).observe($('#crop-stage'));
window.addEventListener('storage', event => {
  if (event.key === 'shub-travel-frame' && category === 'travel' && ratioSelect.value === 'placeholder') updateCrop();
});
window.addEventListener('beforeunload', event => {
  if (busy) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('pagehide', event => {
  dragging = null; cancelAnimationFrame(drawFrame); drawFrame = 0;
  if (!event.persisted) { channel?.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
});
window.addEventListener('pageshow', event => { if (event.persisted) draw(); });
try {
  library = await request(); $('#add-image').disabled = false; renderLibrary();
  message('Choose an image to crop, replace, or delete.');
} catch (error) { message('The editor needs the local server. ' + error.message, true); }
