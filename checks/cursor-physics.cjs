const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const {stepCursorSpring,cursorSpringSettled}=await import('data:text/javascript;base64,'+fs.readFileSync('cursor-physics.js').toString('base64'));const rows=[];
 for(const hz of [60,75,120,144,165,240]){
  const axis={value:0,velocity:0};let elapsed=0;
  for(const end of [.05,.1,.2,.4]){
   while(elapsed<end-1e-10){const dt=Math.min(1/hz,end-elapsed);stepCursorSpring(axis,1,dt);elapsed+=dt;assert.ok(axis.value>=0&&axis.value<=1);}
   const expected=1-(1+32*elapsed)*Math.exp(-32*elapsed);assert.ok(Math.abs(axis.value-expected)<1e-10,'closed-form spring response at '+hz+' Hz');
  }
  const saved={...axis};stepCursorSpring(axis,-1,0);assert.deepEqual(axis,saved,'reversal preserves position and velocity');
  for(let i=0;i<hz;i++){stepCursorSpring(axis,-1,1/hz);assert.ok(axis.value>=-1-1e-9&&axis.value<=1+1e-9);assert.ok(Number.isFinite(axis.velocity));}
  assert.ok(cursorSpringSettled(axis,-1));rows.push(hz);
 }
 const jitter={value:0,velocity:0};let elapsed=0;const steps=[.004,.016,.033,.008,.02];for(let i=0;i<100;i++){const dt=steps[i%steps.length];stepCursorSpring(jitter,1,dt);elapsed+=dt;}assert.ok(Math.abs(jitter.value-(1-(1+32*elapsed)*Math.exp(-32*elapsed)))<1e-10);
 console.log(JSON.stringify({refreshRates:rows,closedForm:true,momentumPreservedOnReversal:true,boundedStep:true,irregularFrames:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
