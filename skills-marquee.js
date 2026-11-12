import { requestHobbyFrame, cancelHobbyFrame } from './hobby-motion-clock.js';

const section = document.querySelector('#about');
if (section) {
  const rows = [...section.querySelectorAll('.skills-marquee')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const fineHover = matchMedia('(hover: hover) and (pointer: fine)');
  const events = new AbortController();
  const options = { signal: events.signal };
  const animation = row => row.querySelector('.skills-marquee-track').getAnimations()
    .find(item => item.animationName === 'skills-marquee-loop');
  let visible = false, suspended = false, hovered = null;
  let selected = null, drag = null, pointerShift = 0, touchTarget = null;
  let enhanced = false;
  const phases = new Map();
  let resuming = [], resumeStart = 0;

  function stopResume() {
    cancelHobbyFrame(easeResume);
    for (const current of resuming) current.updatePlaybackRate(1);
    resuming = [];
  }

  function easeResume(time) {
    const elapsed = time - resumeStart;
    if (elapsed >= 750) {
      stopResume();
      return;
    }
    // LogoLoop's exponential acceleration, with steady motion left to CSS.
    const rate = 1 - .8 * Math.exp(-elapsed / 250);
    for (const current of resuming) current.updatePlaybackRate(rate);
  }

  function keyboardFocus() {
    return section.querySelector('[data-skills-primary] button:focus-visible');
  }
  function sync() {
    const paused = !visible || suspended || document.hidden || preference.matches ||
      hovered || selected !== null || drag?.active || keyboardFocus() ||
      document.body.matches('.motion-paused,.photography-gallery-open,.intro-active');
    if (paused && resuming.length) stopResume();
    const state = String(Boolean(paused));
    if (section.dataset.skillsPaused !== state) section.dataset.skillsPaused = state;
  }
  function seek(row, pixels) {
    const current = animation(row);
    if (!current) return;
    const distance = row.querySelector('[data-skills-primary]').offsetWidth;
    const duration = Number(current.effect.getTiming().duration);
    const direction = row.dataset.direction === 'reverse' ? -1 : 1;
    const time = Number(current.currentTime || 0) + pixels / distance * duration * direction;
    current.currentTime = ((time % duration) + duration) % duration;
  }
  function updateHover(event) {
    if (!fineHover.matches || event.pointerType !== 'mouse') return;
    const circle = event.target.closest('.skills-logo-hit')?.closest('[data-skill]') ?? null;
    if (circle === hovered) return;
    const leavingIcon = Boolean(hovered && !circle);
    clearHover();
    hovered = circle;
    hovered?.setAttribute('data-hovered', '');
    sync();
    if (leavingIcon && enhanced && section.dataset.skillsPaused === 'false') {
      resuming = rows.map(animation).filter(current => current && typeof current.updatePlaybackRate === 'function');
      if (!resuming.length) return;
      resumeStart = performance.now();
      easeResume(resumeStart);
      requestHobbyFrame(easeResume, 30, false);
    }
  }
  function clearHover() {
    hovered?.removeAttribute('data-hovered');
    hovered = null;
  }
  function clearSelected() {
    selected?.removeAttribute('data-selected');
    selected = null;
  }
  function bringIntoView(circle) {
    const row = circle.closest('.skills-marquee');
    if (!enhanced) {
      circle.scrollIntoView({ block: 'nearest', inline: 'center' });
      return;
    }
    // Native focus scrolling must not compound the animated track's offset.
    row.scrollLeft = 0;
    const icon = circle.getBoundingClientRect(), label = circle.querySelector('.skills-orbit-name').getBoundingClientRect();
    const bounds = {left:Math.min(icon.left,label.left),right:Math.max(icon.right,label.right)};
    bounds.width = bounds.right-bounds.left;
    const viewport = row.getBoundingClientRect();
    if (bounds.left < viewport.left + 6 || bounds.right > viewport.right - 6) {
      const group = row.querySelector('[data-skills-primary]');
      const base = bounds.left - group.getBoundingClientRect().left;
      const distance = group.offsetWidth, duration = 40000;
      const offset = Math.max(0, Math.min(distance - row.clientWidth, base - (row.clientWidth - bounds.width) / 2));
      const time = offset / distance * duration;
      animation(row).currentTime = row.dataset.direction === 'reverse' ? duration - time - .01 : time;
    }
  }
  function paintDrag() {
    cancelHobbyFrame(paintDrag);
    if (drag?.active && pointerShift) seek(drag.row, pointerShift);
    pointerShift = 0;
  }
  function release(event) {
    if (drag?.active) {
      paintDrag();
    }
    const previous = drag;
    drag = null;
    cancelHobbyFrame(paintDrag);
    if (!['pointerup', 'pointercancel', 'lostpointercapture'].includes(event?.type) && previous?.row.hasPointerCapture(previous.id)) previous.row.releasePointerCapture(previous.id);
    sync();
  }
  function configure() {
    stopResume();
    release();
    clearSelected();
    rows.forEach(row => {
      const current = animation(row);
      if (current) phases.set(row, Number(current.currentTime || 0));
    });
    enhanced = !preference.matches && CSS.supports('width', '1cqw');
    section.classList.toggle('skills-enhanced', enhanced);
    if (enhanced) rows.forEach(row => {
      row.scrollLeft = 0;
      const current = animation(row);
      if (current && phases.has(row)) current.currentTime = phases.get(row);
    });
    sync();
  }

  section.addEventListener('pointermove', updateHover, { ...options, passive: true });
  section.addEventListener('pointerover', updateHover, options);
  section.addEventListener('pointerleave', () => { clearHover(); sync(); }, options);
  section.addEventListener('focusin', event => {
    if (!event.target.matches(':focus-visible')) return;
    clearSelected();
    sync();
    if (event.target.matches('[data-skills-primary] button')) bringIntoView(event.target);
  }, options);
  section.addEventListener('focusout', () => queueMicrotask(sync), options);
  function activate(event) {
    const circle = event.target.closest('[data-skill]');
    if (!circle) return;
    const previous = selected;
    clearSelected();
    if (previous !== circle) {
      selected = circle;
      circle.setAttribute('data-selected', '');
    }
    sync();
  }
  section.addEventListener('click', event => {
    const target = event.target.closest('[data-skill]');
    if (event.pointerType === 'touch' || (event.detail > 0 && target === touchTarget)) { touchTarget = null; return; }
    if (!event.detail) activate(event);
    else { clearSelected(); sync(); }
  }, options);
  section.addEventListener('pointerup', event => {
    if (event.pointerType !== 'touch' || !event.isPrimary || drag?.active) return;
    const target = event.target.closest('[data-skill]');
    if (!target?.contains(document.elementFromPoint(event.clientX, event.clientY))) return;
    if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 8) return;
    touchTarget = target;
    activate(event);
  }, options);
  document.addEventListener('pointerdown', event => {
    touchTarget = null;
    if (event.pointerType === 'touch' && !event.isPrimary) release();
    if (!event.target.closest('#about [data-skill]')) { clearSelected(); sync(); }
  }, { ...options, passive: true });
  for (const type of ['pointerup', 'pointercancel']) {
    document.addEventListener(type, event => {
      if (drag?.id === event.pointerId) release(event);
    }, options);
  }

  for (const row of rows) {
    row.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, row, x: event.clientX, y: event.clientY, lastX: event.clientX, active: false };
    }, { ...options, passive: true });
    row.addEventListener('pointermove', event => {
      if (!enhanced || !drag || drag.id !== event.pointerId) return;
      if (!drag.active) {
        const dx = Math.abs(event.clientX - drag.x), dy = Math.abs(event.clientY - drag.y);
        if (dy > dx && dy >= 8) { release(); return; }
        if (dx < 8 || dx <= dy) return;
        drag.active = true;
        clearSelected();
        row.setPointerCapture(event.pointerId);
        sync();
      }
      pointerShift += drag.lastX - event.clientX;
      drag.lastX = event.clientX;
      requestHobbyFrame(paintDrag, 30, false);
    }, { ...options, passive: true });
    row.addEventListener('lostpointercapture', event => {
      // Ignore the button's implicit touch capture transferring to this row.
      if (event.target === row && drag?.id === event.pointerId) release(event);
    }, options);
    row.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const buttons = [...row.querySelectorAll('[data-skills-primary] button')];
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus();
    }, options);
  }

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { release(); clearSelected(); clearHover(); }
    sync();
  });
  intersection.observe(section);
  const resize = new ResizeObserver(() => {
    release();
    clearHover();
    clearSelected();
    const focused = keyboardFocus();
    if (focused) bringIntoView(focused);
    sync();
  });
  rows.forEach(row => resize.observe(row));
  const state = new MutationObserver(sync);
  state.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  preference.addEventListener('change', configure, options);
  fineHover.addEventListener('change', () => { clearHover(); sync(); }, options);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { release(); clearSelected(); clearHover(); }
    sync();
  }, options);
  window.addEventListener('blur', () => { release(); clearSelected(); clearHover(); sync(); }, options);
  window.addEventListener('pageshow', () => { suspended = false; sync(); }, options);
  window.addEventListener('pagehide', event => {
    suspended = true;
    release();
    clearSelected();
    clearHover();
    if (event.persisted) return;
    events.abort();
    intersection.disconnect();
    resize.disconnect();
    state.disconnect();
  }, options);
  configure();
}
