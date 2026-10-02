const fs=require('node:fs/promises');
const sharp=require('sharp');
const normalize=s=>s.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
async function prepare([title,artist],index){
  try{return JSON.parse(await fs.readFile('assets/music/'+String(index+1).padStart(2,'0')+'.json','utf8'));}catch{}
  const queryArtist=artist.split(/[&/]/)[0].trim();
  let matches=[];
  for(const country of ['US','IN']){
    const url='https://itunes.apple.com/search?'+new URLSearchParams({term:title+' '+queryArtist,entity:'song',media:'music',country,limit:'15'});
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('Search failed '+response.status+' for '+title);
    matches=(await response.json()).results||[];
    matches=matches.filter(x=>normalize(x.artistName).includes(normalize(queryArtist))||normalize(artist).includes(normalize(x.artistName)));
    matches.sort((a,b)=>score(b)-score(a));
    if(matches.length)break;
  }
  function score(x){const n=normalize(x.trackName),t=normalize(title);return (n===t?100:n.startsWith(t)?60:0)-( /live|karaoke|tribute|remix|instrumental/i.test(x.trackName)?80:0);}
  let match=matches[0];
  if(!match||score(match)<=0){
    const albums={'The Less I Know the Better':'Currents','Nadaan Parindey':'Rockstar','Kun Faya Kun':'Rockstar','Tum Se Hi':'Jab We Met','Ikk Kudi':'Udta Punjab','Kabhi Kabhi Aditi':'Jaane Tu Ya Jaane Na'};
    const album=albums[title];if(!album)throw Error('No matching artwork: '+title);
    const response=await fetch('https://itunes.apple.com/search?'+new URLSearchParams({term:album+' '+queryArtist,entity:'album',country:'IN',limit:'30'}));
    const candidates=(await response.json()).results||[];
    match=candidates.find(x=>normalize(x.collectionName).includes(normalize(album))&&normalize(x.artistName).includes(normalize(queryArtist)));
    if(!match)throw Error('No matching album artwork: '+title);
  }
  const art=match.artworkUrl100.replace('100x100bb','600x600bb');
  const response=await fetch(art,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Artwork unavailable: '+title);
  const buffer=Buffer.from(await response.arrayBuffer());
  const base='assets/music/'+String(index+1).padStart(2,'0');
  await sharp(buffer).resize(240,240,{fit:'cover'}).webp({quality:90}).toFile(base+'-240.webp');
  await sharp(buffer).resize(600,600,{fit:'cover',withoutEnlargement:true}).webp({quality:94}).toFile(base+'-600.webp');
  console.log(title+' -> '+match.trackName+' / '+match.artistName+' / '+match.collectionName);
  const result={title,artist,src:base+'-240.webp',fullSrc:base+'-600.webp',source:art,sourcePage:match.trackViewUrl||match.collectionViewUrl,album:match.collectionName};
  await fs.writeFile(base+'.json',JSON.stringify(result));return result;
}
(async()=>{
  await fs.mkdir('assets/music',{recursive:true});
  const songs=JSON.parse(await fs.readFile('music-song-list.json','utf8')),results=[];
  for(let i=0;i<songs.length;i+=2){results.push(...await Promise.all(songs.slice(i,i+2).map((song,j)=>prepare(song,i+j))));await new Promise(resolve=>setTimeout(resolve,3100));}
  await fs.writeFile('music-data.js','// Album artwork sources are preserved per song.\nexport const musicImages = '+JSON.stringify(results,null,2)+';\n');
  await fs.writeFile('assets/music/sources.json',JSON.stringify(results,null,2));
  console.log('Prepared '+results.length+' songs.');
})().catch(error=>{console.error(error);process.exitCode=1;});
