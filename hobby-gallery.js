export function connectHobbyGallery(button,gallery,fill) {
  let saved=null;
  button.addEventListener('click',()=>{
    if(gallery.open)return;
    fill?.(gallery);
    saved={overflow:document.body.style.overflow,padding:document.body.style.paddingRight};
    const gutter=window.innerWidth-document.documentElement.clientWidth;
    const padding=parseFloat(getComputedStyle(document.body).paddingRight)||0;
    gallery.showModal();
    document.body.style.overflow='hidden';
    if(gutter>0)document.body.style.paddingRight=(padding+gutter)+'px';
    document.body.classList.add('photography-gallery-open');
    gallery.querySelector('header button').focus({preventScroll:true});
  });
  const close=()=>gallery.close();
  gallery.querySelector('header button').addEventListener('click',close);
  let backdropDown=false;
  const outside=event=>{
    const bounds=gallery.getBoundingClientRect();
    return event.target===gallery&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom);
  };
  gallery.addEventListener('pointerdown',event=>{backdropDown=outside(event);});
  gallery.addEventListener('click',event=>{if(backdropDown&&outside(event))close();backdropDown=false;});
  gallery.addEventListener('close',()=>{
    gallery.querySelectorAll('video').forEach(video=>video.pause());
    if(saved){document.body.style.overflow=saved.overflow;document.body.style.paddingRight=saved.padding;saved=null;}
    document.body.classList.remove('photography-gallery-open');
    button.focus({preventScroll:true});
  });
  // Only one gallery video plays at a time; stop hidden media as it scrolls out.
  gallery.addEventListener('play',event=>{
    if(event.target.tagName!=='VIDEO')return;
    gallery.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause();});
  },true);
  const mediaObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(!entry.isIntersecting)entry.target.pause();});
  },{root:gallery.querySelector('.hobby-gallery-content'),threshold:0});
  const watchVideos=()=>gallery.querySelectorAll('video').forEach(video=>mediaObserver.observe(video));
  const observer=new MutationObserver(watchVideos);
  observer.observe(gallery.querySelector('.hobby-gallery-content'),{childList:true,subtree:true});
  watchVideos();
}
