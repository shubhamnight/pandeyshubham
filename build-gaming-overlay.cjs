const { buildUI } = require('./lib/build-ui.cjs');

async function buildGamingOverlay() {
  await buildUI('gaming-overlay', 'components/gaming-overlay.tsx');
  console.log('Gaming overlay compiled.');
}
module.exports = buildGamingOverlay;
if (require.main === module) buildGamingOverlay().catch(error => { console.error(error); process.exitCode = 1; });
