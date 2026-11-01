(() => {
  const onOfflinePage = location.pathname === '/offline.html' || document.getElementById('offline-root');
  // A connectivity hint must not discard an already loaded document, dialog,
  // scroll position or decoded media. Only a failed document navigation uses
  // the service worker's offline page; existing content remains usable.
  // Only the small offline page is cached; portfolio media stays network driven.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Update an open offline preview after its new cache has finished installing.
      if (hadController && onOfflinePage && navigator.onLine) location.reload();
    }, { once: true });
    const prepare=()=>navigator.serviceWorker.register('/offline-sw.js', { scope: '/', updateViaCache: 'none' })
      .then(() => navigator.serviceWorker.ready)
      .catch(error => console.warn('Offline page could not be prepared.', error));
    // The backup page includes its own React/3D assets. Prepare it after the
    // current document loads, rather than competing with its critical requests.
    const schedule=()=>{
      if('requestIdleCallback' in window)requestIdleCallback(prepare,{timeout:3000});
      else setTimeout(prepare,0);
    };
    if(onOfflinePage)void prepare();
    else if(document.readyState==='complete')schedule();
    else window.addEventListener('load',schedule,{once:true});
  }
})();
