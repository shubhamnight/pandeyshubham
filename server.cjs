const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
// Local secrets stay outside the generated deployment and Git history.
try { process.loadEnvFile(path.join(__dirname, '.env.local')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const zlib = require('node:zlib');
const {promisify}=require('node:util');
const brotli=promisify(zlib.brotliCompress),gzip=promisify(zlib.gzip);
const compressedFiles=new Map();
const mediaManager=require('./lib/media-manager.cjs');
const readJson=require('./lib/read-json.cjs');
const writeAtomicFiles=require('./lib/write-build-files.cjs');
function acceptedEncoding(header='',compressible=true){
  const qualities=new Map(header.toLowerCase().split(',').map(part=>{
    const [name,...parameters]=part.trim().split(';'),value=parameters.find(p=>p.trim().startsWith('q='));
    const q=value?Number(value.trim().slice(2)):1;
    return [name,Number.isFinite(q)&&q>=0&&q<=1?q:0];
  }));
  const preferred=(compressible?['br','gzip']:[]).map(name=>({name,q:qualities.get(name)??qualities.get('*')??0})).filter(e=>e.q>0).sort((a,b)=>b.q-a.q)[0];
  const identity=qualities.get('identity')??(qualities.get('*')===0?0:1);
  if(qualities.has('identity')&&identity>(preferred?.q||0))return null;
  return preferred?.name||(identity?null:false);
}
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
const root = process.env.SERVE_DIST === '1' ? path.join(__dirname, 'dist') : __dirname;
const port = Number(process.env.PORT || 3000);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.mov':'video/quicktime','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.webmanifest':'application/manifest+json'};
http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  if(pathname.includes('\0')){res.writeHead(400);return res.end('Bad request');}
  // Never serve dotfiles, server code, environment files, or provider secrets.
  pathname=pathname.replaceAll('\\','/');
  const segments=pathname.split('/');
  if(process.env.SERVE_DIST==='1'&&['/api/media-manager','/api/travel-locations'].includes(pathname)){res.writeHead(404);return res.end('Not found');}
  if(pathname==='/api/media-manager') {
    mediaManager(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});return;
  }
  if(segments.some(segment=>segment.startsWith('.')) || /\.cjs$/i.test(pathname) || /^\/(?:lib|tmp|api)(?:\/|$)/i.test(pathname) && pathname!=='/api/travel-locations') {res.writeHead(404);return res.end('Not found');}
  if(pathname === '/api/travel-locations' && process.env.SERVE_DIST !== '1') {
    const locationFile=path.join(root,'travel-locations.json');
    const reply=(status,value)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    if(!/^(?:localhost|127\.0\.0\.1):\d+$/.test(req.headers.host||'')||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){reply(403,{error:'The location editor is local only'});return;}
    if(req.method==='GET') {
      fs.readFile(locationFile,'utf8',(error,data)=>{
        if(error){reply(error.code==='ENOENT'?200:500,error.code==='ENOENT'?{}:{error:'Could not read saved travel locations'});return;}
        try{reply(200,JSON.parse(data));}
        catch{reply(500,{error:'Could not read saved travel locations'});}
      });return;
    }
    if(req.method!=='POST'){reply(405,{error:'Method not allowed'});return;}
    if(req.headers.origin!==`http://${req.headers.host}`||!/^application\/json\b/.test(req.headers['content-type']||'')){reply(403,{error:'Open the local location editor to save changes'});return;}
    (async()=>{
      try {
        const input=await readJson(req,65536,'Location request is too large'),locations=Object.create(null);
        if(!input || typeof input!=='object' || Array.isArray(input))throw Error();
        const files=new Set(fs.readdirSync(path.join(root,'TRAVEL')));
        for(const [key,value] of Object.entries(input)){
          if(!files.has(key)||typeof value!=='string'||value.length>120)throw Error();
          if(value.trim())locations[key]=value.trim();
        }
        await writeAtomicFiles([{path:locationFile,contents:JSON.stringify(locations,null,2)}]);
        reply(200,{saved:true});
      }catch(error){reply(error.status||(error.code?500:400),{error:error.status?error.message:error.code?'Could not save locations':'Invalid locations'});}
    })();return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end('Method not allowed');}
  if(pathname === '/index.html'){res.writeHead(308,{Location:'/'});return res.end();}
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, async (error, info) => {
    if(res.destroyed)return;
    if(error || !info.isFile()){
      res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex, follow','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')return res.end();
      return fs.readFile(path.join(root,'404.html'),(notFoundError,html)=>res.end(notFoundError?'Not found':html));
    }
    const headers={'Content-Type':types[path.extname(file).toLowerCase()] || 'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Last-Modified':info.mtime.toUTCString()};
    let range=req.headers.range;
    const textFile=/\.(?:html|css|m?js|json|svg|txt|xml|webmanifest)$/i.test(file);
    const tag=encoding=>`"${info.size.toString(16)}-${info.mtimeMs.toString(16)}-${encoding||'raw'}"`;
    if(range&&req.headers['if-range']){
      const validator=req.headers['if-range'];
      if(validator!==tag(null)&&!(Number.isFinite(Date.parse(validator))&&Math.floor(info.mtimeMs/1000)*1000<=Date.parse(validator)))range=null;
    }
    const encoding=acceptedEncoding(req.headers['accept-encoding'],!range&&textFile&&info.size>1024);
    if(encoding===false){res.writeHead(406,{'Content-Type':'text/plain; charset=utf-8',Vary:'Accept-Encoding'});return res.end('No acceptable content encoding');}
    headers.ETag=tag(encoding);
    if(textFile)headers.Vary='Accept-Encoding';
    if((req.headers['if-none-match']||'').split(',').some(value=>value.trim()==='*'||value.trim().replace(/^W\//,'')===headers.ETag)){res.writeHead(304,headers);return res.end();}
    if(encoding){
      try{
        const buffer=await compressedFile(file,info,encoding);
        if(res.destroyed)return;
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
}).listen(port, '127.0.0.1', () => console.log('Shub portfolio: http://localhost:'+port));
