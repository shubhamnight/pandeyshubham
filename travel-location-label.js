export let travelLocations={};
// Filename keys keep the chosen colours stable when the media order changes.
const whiteTextFiles=new Set([
  'WhatsApp Image 2026-10-01 at 5.05.05 AM (1).jpeg',
  'WhatsApp Image 2026-10-01 at 5.05.05 AM (2).jpeg',
  'WhatsApp Image 2026-10-01 at 5.05.06 AM.jpeg',
  'WhatsApp Video 2026-10-01 at 5.04.33 AM.mp4',
]);
export const locationsReady=fetch('/api/travel-locations').then(response=>response.ok?response.json():{}).then(data=>{travelLocations=data;}).catch(()=>{});
export function locationLabel(item){
  const name=decodeURIComponent(item.original.split('/').pop());
  const text=travelLocations[name];if(!text)return null;
  const label=document.createElement('span');label.className='travel-location-label';
  if(whiteTextFiles.has(name))label.classList.add('travel-location-light');
  const pin=document.createElement('img');pin.className='travel-location-pin';
  pin.src='assets/location-pushpin.svg';pin.alt='';pin.setAttribute('aria-hidden','true');pin.width=16;pin.height=24;
  const caption=document.createElement('span');caption.textContent=text;label.append(pin,caption);return label;
}
