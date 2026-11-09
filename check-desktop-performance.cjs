const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const {transformSync}=require('esbuild');
const revision='05244ef';
const original=name=>cp.execFileSync('git',['show',revision+':'+name],{encoding:'utf8'});
function badgeFixture(source,touch=false,reduced=false){
 let measurements=0,time=0,id=0;const frames=new Map();
 function element(){const attrs=new Map(),events=new Map(),classes=new Set(),captures=new Set();const style=new Proxy({setProperty:(k,v)=>attrs.set(k,String(v)),removeProperty:k=>attrs.delete(k)},{set:(o,k,v)=>{attrs.set(k,String(v));return true;},get:(o,k)=>k in o?o[k]:attrs.get(k)||''});
  return {attrs,style,events,classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:(...ks)=>ks.forEach(k=>classes.delete(k))},addEventListener:(k,fn)=>{if(!events.has(k))events.set(k,[]);events.get(k).push(fn);},setAttribute(){},append(){},insertBefore(){},setPointerCapture:k=>captures.add(k),hasPointerCapture:k=>captures.has(k),releasePointerCapture:k=>captures.delete(k)};
 }
 const glare=element(),face=element(),body=element(),hanger=element(),cord=element(),slot={offsetTop:10,offsetHeight:8};
 const hero=Object.assign(element(),{offsetWidth:1440,offsetHeight:900,querySelector:()=>null,getBoundingClientRect:()=>{measurements++;return {left:0,top:0,width:1440,height:900};}});
 const badge=Object.assign(element(),{offsetLeft:0,offsetTop:130,offsetWidth:320,offsetHeight:450,clientTop:6,querySelector:s=>({'.badge-glare':glare,'.badge-face':face,'.slot':slot})[s]});
 const rig=Object.assign(element(),{offsetLeft:560,offsetTop:0,offsetWidth:320}),strap=Object.assign(element(),{offsetHeight:176});
 const context=vm.createContext({navigator:{platform:'Win32',maxTouchPoints:0},document:{hidden:false,body,querySelector:s=>({'.badge':badge,'.strap':strap,'.badge-rig':rig,'.hero':hero,'.badge-hanger':hanger,'.lanyard-cord':cord})[s],createElement:element,addEventListener(){}},
  window:{matchMedia:q=>({matches:(touch&&q==='(pointer: coarse)')||(reduced&&q==='(prefers-reduced-motion: reduce)'),addEventListener(){}}),addEventListener(){}},DOMMatrix:class{inverse(){return {a:1,b:0,c:0,d:1};}},getComputedStyle:()=>({transform:'none'}),
  requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:k=>frames.delete(k),ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}}});
 vm.runInContext(source.split('// Two identical groups')[0],context);
 const read=expression=>vm.runInContext(expression,context);
 return {read,get measurements(){return measurements;},tick(hz){time+=1000/hz;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));},
  send(type,x=720,y=300){for(const fn of badge.events.get(type)||[])fn({button:0,isPrimary:true,pointerId:1,clientX:x,clientY:y});},
  state(){return JSON.parse(read(`JSON.stringify({pose,velocity,ribbon:typeof ribbon==='undefined'?null:ribbon,rig:rig.attrs.get('transform'),hanger:hanger.attrs.get('transform'),lighting:['--glare-x','--glare-y','--glare-opacity'].map(k=>glareSurface.attrs.get(k)??badge.attrs.get(k)),pattern:['--ticket-pattern-x','--ticket-pattern-y'].map(k=>patternSurface.attrs.get(k)??badge.attrs.get(k)),edge:['--edge-x','--edge-y','--tilt-shadow-x','--tilt-shadow-y','--tilt-shadow-blur'].map(k=>badge.attrs.get(k))})`));},
 };
}
const badgeSource=fs.readFileSync('script.js','utf8');
let comparisons=0;
function simulateBadge(hz,touch){
 const f=badgeFixture(badgeSource,touch),samples=[],sampleFrames=[.5,1,1.5,2].map(t=>Math.round(t*hz)-1);f.send('pointerdown');
 for(let frame=0;frame<hz*10;frame++){
  const seconds=(frame+1)/hz;
  if(frame<hz)f.send('pointermove',720+Math.sin(seconds)*70,300+seconds*40);
  if(frame===hz)f.send('pointerup');
  f.tick(hz);const state=f.state();
  assert.ok(Object.values(state.pose).every(Number.isFinite),'finite ID pose at '+hz+' Hz');
  assert.ok(Object.values(state.velocity).every(Number.isFinite),'finite ID velocity at '+hz+' Hz');
  assert.ok(state.ribbon&&[state.ribbon.angle,state.ribbon.velocity,state.ribbon.lag].every(Number.isFinite),'finite independent strap spring and card lag state');
  assert.ok(Math.abs(state.ribbon.angle)<=18.001&&Math.abs(state.ribbon.velocity)<=90.001,'strap spring angle and angular velocity are bounded');
  const q=state.pose;
  assert.deepEqual(state.lighting,[(50+q.ry*2.5).toFixed(2)+'%',(50-q.rx*2.5).toFixed(2)+'%',q.light.toFixed(3)],'existing glare math is preserved');
  assert.deepEqual(state.pattern,[(q.ry*-.7).toFixed(2)+'px',(q.rx*.7).toFixed(2)+'px'],'existing dotted-face parallax is preserved');
  if(sampleFrames.includes(frame))samples.push({...q,strapAngle:state.ribbon.angle,cardLag:state.ribbon.lag});
  comparisons++;
 }
 assert.equal(f.read('frame'),0,'lanyard settles without a perpetual idle loop at '+hz+' Hz');
 const rest=JSON.parse(f.read('JSON.stringify(restingPose)'));
 assert.deepEqual(f.state().pose,rest,'released lanyard returns to rest at '+hz+' Hz');
 return samples;
}
for(const touch of [false,true]){
 const reference=simulateBadge(240,touch);
 for(const hz of [60,75,120,144,165]){
  const samples=simulateBadge(hz,touch);
  assert.equal(samples.length,reference.length);
  samples.forEach((pose,i)=>Object.keys(pose).forEach(key=>{
   assert.ok(Math.abs(pose[key]-reference[i][key])<3,'refresh-independent '+key+' trajectory at '+hz+' Hz');
  }));
 }
}
const rotation=value=>Number((value||'').match(/rotateZ\(([-\d.]+)deg\)/)?.[1]||0);
function regrabContinuity(source){
 const f=badgeFixture(source);f.send('pointerdown');
 for(let i=0;i<12;i++){f.send('pointermove',720+70*(i+1)/12,300);f.tick(60);}
 f.send('pointerup');for(let i=0;i<30;i++)f.tick(60);
 const before=rotation(f.state().rig);f.send('pointerdown');
 for(let i=0;i<4;i++){f.tick(60);assert.ok(Math.abs(rotation(f.state().rig)-before)<1,'stationary regrab preserves the rendered strap angle');}
}
regrabContinuity(badgeSource);
const resetAngle=badgeSource.replace('originSwing-Math.atan2(pose.x,length+pose.y)*180/Math.PI-originAngle','-Math.atan2(pose.x,length+pose.y)*180/Math.PI');
assert.notEqual(resetAngle,badgeSource,'regrab negative control targets the actual held-angle mapping');
assert.throws(()=>regrabContinuity(resetAngle),/stationary regrab preserves/,'old pose-derived regrab snap is detected');
const initial=badgeFixture(badgeSource);for(let i=0;i<15;i++)initial.tick(60);
assert.equal(initial.read('frame'),0,'the visible lanyard waits for input');
assert.equal(rotation(initial.state().rig),0,'the card rests on initial entry');
const reducedInitial=badgeFixture(badgeSource,true,true);for(let i=0;i<15;i++)reducedInitial.tick(60);
assert.equal(reducedInitial.read('frame'),0,'reduced-motion startup never starts the lanyard spring loop');
assert.equal(rotation(reducedInitial.state().rig),0,'reduced-motion startup keeps the suspension still');
const a=badgeFixture(original('script.js')),b=badgeFixture(badgeSource);
for(const f of [a,b]){
 f.read('let conversions=0;const nativeMapping=badgePointer;badgePointer=(x,y)=>{conversions++;return nativeMapping(x,y);};');f.send('pointerdown');f.read('conversions=0;');
 for(let n=0;n<100;n++)f.send('pointermove',740+n*.1,310);
}
assert.equal(a.read('conversions'),100);assert.equal(b.read('conversions'),0);a.tick(165);b.tick(165);assert.equal(b.read('conversions'),1);
assert.deepEqual(JSON.parse(b.read('JSON.stringify(latestPointer)')),{x:749.9,y:310},'only the latest input sample is consumed');
const before=a.measurements,after=b.measurements;
for(let n=0;n<90;n++){a.read('badgeBoundsDirty=true');b.read('badgeBoundsDirty=true');a.tick(165);b.tick(165);}
assert.ok(a.measurements>before);assert.equal(b.measurements,after,'stationary scroll spring frames do not remeasure screen bounds');

