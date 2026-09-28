// check-media.mjs: checks the site's video and image files before they are merged.
//
// Run it with: npm run check:media   (the CI workflow runs it on every pull request)
//
// Videos stay in the repository's history forever, so a single oversized file makes every future
// download of the project slower. This script stops that early. It checks:
//   1. Size limits (the "budgets"):
//        - no file in public/ over 10 MB,
//        - public/media/ under 150 MB in total,
//        - every poster (the still a video shows before it plays) under 100 KB,
//        - every photo file (each size and format of a "kind": "image" entry, e.g. the club
//          photo's 1600 px WebP) under 300 KB. Which budget a picture gets comes from media.json:
//          a clip's "poster" is a poster, a file in an image entry's "files" is a photo. A picture
//          that media.json doesn't mention is judged by its name ("-poster.webp" or not),
//        - the home page's videos under 8 MB in total (counting the largest of each clip's files,
//          its phone copy's included, since a browser downloads only one of them).
//   2. The clip list, src/data/media.json (and media-demo.json): every entry has its fields,
//      every file it names exists, no id is used twice, and tool recordings end their caption
//      with "Demo data.". Entries with "kind": "image" (a photo, not a video) need a size, alt
//      text and their files instead.
//   3. It then lists, without failing:
//        - clip ids that case files or pages ask for but media.json doesn't have yet (those show
//          a placeholder on the site until the footage arrives),
//        - files in public/media/ that no clip uses (probably safe to delete).
// It ends with exit code 1 (failure) if any check in part 1 or 2 fails, so CI marks the PR red.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => join(root, ...parts);

const MB = 1024 * 1024;
const KB = 1024;
const LIMITS = {
  file: 10 * MB,
  mediaTotal: 150 * MB,
  poster: 100 * KB,
  image: 300 * KB,
  home: 8 * MB,
};

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);
const note = (message) => notes.push(message);
const size = (bytes) => (bytes >= MB ? `${(bytes / MB).toFixed(2)} MB` : `${(bytes / KB).toFixed(1)} KB`);

// List every file inside a folder, including folders inside it.
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

// ---- 1. Size limits ---------------------------------------------------------------------------
const publicFiles = walk(at('public'));
for (const file of publicFiles) {
  const bytes = statSync(file).size;
  if (bytes > LIMITS.file) fail(`${relative(root, file)} is ${size(bytes)} (limit ${size(LIMITS.file)} per file).`);
}
const mediaFiles = walk(at('public', 'media'));
const mediaTotal = mediaFiles.reduce((sum, file) => sum + statSync(file).size, 0);
if (mediaTotal > LIMITS.mediaTotal) {
  fail(`public/media is ${size(mediaTotal)} in total (limit ${size(LIMITS.mediaTotal)}).`);
}
// (Pictures get their budgets after the clip list is read below, because media.json says which
// pictures are video posters and which are photos.)

// ---- 2. The clip list --------------------------------------------------------------------------
// Read one JSON list of clips. A file that isn't valid JSON is a failure on its own.
function readClips(path) {
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(data)) {
      fail(`${relative(root, path)} must be a list ([ ... ]).`);
      return [];
    }
    return data.map((clip) => ({ ...clip, __file: relative(root, path) }));
  } catch (error) {
    fail(`${relative(root, path)} is not valid JSON: ${error.message}`);
    return [];
  }
}
const clips = [...readClips(at('src', 'data', 'media.json')), ...readClips(at('src', 'data', 'media-demo.json'))];

const seen = new Set();
const usedFiles = new Set();
// Pictures sorted by their job, for the picture budgets further down.
const posterFiles = new Set();
const imageFiles = new Set();
let homeBytes = 0;
// Every file path written anywhere inside an entry's "files" (for photos, which list one file per
// format and size, e.g. files.webp["1600"]).
function pathsIn(value) {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(pathsIn);
  return [];
}

