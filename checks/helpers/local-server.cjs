const net=require('node:net'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
module.exports=async function localServer({cwd,logFile,serveDist=true,ipc=false}){
 const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
 const child=spawn(process.execPath,[...(ipc?['--expose-gc']:[]),path.join(cwd,'server.cjs')],{cwd,env:{...process.env,PORT:String(port),SERVE_DIST:serveDist?'1':'0'},windowsHide:true,stdio:['ignore','pipe','pipe',...(ipc?['ipc']:[])]});
 const log=fs.createWriteStream(logFile);child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('exit',()=>log.end());
 async function close(){if(child.exitCode!==null)return;await new Promise(resolve=>{const timer=setTimeout(resolve,2000);timer.unref();child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill();});}
 const origin='http://127.0.0.1:'+port;
 try{for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('Local test server exited before readiness');try{if((await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok)return {origin,child,close};}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Local test server readiness timed out');}
 catch(error){await close();throw error;}
};
