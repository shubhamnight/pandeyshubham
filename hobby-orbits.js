import { requestHobbyFrame, cancelHobbyFrame } from './hobby-motion-clock.js';
(() => {
  const section=document.querySelector('#projects');
  if(!section)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const groups=[...section.querySelectorAll('.hobby-orbit')];
  const count=3, resolution=1024;
  let visible=false, running=false, phase=.74, duration=1;
  let entrance=section.hobbyEntranceProgress||0,withdrawal=null;
  let entranceTarget=entrance;
  let frame=0, resizeFrame=0, lastTime=null, previousSize='', streams=[];
  const positions=new Float64Array(count);
  const indices=new Uint16Array(count),mixes=new Float64Array(count);
  let pageWidth=0,pageHeight=0,tileWidth=0,tileHeight=0;
  function draw() {
    const showing=entrance>0&&entranceTarget>0;
    if(section.classList.contains('hobby-images-entering')!==showing)section.classList.toggle('hobby-images-entering',showing);
    // Compute each slot's progress once and reuse it for every hobby.
    for(let i=0;i<count;i++){
      const raw=entrance===1?((phase-i/count+1)%1)*resolution:
        withdrawal?withdrawal[i]*entrance*resolution:(entrance*.74-i/count)*resolution;
      positions[i]=raw;
      const at=Math.max(0,Math.min(resolution-.000001,raw));
      indices[i]=Math.floor(at);mixes[i]=at-indices[i];
    }
    for(const {slots,points} of streams) {
      for(let i=0;i<count;i++) {
        const raw=positions[i],index=indices[i],mix=mixes[i],at=index+mix;
        const slot=slots[i];
        const visibility=!showing||raw<0?'hidden':'visible';
        if(slot.arcVisibility!==visibility){slot.arcVisibility=visibility;slot.style.visibility=visibility;}
        if(entrance===1 && slot.arcPosition!==undefined && at<slot.arcPosition)slot.dispatchEvent(new Event('hobby-cycle'));
        slot.arcPosition=at;
        const offset=index*2;
        const x=points[offset]+(points[offset+2]-points[offset])*mix,y=points[offset+1]+(points[offset+3]-points[offset+1])*mix;
        // Include the full hover enlargement and shadows when culling. Write
        // once on exit so intersection observers can pause the hidden video.
        const pad=64;
        const outside=raw<0||x+tileWidth*1.133+pad<0||x-tileWidth*.133-pad>pageWidth||y+tileHeight*1.133+pad<0||y-tileHeight*.133-pad>pageHeight;
        if(!outside||!slot.arcOutside){
          const transform=`translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0)`;
          if(slot.arcTransform!==transform){slot.arcTransform=transform;slot.style.transform=transform;}
        }
        slot.arcOutside=outside;
      }
    }
  }
  function tick(time) {
    frame=0;
    if(!running){cancelHobbyFrame(tick);return;}
    const elapsed=lastTime===null?0:Math.min(time-lastTime,50);
    if(entrance!==entranceTarget){
      // Limit the reveal to a 4.8 second entrance even after a fast scroll.
      // Every arc uses this same clock; normal rotation speed is untouched.
      const step=elapsed/4800;
      entrance+=Math.sign(entranceTarget-entrance)*Math.min(Math.abs(entranceTarget-entrance),step);
      if(Math.abs(entranceTarget-entrance)<.000001)entrance=entranceTarget;
    }else if(entrance===1)phase=(phase+elapsed/duration)%1;
    lastTime=time;
    draw();
    // Visibility and pause changes already wake update through observers.
    // Only a completed partial entrance needs a running-state change here.
    if(entrance===entranceTarget&&entrance!==1)update();
    if(running)frame=requestHobbyFrame(tick,30);
  }
  function update() {
    const shouldRun=visible&&!document.hidden&&!reduced.matches&&
      (entrance===1||entrance!==entranceTarget)&&
      !document.body.classList.contains('motion-paused')&&
      !document.body.classList.contains('photography-gallery-open');
    if(section.classList.contains('orbits-running')!==shouldRun)section.classList.toggle('orbits-running',shouldRun);
    if(shouldRun===running)return;
    running=shouldRun;lastTime=null;
    if(running)frame=requestHobbyFrame(tick,30);
    else {cancelHobbyFrame(tick);frame=0;}
  }
  function layout() {
    resizeFrame=0;
    const w=section.clientWidth,h=section.clientHeight;
    const tile=groups[0].querySelector('.hobby-image-placeholder');
    const tw=tile.offsetWidth,th=tile.offsetHeight;
    pageWidth=w;pageHeight=h;tileWidth=tw;tileHeight=th;
    const size=`${w}:${h}:${tw}:${th}`;
    if(size===previousSize||!w||!h)return;
    previousSize=size;
    const margin = Math.max(tw, th) / 2 + 24;
    const narrow = w <= 900;
    // Leave room between paired images now that opposite arcs move in sync.
    const x = narrow ? Math.min(.44, .5-(tw+24)/(2*w)) : .34;
    // Each cubic is an OPEN path. Both endpoints are fully outside the page.
    // Order matches the blueprint arrows: top->left, top->right,
    // bottom->left (Gaming anticlockwise), bottom->right.
    const paths = [
      [[x*w,-margin],[x*w,.23*h],[.22*w,.35*h],[-margin,.35*h]],
      [[(1-x)*w,-margin],[(1-x)*w,.23*h],[.78*w,.35*h],[w+margin,.35*h]],
      [[x*w,h+margin],[x*w,.77*h],[.22*w,.65*h],[-margin,.65*h]],
      [[(1-x)*w,h+margin],[(1-x)*w,.77*h],[.78*w,.65*h],[w+margin,.65*h]]
    ];
    const tracks = paths.map(p => {
      const samples = [];
      const pointAt = t => {
        const u=1-t;
        return [0,1].map(axis => u*u*u*p[0][axis]+3*u*u*t*p[1][axis]+3*u*t*t*p[2][axis]+t*t*t*p[3][axis]);
      };
      const onPage = ([px,py]) => px>=-tw/2 && px<=w+tw/2 && py>=-th/2 && py<=h+th/2;
      const boundary = entering => {
        let lo=entering?0:.5, hi=entering?.5:1;
        for(let i=0;i<30;i++) {
          const mid=(lo+hi)/2;
          if(onPage(pointAt(mid)) === entering) hi=mid; else lo=mid;
        }
        return (lo+hi)/2;
      };
      const entryT=boundary(true), exitT=boundary(false);
      const steps=Array.from({length:121},(_,i)=>i/120);
      steps.push(entryT,exitT); steps.sort((a,b)=>a-b);
      let length = 0;
      for (const t of steps) {
        const point=pointAt(t),previous=samples[samples.length-1];
        if(previous) length+=Math.hypot(point[0]-previous.x,point[1]-previous.y);
        samples.push({x:point[0],y:point[1],distance:length,t});
      }
      return {samples,length,entryDistance:samples.find(s=>s.t===entryT).distance,exitDistance:samples.find(s=>s.t===exitT).distance};
    });
    duration=Math.max(...tracks.map(track=>track.length))/(narrow?18:24)*1000;
    streams=groups.map((group,index)=>{
      const {samples,length,entryDistance,exitDistance}=tracks[index];
      const offsetAt=distance=>{
        if(distance<entryDistance)return .04*distance/entryDistance;
        if(distance>exitDistance)return .96+.04*(distance-exitDistance)/(length-exitDistance);
        return .04+.92*(distance-entryDistance)/(exitDistance-entryDistance);
      };
      // Bake the existing curves into lookup tables only on resize. No path
      // math, layout reads, Animation objects or async starts during movement.
      const offsets=samples.map(point=>offsetAt(point.distance));
      const points=new Float64Array((resolution+1)*2);let segment=0;
      for(let i=0;i<=resolution;i++){
        const progress=i/resolution;
        while(segment<samples.length-2&&offsets[segment+1]<progress)segment++;
        const a=samples[segment],b=samples[segment+1];
        const t=(progress-offsets[segment])/(offsets[segment+1]-offsets[segment]);
        points[i*2]=a.x+(b.x-a.x)*t-tw/2;
        points[i*2+1]=a.y+(b.y-a.y)*t-th/2;
      }
      const slots=[...group.querySelectorAll('.hobby-image-placeholder')];
      slots.forEach((slot,i)=>{slot.hidden=i>=count;});
      return {slots:slots.slice(0,count),points};
    });
    lastTime=null;
    draw();update();
  }
  const resizeObserver=new ResizeObserver(()=>{
    if(!resizeFrame)resizeFrame=requestAnimationFrame(layout);
  });resizeObserver.observe(section);
  const visibilityObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();});visibilityObserver.observe(section);
  document.addEventListener('visibilitychange',update);
  reduced.addEventListener('change',update);
  const motionObserver=new MutationObserver(update);
  motionObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  function entranceChanged(){
    const next=section.hobbyEntranceProgress??0;
    if(entrance===1&&next<1)withdrawal=Array.from({length:count},(_,i)=>(phase-i/count+1)%1);
    entranceTarget=next;
    if(next===0){
      // A fresh approach must enter from the path start, never resume stale
      // cards halfway down an arc after a quick scroll out and back.
      entrance=0;withdrawal=null;phase=.74;
    }else if(reduced.matches)entrance=next;
    // Scroll reversal scrubs the same points without cycling artwork.
    for(const {slots} of streams)slots.forEach(slot=>{slot.arcPosition=undefined;});
    // The shared animation clock draws the next interpolated position.
    // Updating the target alone must not write twelve duplicate transforms.
    if(reduced.matches||next===0)draw();
    update();
  }
  section.addEventListener('hobby-intro-progress',entranceChanged);
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    cancelHobbyFrame(tick);cancelAnimationFrame(resizeFrame);
    resizeObserver.disconnect();visibilityObserver.disconnect();motionObserver.disconnect();
    document.removeEventListener('visibilitychange',update);
    reduced.removeEventListener('change',update);
    section.removeEventListener('hobby-intro-progress',entranceChanged);
  });
  layout();
})();
