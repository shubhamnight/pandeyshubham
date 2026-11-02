const { buildUI } = require('./lib/build-ui.cjs');

async function buildTravelOverlay() {
  await buildUI('travel-overlay', 'components/travel-overlay.tsx');
  console.log('Travel zoom slider compiled.');
}
module.exports = buildTravelOverlay;
if (require.main === module) buildTravelOverlay().catch(error => { console.error(error); process.exitCode = 1; });
