const fs=require('node:fs/promises'),path=require('node:path');
const profiles=[['laptop',1366,768,false],['phone',393,873,true],['tablet',820,1180,true]];
const galleries=[['photography-camera','photography','.photo-carousel'],['travel-plane','travel','.zoom-slider'],['music-walkman','music','.dcc-root'],['gaming-controller','gaming','.gaming-scroll-viewport']];
const origin=process.env.AUDIT_URL||'http://localhost:3000';
async function enter(page,hash=''){
 await page.goto(origin+'/'+hash,{waitUntil:'domcontentloaded'});
 await page.locator('.intro-replay button').waitFor({state:'visible'});
}
async function hobbies(page){
 await page.locator('.floating-nav a[href="#projects"]').click();
 await page.locator('.hobby-card').first().waitFor({state:'visible'});
}
async function open(page,entry){await page.locator('#'+entry[0]).click();const dialog=page.locator('#'+entry[1]+'-gallery');await dialog.locator(entry[2]).waitFor({state:'visible',timeout:30000});return dialog;}
async function model(page,id){
 await page.locator('[data-hobby-model="'+id+'"]').click();
 await page.locator('#'+id+'.camera-ready canvas').waitFor({state:'visible',timeout:25000});
}
async function close(page,dialog){await dialog.locator('header button').click();await page.waitForFunction(()=>!document.body.classList.contains('photography-gallery-open')&&document.body.style.overflow==='');}
async function save(name,results){const out=path.resolve(process.env.AUDIT_OUTPUT||'output/regressions/'+name);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));}
module.exports={profiles,galleries,origin,enter,hobbies,open,model,close,save};
