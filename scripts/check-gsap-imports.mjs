// check-gsap-imports.mjs: makes sure the animation libraries are only used in one place.
//
// Run it with: npm run check:gsap   (the CI workflow runs it on every pull request)
//
// The club's rule: GSAP (the animation library) and Lenis (smooth scrolling) are imported only
// by files inside src/scripts/motion/. Pages and components ask for motion with data- attributes
// instead (see MOTION.md). Keeping every animation in one folder means switching motion off, or
// fixing an animation bug, only ever involves that folder.
// This script reads every source file in src/ and fails (exit code 1) if any file outside
// src/scripts/motion/ imports "gsap" or "lenis" in any form.

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = join(root, 'src', 'scripts', 'motion') + sep;

// The kinds of files that can contain code.
const CODE = /\.(astro|js|mjs|cjs|ts|mts|cts|jsx|tsx|svelte|vue)$/;

// Any way of loading gsap or lenis: import ... from 'gsap', import 'gsap/...', import('gsap'),
// require('lenis').
const IMPORT = /(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['"](gsap|lenis)(?:\/[^'"]*)?['"]/g;

// List every file inside a folder, including folders inside it.
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const problems = [];
for (const file of walk(join(root, 'src')).filter((f) => CODE.test(f))) {
  if (file.startsWith(allowed)) continue;
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(IMPORT)) {
    const line = text.slice(0, match.index).split('\n').length;
    problems.push(`${relative(root, file)}:${line} imports "${match[1]}"`);
  }
}

if (problems.length) {
  console.error('GSAP and Lenis may only be imported inside src/scripts/motion/:');
  problems.forEach((problem) => console.error(`  - ${problem}`));
  console.error('Use a data- attribute instead (see MOTION.md), or add a module in src/scripts/motion/modules/.');
  process.exit(1);
}
console.log('GSAP/Lenis import check passed: only src/scripts/motion/ uses them.');
