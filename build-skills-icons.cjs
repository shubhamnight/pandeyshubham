const { buildUI } = require('./lib/build-ui.cjs');

async function buildSkillsIcons() {
  await buildUI('skills-icons', 'components/skills-icons.tsx');
  console.log('Skills icons compiled.');
}
module.exports = buildSkillsIcons;
if (require.main === module) buildSkillsIcons().catch(error => { console.error(error); process.exitCode = 1; });
