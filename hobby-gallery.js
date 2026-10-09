export function connectHobbyGallery(button,gallery,fill,{autoplayVideos=false}={}) {
  let saved=null;
  const content=gallery.querySelector('.hobby-gallery-content');
  const closeButton=gallery.querySelector('header button');
  const watchedVideos=new Set();
  const visibleVideos=new Set();
  const events=new AbortController();
  const eventOptions={signal:events.signal};
  const bundle={
    'photography-gallery':'photography-carousel', 'gaming-gallery':'gaming-overlay',
    'travel-gallery':'travel-overlay', 'music-gallery':'music-overlay',
  }[gallery.id];
  const warm=()=>{
    if(!bundle)return;
    // Fetch the stylesheet alongside the bundle so the first render does not
    // wait for a second request after JavaScript has loaded and compiled.
    // Preloading does not apply styles, mount a gallery, or start media.
    for(const [extension,rel] of [['js','modulepreload'],['css','preload']]){
      const href=new URL(`./assets/ui/${bundle}.${extension}`,import.meta.url).href;
      if([...document.querySelectorAll('link[rel="modulepreload"],link[rel="preload"]')].some(link=>link.href===href))continue;
      const link=document.createElement('link');link.rel=rel;link.href=href;
      if(extension==='css')link.as='style';
      document.head.append(link);
    }
  };
  button.addEventListener('pointerenter',warm,{...eventOptions,once:true});
  button.addEventListener('focus',warm,{...eventOptions,once:true});
  button.addEventListener('click',()=>{
    if(gallery.open)return;
    warm();
    fill?.(gallery);
    saved={overflow:document.body.style.overflow,padding:document.body.style.paddingRight};
    const gutter=window.innerWidth-document.documentElement.clientWidth;
    const padding=parseFloat(getComputedStyle(document.body).paddingRight)||0;
    gallery.showModal();
    document.body.style.overflow='hidden';
    if(gutter>0)document.body.style.paddingRight=(padding+gutter)+'px';
    document.body.classList.add('photography-gallery-open');
    closeButton.focus({preventScroll:true});
  },eventOptions);
  const close=()=>gallery.close();
  closeButton.addEventListener('click',close,eventOptions);
  let backdropDown=false;
  const outside=event=>{
    if(event.target!==gallery)return false;
    const bounds=gallery.getBoundingClientRect();
    return event.target===gallery&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom);
  };
  gallery.addEventListener('pointerdown',event=>{backdropDown=outside(event);},eventOptions);
  gallery.addEventListener('click',event=>{if(backdropDown&&outside(event))close();backdropDown=false;},eventOptions);
  gallery.addEventListener('close',()=>{
    watchedVideos.forEach(video=>video.pause());
    if(saved){document.body.style.overflow=saved.overflow;document.body.style.paddingRight=saved.padding;saved=null;}
    document.body.classList.remove('photography-gallery-open');
    button.focus({preventScroll:true});
  },eventOptions);
  // Manual galleries play one video at a time; Travel loops visible media.
  gallery.addEventListener('play',event=>{
    if(event.target.tagName!=='VIDEO'||autoplayVideos)return;
    watchedVideos.forEach(video=>{if(video!==event.target)video.pause();});
  },{...eventOptions,capture:true});
  const mediaObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting){visibleVideos.delete(entry.target);entry.target.pause();}
      else {
        visibleVideos.add(entry.target);
        if(autoplayVideos&&gallery.open&&!document.hidden)entry.target.play().catch(()=>{});
      }
    });
  },{root:content,threshold:0});
  function visitVideos(node,visit){
    if(node.nodeType!==1)return;
    if(node.tagName==='VIDEO')visit(node);
    node.querySelectorAll('video').forEach(visit);
  }
  function watch(video){
    if(!content.contains(video)||watchedVideos.has(video))return;
    watchedVideos.add(video);mediaObserver.observe(video);
  }
  function unwatch(video){
    if(content.contains(video))return;
    video.pause();mediaObserver.unobserve(video);watchedVideos.delete(video);visibleVideos.delete(video);
  }
  // Inspect only inserted/removed branches, not the entire gallery on each
  // caption or loading-status update. Release detached media immediately.
  const observer=new MutationObserver(records=>{
    for(const record of records){
      record.removedNodes.forEach(node=>visitVideos(node,unwatch));
      record.addedNodes.forEach(node=>visitVideos(node,watch));
    }
  });
  observer.observe(content,{childList:true,subtree:true});
  content.querySelectorAll('video').forEach(watch);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)watchedVideos.forEach(video=>video.pause());
    else if(autoplayVideos&&gallery.open)visibleVideos.forEach(video=>video.play().catch(()=>{}));
  },eventOptions);
  window.addEventListener('pagehide',event=>{
    watchedVideos.forEach(video=>video.pause());
    if(event.persisted)return;
    observer.disconnect();mediaObserver.disconnect();watchedVideos.clear();visibleVideos.clear();events.abort();
  },eventOptions);
}
