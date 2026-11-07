const fs = require('node:fs');
const path = require('node:path');
const { renderSkills } = require('./render-skills.cjs');
const { renderComponent } = require('./render-component.cjs');

function composePage() {
  const shell = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');
  let iconInstance = 0;
  return shell.replace(/<!-- section:([a-z-]+) -->/g, (_, name) =>
    name === 'skills' ? renderSkills() : fs.readFileSync(path.join(__dirname, 'sections', name + '.html'), 'utf8').trimEnd()
  ).replace('<!-- loading-waves -->', () => renderComponent('message-loading.tsx', 'IntroLoading'))
  .replace(/<img class="skill-logo" src="assets\/skills\/([\w-]+)\.svg"[^>]*>/g, (_, icon) => {
    const prefix = `skill-${++iconInstance}-`;
    return fs.readFileSync(path.resolve(__dirname, '../../assets/skills', icon + '.svg'), 'utf8')
      .replace(/\bid=(["'])([^"']+)\1/g, (_, quote, id) => `id=${quote}${prefix}${id}${quote}`)
      .replace(/url\(\s*(["']?)#([^\s)"']+)\1\s*\)/g, (_, quote, id) => `url(${quote}#${prefix}${id}${quote})`)
      .replace(/\b((?:xlink:)?href)=(["'])#([^"']+)\2/g, (_, attr, quote, id) => `${attr}=${quote}#${prefix}${id}${quote}`)
      .trim().replace(/<svg\b/, '<svg class="skill-logo" aria-hidden="true" focusable="false"')
  });
}

function writePage() {
  const index = path.resolve(__dirname, '../../index.html');
  fs.writeFileSync(index, composePage());
}

module.exports = { composePage, writePage };
if (require.main === module) writePage();
