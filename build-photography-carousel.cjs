const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { build } = require('esbuild');

async function buildPhotographyCarousel() {
  await require('./build-photography-hero.cjs')();
  const root = __dirname;
  const output = path.join(root, 'assets', 'ui');
  fs.mkdirSync(output, { recursive: true });
  const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist', 'index.mjs');
  execFileSync(process.execPath, [cli,
    '-i', 'styles/photography-carousel.css', '-o', 'assets/ui/photography-carousel.css', '--minify'
  ], { cwd: root, stdio: 'inherit' });
  await build({
    absWorkingDir: root,
    entryPoints: ['components/photography-overlay.tsx'],
    outfile: path.join(output, 'photography-carousel.js'),
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'eof'
  });
  console.log('Photography carousel compiled.');
}

module.exports = buildPhotographyCarousel;
if (require.main === module) buildPhotographyCarousel().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
