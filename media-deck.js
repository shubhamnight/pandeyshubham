export function shuffle(items) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

/** Exhaust each shuffled deck before refilling; avoid a repeat across its boundary. */
export function createMediaDeck(items) {
  const order=shuffle(items);
  let deck=[...order],previous=null;
  return { order, next(){
    if(!deck.length){
      deck=shuffle(items);
      if(deck[0]===previous&&deck.length>1)[deck[0],deck[1]]=[deck[1],deck[0]];
    }
    previous=deck.shift();return previous;
  } };
}
