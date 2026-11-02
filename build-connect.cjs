const { buildUI } = require('./lib/build-ui.cjs');

async function buildConnect() {
  await buildUI('connect-page', 'components/connect-page.tsx');
  console.log('Connect page compiled.');
}
module.exports = buildConnect;
if (require.main === module) buildConnect().catch(error => { console.error(error); process.exitCode = 1; });
