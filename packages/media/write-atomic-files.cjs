// Publish complete bundles without truncating a file the Windows preview is reading.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = async function writeBuildFiles(files) {
  for (const file of files) {
    const temporary = path.join(path.dirname(file.path), '.' + path.basename(file.path) + '-' + randomUUID() + '.tmp');
    try {
      await fs.writeFile(temporary, file.contents);
      for (let attempt = 0; ; attempt++) {
        try { await fs.rename(temporary, file.path); break; }
        catch (error) {
          if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 5) throw error;
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    } finally { await fs.unlink(temporary).catch(() => {}); }
  }
};
