const { buildUI } = require('./lib/build-ui.cjs');

async function buildPhotographyCarousel() {
  await require('./build-photography-hero.cjs')();
  await buildUI('photography-carousel', 'components/photography-overlay.tsx');
  console.log('Photography carousel compiled.');
}
module.exports = buildPhotographyCarousel;
if (require.main === module) buildPhotographyCarousel().catch(error => { console.error(error); process.exitCode = 1; });
