const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { build } = require('esbuild');
const writeBuildFiles = require('./write-build-files.cjs');
const root = path.resolve(__dirname, '..');
const browserOptions = {
  bundle: true, minify: true, format: 'esm', platform: 'browser',
  target: ['es2020'], jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof', write: false,
};

async function buildUI(name, entry) {
  const output = path.join(root, 'assets/ui');
  fs.mkdirSync(output, { recursive: true });
  const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
  execFileSync(process.execPath, [cli, '-i', `styles/${name}.css`,
    '-o', `assets/ui/${name}.css`, '--minify'], { cwd: root, stdio: 'inherit' });
  const result = await build({ ...browserOptions, absWorkingDir: root,
    entryPoints: [entry], outfile: path.join(output, name + '.js') });
  await writeBuildFiles(result.outputFiles);
}

module.exports = { buildUI, browserOptions };
