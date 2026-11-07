const path = require('node:path');
const { buildSync } = require('esbuild');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function renderComponent(file, name, props) {
  const result = buildSync({
    entryPoints: [path.resolve(__dirname, '../../components', file)],
    bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external', write: false,
  });
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, compiled, compiled.exports);
  return renderToStaticMarkup(createElement(compiled.exports[name], props));
}

module.exports = { renderComponent };
