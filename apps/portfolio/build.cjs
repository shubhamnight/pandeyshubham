const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
require('./compose.cjs').writePage();
for (const step of [
  'build-site-assets', 'build-seo',
  'build-photography-carousel', 'build-connect', 'build-gaming-overlay',
  'build-travel-overlay', 'build-music-overlay',
  'build-shared-ui', 'build-offline', 'build-vercel',
]) {
  const result = spawnSync(process.execPath, [step + '.cjs'], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
