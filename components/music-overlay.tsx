import { memo, useEffect, useRef, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import StackingCards, { StackingCardItem } from '@/components/ui/stacking-cards';

export interface MusicCard {
  title: string;
  artist: string;
  singer: string;
  lyric: string;
  lyricSource: string;
  creditSource: string;
  sourcePage: string;
  album: string;
  src: string;
  fullSrc: string;
  background: string;
  accent: string;
  typography: string;
}

const SongCard = memo(function SongCard({ song, index }: { song: MusicCard; index: number }) {
  return <article className="music-song-card" aria-labelledby={`song-title-${index}`}
    style={{ '--song-background': song.background, '--song-accent': song.accent } as CSSProperties}>
    <div className="music-song-copy">
      <h3 id={`song-title-${index}`} className="music-title" data-title-style={song.typography}>{song.title}</h3>
      <p className="music-song-singer">{song.singer}</p>
      <blockquote cite={song.lyricSource} className="music-song-lyric">
        <span className="music-song-lyric-text">{song.lyric}</span>
      </blockquote>
    </div>
    <div className="music-song-artwork">
      <span className="music-song-record">
        <img src={song.fullSrc} srcSet={`${song.src} 240w, ${song.fullSrc} 600w`}
          sizes="(max-width:640px) 35vw, 360px" width={600} height={600}
          alt={`${song.album} — ${song.artist} artwork on a vinyl record`}
          loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'auto' : 'low'} decoding="async" />
        <span className="music-song-record-grooves" aria-hidden="true" />
        <span className="music-song-record-hole" aria-hidden="true" />
      </span>
    </div>
  </article>;
});

export function MusicOverlay({ songs }: { songs: MusicCard[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroll = viewport.current;
    if (!scroll) return;
    const records = [...scroll.querySelectorAll<HTMLElement>('.music-song-record')];
    const intro = scroll.querySelector<HTMLElement>('.music-stack-intro');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const visible = new Set<number>();
    const indices = new Map(records.map((record, index) => [record, index]));
    const running = new Map<number, Animation>();
    const phases = new Float64Array(records.length);
    const duration = 20000;
    let height = 0, introHeight = 0, current = -1, suspended = false;
    const stop = (index: number, animation: Animation) => {
      const time = animation.currentTime;
      phases[index] = typeof time === 'number' ? time % duration : phases[index];
      // Preserve the exact angle while releasing the paused animation and its layer hint.
      records[index].style.transform = `rotate(${phases[index] / duration * 360}deg)`;
      animation.cancel(); records[index].removeAttribute('data-spinning');
      running.delete(index);
    };
    const update = () => {
      const allowed = !document.hidden && !suspended && !reduced.matches && height > 0;
      running.forEach((animation, index) => {
        if (!allowed || (index !== current && index !== current + 1) || !visible.has(index)) stop(index, animation);
      });
      if (!allowed) return;
      // At most two compositor animations exist; covered and distant records have none.
      for (const index of [current, current + 1]) {
        if (!visible.has(index) || running.has(index)) continue;
        const record = records[index];
        record.setAttribute('data-spinning', '');
        const animation = record.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
          { duration, iterations: Infinity, easing: 'linear' });
        animation.currentTime = phases[index];
        running.set(index, animation);
      }
    };
    const onScroll = () => {
      const index = height > 0 ? Math.min(records.length - 1,
        Math.floor(Math.max(0, scroll.scrollTop - introHeight) / height)) : -1;
      // Scrolling within a card needs no record work, style writes or layout queries.
      if (index === current) return;
      current = index; update();
    };
    const resize = new ResizeObserver(() => {
      // Geometry is read together only when the viewport/intro size changes.
      height = scroll.clientHeight; introHeight = intro?.offsetHeight ?? 0;
      current = -1; onScroll();
    });
    const intersection = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const index = indices.get(entry.target as HTMLElement);
        if (index === undefined) continue;
        if (entry.isIntersecting) visible.add(index);
        else visible.delete(index);
      }
      update();
    }, { root: scroll, threshold: 0 });
    records.forEach(record => intersection.observe(record));
    resize.observe(scroll); if (intro) resize.observe(intro);
    const pagehide = () => { suspended = true; update(); };
    const pageshow = () => { suspended = false; update(); };
    scroll.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    return () => {
      resize.disconnect(); intersection.disconnect();
      scroll.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener('change', update);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
      running.forEach((animation, index) => stop(index, animation));
    };
  }, [songs]);
  return <div ref={viewport} className="music-scroll-viewport" tabIndex={0}
    role="region" aria-label="Scroll through favorite songs" data-lenis-prevent>
    <StackingCards totalCards={songs.length} scaleMultiplier={.012} nativeScroll
      scrollOptions={{ container: viewport }} className="music-stack">
      <div className="music-stack-intro">Scroll to explore</div>
      {songs.map((song, index) => <StackingCardItem key={song.title} index={index}
        className="music-stack-slot" topPosition={`${4 + index * .5}%`}>
        <SongCard song={song} index={index} />
      </StackingCardItem>)}
      <div className="music-stack-tail" aria-hidden="true" />
    </StackingCards>
  </div>;
}

/** Styles and Motion load only while the native music dialog is open. */
export async function mountMusicOverlay(host: HTMLElement, songs: MusicCard[], signal?: AbortSignal) {
  if (signal?.aborted) return () => {};
  // Font-face declarations live in the document for browser support; no page styles change.
  if (!document.getElementById('music-title-fonts')) {
    const fonts = document.createElement('link'); fonts.id = 'music-title-fonts'; fonts.rel = 'stylesheet';
    fonts.href = new URL('../fonts/music/fonts.css', import.meta.url).href;
    fonts.onerror = () => fonts.remove();
    document.head.append(fonts);
  }
  host.toggleAttribute('data-batman-cursor', document.body.classList.contains('batman-cursor-active'));
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.replaceChildren();
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./music-overlay.css', import.meta.url).href;
  const ready = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout); signal?.removeEventListener('abort', abort);
      stylesheet.onload = stylesheet.onerror = null;
    };
    const abort = () => { cleanup(); stylesheet.remove(); reject(new DOMException('Gallery closed', 'AbortError')); };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Music styles took too long to load.')); }, 15000);
    stylesheet.onload = () => { cleanup(); resolve(); };
    stylesheet.onerror = () => { cleanup(); reject(new Error('Music styles could not load.')); };
    signal?.addEventListener('abort', abort, { once: true });
  });
  const container = document.createElement('div'); container.className = 'music-react-root';
  shadow.append(stylesheet, container);
  await ready;
  const gallery = host.closest('dialog');
  if (signal?.aborted || !gallery?.open) return () => {};
  gallery.classList.add('music-stacking-active'); host.hidden = false;
  const root = createRoot(container);
  root.render(<MusicOverlay songs={songs} />);
  return () => { root.unmount(); host.hidden = true; gallery.classList.remove('music-stacking-active'); };
}
