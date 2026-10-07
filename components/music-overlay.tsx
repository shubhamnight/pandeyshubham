import { useMemo, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import DiscCascadeCarousel from '@/components/ui/disc-cascade-carousel';

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

export function MusicOverlay({ songs }: { songs: MusicCard[] }) {
  const [index, setIndex] = useState(0);
  const items = useMemo(() => songs.map(song => ({
    title: song.title, src: song.fullSrc, label: '', fine: '',
    alt: `${song.album} — ${song.artist} artwork on a disc`,
  })), [songs]);
  const song = songs[index];
  if (!song) return <p>No songs available yet.</p>;
  return <div className="music-cascade-viewport" data-lenis-prevent
    style={{ '--song-background': song.background, '--song-accent': song.accent } as CSSProperties}>
    <DiscCascadeCarousel items={items} height="100%" discSize="clamp(150px,min(42cqw,62cqh),400px)"
      defaultIndex={0} onIndexChange={setIndex} loop spin={20} brand="" nav={[]} wheelAxis="both"
      indexLabel="Songs" details={false} reviews={false} frame={false}
      background="var(--song-background,#181a1d)" color="#e7ebf0" fontHref={null}
      hint="Drag · Scroll · ← →" ariaLabel="Favorite songs" className="music-disc-cascade" />
    <article className="music-song-copy" aria-live="polite" aria-atomic="true" aria-labelledby="music-current-title">
      <h3 id="music-current-title" className="music-title" data-title-style={song.typography}>{song.title}</h3>
      <p className="music-song-singer">{song.singer}</p>
      <blockquote cite={song.lyricSource} className="music-song-lyric">
        <span className="music-song-lyric-text">{song.lyric}</span>
      </blockquote>
    </article>
  </div>;
}
/** Styles and the disc carousel load only while the native music dialog is open. */
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
  gallery.classList.add('music-cascade-active'); host.hidden = false;
  const root = createRoot(container);
  root.render(<MusicOverlay songs={songs} />);
  return () => { root.unmount(); host.hidden = true; gallery.classList.remove('music-cascade-active'); };
}
