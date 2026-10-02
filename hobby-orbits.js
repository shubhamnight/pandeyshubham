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
  function draw() {
    // Compute each slot's progress once and reuse it for every hobby.
    const positions=Array.from({length:count},(_,i)=>{
      if(entrance===1)return ((phase-i/count+1)%1)*resolution;
      if(withdrawal)return withdrawal[i]*entrance*resolution;
      return (entrance*.74-i/count)*resolution;
    });
    for(const {slots,points} of streams) {
      for(let i=0;i<count;i++) {
        const raw=positions[i],at=Math.max(0,Math.min(resolution-.000001,raw)),index=Math.floor(at),mix=at-index;
        const slot=slots[i];
        const visibility=raw<0?'hidden':'visible';
        if(slot.style.visibility!==visibility)slot.style.visibility=visibility;
        if(entrance===1 && slot.arcPosition!==undefined && at<slot.arcPosition)slot.dispatchEvent(new Event('hobby-cycle'));
        slot.arcPosition=at;
        const a=points[index],b=points[index+1];
        const x=a.x+(b.x-a.x)*mix,y=a.y+(b.y-a.y)*mix;
        slots[i].style.transform=`translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0)`;
      }
    }
  }
  function tick(time) {
    frame=0;
    if(!running)return;
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
    update();
    if(running)frame=requestAnimationFrame(tick);
  }
  function update() {
    const shouldRun=visible&&!document.hidden&&!reduced.matches&&
      (entrance===1||entrance!==entranceTarget)&&
      !document.body.classList.contains('motion-paused')&&
      !document.body.classList.contains('photography-gallery-open');
    if(section.classList.contains('orbits-running')!==shouldRun)section.classList.toggle('orbits-running',shouldRun);
    if(shouldRun===running)return;
    running=shouldRun;lastTime=null;
    if(running)frame=requestAnimationFrame(tick);
    else {cancelAnimationFrame(frame);frame=0;}
  }
  function layout() {
    resizeFrame=0;
    const w=section.clientWidth,h=section.clientHeight;
    const tile=groups[0].querySelector('.hobby-image-placeholder');
    const tw=tile.offsetWidth,th=tile.offsetHeight;
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
      const points=[];let segment=0;
      for(let i=0;i<=resolution;i++){
        const progress=i/resolution;
        while(segment<samples.length-2&&offsets[segment+1]<progress)segment++;
        const a=samples[segment],b=samples[segment+1];
        const t=(progress-offsets[segment])/(offsets[segment+1]-offsets[segment]);
        points.push({x:a.x+(b.x-a.x)*t-tw/2,y:a.y+(b.y-a.y)*t-th/2});
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
    if(reduced.matches)entrance=next;
    // Scroll reversal scrubs the same points without cycling artwork.
    for(const {slots} of streams)slots.forEach(slot=>{slot.arcPosition=undefined;});
    draw();update();
  }
  section.addEventListener('hobby-intro-progress',entranceChanged);
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    cancelAnimationFrame(frame);cancelAnimationFrame(resizeFrame);
    resizeObserver.disconnect();visibilityObserver.disconnect();motionObserver.disconnect();
    document.removeEventListener('visibilitychange',update);
    reduced.removeEventListener('change',update);
    section.removeEventListener('hobby-intro-progress',entranceChanged);
  });
  layout();
})();
