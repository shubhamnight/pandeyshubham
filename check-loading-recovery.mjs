import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync('module-loader.js','utf8').replace('export function','function').replaceAll('import(url.href)','fetchModule(url.href)');
const loader=fetchModule=>new Function('document','fetchModule',code+'\nreturn importPortfolioModule;')({baseURI:'https://example.test/'},fetchModule);
let calls=[];
const recovered=loader(async url=>{calls.push(url);if(calls.length===1)throw new TypeError('Failed to fetch dynamically imported module');return {ready:true};});
const first=recovered('./gallery.js');assert.equal(first,recovered('./gallery.js'),'deduplicate concurrent requests');
assert.deepEqual(await first,{ready:true});assert.equal(calls.length,2);assert.notEqual(calls[0],calls[1]);
await recovered('./gallery.js');assert.equal(calls.length,2,'successful imports stay cached');
for(const error of [new SyntaxError('Unexpected token'),new TypeError('Cannot read properties of undefined')]){
 let count=0;const broken=loader(async()=>{count++;throw error;});
 await assert.rejects(broken('./broken.js'),error);assert.equal(count,1,'do not re-execute code that threw');
}
calls=[];let online=false;
const retryLater=loader(async url=>{calls.push(url);if(!online)throw new TypeError('error loading dynamically imported module');return {online:true};});
await assert.rejects(retryLater('./offline.js'));assert.equal(calls.length,2);
online=true;assert.deepEqual(await retryLater('./offline.js'),{online:true});assert.equal(new Set(calls).size,calls.length,'explicit retry avoids the failed module-map URLs');
calls=[];
const shared=loader(async url=>{calls.push(url);if(!url.endsWith('-recovery.js'))throw new TypeError('Failed to fetch dynamically imported module');return {component:true};});
assert.deepEqual(await shared('/assets/ui/skills-icons.js'),{component:true});
assert.equal(calls.length,3);assert.ok(calls.at(-1).endsWith('/assets/ui/skills-icons-recovery.js'));
calls=[];online=false;
const sharedLater=loader(async url=>{
 calls.push(url);
 if(!online||!new URL(url).pathname.endsWith('-recovery.js'))throw new TypeError('Failed to fetch dynamically imported module');
 return {reconnected:true};
});
await assert.rejects(sharedLater('/assets/ui/music-overlay.js'));assert.equal(calls.length,3);
online=true;assert.deepEqual(await sharedLater('/assets/ui/music-overlay.js'),{reconnected:true});
assert.equal(new Set(calls).size,calls.length,'later recovery avoids both failed entry and backup URLs');
console.log('Module recovery: bounded fetch retry, fresh URLs, deduplication, execution-error isolation and later recovery passed.');
