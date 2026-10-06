const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { build } = require('esbuild');

async function buildSkillsIcons() {
  const root = __dirname;
  const output = path.join(root, 'assets', 'ui');
  fs.mkdirSync(output, { recursive: true });
  const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist', 'index.mjs');
  execFileSync(process.execPath, [cli, '-i', 'styles/skills-icons.css', '-o', 'assets/ui/skills-icons.css', '--minify'], { cwd: root, stdio: 'inherit' });
  await build({
    absWorkingDir: root, entryPoints: ['components/skills-icons.tsx'],
    outfile: path.join(output, 'skills-icons.js'), bundle: true, minify: true,
    format: 'esm', platform: 'browser', target: ['es2020'], jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof',
  });
  console.log('Skills icons compiled.');
}
module.exports = buildSkillsIcons;
if (require.main === module) buildSkillsIcons().catch(error => { console.error(error); process.exitCode = 1; });
