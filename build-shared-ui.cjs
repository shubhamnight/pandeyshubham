// Keep the same lazy entry URLs while sharing their runtime dependencies.
const path = require('node:path');
const fs = require('node:fs/promises');
const { build } = require('esbuild');
const writeBuildFiles = require('./lib/write-build-files.cjs');

async function buildSharedUI() {
  const entryPoints={
    'photography-carousel': 'components/photography-overlay.tsx',
    'connect-page': 'components/connect-page.tsx',
    'gaming-overlay': 'components/gaming-overlay.tsx',
    'travel-overlay': 'components/travel-overlay.tsx',
    'music-overlay': 'components/music-overlay.tsx',
    'skills-icons': 'components/skills-icons.tsx',
  };
  const result = await build({
    absWorkingDir: __dirname,
    entryPoints,
    outdir: path.join(__dirname, 'assets/ui'),
    chunkNames: 'chunks/shared-[hash]',
    bundle: true, splitting: true, minify: true,
    format: 'esm', platform: 'browser', target: ['es2020'], jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'eof', write: false,
  });
  // Publish dependencies first so a live preview never sees an entry pointing
  // to a chunk that is still being written. Existing hashed chunks stay usable.
  const chunks = result.outputFiles.filter(file => path.dirname(file.path).endsWith(path.sep + 'chunks'));
  const entries = result.outputFiles.filter(file => !chunks.includes(file));
  await fs.mkdir(path.join(__dirname, 'assets/ui/chunks'), { recursive: true });
  await writeBuildFiles([...chunks, ...entries]);
  const recovery=await build({
    absWorkingDir:__dirname,
    entryPoints:Object.fromEntries(Object.entries(entryPoints).filter(([name])=>name!=='connect-page')
      .map(([name,file])=>[name+'-recovery',file])),
    outdir:path.join(__dirname,'assets/ui'),bundle:true,splitting:false,minify:true,
    format:'esm',platform:'browser',target:['es2020'],jsx:'automatic',
    define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof',write:false,
  });
  await writeBuildFiles(recovery.outputFiles);
  console.log(`Shared UI compiled: ${entries.length} lazy entries, ${chunks.length} shared chunks.`);
}

module.exports = buildSharedUI;
if (require.main === module) buildSharedUI().catch(error => { console.error(error); process.exitCode = 1; });
