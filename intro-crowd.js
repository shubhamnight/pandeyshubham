// Walking crowd adapted from Skiper UI / zadvorsky, illustrated by Open Peeps.
window.startIntroCrowd = function(host) {
  const canvas=document.createElement('canvas');
  canvas.className='intro-crowd';
  canvas.setAttribute('aria-hidden','true');
  host.prepend(canvas);
  const ctx=canvas.getContext('2d');
  if(!ctx) return ()=>{};
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const img=new Image();
  let frame=0,last=0,w=0,h=0,people=[],sprites=[],dead=false,loaded=false;
  // The existing alpha repair is baked once by build-intro-crowd.cjs.
  const spriteManifest=fetch('assets/intro-crowd-sprites.json').then(response=>{
    if(!response.ok)throw new Error('Crowd sprite metadata unavailable');
    return response.json();
  }).catch(()=>null);
  async function prepareSprites() {
    const manifest=await spriteManifest;
    if(!manifest||dead)return;
    for(const bounds of manifest.sprites){
      const sprite=document.createElement('canvas');
      sprite.width=bounds.width;sprite.height=bounds.height;
      sprite.getContext('2d').drawImage(img,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height);
      sprites.push(sprite);
    }
  }
  function size() {
    if(!loaded||dead) return;
    const nextW=canvas.clientWidth,nextH=canvas.clientHeight;
    if(nextW===w&&nextH===h)return;
    w=nextW;h=nextH;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const scale=Math.min(1,Math.max(.48,w/1400))*1.2;
    const count=Math.min(54,Math.max(20,Math.round(w/25)));
    people=Array.from({length:count},(_,index)=>{
      const sprite=sprites[Math.floor(Math.random()*sprites.length)];
      const depth=index/count,height=sprite.height*scale*(.86+depth*.14);
      return {sprite,width:sprite.width*height/sprite.height,height,x:(index+.5)/count*w,y:h-height+24+depth*32,direction:Math.random()>.5?1:-1,speed:20+Math.random()*35,phase:Math.random()*Math.PI*2};
    });
    wake();
  }
  function draw(time){
    frame=0;if(dead||document.hidden||!host.classList.contains('crowd-ready'))return;
    const dt=Math.min((time-(last||time))/1000,.04);last=time;
    ctx.clearRect(0,0,w,h);
    for(const p of people){
      if(!reduce.matches){p.x+=p.direction*p.speed*dt;p.phase+=dt*Math.PI*4;}
      if(p.x>w+p.width)p.x=-p.width;
      if(p.x < -p.width)p.x=w+p.width;
      ctx.save();ctx.translate(p.x,p.y+(reduce.matches?0:Math.sin(p.phase)*1.5));ctx.scale(p.direction,1);
      ctx.drawImage(p.sprite,-p.width/2,0,p.width,p.height);ctx.restore();
    }
    if(!reduce.matches)wake();
  }
  function wake(){if(!frame&&!dead&&loaded&&!document.hidden&&host.classList.contains('crowd-ready'))frame=requestAnimationFrame(draw);}
  function visibility(){cancelAnimationFrame(frame);frame=0;last=0;wake();}
  const observer=new ResizeObserver(size);observer.observe(canvas);
  const hostObserver=new MutationObserver(()=>{if(host.classList.contains('crowd-ready')){wake();hostObserver.disconnect();}});
  hostObserver.observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',visibility);reduce.addEventListener('change',visibility);
  img.onload=async()=>{if(dead)return;await prepareSprites();if(dead||!sprites.length)return;loaded=true;size();};
  img.src='assets/intro-crowd.webp';
  return ()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();hostObserver.disconnect();document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',visibility);img.onload=null;};
};
