// Decode once after collecting bytes: TCP chunks may split a UTF-8 character.
module.exports=async function readJson(req,limit,message='Request is too large'){
  const reject=(text,status)=>Object.assign(new Error(text),{status});
  if(Number(req.headers['content-length'])>limit){req.resume();throw reject(message,413);}
  const chunks=[];let size=0;
  for await(const chunk of req.iterator({destroyOnReturn:false})){
    const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=buffer.length;
    if(size>limit){req.resume();throw reject(message,413);}
    chunks.push(buffer);
  }
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{throw reject('Invalid JSON request',400);}
};
