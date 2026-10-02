const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {promisify}=require('node:util');
const brotli=promisify(zlib.brotliCompress),gzip=promisify(zlib.gzip);
const compressedFiles=new Map();
async function compressedFile(file,info,encoding){
  const key=file+'::'+encoding,version=info.mtimeMs+'-'+info.size;
  const cached=compressedFiles.get(key);
  if(cached?.version===version)return cached.buffer;
  const buffer=fs.promises.readFile(file).then(data=>encoding==='br'?brotli(data,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:4}}):gzip(data,{level:6}));
  compressedFiles.set(key,{version,buffer});
  // Bound the cache; large media is always streamed without compression.
  while(compressedFiles.size>24)compressedFiles.delete(compressedFiles.keys().next().value);
  try{return await buffer;}catch(error){compressedFiles.delete(key);throw error;}
}
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.mov':'video/quicktime'};
http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  if(pathname === '/api/travel-locations') {
    const locationFile=path.join(root,'travel-locations.json');
    const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    if(req.method==='GET') {fs.readFile(locationFile,'utf8',(error,data)=>reply(200,error?{}:JSON.parse(data)));return;}
    if(req.method!=='POST'){reply(405,{error:'Method not allowed'});return;}
    if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`){reply(403,{error:'Invalid origin'});return;}
    let body='';
    req.on('data',chunk=>{body+=chunk;if(body.length>65536)req.destroy();});
    req.on('end',()=>{
      try {
        const input=JSON.parse(body),locations=Object.create(null);
        if(!input || typeof input!=='object' || Array.isArray(input))throw Error();
        const files=new Set(fs.readdirSync(path.join(root,'TRAVEL')));
        for(const [key,value] of Object.entries(input)){
          if(!files.has(key)||typeof value!=='string'||value.length>120)throw Error();
          if(value.trim())locations[key]=value.trim();
        }
        fs.writeFile(locationFile,JSON.stringify(locations,null,2),'utf8',error=>reply(error?500:200,error?{error:'Could not save locations'}:{saved:true}));
      }catch{reply(400,{error:'Invalid locations'});}
    });return;
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, async (error, info) => {
    if(error || !info.isFile()){res.writeHead(404);return res.end('Not found');}
    const headers={'Content-Type':types[path.extname(file).toLowerCase()] || 'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','Last-Modified':info.mtime.toUTCString()};
    const range=req.headers.range;
    const textFile=/\.(?:html|css|m?js|json|svg)$/i.test(file);
    const accepted=req.headers['accept-encoding']||'';
    const encoding=!range&&textFile&&info.size>1024?(accepted.includes('br')?'br':accepted.includes('gzip')?'gzip':null):null;
    headers.ETag=`"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}-${encoding||'raw'}"`;
    if(textFile)headers.Vary='Accept-Encoding';
    if(!range&&req.headers['if-none-match']===headers.ETag){res.writeHead(304,headers);return res.end();}
    if(encoding){
      try{
        const buffer=await compressedFile(file,info,encoding);
        headers['Content-Encoding']=encoding;headers['Content-Length']=buffer.length;
        delete headers['Accept-Ranges'];
        res.writeHead(200,headers);return res.end(req.method==='HEAD'?undefined:buffer);
      }catch{res.writeHead(500);return res.end('Could not read file');}
    }
    let start=0,end=info.size-1,status=200;
    if(range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match || (!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end();}
      start=match[1]?Number(match[1]):Math.max(0,info.size-Number(match[2]));
      end=match[1]&&match[2]?Math.min(Number(match[2]),info.size-1):info.size-1;
      if(start>end || start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end();}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);
    res.writeHead(status,headers);
    if(req.method==='HEAD'||!info.size)return res.end();
    const stream=fs.createReadStream(file,{start,end});
    stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  });
}).listen(3000, '127.0.0.1', () => console.log('Shub portfolio: http://localhost:3000'));
