// Optional asset refresh. The normal site build uses these checked-in fonts offline.
const fs = require('node:fs/promises');
const path = require('node:path');
const families = [
  ['Libre Caslon Text:ital,wght@0,400;0,700;1,400', 'Libre Caslon Text', 'librecaslontext'],
  ['Oswald:wght@400;500;600', 'Oswald', 'oswald'],
  ['Michroma', 'Michroma', 'michroma'],
  ['Cinzel:wght@400;700', 'Cinzel', 'cinzel'],
  ['Yellowtail', 'Yellowtail', 'yellowtail'],
  ['Pinyon Script', 'Pinyon Script', 'pinyonscript'],
  ['Permanent Marker', 'Permanent Marker', 'permanentmarker'],
  ['Jost:wght@400;500', 'Jost', 'jost'],
  ['Metal Mania', 'Metal Mania', 'metalmania'],
];
async function get(url) {
  const response = await fetch(url, { headers: { 'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' } });
  if (!response.ok) throw new Error(`Font download failed (${response.status}): ${url}`);
  return response;
}
async function refreshMusicFonts() {
  const output = path.join(__dirname, 'assets', 'fonts', 'music');
  await fs.mkdir(output, { recursive: true });
  const blocks = [];
  for (const [query, family, folder] of families) {
    const css = await (await get(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(query)}&display=swap`)).text();
    const latin = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g)].map(match => match[1]);
    if (!latin.length) throw new Error('Missing Latin font subset: ' + family);
    for (const block of latin) {
      const source = block.match(/url\(([^)]+)\)/)[1];
      const weight = block.match(/font-weight:\s*([^;]+)/)[1].replace(/\s/g, '-');
      const style = block.match(/font-style:\s*([^;]+)/)[1];
      const filename = `${folder}-${style}-${weight}-latin.woff2`;
      await fs.writeFile(path.join(output, filename), Buffer.from(await (await get(source)).arrayBuffer()));
      blocks.push(block.replace(source, filename));
    }
    let license;
    for (const location of [`ofl/${folder}/OFL.txt`, `apache/${folder}/LICENSE.txt`]) {
      try { license = await (await get('https://raw.githubusercontent.com/google/fonts/main/' + location)).text(); break; } catch {}
    }
    if (!license) throw new Error('Missing font license: ' + family);
    await fs.writeFile(path.join(output, `${folder}-LICENSE.txt`), license);
    console.log('Self-hosted ' + family + ' (' + latin.length + ' faces).');
  }
  await fs.writeFile(path.join(output, 'fonts.css'),
    '/* Latin subsets from Google Fonts; original licenses accompany each family. */\n' + blocks.join('\n'));
}
if (require.main === module) refreshMusicFonts().catch(error => { console.error(error); process.exitCode = 1; });
