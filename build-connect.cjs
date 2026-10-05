const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { build } = require('esbuild');

async function buildConnect() {
  const root = __dirname;
  const output = path.join(root, 'assets', 'ui');
  fs.mkdirSync(output, { recursive: true });
  const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist', 'index.mjs');
  execFileSync(process.execPath, [cli, '-i', 'styles/connect-page.css', '-o', 'assets/ui/connect-page.css', '--minify'], { cwd: root, stdio: 'inherit' });
  await build({
    absWorkingDir: root, entryPoints: ['components/connect-page.tsx'],
    outfile: path.join(output, 'connect-page.js'), bundle: true, minify: true,
    format: 'esm', platform: 'browser', target: ['es2020'], jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof',
  });
  console.log('Connect page compiled.');
}
module.exports = buildConnect;
if (require.main === module) buildConnect().catch(error => { console.error(error); process.exitCode = 1; });
