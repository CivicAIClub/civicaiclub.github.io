// build-docket-letters.mjs: traces the case letters A to E (and a "?") for the home page's docket.
//
// What this does, in plain words:
// On the home page, each case is shown as a giant letter (A, B, C, D, E) cut out of a black
// sheet, with a video of that case's tool playing through the hole. To cut a letter-shaped hole,
// the page needs the letter's outline as an SVG "path" (drawing instructions: move here, curve
// to there), not as ordinary text. This script traces each letter once from the Host Grotesk
// Bold (weight 700) font, the same way scripts/build-wordmark.mjs traces CIVIC.
// Why Bold when every word on the site is Light: the letters are windows onto the footage, and
// Bold strokes are almost twice as wide, so about 1.7 times more of each clip shows through.
// (Weight 800 was tried too: it closes the hole in the A and the opening of the C.)
// The "?" is for the 404 page ("No case filed here."), which draws it as an empty outline.
//
// It also finds, for each letter, the point that sits deepest inside one of its strokes (the
// middle of the thickest part of the line). When someone clicks a letter, the page zooms
// through the hole around that point until the video fills the screen; zooming around a point
// inside the stroke is what makes the hole, not the black sheet, grow over the screen.
//
// Where the information comes from: the Host Grotesk Bold font file in node_modules (free under
// the OFL license, which allows turning letters into outlines).
// Where it goes: src/components/home/docket-letters.json, read by
// src/components/home/Docket.astro and src/scripts/motion/modules/home-docket.js (the home
// docket), src/components/case/NextCase.astro (the "Next case" band at the bottom of a case page)
// and the 404 page. Keep the file's shape the same: { _note, capHeight, letters: { A: { d, ... } } }.
//
// Run it with: node scripts/build-docket-letters.mjs   (only needed if the font or letters change)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { toPathData } from './lib/path-data.mjs';

// Work out where the project folder is, so the script works from any folder you run it in.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_FILE = resolve(root, 'node_modules/@fontsource/host-grotesk/files/host-grotesk-latin-700-normal.woff');
const OUT_FILE = resolve(root, 'src/components/home/docket-letters.json');
const LETTERS = ['A', 'B', 'C', 'D', 'E', '?'];

// Load the font. opentype.js wants the raw bytes as an "ArrayBuffer" (a block of memory).
const bytes = readFileSync(FONT_FILE);
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const size = font.unitsPerEm;
// The height of a capital letter in the font's own units (about 700 of the 1000-unit grid).
// Every letter is placed so its top sits at 0 and its baseline at this height.
const capHeight = font.tables.os2?.sCapHeight || 700;

// Round to one decimal place: far finer than a pixel, and it keeps the file small.
const round = (n) => Math.round(n * 10) / 10;

// Turn the letter's outline into straight-line pieces (curves are cut into 24 short lines each),
// so we can test whether a point is inside the letter and how far it is from the edge.
function flatten(path) {
  const rings = [];
  let ring = [];
  let x = 0;
  let y = 0;
  for (const c of path.commands) {
    if (c.type === 'M') {
      if (ring.length) rings.push(ring);
      ring = [[c.x, c.y]];
    } else if (c.type === 'L') {
      ring.push([c.x, c.y]);
    } else if (c.type === 'Q' || c.type === 'C') {
      // Sample the curve at 24 evenly spaced moments between its start and its end.
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        const u = 1 - t;
        if (c.type === 'Q') {
          ring.push([u * u * x + 2 * u * t * c.x1 + t * t * c.x, u * u * y + 2 * u * t * c.y1 + t * t * c.y]);
        } else {
          ring.push([
            u ** 3 * x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t ** 3 * c.x,
            u ** 3 * y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t ** 3 * c.y,
          ]);
        }
      }
    } else if (c.type === 'Z') {
      if (ring.length) rings.push(ring);
      ring = [];
    }
    if (c.x !== undefined) {
      x = c.x;
      y = c.y;
    }
  }
  if (ring.length) rings.push(ring);
  return rings;
}

// Is the point inside the letter? Count how many outline edges a line drawn from the point to
// the right crosses: an odd number means inside (this is the "even-odd" rule SVG uses too).
function inside(rings, px, py) {
  let odd = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) odd = !odd;
    }
  }
  return odd;
}

// The shortest distance from the point to any edge of the letter's outline.
function edgeDistance(rings, px, py) {
  let best = Infinity;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [ax, ay] = r[j];
      const [bx, by] = r[i];
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
      best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
    }
  }
  return best;
}

// Find the point deepest inside the letter's strokes: try every point on a fine grid over the
// letter, keep those inside it, and pick the one furthest from any edge. Among near-ties we
// prefer the point closest to the letter's middle height, so the zoom feels centered.
function deepestPoint(rings, box) {
  let best = { x: 0, y: 0, r: 0, score: -Infinity };
  const step = 4;
  const mid = (box.y1 + box.y2) / 2;
  for (let py = box.y1; py <= box.y2; py += step) {
    for (let px = box.x1; px <= box.x2; px += step) {
      if (!inside(rings, px, py)) continue;
      const r = edgeDistance(rings, px, py);
      const score = r - Math.abs(py - mid) * 0.05;
      if (score > best.score) best = { x: px, y: py, r, score };
    }
  }
  return best;
}

// Trace each letter with its top at 0 and its left edge at 0, and measure it.
const letters = {};
for (const char of LETTERS) {
  const glyph = font.charToGlyph(char);
  const probe = glyph.getPath(0, 0, size).getBoundingBox();
  // Shift so the left edge of the letter is at x = 0 and the cap line at y = 0.
  const path = glyph.getPath(-probe.x1, capHeight, size);
  const box = path.getBoundingBox();
  const rings = flatten(path);
  const deep = deepestPoint(rings, box);
  letters[char] = {
    d: toPathData(path, 1),
    // Width, and the top and bottom of the letter (round letters like C poke a little above
    // the cap line and below the baseline).
    width: round(box.x2 - box.x1),
    top: round(box.y1),
    bottom: round(box.y2),
    // The zoom point: where it is, and the radius of the biggest circle that fits in the stroke
    // there. The page uses the radius to work out how far to zoom.
    zoom: { x: round(deep.x), y: round(deep.y), r: round(deep.r) },
  };
}

const data = {
  _note:
    'Generated by scripts/build-docket-letters.mjs from Host Grotesk Bold, weight 700 (OFL-1.1): the case letters A to E for the home docket and the next-case band, and "?" for the 404 page. Do not edit by hand: change the script and run "node scripts/build-docket-letters.mjs". Units are the font\'s own: the cap line is y = 0 and the baseline is y = capHeight.',
  capHeight,
  letters,
};

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(data, null, 2) + '\n');

// Print a short report so whoever ran the script can see it worked.
for (const [char, l] of Object.entries(letters)) {
  console.log(`${char}: width ${l.width}, top ${l.top}, bottom ${l.bottom}, zoom point (${l.zoom.x}, ${l.zoom.y}) r=${l.zoom.r}`);
}
console.log(`wrote ${OUT_FILE}`);
