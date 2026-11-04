const fs = require('node:fs');
const path = require('node:path');

function composePage() {
  const shell = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');
  return shell.replace(/<!-- section:([a-z-]+) -->/g, (_, name) =>
    fs.readFileSync(path.join(__dirname, 'sections', name + '.html'), 'utf8').trimEnd()
  );
}

function writePage() {
  const index = path.resolve(__dirname, '../../index.html');
  fs.writeFileSync(index, composePage());
}

module.exports = { composePage, writePage };
if (require.main === module) writePage();
