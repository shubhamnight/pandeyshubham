// Negative controls run isolated old/mutated code; the live website is never edited.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const out=path.resolve(process.env.AUDIT_OUTPUT||'output/regressions/reproductions');
async function run(name,file,extra){
 const folder=path.join(out,name);await fs.mkdir(folder,{recursive:true});
 return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--require',path.join(__dirname,'helpers/browser-env.cjs'),path.join(__dirname,file)],{cwd:path.resolve(__dirname,'..'),env:{...process.env,...extra,AUDIT_OUTPUT:folder},windowsHide:true});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('exit',async code=>{try{await fs.writeFile(path.join(folder,'stdout.log'),stdout);await fs.writeFile(path.join(folder,'stderr.log'),stderr);resolve({code,stdout,stderr,folder});}catch(error){reject(error);}});});
}
(async()=>{
 const old=await run('stranded-phone-icon','skills-image-continuity.cjs',{PHONE_REFERENCE:'1',BROWSER_PROFILE:'phone'});
 assert.notEqual(old.code,0,'the regression must reject a stranded phone icon');
 assert.match(old.stderr,/all Skills icons are visible immediately/);
 const current=await run('current-phone-entrance','skills-image-continuity.cjs',{PHONE_REFERENCE:'',BROWSER_PROFILE:'phone'});
 assert.equal(current.code,0,current.stderr);
 const preload=await run('old-overlay-preload','historical-contracts.cjs',{HISTORY_MUTATE_PRELOAD:'1',BROWSER_PROFILE:'laptop'});assert.notEqual(preload.code,0);assert.match(preload.stderr,/closed gallery styles are not preloaded/,'the preload assertion must detect the restored hint bug');
 const importmap=await run('old-importmap-order','cross-engine-regression.cjs',{REGRESSION_BROWSERS:'firefox',HISTORY_MUTATE_IMPORTMAP:'1'});assert.notEqual(importmap.code,0);assert.match(importmap.stderr,/normal browser journeys must render all four 3D models/,'late import maps must reproduce missing Firefox models');
 const font=await run('old-font-metadata','cross-engine-regression.cjs',{REGRESSION_BROWSERS:'firefox',HISTORY_MUTATE_FONT:'1'});assert.notEqual(font.code,0);assert.match(font.stderr,/normal browser journeys must not hide caught runtime or font errors/,'the original malformed font must trigger the browser error assertion');
 const backendRevision='2b6022d1513d53115ee078745b2832ecc29a4a03',backend=await run('old-backend','backend-stress.cjs',{BACKEND_REFERENCE:backendRevision});assert.notEqual(backend.code,0,'the backend tests must reject the previous implementation');
 const backendResults=JSON.parse(await fs.readFile(path.join(backend.folder,'results.json'))).results;
 const rejectedBackend=backendResults.filter(r=>!r.passed).map(r=>r.name);
 for(const name of ['compression-negotiation','ranges-and-validators','static-methods-and-private-files','chunked-unicode-labels','concurrent-label-writes-and-reads','editor-origin-and-body-limits'])assert.ok(rejectedBackend.includes(name),'the baseline must reproduce '+name);
 assert.ok(rejectedBackend.includes('malformed-path-isolation'),'the previous backend must reject the new malformed-path check');assert.match(await fs.readFile(path.join(backend.folder,'server.log'),'utf8'),/ERR_INVALID_ARG_VALUE/,'the malformed-path negative control must reproduce the filesystem path exception');
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({strandedPhoneIconRejected:true,currentPhonePassed:true,restoredPreloadBugRejected:true,lateImportMapRejected:true,originalFontMetadataRejected:true,backendRevision,rejectedBackend},null,2));
 console.log('Negative controls passed: original phone, restored CSS-preload and previous backend bugs are rejected; current phone implementation passes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
