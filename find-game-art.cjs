const fs=require('node:fs/promises');
const games=['Batman Arkham Knight','God of War Ragnarok','Battlefield 4','Ghost of Tsushima','Elden Ring','Marvel Spider-Man 2','Watch Dogs','Ghost of Yotei','Silent Hill 2','007 First Light','Resident Evil 7','Resident Evil Village','Assassins Creed Origins','Tekken 8','Mortal Kombat X','Valorant','Call of Duty Modern Warfare','The Last of Us Part I','Pragmata','Need for Speed Most Wanted','The Witcher 3','Mass Effect 3','Dark Souls III','Detroit Become Human','Metal Gear Solid V The Phantom Pain','Far Cry 5','Forza Horizon 5','Grand Theft Auto V','Black Myth Wukong','Uncharted','Hitman World of Assassination','Minecraft'];
(async()=>{
 const results=[];
 for(let i=0;i<games.length;i+=3){
  const batch=await Promise.all(games.slice(i,i+3).map(async title=>{
   const url='https://store.steampowered.com/api/storesearch/?term='+encodeURIComponent(title)+'&l=english&cc=us';
   try{const data=await(await fetch(url)).json();return{title,items:data.items?.slice(0,3).map(item=>({id:item.id,name:item.name,tiny_image:item.tiny_image}))||[]};}catch(error){return{title,error:error.message};}
  }));results.push(...batch);batch.forEach(result=>console.log(JSON.stringify(result)));
 }
 await fs.writeFile('game-art-search.json',JSON.stringify(results,null,2));
})();
