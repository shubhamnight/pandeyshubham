const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
const selected={ 'Watch Dogs':243470,'Call of Duty Modern Warfare':2000950 };
const specials={
 '007 First Light':{title:'007 First Light',page:'https://www.playstation.com/en-us/games/007-first-light/',art:'https://image.api.playstation.com/vulcan/ap/rnd/202607/2312/ecb14ee33763d4dd295dbb4f4207f9961bf3dcd8ea3bba9f.png'},
 'Ghost of Yotei':{title:'Ghost of Yōtei',page:'https://www.playstation.com/en-us/games/ghost-of-yotei/',art:'https://image.api.playstation.com/vulcan/ap/rnd/202607/2723/890df32c227f619c5bd80e9f34ba2be53d0fea4b1615adee.png'},
 'Valorant':{title:'Valorant',page:'https://www.playstation.com/en-us/games/valorant/',art:'https://image.api.playstation.com/vulcan/ap/rnd/202609/0921/8b9042708110602ee93c3a28f4efee0aba91c4b9419fa128.png'},
 'Minecraft':{title:'Minecraft',page:'https://www.minecraft.net/en-us/store/minecraft-java-bedrock-edition-pc',art:'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Hero-Image_Vanilla_Standard_1200x675.jpg'},
 'Need for Speed Most Wanted':{title:'Need for Speed: Most Wanted (2005)',page:'https://gamesdb.launchbox-app.com/games/images/5015-need-for-speed-most-wanted-2005',art:'https://images.launchbox-app.com/0789b478-dee4-4fbd-b814-097da28ce33d.jpg'},
 'Uncharted':{title:"Uncharted 4: A Thief’s End",page:'https://www.playstation.com/en-us/games/uncharted-4-a-thiefs-end/',art:'https://image.api.playstation.com/vulcan/img/rnd/202011/1018/SGqMZHd7WWmN4XIcLfYMxJsc.png'},
 'Mortal Kombat X':{title:'Mortal Kombat XL',page:'https://store.playstation.com/en-us/product/UP1018-CUSA03589_00-MORTALKOMBATXL00/',art:'https://image.api.playstation.com/cdn/UP1018/CUSA03589_00/ezdXAsaNqjRSG19ujCjT1p1KqoI67wDO.png'}
};
async function download(url){const res=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error(res.status+' '+url);const buffer=Buffer.from(await res.arrayBuffer());await sharp(buffer).metadata();return buffer;}
async function build(row){
 const special=specials[row.title];
 const app=special?null:row.items.find(x=>x.id===(selected[row.title]||row.items[0]?.id));
 if(!special&&!app)throw Error('No correct match: '+row.title);
 const title=special?.title||app.name.replace(/[™®]/g,'');
 const id=row.title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 let buffer,source;
 const base=app?'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/'+app.id+'/':'';
 const candidates=special?[special.art]:[base+'capsule_616x353_2x.jpg',base+'capsule_616x353.jpg',app.tiny_image.replace(/capsule_231x87/,'capsule_616x353'),base+'library_600x900_2x.jpg',base+'library_600x900.jpg',base+'header.jpg'];
 for(const url of candidates){try{buffer=await download(url);source=url;break;}catch{}}
 if(!buffer&&app){
  const details=await(await fetch('https://store.steampowered.com/api/appdetails?appids='+app.id+'&l=english')).json();
  const header=details[app.id]?.data?.header_image;
  if(header){buffer=await download(header);source=header;}
 }
 if(!buffer)throw Error('Artwork unavailable: '+title);
 const metadata=await sharp(buffer).metadata();
 const original='assets/gaming/'+id+'-source.'+(metadata.format==='jpeg'?'jpg':metadata.format);
 await fs.writeFile(original,buffer);
 // Keep the entire official artwork visible. A subdued extension fills the
 // 4:3 frame, rather than stretching the art or cutting off its title.
 const background=await sharp(buffer).resize(960,720,{fit:'cover'}).blur(22).modulate({brightness:.35}).png().toBuffer();
 const foreground=await sharp(buffer).resize(960,720,{fit:'inside'}).png().toBuffer();
 const size=await sharp(foreground).metadata();
 const composite=await sharp(background).composite([{input:foreground,left:Math.round((960-size.width)/2),top:Math.round((720-size.height)/2)}]).png().toBuffer();
 const full='assets/gaming/'+id+'-960.webp',small='assets/gaming/'+id+'-480.webp';
 await sharp(composite).webp({quality:94}).toFile(full);
 await sharp(composite).resize(480,360).webp({quality:91}).toFile(small);
 console.log(title+' — source '+metadata.width+'×'+metadata.height);
 return {type:'image',title,alt:title+' game artwork',src:small,srcset:small+' 480w, '+full+' 960w',original:full,sourceOriginal:original,width:960,height:720,source,sourcePage:special?.page||'https://store.steampowered.com/app/'+app.id+'/'};
}
(async()=>{
 await fs.mkdir('assets/gaming',{recursive:true});
 const rows=JSON.parse(await fs.readFile('game-art-search.json','utf8'));
 rows.splice(rows.findIndex(x=>x.title==='007 First Light'),0,{title:'Red Dead Redemption 2',items:[{id:1174180,name:'Red Dead Redemption 2',tiny_image:'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/capsule_231x87.jpg'}]});
 const filter=process.argv[2];
 const results=filter?JSON.parse((await fs.readFile('gaming-data.js','utf8')).split('export const gamingImages = ')[1].trim().replace(/;$/, '')):[];
 const pending=filter?rows.filter(row=>row.title===filter):rows;
 for(let i=0;i<pending.length;i+=3){
  const batch=await Promise.all(pending.slice(i,i+3).map(build));
  for(const item of batch){const index=results.findIndex(old=>old.title===item.title);if(index>=0)results[index]=item;else results.push(item);}
 }
 await fs.writeFile('gaming-data.js','// Artwork sources are recorded per item. Cards are exactly 4:3.\nexport const gamingImages = '+JSON.stringify(results,null,2)+';\n');
 await fs.writeFile('assets/gaming/sources.json',JSON.stringify(results.map(({title,source,sourcePage})=>({title,source,sourcePage})),null,2));
 console.log('Prepared '+results.length+' game posters.');
})();
