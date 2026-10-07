const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');
const { execFileSync } = require('node:child_process');
const { build } = require('esbuild');

const hex = rgb => '#' + rgb.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
async function artworkPalette(file) {
  const { data } = await sharp(file).resize(48, 48, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    let bin = bins.get(key);
    if (!bin) bins.set(key, bin = { count: 0, rgb: [0, 0, 0] });
    bin.count++; bin.rgb[0] += r; bin.rgb[1] += g; bin.rgb[2] += b;
  }
  let chosen = null, score = -1;
  for (const bin of bins.values()) {
    const rgb = bin.rgb.map(value => value / bin.count), max = Math.max(...rgb), min = Math.min(...rgb);
    if (max < 32 || min > 238) continue;
    const saturation = max ? (max - min) / max : 0;
    const weight = bin.count * (.3 + saturation * saturation * 2) * (.4 + max / 255);
    if (weight > score) { score = weight; chosen = rgb; }
  }
  if (!chosen) chosen = [36, 38, 42];
  return { accent: hex(chosen), background: hex(chosen.map((value, index) =>
    Math.min(110, value * .5 + [12, 13, 16][index] * .5))) };
}

async function buildMusicOverlay() {
  const root = __dirname, output = path.join(root, 'assets', 'ui');
  fs.mkdirSync(output, { recursive: true });
  const source = fs.readFileSync(path.join(root, 'music-data.js'), 'utf8');
  const songs = JSON.parse(source.slice(source.indexOf('['), source.lastIndexOf(']') + 1));
  const highlights = new Map(JSON.parse(fs.readFileSync(path.join(root, 'music-highlights.json'), 'utf8')).map(item => [item.title, item]));
  const typography = new Map(JSON.parse(fs.readFileSync(path.join(root, 'music-typography.json'), 'utf8')).map(item => [item.title, item]));
  const cards = await Promise.all(songs.map(async song => {
    const highlight = highlights.get(song.title);
    const titleStyle = typography.get(song.title);
    if (!titleStyle) throw new Error('Missing title typography: ' + song.title);
    if (!highlight) throw new Error('Missing song highlight: ' + song.title);
    // Keep each sourced lyric excerpt brief, including across line breaks.
    if (highlight.lyric.trim().split(/\s+/).length > 10) throw new Error('Lyric excerpt exceeds ten words: ' + song.title);
    if (highlight.lyric.split('\n').filter(line => line.trim()).length < 2) throw new Error('Song needs a two-line excerpt: ' + song.title);
    return { ...song, ...highlight, singer: highlight.singer || song.artist,
      typography: titleStyle.typography,
      creditSource: highlight.creditSource || song.sourcePage,
      ...await artworkPalette(path.join(root, song.fullSrc)) };
  }));
  fs.writeFileSync(path.join(root, 'music-overlay-data.js'),
    '// Song excerpts and source links: music-highlights.json. Colors sampled from the local album artwork.\nexport const musicCards = ' + JSON.stringify(cards, null, 2) + ';\n');
  fs.writeFileSync(path.join(root, 'music-title-data.js'),
    '// Generated from the same typography metadata as the overlay.\nexport const musicTitleStyles = ' +
    JSON.stringify(Object.fromEntries(cards.map(song => [song.title, song.typography])), null, 2) + ';\n');
  // Keep research links reviewable without duplicating lyric excerpts.
  fs.writeFileSync(path.join(root, 'components', 'music-sources.md'),
    '# Music overlay sources\n\nResearched on 7 October 2026. Brief excerpts are stored in music-highlights.json.\nCard colors are sampled from the existing local album covers; no new stock images are used.\n\n' +
    '| Song | Credits / artwork | Lyric source |\n| --- | --- | --- |\n' +
    cards.map(song => `| ${song.title} | [Credits](${song.creditSource}), [Artwork](${song.sourcePage}) | [Excerpt source](${song.lyricSource}) |`).join('\n') +
    '\n\n## Title typography\n\nTitles interpret their release artwork/campaign lettering using locally hosted open fonts. These are style matches, not claims that the original commercial fonts or custom lettering are installed. Original artwork remains visible on the record.\n\n| Song | Reference and local treatment | Reference |\n| --- | --- | --- |\n' +
    cards.map(song => { const style = typography.get(song.title); return `| ${song.title} | ${style.reference} | [Reference](${style.source || song.sourcePage}) |`; }).join('\n') +
    '\n\nFont files and licenses: assets/fonts/music/. [Google Fonts source](https://github.com/google/fonts). Refresh only when needed with node build-music-fonts.cjs; normal builds never fetch fonts.\n');
  const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist', 'index.mjs');
  execFileSync(process.execPath, [cli, '-i', 'styles/music-overlay.css',
    '-o', 'assets/ui/music-overlay.css', '--minify'], { cwd: root, stdio: 'inherit' });
  await build({ absWorkingDir: root, entryPoints: ['components/music-overlay.tsx'],
    outfile: path.join(output, 'music-overlay.js'), bundle: true, minify: true,
    format: 'esm', platform: 'browser', target: ['es2020'], jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof' });
  console.log('Music stacking cards compiled for ' + cards.length + ' songs.');
}
module.exports = buildMusicOverlay;
if (require.main === module) buildMusicOverlay().catch(error => { console.error(error); process.exitCode = 1; });
