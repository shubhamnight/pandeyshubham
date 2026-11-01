// The optional read-only share uses the same current package as production.
// This prepares files only; it never publishes or changes a hosted site.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const buildVercel = require('./build-vercel.cjs');

function buildShare({ identity, outputRoot, build = buildVercel } = {}) {
  const root = fs.realpathSync(__dirname);
  const checkout = path.resolve(outputRoot || path.join(root, 'output', 'share-site'));
  assert.ok(checkout.startsWith(root + path.sep), 'Share output must stay inside the workspace.');
  // Verify every existing parent before replacing generated output on Windows.
  let parent = root;
  for (const part of path.relative(root, checkout).split(path.sep)) {
    parent = path.join(parent, part);
    assert.ok(!fs.lstatSync(parent, { throwIfNoEntry: false })?.isSymbolicLink(), 'Share output cannot use linked directories.');
  }
  identity ||= JSON.parse(fs.readFileSync(path.join(root, '.openai', 'hosting.json'), 'utf8'));
  assert.ok(identity.project_id, 'The optional share workflow needs its owner project ID.');
  const production = build();
  fs.mkdirSync(checkout, { recursive: true });
  assert.equal(fs.realpathSync(checkout), checkout);
  const dist = path.join(checkout, 'dist');
  assert.ok(!fs.lstatSync(dist, { throwIfNoEntry: false })?.isSymbolicLink(), 'Share dist cannot be linked.');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.cpSync(production, dist, { recursive: true });
  fs.mkdirSync(path.join(checkout, '.openai'), { recursive: true });
  fs.writeFileSync(path.join(checkout, '.openai', 'hosting.json'), JSON.stringify({
    project_id: identity.project_id,
    static: { directory: 'dist', not_found_handling: 'none' },
  }, null, 2));
  fs.writeFileSync(path.join(checkout, '.gitignore'), '.sites-runtime/\n');
  console.log('Shareable portfolio snapshot: ' + checkout);
  return dist;
}
module.exports = buildShare;
if (require.main === module) buildShare();
