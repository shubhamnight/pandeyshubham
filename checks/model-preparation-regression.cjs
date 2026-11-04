const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {transformSync}=require('esbuild');
function runtime(){
 const window=new EventTarget(),document=new EventTarget(),turns=[];document.hidden=false;
 const frame=fn=>setImmediate(()=>{turns.push('frame');fn();}),idle=fn=>setImmediate(()=>{turns.push('idle');fn();});window.requestIdleCallback=idle;
 const module={exports:{}};vm.runInNewContext(transformSync(fs.readFileSync('hobby-preparation.js','utf8'),{format:'cjs'}).code,{module,exports:module.exports,window,document,AbortController,DOMException,setTimeout,clearTimeout,requestAnimationFrame:frame,cancelAnimationFrame:clearImmediate,requestIdleCallback:idle,cancelIdleCallback:clearImmediate});
 return {api:module.exports,window,document,turns};
}
(async()=>{
 const r=runtime();let done=false;const first=r.api.yieldHobbyPreparation().then(()=>{done=true;});assert.equal(done,false);await first;assert.deepEqual(r.turns,['frame','idle']);
 r.document.hidden=true;let resumed=false;const hidden=r.api.yieldHobbyPreparation().then(()=>{resumed=true;});await new Promise(setImmediate);assert.equal(resumed,false);r.document.hidden=false;r.document.dispatchEvent(new Event('visibilitychange'));await hidden;
 const pieces=[1,2,7].map(mask=>({isMesh:true,layers:{mask}})),model={traverse:visit=>pieces.forEach(visit)},canvas={style:{visibility:'visible'}},draws=[];
 const renderer={domElement:canvas,compileAsync:async()=>{},render(){assert.equal(canvas.style.visibility,'hidden');draws.push({masks:pieces.map(p=>p.layers.mask),turns:r.turns.length});}};
 assert.equal(await r.api.warmHobbyRenderer(renderer,{}, {},model,()=>true),true);assert.equal(draws.length,4);assert.ok(draws.slice(0,-1).every(draw=>draw.masks.filter(Boolean).length===1));assert.ok(draws.every((draw,index)=>!index||draw.turns>draws[index-1].turns),'input/paint gets a turn between GPU draws');assert.deepEqual(pieces.map(p=>p.layers.mask),[1,2,7]);assert.equal(canvas.style.visibility,'visible');
 renderer.compileAsync=async()=>{throw Error('Injected shader preparation failure');};await assert.rejects(r.api.warmHobbyRenderer(renderer,{}, {},model,()=>true),/Injected shader/);assert.deepEqual(pieces.map(p=>p.layers.mask),[1,2,7]);assert.equal(canvas.style.visibility,'visible');
 assert.equal(await r.api.warmHobbyRenderer(renderer,{}, {},model,()=>false),false);assert.deepEqual(pieces.map(p=>p.layers.mask),[1,2,7]);
 r.document.hidden=true;
 const modelController=new AbortController();
 const cancelledModel=r.api.yieldHobbyPreparation(modelController.signal);
 modelController.abort();await assert.rejects(cancelledModel,error=>error.name==='AbortError');
 r.document.hidden=false;await r.api.yieldHobbyPreparation();
 r.document.hidden=true;const pending=r.api.yieldHobbyPreparation();r.window.dispatchEvent(new Event('pagehide'));await assert.rejects(pending,error=>error.name==='AbortError');await assert.rejects(r.api.yieldHobbyPreparation(),error=>error.name==='AbortError');
 console.log('Cooperative preparation: input/paint yields, hidden-tab pause, isolated hidden GPU draws, layer/visibility restoration, stale preparation and departure cancellation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