for (const clip of clips) {
  const label = `${clip.__file} → "${clip.id ?? '(no id)'}"`;
  if (!clip.id || !/^[a-z0-9-]+$/.test(clip.id)) fail(`${label}: "id" must be lowercase letters, numbers and dashes.`);
  if (seen.has(clip.id)) fail(`${label}: this id is listed twice.`);
  seen.add(clip.id);
  // A photo: it needs its size, alt text (what it shows, for people who can't see it) and files.
  if (clip.kind === 'image') {
    for (const field of ['width', 'height', 'alt']) {
      if (clip[field] === undefined || clip[field] === '') fail(`${label}: missing "${field}".`);
    }
    const files = pathsIn(clip.files);
    if (!files.length) fail(`${label}: "files" lists no files.`);
    for (const file of files) {
      const path = at('public', file.replace(/^\//, ''));
      if (!existsSync(path)) fail(`${label}: file not found: public/${file.replace(/^\//, '')}`);
      else {
        usedFiles.add(path);
        imageFiles.add(path);
      }
    }
    continue;
  }
  for (const field of ['h264', 'poster', 'width', 'height', 'duration', 'caption']) {
    if (clip[field] === undefined || clip[field] === '') fail(`${label}: missing "${field}".`);
  }
  // Loops need the small AV1 file too; scrub clips (scrub: true) may be H.264 only.
  if (!clip.scrub && !clip.av1) fail(`${label}: missing "av1" (only scrub clips may leave it out).`);
  if (clip.demoData !== false && typeof clip.caption === 'string' && !/Demo data\.$/.test(clip.caption.trim())) {
    fail(`${label}: the caption must end with "Demo data." (or set "demoData": false for non-tool footage).`);
  }
  // Every file the clip names must exist under public/.
  const files = [clip.av1, clip.h264, clip.poster, clip.mobile?.av1, clip.mobile?.h264, clip.mobile?.poster].filter(
    Boolean
  );
  // Remember which pictures are this clip's posters (the main one and the phone copy's).
  for (const poster of [clip.poster, clip.mobile?.poster].filter(Boolean)) {
    posterFiles.add(at('public', poster.replace(/^\//, '')));
  }
  const sizes = {};
  for (const file of files) {
    const path = at('public', file.replace(/^\//, ''));
    if (!existsSync(path)) {
      fail(`${label}: file not found: public${file}`);
      continue;
    }
    usedFiles.add(path);
    sizes[file] = statSync(path).size;
  }
  // Home page weight: a browser downloads one file per clip (the AV1 or the H.264 file, or on a
  // phone one of the phone copy's two), so count the largest of them.
  if (Array.isArray(clip.usedOn) && clip.usedOn.includes('home')) {
    homeBytes += Math.max(
      sizes[clip.av1] ?? 0,
      sizes[clip.h264] ?? 0,
      sizes[clip.mobile?.av1] ?? 0,
      sizes[clip.mobile?.h264] ?? 0
    );
  }
}
if (homeBytes > LIMITS.home) fail(`Home page video adds up to ${size(homeBytes)} (limit ${size(LIMITS.home)}).`);

// Picture budgets. A poster is shown before its video plays, so it must be light (100 KB). A
// photo comes in several sizes and the browser downloads only the one that fits the screen, so
// each file may be larger (300 KB). A picture media.json doesn't mention is judged by its name.
const PICTURE = new Set(['.webp', '.avif', '.jpg', '.jpeg', '.png']);
for (const file of mediaFiles.filter((f) => PICTURE.has(extname(f).toLowerCase()))) {
  const bytes = statSync(file).size;
  const isPoster = posterFiles.has(file) || (!imageFiles.has(file) && file.endsWith('-poster.webp'));
  const limit = isPoster ? LIMITS.poster : LIMITS.image;
  if (bytes > limit) fail(`${isPoster ? 'Poster' : 'Photo'} ${relative(root, file)} is ${size(bytes)} (limit ${size(limit)}).`);
}

// ---- 3. Information only ---------------------------------------------------------------------
// Clip ids asked for by case files (their "clips:" block) and by pages (<Video id="...">).
const wanted = new Map();
for (const file of walk(at('src', 'content', 'cases')).filter((f) => f.endsWith('.md'))) {
  const text = readFileSync(file, 'utf8');
  const block = text.match(/^clips:\n((?:[ \t]+\w+:.*\n)+)/m);
  if (!block) continue;
  for (const line of block[1].split('\n')) {
    const match = line.match(/^\s+\w+:\s*([a-z0-9-]+)\s*$/);
    if (match) wanted.set(match[1], relative(root, file));
  }
}
for (const file of walk(at('src', 'pages')).filter((f) => f.endsWith('.astro'))) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/<(?:Video|Photo)[^>]*\sid="([a-z0-9-]+)"/g)) wanted.set(match[1], relative(root, file));
}
// Page data files (src/data/home.json, about.json) name their footage under a "media" key, either
// one id or a group of ids, e.g. "media": { "reel": "home-reel" } or { "media": "glance-1" }.
function mediaIdsIn(value, underMediaKey = false) {
  if (typeof value === 'string') return underMediaKey ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((item) => mediaIdsIn(item, underMediaKey));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => mediaIdsIn(item, underMediaKey || key === 'media'));
  }
  return [];
}
for (const name of ['home.json', 'about.json']) {
  const path = at('src', 'data', name);
  if (!existsSync(path)) continue;
  try {
    for (const id of mediaIdsIn(JSON.parse(readFileSync(path, 'utf8')))) wanted.set(id, relative(root, path));
  } catch (error) {
    fail(`${relative(root, path)} is not valid JSON: ${error.message}`);
  }
}
const missing = [...wanted.entries()].filter(([id]) => !seen.has(id) && id !== 'missing-clip-id');
if (missing.length) {
  note(`${missing.length} clip id(s) are not in media.json yet (a placeholder shows until they are):`);
  missing.forEach(([id, from]) => note(`  - ${id}  (asked for by ${from})`));
}
const orphans = mediaFiles.filter((file) => !usedFiles.has(file));
if (orphans.length) {
  note(`${orphans.length} file(s) in public/media are not used by any clip:`);
  orphans.forEach((file) => note(`  - ${relative(root, file)}`));
}

// ---- Report -----------------------------------------------------------------------------------
console.log(`Media check: ${clips.length} clip(s) listed, public/media ${size(mediaTotal)}, home video ${size(homeBytes)}.`);
if (notes.length) console.log(notes.join('\n'));
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('All media checks passed.');
