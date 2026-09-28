// path-data.mjs: turns a traced letter into the short text SVG uses to draw it.
//
// opentype.js (the font-reading tool) has its own way to do this, called toPathData, but
// version 2.0.0 has a bug: numbers that land a hair away from a whole number come out as
// "NaN" ("not a number"), and the browser then stops drawing the rest of the shape.
// This helper does the same job safely. It is used by build-wordmark.mjs and
// build-brand-images.mjs.

// Write one number with at most `places` decimal places, dropping useless zeros
// (so 12.50 becomes "12.5" and 7.00 becomes "7").
function num(value, places) {
  const rounded = Number(value.toFixed(places));
  // "-0" looks odd in a file; treat it as plain 0.
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

// Given a traced path (a list of drawing commands: M = move the pen, L = straight line,
// Q and C = curves, Z = close the shape), give back the SVG "d" text for it.
export function toPathData(path, places = 1) {
  const n = (v) => num(v, places);
  return path.commands
    .map((c) => {
      if (c.type === 'M' || c.type === 'L') return `${c.type}${n(c.x)} ${n(c.y)}`;
      if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      return 'Z';
    })
    .join('');
}
