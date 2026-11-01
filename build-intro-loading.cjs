// Generate the first-paint fallback from the same React component. The loading
// screen remains available even while its optional React runtime is downloading.
const fs=require('node:fs');
const path=require('node:path');
const {transformSync}=require('esbuild');
const {createElement}=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root=__dirname;
const source=fs.readFileSync(path.join(root,'components/ui/message-loading.tsx'),'utf8');
const compiled=transformSync(source,{loader:'tsx',format:'cjs',jsx:'automatic',target:'es2020'}).code;
const component={exports:{}};
new Function('module','exports','require',compiled)(component,component.exports,require);
const svg=renderToStaticMarkup(createElement(component.exports.MessageLoading));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const marker=/<!-- INTRO-LOADER:START -->[\s\S]*?<!-- INTRO-LOADER:END -->/;
if(!marker.test(html))throw new Error('Intro loading markup markers are missing.');
fs.writeFileSync(path.join(root,'index.html'),html.replace(marker,`<!-- INTRO-LOADER:START -->${svg}<!-- INTRO-LOADER:END -->`));
console.log('MessageLoading first-paint markup prepared.');
