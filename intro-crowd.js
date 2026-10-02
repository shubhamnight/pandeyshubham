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
  // Repair enclosed alpha holes and discard stray pixels once, before animation.
  async function prepareSprites() {
    const sw=img.naturalWidth/15,sh=img.naturalHeight/7;
    for(let index=0;index<105;index++) {
      // Yield between figures so decoding/cleanup cannot monopolize the loader's frames.
      if(index%2===0)await new Promise(resolve=>setTimeout(resolve,0));
      if(dead)return;
      const tile=document.createElement('canvas');tile.width=sw;tile.height=sh;
      const paint=tile.getContext('2d',{willReadFrequently:true});
      paint.drawImage(img,index%15*sw,Math.floor(index/15)*sh,sw,sh,0,0,sw,sh);
      const pixels=paint.getImageData(0,0,sw,sh),data=pixels.data;
      const seen=new Uint8Array(sw*sh),queue=new Int32Array(sw*sh);
      let largest=[];
      // Keep the connected figure; tiny detached artifacts should not walk with it.
      const components=[];
      for(let start=0;start<seen.length;start++) {
        if(seen[start]||data[start*4+3]<32)continue;
        let head=0,tail=1;queue[0]=start;seen[start]=1;
        while(head<tail){const p=queue[head++],x=p%sw;
          for(const n of [x>0?p-1:-1,x<sw-1?p+1:-1,p-sw,p+sw]){
            if(n<0||n>=seen.length||seen[n]||data[n*4+3]<32)continue;
            seen[n]=1;queue[tail++]=n;
          }
        }
        const component=queue.slice(0,tail);components.push(component);
        if(component.length>largest.length)largest=component;
      }
      for(const component of components)if(component.length<Math.max(48,largest.length*.003)){
        for(const p of component)data[p*4+3]=0;
      }
      // Flood only the exterior, preserving open spaces around arms and hair.
      seen.fill(0);let head=0,tail=0;
      const add=p=>{if(!seen[p]&&data[p*4+3]<32){seen[p]=1;queue[tail++]=p;}};
      for(let x=0;x<sw;x++){add(x);add((sh-1)*sw+x);}
      for(let y=0;y<sh;y++){add(y*sw);add(y*sw+sw-1);}
      while(head<tail){const p=queue[head++],x=p%sw;
        if(x>0)add(p-1);if(x<sw-1)add(p+1);if(p>=sw)add(p-sw);if(p<sw*(sh-1))add(p+sw);
      }
      let left=sw,top=sh,right=0,bottom=0;
      for(let p=0;p<seen.length;p++){
        const offset=p*4;
        if(!seen[p]&&data[offset+3]<255){
          if(data[offset+3]<32)data[offset]=data[offset+1]=data[offset+2]=255;
          data[offset+3]=255;
        }
        if(data[offset+3]>=32){left=Math.min(left,p%sw);right=Math.max(right,p%sw);top=Math.min(top,Math.floor(p/sw));bottom=Math.max(bottom,Math.floor(p/sw));}
      }
      if(right<=left||bottom<=top)continue;
      paint.putImageData(pixels,0,0);
      const sprite=document.createElement('canvas');sprite.width=right-left+1;sprite.height=bottom-top+1;
      sprite.getContext('2d').drawImage(tile,left,top,sprite.width,sprite.height,0,0,sprite.width,sprite.height);
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
    frame=0;if(dead||document.hidden||!host.classList.contains('show-play'))return;
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
  function wake(){if(!frame&&!dead&&loaded&&!document.hidden&&host.classList.contains('show-play'))frame=requestAnimationFrame(draw);}
  function visibility(){cancelAnimationFrame(frame);frame=0;last=0;wake();}
  const observer=new ResizeObserver(size);observer.observe(canvas);
  const hostObserver=new MutationObserver(()=>{if(host.classList.contains('show-play')){wake();hostObserver.disconnect();}});
  hostObserver.observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',visibility);reduce.addEventListener('change',visibility);
  img.onload=async()=>{if(dead)return;await prepareSprites();if(dead)return;loaded=true;size();};
  img.src='assets/intro-crowd.png';
  return ()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();hostObserver.disconnect();document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',visibility);img.onload=null;};
};
