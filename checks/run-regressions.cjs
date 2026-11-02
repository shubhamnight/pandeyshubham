const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path');
const {spawn}=require('node:child_process');
const manifest=require('./regression-manifest.cjs'),root=path.resolve(__dirname,'..');
const args=process.argv.slice(2),option=name=>args.find(arg=>arg.startsWith('--'+name+'='))?.split('=').slice(1).join('=');
const selected=manifest.filter(test=>(!option('group')||option('group').split(',').includes(test.group))&&(!option('case')||option('case').split(',').includes(test.id)));
if(args.includes('--list')){for(const test of selected)console.log(`${test.id}\t${test.group}\t${test.platforms.join(', ')}\t${test.bugs.join('; ')}`);process.exit(0);}
if(!selected.length)throw Error('No matching regression cases. Use --list to inspect valid names.');
// A full run must not silently inherit a previous focused diagnostic's filters.
if(!option('case')&&!option('group'))for(const key of ['BROWSER_PROFILE','DESKTOP_WIDTH','DESKTOP_HEIGHT','REGRESSION_BROWSERS','PHONE_CHECK_WIDTH','PHONE_REFERENCE','BACKEND_REFERENCE','HISTORY_MUTATE_PRELOAD','HISTORY_MUTATE_IMPORTMAP','HISTORY_MUTATE_FONT','READING_WIDTH','GAMING_WIDTH','REPAIR_DESKTOP','REPAIR_WIDTH','REPAIR_CPU','REPAIR_MEMORY_CYCLES','REPAIR_FAULT','REPAIR_FAULTS_ONLY','REPAIR_SKIP_FAULTS'])delete process.env[key];
const out=path.resolve(option('output')||path.join(root,'output/regressions',new Date().toISOString().replace(/[:.]/g,'-')));
let server=null;const report={started:new Date().toISOString(),expectedCases:selected.length+(args.includes('--no-build')?0:1),selectedIds:selected.map(test=>test.id),results:[],manualEvidence:['The isolated partial-hero CDP capture still needs independent physical-display verification; passing browser tests does not establish a universal physical-device FPS guarantee.']};
async function run(id,program,commandArgs,env,timeout=30*60*1000){
 const folder=path.join(out,id);await fsp.mkdir(folder,{recursive:true});console.log(`RUN ${id}`);const started=Date.now();
 const stdout=fs.createWriteStream(path.join(folder,'stdout.log')),stderr=fs.createWriteStream(path.join(folder,'stderr.log'));
 let code=1,signal=null,timedOut=false;
 try{await new Promise((resolve,reject)=>{
  const child=spawn(program,commandArgs,{cwd:root,env:{...process.env,...env},windowsHide:true});
  const timer=setTimeout(()=>{timedOut=true;child.kill();},timeout);
  child.stdout.on('data',value=>{stdout.write(value);process.stdout.write(value);});child.stderr.on('data',value=>{stderr.write(value);process.stderr.write(value);});
  child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('exit',(status,why)=>{clearTimeout(timer);code=status;signal=why;resolve();});
 });}finally{stdout.end();stderr.end();}
 const result={id,passed:code===0&&!timedOut,exitCode:code,signal,timedOut,seconds:(Date.now()-started)/1000};
 report.results.push(result);await fsp.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(`${result.passed?'PASS':'FAIL'} ${id} (${result.seconds.toFixed(1)}s)`);return result;
}
(async()=>{await fsp.mkdir(out,{recursive:true});console.log('Regression evidence: '+out);
 try{
  if(!args.includes('--no-build')){
   const build=process.platform==='win32'?await run('build',process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm.cmd run build']):await run('build','npm',['run','build']);
   if(!build.passed)throw Error('Build failed; browser results would test stale output.');
  }
  if(!process.env.AUDIT_URL)server=await require('./helpers/local-server.cjs')({cwd:root,logFile:path.join(out,'server.log')});
  report.origin=process.env.AUDIT_URL||server.origin;
  for(const test of selected){
   const environment={AUDIT_URL:report.origin,AUDIT_OUTPUT:path.join(out,test.id),REPAIR_OUTPUT:path.join(out,test.id),PLAYWRIGHT_MODULE:require.resolve('playwright-core')};
   const commandArgs=test.group==='core'?[]:['--require',path.join(__dirname,'helpers/browser-env.cjs')];
   commandArgs.push(path.join(root,test.script));if(test.id==='typecheck')commandArgs.push('--noEmit','--noUnusedLocals','--noUnusedParameters');
   const result=await run(test.id,process.execPath,commandArgs,environment);result.platforms=test.platforms;result.bugs=test.bugs;
  }
 }finally{
  await server?.close();
  report.finished=new Date().toISOString();report.passed=report.results.length===report.expectedCases&&report.results.every(result=>result.passed);
  await fsp.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));
  console.log(`Regression results: ${report.results.filter(result=>result.passed).length}/${report.results.length} passed. ${out}`);
  if(!report.passed)process.exitCode=1;
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
