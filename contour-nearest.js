// Exact nearest-segment queries for the intro's unchanged dense silhouette.
// The spatial grid only eliminates segments whose lower distance bound is
// already farther away; distances and tie-breaking match the ordered scan.
export function createContourSearch(segments, cellSize=.09) {
  const cells=new Map(),visited=new Uint32Array(segments.length);
  let stamp=0,minColumn=Infinity,maxColumn=-Infinity,minRow=Infinity,maxRow=-Infinity;
  for(let index=0;index<segments.length;index++){
    const {from,dx,dy}=segments[index];
    const left=Math.floor(Math.min(from.x,from.x+dx)/cellSize),right=Math.floor(Math.max(from.x,from.x+dx)/cellSize);
    const top=Math.floor(Math.min(from.y,from.y+dy)/cellSize),bottom=Math.floor(Math.max(from.y,from.y+dy)/cellSize);
    minColumn=Math.min(minColumn,left);maxColumn=Math.max(maxColumn,right);
    minRow=Math.min(minRow,top);maxRow=Math.max(maxRow,bottom);
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
      const key=x+':'+y;
      if(!cells.has(key))cells.set(key,[]);
      cells.get(key).push(index);
    }
  }
  // Reuse the visitor across all vertex queries instead of allocating a new
  // captured function for every unique point in the morph's preparation.
  let queryX=0,queryY=0,best=Infinity,nearest=-1,fraction=0;
  const visit=(cx,cy)=>{
    const bucket=cells.get(cx+':'+cy);
    if(!bucket)return;
    for(const index of bucket){
      if(visited[index]===stamp)continue;
      visited[index]=stamp;
      const {from,dx,dy,squared}=segments[index];
      const at=Math.max(0,Math.min(1,((queryX-from.x)*dx+(queryY-from.y)*dy)/Math.max(squared,1e-12)));
      const ex=queryX-from.x-dx*at,ey=queryY-from.y-dy*at,distance=ex*ex+ey*ey;
      if(distance<best||(distance===best&&index<nearest)){best=distance;nearest=index;fraction=at;}
    }
  };
  return (x,y,result)=>{
    if(++stamp===0x100000000){visited.fill(0);stamp=1;}
    queryX=x;queryY=y;best=Infinity;nearest=-1;fraction=0;
    const column=Math.floor(x/cellSize),row=Math.floor(y/cellSize);
    const limit=Math.max(Math.abs(column-minColumn),Math.abs(column-maxColumn),Math.abs(row-minRow),Math.abs(row-maxRow));
    for(let ring=0;ring<=limit;ring++){
      for(let cx=column-ring;cx<=column+ring;cx++){
        visit(cx,row-ring);if(ring)visit(cx,row+ring);
      }
      for(let cy=row-ring+1;cy<row+ring;cy++){visit(column-ring,cy);if(ring)visit(column+ring,cy);}
      const bound=Math.min(x-(column-ring)*cellSize,(column+ring+1)*cellSize-x,
        y-(row-ring)*cellSize,(row+ring+1)*cellSize-y);
      if(best<bound*bound)break;
    }
    result.index=nearest;result.fraction=fraction;result.squared=best;
  };
}
