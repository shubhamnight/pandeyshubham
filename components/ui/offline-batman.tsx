import { useEffect, useRef } from 'react';

export function OfflineBatman() {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    // A separately cached bundle keeps the 3D renderer out of the page UI bundle.
    const modelURL = new URL('./offline-batman.js', import.meta.url).href;
    import(/* @vite-ignore */ modelURL).then(module => {
      if (!cancelled && stage.current) dispose = module.mountOfflineBatman(stage.current);
    }).catch(error => console.warn('Offline Batman model unavailable; using its local emblem.', error));
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return <div ref={stage} className="offline-batman">
    <img className="offline-batman-fallback" src="/assets/batman/cursor.svg" width={220} height={150} alt="" draggable={false} />
  </div>;
}
