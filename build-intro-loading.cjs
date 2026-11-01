// Generate the first-paint fallback from the same React component. The loading
// screen remains available even while its optional React runtime is downloading.
const fs=require('node:fs');
const path=require('node:path');
const {buildSync}=require('esbuild');
const {createElement}=require('react');
const {renderToString}=require('react-dom/server');
const root=__dirname;
const compiled=buildSync({absWorkingDir:root,entryPoints:['components/message-loading.tsx'],bundle:true,packages:'external',platform:'node',format:'cjs',jsx:'automatic',target:'es2020',write:false}).outputFiles[0].text;
const component={exports:{}};
new Function('module','exports','require',compiled)(component,component.exports,require);
const markup=renderToString(createElement(component.exports.IntroLoading),{identifierPrefix:'intro-'});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const marker=/<!-- INTRO-LOADER:START -->[\s\S]*?<!-- INTRO-LOADER:END -->/;
if(!marker.test(html))throw new Error('Intro loading markup markers are missing.');
fs.writeFileSync(path.join(root,'index.html'),html.replace(marker,`<!-- INTRO-LOADER:START -->${markup}<!-- INTRO-LOADER:END -->`));
console.log('GooeyLoader first-paint markup prepared.');