function paintCadence(source,hz,touch){
 const interval=source.slice(source.indexOf('const frameInterval ='),source.indexOf('function paused()'));
 const tick=transformSync(source.slice(source.indexOf('function tick(now:'),source.indexOf('function sync()')),{loader:'ts'}).code;
 const draws=[];const context=vm.createContext({frame:0,lastDraw:0,paused:()=>false,reportGraphicsFrame(){},pointerPending:false,draw:dt=>draws.push(dt),requestAnimationFrame:()=>1,matchMedia:()=>({matches:touch})});
 vm.runInContext(interval+tick,context);
 for(let i=0;i<hz;i++){context.timestamp=1000+i*1000/hz;vm.runInContext('tick(timestamp)',context);}
 return draws;
}
// Compare the particle renderer independently of the approved palette change.
const oldParticles=cp.execFileSync('git',['show','49f92b2:components/ui/aether-flow-hero.tsx'],{encoding:'utf8'}),newParticles=fs.readFileSync('components/ui/aether-flow-hero.tsx','utf8');
const particleDraw=source=>source.slice(source.indexOf('function draw('),source.indexOf('function tick('))
 .replace(/\r\n/g,'\n')
 .replace(/(ctx\.(?:fill|stroke)Style = [^;]+);/g,(_,paint)=>paint.replace(/#[\da-f]{6}\b/gi,'#PALETTE')+';');
assert.equal(particleDraw(newParticles),particleDraw(oldParticles),'particle physics, dots and connections unchanged');
const cadence=[];
for(const hz of [60,75,120,144,165,240]){
 const old=paintCadence(oldParticles,hz,false),next=paintCadence(newParticles,hz,false);
 assert.equal(next.length,hz,'desktop paints every delivered refresh');if(hz===60)assert.deepEqual(next,old,'identical original 60 Hz updates');
 assert.deepEqual(paintCadence(newParticles,hz,true),paintCadence(oldParticles,hz,true),'touch cadence unchanged');cadence.push({hz,before:old.length,after:next.length});
}
function travelFixture(source,touch,width){
 const start=source.indexOf('const positionCards = useCallback('),end=source.indexOf('\n  useEffect(() => {',start);
 const code=transformSync(source.slice(start,end)+'\nglobalThis.paintPosition=positionCards;',{loader:'tsx'}).code;
 let writes=0;const elements=[];
 const node=()=>{const values={};const element={inert:false,tabIndex:0,hasAttribute:()=>true,style:new Proxy(values,{set:(o,k,v)=>{writes++;o[k]=v;return true;}})};elements.push(element);return element;};
 const images=Array.from({length:20},(_,i)=>({src:'unchanged-'+i,type:i%5===0?'video':'image',videoFrameRatio:i%10===0?4/3:9/16}));
 const cardRefs={current:images.map(node)},imageWrapRefs={current:images.map(node)},imageRefs={current:images.map(()=>null)},videoRefs={current:images.map(()=>null)};
 const scope={useCallback:fn=>fn,images,box:{w:width,h:700},cardStep:680,cardWidthMax:680,cardHeightMax:574,cardHeightMin:50,easingPercentage:100,touchPerformance:touch,
  cardRefs,imageWrapRefs,imageRefs,videoRefs,paintedCardsRef:{current:new WeakMap()},announcedIndexRef:{current:-1},setActiveIndex(){},setVideoPlaying(){}};
 vm.runInNewContext(code,scope);return {paint:scope.paintPosition,state:()=>JSON.stringify(elements),get writes(){return writes;}};
}
let travelComparisons=0,oldWrites=0,newWrites=0;
for(const touch of [false,true])for(const width of [1280,1440,2560]){
 const old=travelFixture(original('components/ui/zoom-slider.tsx'),touch,width),next=travelFixture(fs.readFileSync('components/ui/zoom-slider.tsx','utf8'),touch,width);
 for(let i=0;i<120;i++){const position=i<100?i*7.5:742.5;old.paint(position);next.paint(position);assert.equal(next.state(),old.state(),'identical Travel geometry and interaction flags');travelComparisons++;}
 if(!touch){oldWrites+=old.writes;newWrites+=next.writes;}
}
assert.ok(newWrites<oldWrites,'desktop skips redundant Travel style writes');
const propertyCode=transformSync(fs.readFileSync('touch-performance.js','utf8'),{loader:'js',format:'cjs'}).code;
function registrations(touch,supported=true){const calls=[];const scope={module:{exports:{}},exports:{},matchMedia:()=>({matches:touch}),navigator:{platform:'Win32',maxTouchPoints:0}};
 if(supported)scope.CSS={registerProperty:definition=>calls.push(definition)};vm.runInNewContext(propertyCode,scope);return JSON.parse(JSON.stringify(calls));}
const desktopProperties=registrations(false),touchProperties=registrations(true);
assert.deepEqual(desktopProperties.map(p=>p.name),['--exit-scale','--exit-rotation','--enter-scale','--enter-rotation']);
assert.equal(touchProperties.length,9);assert.ok([...desktopProperties,...touchProperties].every(p=>p.inherits===false));assert.deepEqual(registrations(false,false),[]);
console.log(JSON.stringify({idMotionSamples:comparisons,unusedMappings:{before:100,after:0},stationaryMeasurements:{before:a.measurements-before,after:b.measurements-after},particleCadence:cadence,travelComparisons,travelDesktopWrites:{before:oldWrites,after:newWrites}}));
