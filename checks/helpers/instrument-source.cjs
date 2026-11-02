// White-box diagnostics use the matching readable source, not renamed bundle locals.
// Separate black-box interaction tests still exercise the untouched production scripts.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=(file,decorate)=>async route=>{
 const source=await fs.readFile(path.resolve(__dirname,'../..',file),'utf8'),body=decorate(source);
 assert.notEqual(body,source,'Diagnostic marker must exist in '+file);
 return route.fulfill({contentType:'text/javascript',body});
};
