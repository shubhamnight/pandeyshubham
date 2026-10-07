const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { build } = require('esbuild');

async function buildTravelOverlay() {
  const root = __dirname, output = path.join(root, 'assets', 'ui');
  fs.mkdirSync(output, { recursive: true });
  const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist', 'index.mjs');
  execFileSync(process.execPath, [cli, '-i', 'styles/travel-overlay.css',
    '-o', 'assets/ui/travel-overlay.css', '--minify'], { cwd: root, stdio: 'inherit' });
  await build({ absWorkingDir: root, entryPoints: ['components/travel-overlay.tsx'],
    outfile: path.join(output, 'travel-overlay.js'), bundle: true, minify: true,
    format: 'esm', platform: 'browser', target: ['es2020'], jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof' });
  console.log('Travel zoom slider compiled.');
}
module.exports = buildTravelOverlay;
if (require.main === module) buildTravelOverlay().catch(error => { console.error(error); process.exitCode = 1; });
