const fs=require('node:fs/promises'),path=require('node:path');
const profiles=[['laptop',1366,768,false],['phone',393,873,true],['tablet',820,1180,true]];
const galleries=[['photography-camera','photography','.photo-carousel'],['travel-plane','travel','.zoom-slider'],['music-walkman','music','.dcc-root'],['gaming-controller','gaming','.gaming-scroll-viewport']];
const origin=process.env.AUDIT_URL||'http://localhost:3000';
async function enter(page,hash=''){
 await page.goto(origin+'/'+hash);await page.getByRole('button',{name:'Enter Shubham Pandey’s portfolio',exact:true}).click({timeout:45000});
 await page.locator('.portfolio-intro').waitFor({state:'detached'});await page.waitForFunction(()=>!document.body.classList.contains('badge-entering'));
}
async function hobbies(page){
 await page.locator('.floating-nav a[href="#projects"]').evaluate(e=>e.click());
 await page.waitForFunction(()=>!document.querySelector('#projects').inert&&document.querySelector('#projects').hobbyEntranceProgress===1&&[...document.querySelectorAll('.hobby-orbit-center button')].every(e=>e.dataset.hobbyCompiling==='false'||e.dataset.hobbyModelFailed==='true'),null,{timeout:45000});
}
async function open(page,entry){await page.locator('#'+entry[0]).evaluate(e=>e.click());const dialog=page.locator('#'+entry[1]+'-gallery');await dialog.locator(entry[2]).waitFor({state:'visible',timeout:30000});return dialog;}
async function close(page,dialog){await dialog.locator('header button').click();await page.waitForFunction(()=>!document.body.classList.contains('photography-gallery-open')&&document.body.style.overflow==='');}
async function save(name,results){const out=path.resolve(process.env.AUDIT_OUTPUT||'output/regressions/'+name);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));}
module.exports={profiles,galleries,origin,enter,hobbies,open,close,save};
