// encode.mjs: cuts, crops and encodes the Case F clips from the masters that capture/case-f.mjs
// recorded, into public/media/project-pomfret/.
//
// Run it from this repo's root after recording:
//   node capture/encode.mjs                  (every clip)
//   node capture/encode.mjs project-pomfret-hero project-pomfret-docket   (some clips)
//
// It needs ffmpeg with libx264 and an AV1 encoder (libsvtav1, or libaom-av1 as a fallback), and
// for the posters either ffmpeg's libwebp or the cwebp tool (brew install webp).
//
// For every clip it writes <id>.h264.mp4, <id>.av1.mp4 (not for the scrub clip) and
// <id>-poster.webp (the clip's first frame, which has no pointer in it), saves three stills
// (start, middle, end) to capture/out/check/ for checking by eye, and prints each file's size and
// the clip's exact length for src/data/media.json.
//
// All positions below are in master pixels. Most masters are 3200 x 1800, twice the demo's
// 1600 x 900 window, so a point on the demo at (x, y) is at (2x, 2y) in the master. The docket
// and heroMobile takes use other windows (see capture/case-f.mjs).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('capture/out');
const WORK = path.join(OUT, 'work');
const CHECK = path.join(OUT, 'check');
const DEST = path.resolve('public/media/project-pomfret');
const FPS = 30;

// A take's length in seconds, from <take>-cuts.json. A clip ends a few frames before its take
// does, or earlier when the take is longer than the clip may be.
function upTo(take, most) {
  const file = path.join(OUT, `${take}-cuts.json`);
  if (!fs.existsSync(file)) throw new Error(`${file} is missing. Record the "${take}" take first.`);
  const { duration } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Math.min(Math.floor((duration - 0.03) * FPS) / FPS, most);
}

// ---------------------------------------------------------------------------------------------
// The clips. "start" and "end" are seconds into the take's master. "filter" crops and scales.
// "loopFade" crossfades the last seconds back into the first frame, for loops whose end and start
// differ (the hero starts before the draft and ends after it). "h264Crf" and "av1Crf" override the
// usual quality (22 and 38) where a clip came out much bigger than Case D's: a higher number
// means a smaller, softer file.

const clips = [
  {
    id: 'project-pomfret-hero',
    take: 'hero',
    start: () => 0,
    end: () => upTo('hero', 9.5),
    size: [1920, 1080],
    // A slow push-in from 1.00x to 1.06x toward the numbers and the Needs review list.
    filter: (d) =>
      `zoompan=z='1+0.06*on/${Math.round(d * FPS) - 1}':x='(iw-iw/zoom)*0.58':y='(ih-ih/zoom)*0.5':d=1:s=1920x1080:fps=${FPS}`,
    loopFade: 0.6,
    // The push-in changes every pixel of every frame, so this clip needs more squeezing.
    h264Crf: 26,
    av1Crf: 40,
    av1: true,
  },
  {
    id: 'project-pomfret-hero-mobile',
    take: 'heroMobile',
    start: () => 0,
    end: () => upTo('heroMobile', 9.5),
    size: [1080, 1350],
    // The phone copy has its own take in a 540 x 675 window, where the demo puts the four numbers
    // in two rows, so the frames are already 1080 x 1350. It gets the same slow push-in as the
    // hero (scaled up first so the push-in stays sharp).
    filter: (d) =>
      `scale=2160:2700:flags=lanczos,zoompan=z='1+0.04*on/${Math.round(d * FPS) - 1}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.55':d=1:s=1080x1350:fps=${FPS}`,
    loopFade: 0.6,
    h264Crf: 26,
    av1Crf: 40,
    av1: true,
  },
  {
    id: 'project-pomfret-scrub',
    take: 'flow',
    start: () => 0,
    end: () => upTo('flow', 19.4),
    size: [1600, 900],
    filter: () => 'scale=1600:900:flags=lanczos',
    scrub: true,
    av1: false,
  },
  {
    id: 'project-pomfret-docket',
    take: 'docket',
    start: () => 0,
    end: () => upTo('docket', 10),
    size: [1600, 1600],
    // This take's master is 2500 x 1874 (a 2000 x 1500 window at scale 1.25). A 1750 x 1750
    // square puts the interest bars where the giant F's stem is and the "Suggested" choices in
    // its arms. The pointer waits in the sidebar, outside the square.
    filter: () => 'crop=1750:1750:678:62,scale=1600:1600:flags=lanczos',
    // The steady scroll moves fine text in every frame. This also counts toward the home page's
    // 8 MB video budget.
    h264Crf: 26,
    av1: true,
  },
  {
    id: 'project-pomfret-detail-1',
    take: 'detail1',
    start: () => 0,
    end: () => upTo('detail1', 8),
    size: [1080, 1080],
    // The "Why this placement" panel: its reason, its tags and the checked projects.
    filter: () => 'crop=1760:1760:720:20,scale=1080:1080:flags=lanczos',
    av1: true,
  },
  {
    id: 'project-pomfret-detail-2',
    take: 'detail2',
    start: () => 0,
    end: () => upTo('detail2', 8),
    size: [1920, 1080],
    // The first two rows of project cards and the week menu.
    filter: () => 'crop=2496:1404:592:100,scale=1920:1080:flags=lanczos',
    av1: true,
  },
];

// ---------------------------------------------------------------------------------------------

