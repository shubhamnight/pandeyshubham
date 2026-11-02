const fs=require('node:fs'),path=require('node:path');
module.exports=async function launchFirefox(browserType,options={}){
 const settings={headless:true,...options};
 try{return await browserType.launch(settings);}
 catch(error){
  if(process.platform!=='win32'||!error.message.includes('spawn UNKNOWN'))throw error;
  // Some Windows app environments cannot resolve cached Firefox's private SxS
  // dependency outside the workspace. Copy the unchanged test distribution;
  // no system settings, real browser profiles, binaries or manifests are edited.
  const source=path.dirname(browserType.executablePath()),target=path.resolve(__dirname,'../../tmp/regression-firefox');
  const marker=path.join(target,'.source-revision');
  if(!fs.existsSync(marker)||fs.readFileSync(marker,'utf8')!==source){fs.cpSync(source,target,{recursive:true});fs.writeFileSync(marker,source);}
  return browserType.launch({...settings,executablePath:path.join(target,'firefox.exe')});
 }
};
