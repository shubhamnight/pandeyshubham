const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { createElement, Fragment } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Only the original section's inline breaks and emphasis are accepted here.
function inlineContent(html) {
  return html.split(/(<br\s*\/?>|<em>.*?<\/em>)/g).filter(Boolean).map((part, index) => {
    if (/^<br/.test(part)) return createElement('br', { key: index });
    if (part.startsWith('<em>')) return createElement('em', { key: index }, part.slice(4, -5));
    if (part.includes('<')) throw new Error('Unsupported skills heading markup');
    return part;
  });
}

function renderSkills() {
  const source = fs.readFileSync(path.join(__dirname, 'sections/skills.html'), 'utf8');
  const title = source.match(/<h2 id="skills-heading">([\s\S]*?)<\/h2>/)?.[1];
  const description = source.match(/<\/h2><\/div><p>([\s\S]*?)<\/p>/)?.[1];
  const logos = [...source.matchAll(/aria-label="([^"]+)"><span class="skills-orbit-symbol"[^>]*><img class="skill-logo" src="([^"]+)"/g)]
    .map(([, name, src]) => ({ name, src }));
  if (!title || !description || logos.length !== 14) throw new Error('Skills source must contain its heading, description, and fourteen logos');
  const result = buildSync({
    entryPoints: [path.resolve(__dirname, '../../components/ui/marquee-logo-scroller.tsx')],
    bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external', write: false,
  });
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, compiled, compiled.exports);
  return renderToStaticMarkup(createElement(compiled.exports.MarqueeLogoScroller, {
    title: createElement(Fragment, null, ...inlineContent(title)),
    description: createElement(Fragment, null, ...inlineContent(description)), logos,
  }));
}

module.exports = { renderSkills };