function ffmpeg(args) {
  // SVT_LOG=1 keeps the AV1 encoder quiet unless something goes wrong.
  const run = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    stdio: 'inherit', env: { ...process.env, SVT_LOG: '1' },
  });
  if (run.status !== 0) throw new Error(`ffmpeg failed: ffmpeg ${args.join(' ')}`);
}

function duration(file) {
  const run = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return Number(Number(run.stdout.trim()).toFixed(3));
}

const encoders = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout;
const AV1 = encoders.includes('libsvtav1')
  ? (crf) => ['-c:v', 'libsvtav1', '-preset', '6', '-crf', String(crf)]
  : encoders.includes('libaom-av1')
    ? (crf) => ['-c:v', 'libaom-av1', '-crf', String(crf), '-b:v', '0', '-cpu-used', '4']
    : null;
if (!encoders.includes('libx264') || !AV1) {
  console.error('ffmpeg needs libx264 and libsvtav1 (or libaom-av1). See capture/README.md.');
  process.exit(1);
}

const COMMON = ['-an', '-r', String(FPS), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
const H264 = (crf) => ['-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', String(crf)];

// A WebP still from a PNG, at the given quality.
function webp(png, out, quality) {
  if (encoders.includes('libwebp')) ffmpeg(['-i', png, '-c:v', 'libwebp', '-quality', String(quality), out]);
  else {
    const run = spawnSync('cwebp', ['-quiet', '-q', String(quality), png, '-o', out], { stdio: 'inherit' });
    if (run.status !== 0) throw new Error('cwebp failed. Install it with: brew install webp');
  }
}

const kb = (file) => `${(fs.statSync(file).size / 1024).toFixed(0)} KB`;

function encode(clip) {
  const master = path.join(OUT, `${clip.take}-master.mp4`);
  if (!fs.existsSync(master)) throw new Error(`${master} is missing. Record the "${clip.take}" take first.`);
  const start = clip.start();
  const length = Number((clip.end() - start).toFixed(3));
  const [w, h] = clip.size;

  // 1. Trim, crop and scale into a lossless working copy.
  const work = path.join(WORK, `${clip.id}.mkv`);
  const lossless = ['-an', '-c:v', 'libx264', '-qp', '0', '-preset', 'ultrafast'];
  ffmpeg(['-ss', String(start), '-t', String(length), '-i', master,
    '-vf', `${clip.filter(length)},fps=${FPS},format=yuv420p,setsar=1`, '-t', String(length), ...lossless, work]);
  if (clip.loopFade) {
    // Fade the last moments into a still of the first frame, so the loop's end matches its start.
    const f = clip.loopFade;
    const still = path.join(WORK, `${clip.id}-loop.png`);
    const faded = path.join(WORK, `${clip.id}-faded.mkv`);
    ffmpeg(['-i', work, '-frames:v', '1', still]);
    ffmpeg(['-i', work, '-loop', '1', '-framerate', String(FPS), '-t', String(f), '-i', still,
      '-filter_complex', `[0:v]settb=1/${FPS}[main];[1:v]format=yuv420p,setsar=1,settb=1/${FPS}[head];[main][head]xfade=transition=fade:duration=${f}:offset=${(length - f).toFixed(3)}`,
      '-t', String(length), ...lossless, faded]);
    fs.renameSync(faded, work);
  }

  // 2. The site's files.
  const base = path.join(DEST, clip.id);
  ffmpeg(['-i', work, ...H264(clip.h264Crf ?? 22), ...(clip.scrub ? ['-g', '10', '-bf', '0'] : []), ...COMMON, `${base}.h264.mp4`]);
  if (clip.av1) ffmpeg(['-i', work, ...AV1(clip.av1Crf ?? 38), ...COMMON, `${base}.av1.mp4`]);

  // 3. The poster: the first frame (taken from the lossless copy, so it stays sharp), under 100 KB.
  const firstPng = path.join(WORK, `${clip.id}-first.png`);
  ffmpeg(['-i', work, '-frames:v', '1', firstPng]);
  for (const quality of [75, 68, 60, 52, 45]) {
    webp(firstPng, `${base}-poster.webp`, quality);
    if (fs.statSync(`${base}-poster.webp`).size < 100 * 1024) break;
  }

  // 4. Three stills to check by eye: start, middle and end.
  const real = duration(`${base}.h264.mp4`);
  [['start', 0], ['middle', real / 2], ['end', Math.max(real - 0.05, 0)]].forEach(([name, t]) =>
    ffmpeg(['-ss', t.toFixed(3), '-i', `${base}.h264.mp4`, '-frames:v', '1', path.join(CHECK, `${clip.id}-${name}.png`)]));

  const files = [`${base}.h264.mp4`, clip.av1 && `${base}.av1.mp4`, `${base}-poster.webp`].filter(Boolean);
  console.log(`${clip.id}  ${w}x${h}  ${real.toFixed(3)} s  ${files.map((f) => `${path.basename(f)} ${kb(f)}`).join('  ')}`);
}

const wanted = process.argv.slice(2);
const list = wanted.length ? clips.filter((c) => wanted.includes(c.id)) : clips;
if (wanted.length && list.length !== wanted.length) {
  console.error(`Unknown clip id. Known: ${clips.map((c) => c.id).join(', ')}`);
  process.exit(1);
}
for (const dir of [WORK, CHECK, DEST]) fs.mkdirSync(dir, { recursive: true });
for (const clip of list) encode(clip);
