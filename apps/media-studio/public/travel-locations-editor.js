import {travelImages} from './travel-data.js';
const form=document.querySelector('#form'),grid=document.querySelector('#photos'),status=document.querySelector('#status'),button=form.querySelector('button');
try{
  const response=await fetch('/api/travel-locations');if(!response.ok)throw Error('Could not load saved locations');
  const locations=await response.json();
  travelImages.forEach((item,index)=>{
    const name=decodeURIComponent(item.original.split('/').pop()),card=document.createElement('article'),image=document.createElement('img'),label=document.createElement('label'),input=document.createElement('input');
    image.src=item.poster||item.src;image.alt=item.alt;image.loading='lazy';image.decoding='async';
    input.id='location-'+index;input.name=name;input.type='text';input.maxLength=120;input.value=locations[name]||'';input.placeholder='e.g. Jaipur, India';
    label.htmlFor=input.id;label.textContent=name;card.append(image,label,input);grid.append(card);
  });button.disabled=false;status.textContent='';
}catch(error){status.textContent=error.message;}
form.addEventListener('input',()=>{status.textContent='Unsaved changes';});
form.addEventListener('submit',async event=>{
  event.preventDefault();button.disabled=true;status.textContent='Saving…';
  try{const response=await fetch('/api/travel-locations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});if(!response.ok)throw Error('Save failed. Please try again.');status.textContent='Saved. Reload the portfolio to see your pins.';}
  catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
