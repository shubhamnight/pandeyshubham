// Record the actual open travel overlay dimensions for the local crop editor.
export function observeTravelFrame(host) {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return () => {};
  const observer = new ResizeObserver(() => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const cardWidth = Math.min(width,width < 640 ? 260 : width < 1025 ? 500 : 680);
    const cardHeight = Math.max(1,Math.min(Math.round(height * (width < 640 ? .6 : .82)),height - 32));
    try { localStorage.setItem('shub-travel-frame', JSON.stringify({ ratio: cardWidth / cardHeight, screenWidth: innerWidth, screenHeight: innerHeight })); } catch {}
  });
  observer.observe(host);
  return () => observer.disconnect();
}
