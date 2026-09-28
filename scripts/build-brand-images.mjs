// build-brand-images.mjs: makes the small picture files the site needs, all from our own artwork.
//
// What this makes, in plain words:
//   - public/favicon.svg and public/favicon.ico: the tiny griffin icon in the browser tab.
//   - public/apple-touch-icon.png: the icon a phone uses if someone saves the site to their
//     home screen.
//   - public/og.png: the 1200 x 630 "share image" that appears when someone pastes the site's
//     link into a chat, email or social post (OG stands for "Open Graph", the standard for this).
//   - src/assets/texture/grain.png: a 256 x 256 square of fine noise. The paper and ink
//     sections tile it very faintly so the flat colors feel like printed paper.
//
// Where the artwork comes from:
//   - The Pomfret griffin: src/assets/brand/griffin.svg (official school artwork, see README).
//   - The CIVIC wordmark: src/assets/brand/wordmark.svg (made by scripts/build-wordmark.mjs).
//   - Text on the share image is traced from the Host Grotesk and Martian Mono font files in
//     node_modules, so the image looks the same on every computer that runs this script.
//
// The pictures are drawn as SVG (a text description of shapes) and then turned into PNG files
// by "sharp", an image tool that Astro already installs. Run with: npm run brand

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { toPathData } from './lib/path-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (p) => resolve(root, p);

// The club palette (the same colors as src/styles/tokens.css).
const INK = '#0D0D0C';
const PAPER = '#F4F3EF';
const PAPER_2 = '#9A9893';

// Read a font file from node_modules and hand it to opentype.js, which can trace its letters.
function loadFont(file) {
  const bytes = readFileSync(at(file));
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const hostLight = loadFont('node_modules/@fontsource/host-grotesk/files/host-grotesk-latin-300-normal.woff');
const hostRegular = loadFont('node_modules/@fontsource/host-grotesk/files/host-grotesk-latin-400-normal.woff');
const mono = loadFont('node_modules/@fontsource/martian-mono/files/martian-mono-latin-400-normal.woff');

// Trace a line of text into one SVG path, starting at (x, y) where y is the baseline.
// "tracking" is extra space between letters as a share of the font size (0.04 = 4%).
// It gives back the path's drawing instructions and how wide the line turned out.
function textPath(font, text, x, y, size, tracking = 0) {
  let penX = x;
  let d = '';
  const glyphs = font.stringToGlyphs(text);
  glyphs.forEach((glyph, i) => {
    d += toPathData(glyph.getPath(penX, y, size), 2);
    const next = glyphs[i + 1];
    const kern = next ? font.getKerningValue(glyph, next) : 0;
    penX += ((glyph.advanceWidth + kern) / font.unitsPerEm) * size + (next ? tracking * size : 0);
  });
  return { d, width: penX - x };
}

// Pull the <path d="..."> drawing instructions and the viewBox out of one of our SVG files,
// so we can place that artwork inside a bigger picture at any size.
function readSvgArt(file) {
  const svg = readFileSync(at(file), 'utf8');
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  return { viewBox, paths };
}
const griffin = readSvgArt('src/assets/brand/griffin.svg');
const wordmark = readSvgArt('src/assets/brand/wordmark.svg');

// Place a piece of artwork so it fits a box: left edge at x, top at y, a set width.
// It gives back SVG markup (a group of paths moved and scaled into place) and the final height.
function place(art, x, y, width, fill) {
  const [vx, vy, vw, vh] = art.viewBox;
  const scale = width / vw;
  const markup = `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-vx} ${-vy})" fill="${fill}">${art.paths
    .map((d) => `<path d="${d}"/>`)
    .join('')}</g>`;
  return { markup, height: vh * scale };
}

// ---- The share image (1200 x 630) --------------------------------------------------------------
// Layout, like the site's hero: griffin and the two-line name at the top left, the mission line
// at the top right, and the huge CIVIC across the bottom with "AI CLUB" under the last C.
function buildOgSvg() {
  const W = 1200;
  const H = 630;
  const margin = 56;

  // The griffin, 58px wide, and the name beside it in two short lines.
  const mark = place(griffin, margin, margin, 58, PAPER);
  const name = textPath(hostRegular, 'Civic AI Club', margin + 76, margin + 20, 20);
  const school = textPath(hostRegular, 'Pomfret School', margin + 76, margin + 44, 20);

  // The mission line, right-aligned in two lines of light type.
  const lines = ['Built at Pomfret for people', 'down the hall and down the road.'];
  const mission = lines.map((line, i) => {
    const probe = textPath(hostLight, line, 0, 0, 26);
    return textPath(hostLight, line, W - margin - probe.width, margin + 22 + i * 30, 26);
  });

  // The CIVIC wordmark from margin to margin, sitting above the small "AI CLUB" line.
  const wordWidth = W - margin * 2;
  const wordTop = H - margin - 30 - (wordmark.viewBox[3] * wordWidth) / wordmark.viewBox[2];
  const civic = place(wordmark, margin, wordTop, wordWidth, PAPER);
  const lockupProbe = textPath(mono, 'AI CLUB', 0, 0, 15, 0.04);
  const lockup = textPath(mono, 'AI CLUB', W - margin - lockupProbe.width, H - margin, 15, 0.04);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  ${mark.markup}
  <path d="${name.d}" fill="${PAPER}"/>
  <path d="${school.d}" fill="${PAPER_2}"/>
  ${mission.map((m) => `<path d="${m.d}" fill="${PAPER}"/>`).join('\n  ')}
  ${civic.markup}
  <path d="${lockup.d}" fill="${PAPER}"/>
</svg>`;
}

// ---- The favicon (a paper griffin on an ink square) ------------------------------------------
// The griffin is wider than it is tall, so we center it with a little room on every side.
function buildFaviconSvg(size = 64) {
  const pad = size * 0.1;
  const width = size - pad * 2;
  const [, , vw, vh] = griffin.viewBox;
  const height = (vh * width) / vw;
  const mark = place(griffin, pad, (size - height) / 2, width, PAPER);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${INK}"/>${mark.markup}</svg>`;
}

// Wrap a PNG picture inside an .ico file. Old browsers still ask for /favicon.ico, and the
// .ico format allows a PNG inside, so we only need to add a small header in front of it.
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved, always 0
  header.writeUInt16LE(1, 2); // 1 means "this is an icon"
  header.writeUInt16LE(1, 4); // it holds one picture
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // no color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // how many bytes the picture takes
  entry.writeUInt32LE(6 + 16, 12); // where the picture starts in the file
  return Buffer.concat([header, entry, png]);
}

