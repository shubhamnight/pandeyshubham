(() => {
  const onOfflinePage = location.pathname === '/offline.html' || document.getElementById('offline-root');
  const showOffline = () => {
    if (onOfflinePage) return;
    const returnTo = location.pathname + location.search + location.hash;
    location.replace(`/offline.html?returnTo=${encodeURIComponent(returnTo)}`);
  };
  window.addEventListener('offline', showOffline);
  // Only the small offline page is cached; portfolio media stays network driven.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Update an open offline preview after its new cache has finished installing.
      if (hadController && onOfflinePage && navigator.onLine) location.reload();
    }, { once: true });
    navigator.serviceWorker.register('/offline-sw.js', { scope: '/', updateViaCache: 'none' })
      .then(() => navigator.serviceWorker.ready)
      .then(() => { if (!navigator.onLine) showOffline(); })
      .catch(error => console.warn('Offline page could not be prepared.', error));
  }
})();