// ---- The grain texture ------------------------------------------------------------------------
// A 256 x 256 square where every pixel is randomly black or white. On its own it looks like TV
// static; the CSS lays it over sections at 3 to 5% strength, which reads as paper texture.
// Two colors only keeps the file small (a few kilobytes). We use a fixed "seed" (starting
// number) for the randomness so the file comes out the same every time the script runs.
function buildGrainRaw(size = 256) {
  let seed = 1894; // the year of the first moment on Pomfret Voices' timeline
  const random = () => {
    // A tiny, well-known random number recipe ("mulberry32"): same seed, same sequence.
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pixels = Buffer.alloc(size * size);
  for (let i = 0; i < pixels.length; i++) pixels[i] = random() < 0.5 ? 0 : 255;
  return pixels;
}

// ---- Write every file --------------------------------------------------------------------------
async function main() {
  mkdirSync(at('public'), { recursive: true });
  mkdirSync(at('src/assets/texture'), { recursive: true });

  // Share image: draw the SVG, then turn it into a PNG with a reduced color palette to keep it small.
  const og = await sharp(Buffer.from(buildOgSvg())).png({ compressionLevel: 9, palette: true, colours: 64 }).toBuffer();
  writeFileSync(at('public/og.png'), og);

  // Favicons: the SVG file is used by modern browsers; the .ico and the 180px PNG for the rest.
  writeFileSync(at('public/favicon.svg'), buildFaviconSvg(64) + '\n');
  const fav32 = await sharp(Buffer.from(buildFaviconSvg(32))).png().toBuffer();
  writeFileSync(at('public/favicon.ico'), pngToIco(fav32, 32));
  const touch = await sharp(Buffer.from(buildFaviconSvg(180))).png().toBuffer();
  writeFileSync(at('public/apple-touch-icon.png'), touch);

  // Grain: one grey channel, then saved as a 2-color PNG.
  const grain = await sharp(buildGrainRaw(256), { raw: { width: 256, height: 256, channels: 1 } })
    .png({ compressionLevel: 9, palette: true, colours: 2 })
    .toBuffer();
  writeFileSync(at('src/assets/texture/grain.png'), grain);

  // Report the sizes so it is easy to check them against the budgets in the README.
  const kb = (b) => `${(b.length / 1024).toFixed(1)} KB`;
  console.log(`og.png ${kb(og)} · favicon.ico ${kb(pngToIco(fav32, 32))} · apple-touch-icon.png ${kb(touch)} · grain.png ${kb(grain)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
