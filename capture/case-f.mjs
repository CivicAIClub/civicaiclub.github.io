// case-f.mjs: records the footage for Case F (Project: Pomfret sorting) from the case-f repo's
// browser demo, which uses only invented students ("Practice Student 001" to "253").
//
// Run the demo in another terminal first (in ../case-f-project-pomfret):
//   npm run build:demo && npm run preview          (serves http://127.0.0.1:3000)
// Then, from this repo's root:
//   node capture/case-f.mjs flow                   (one take by name)
//   node capture/case-f.mjs all                    (every take)
// Another address can be used with:  CASE_F_URL=http://127.0.0.1:3001 node capture/case-f.mjs all
//
// How it records:
//   1. Chromium runs headless (no address bar, no tabs) at 1600 x 900 with deviceScaleFactor 2,
//      so every frame is 3200 x 1800. CAPTURE_SCALE=1.5 records smaller frames if the computer
//      can't keep up.
//   2. Chrome's own screencast sends a PNG each time the screen changes, with the time it was
//      drawn. The script saves them, then ffmpeg turns them into a steady 30 fps master video
//      (each frame stays on screen until the next one arrived).
//   3. A headless browser has no mouse pointer, so the page gets a drawn one: a small black arrow
//      that follows the mouse. The mouse glides along eased paths, the way a person moves it.
//   4. The name guard: about every 200 ms it checks whether any text on screen contains a name
//      that must never be filmed. If one shows up, the take stops with an error and its master
//      isn't written.
//
// Each take writes capture/out/<take>-master.mp4 and capture/out/<take>-cuts.json (the time, in
// seconds, each step started). capture/encode.mjs cuts the site's clips from those.
// capture/out/ is never committed.

import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEMO = process.env.CASE_F_URL || 'http://127.0.0.1:3000';
const SCALE = Number(process.env.CAPTURE_SCALE || 2);
const VIEW = { width: 1600, height: 900 };
const OUT = path.resolve('capture/out');

// Names that must never appear on camera: the program's director and the club's student leaders.
const BANNED = /Litowitz|Cayden|Luke/;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------------------------
// The drawn pointer. It is added to every page before the demo's own scripts run. It is shown as
// a "popover" so it sits in the browser's top layer, above the demo's dialogs; when a dialog
// opens, the pointer is shown again so it stays on top of it.
function installPointer() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 20 24">' +
    '<path d="M2 2 L2 19.5 L6.6 15.3 L9.6 22.2 L12.9 20.8 L9.9 14 L16 14 Z" fill="#000" ' +
    'stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  function make() {
    const arrow = document.createElement('div');
    arrow.id = 'capture-pointer';
    arrow.setAttribute('popover', 'manual');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = svg;
    Object.assign(arrow.style, {
      position: 'fixed', inset: 'auto', left: '0', top: '0', margin: '0', padding: '0',
      border: '0', background: 'transparent', overflow: 'visible', width: '20px', height: '24px',
      pointerEvents: 'none', transform: 'translate(-100px, -100px)',
    });
    document.documentElement.append(arrow);
    arrow.showPopover();
    window.__movePointer = (x, y) => {
      arrow.style.transform = `translate(${x - 2}px, ${y - 2}px)`;
    };
    addEventListener('mousemove', (event) => window.__movePointer(event.clientX, event.clientY), true);
    // A dialog opening goes on top of the top layer, so put the pointer back above it.
    new MutationObserver(() => {
      arrow.hidePopover();
      arrow.showPopover();
    }).observe(document.documentElement, { subtree: true, attributeFilter: ['open'] });
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', make);
  else make();
}

// The name guard's check, run inside the page: the first piece of visible text, inside the
// window, that contains a banned name.
function findBannedText(source) {
  const banned = new RegExp(source);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!banned.test(node.nodeValue)) continue;
    const parent = node.parentElement;
    if (parent && !parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const box of range.getClientRects()) {
      const inside = box.width > 0 && box.height > 0 && box.right > 0 && box.bottom > 0 &&
        box.left < innerWidth && box.top < innerHeight;
      if (inside) return node.nodeValue.trim().slice(0, 160);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Moving like a person.

let pointer = { x: 0, y: 0 };

// Ease in and out: slow start, quicker middle, slow stop.
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Glide the mouse to a point (or to the middle of an element) in 20 to 30 small steps.
async function glide(page, target, steps = 26) {
  const to = target.x === undefined ? await centerOf(target) : target;
  const from = { ...pointer };
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    await wait(14);
  }
  pointer = { ...to };
}

// Put the drawn pointer somewhere without a glide, during setup (off camera). A point outside
// the window hides it.
async function park(page, to) {
  await page.mouse.move(Math.min(Math.max(to.x, 0), VIEW.width - 1), Math.min(Math.max(to.y, 0), VIEW.height - 1));
  await page.evaluate(({ x, y }) => window.__movePointer(x, y), to);
  pointer = { ...to };
}

async function centerOf(locator, fx = 0.5, fy = 0.5) {
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

// A click as a person makes it: press, a short moment, release.
async function press(page) {
  await page.mouse.down();
  await wait(70);
  await page.mouse.up();
}

// Scroll by dy pixels over about ms milliseconds, in many small wheel steps.
async function scroll(page, dy, ms = 1000) {
  const steps = Math.max(20, Math.round(ms / 16));
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await wait(ms / steps - 4);
  }
}

// Wait until nothing on the page is moving (no CSS animations or transitions running).
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let i = 0; i < 100 && document.getAnimations().length; i++) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await wait(300);
}

// The toast ("The draft is ready…") stays for five seconds. Setup waits it out off camera.
async function toastGone(page) {
  await page.locator('#toast').waitFor({ state: 'hidden', timeout: 10000 });
}

// ---------------------------------------------------------------------------------------------
// Setup steps, shared by the takes. None of this is on camera.

async function openDemo(page) {
  await page.goto(DEMO, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Skip walkthrough' }).click();
  await page.evaluate(() => scrollTo(0, 0));
  await settle(page);
}

async function toPlaceStudents(page) {
  await page.getByRole('button', { name: 'Next: place students' }).first().click();
  await page.evaluate(() => scrollTo(0, 0));
  await settle(page);
}

async function toDraft(page) {
  await toPlaceStudents(page);
  await page.getByRole('button', { name: 'Create draft placements' }).click();
  await page.getByText('Taking a Major').waitFor();
  await toastGone(page);
  await settle(page);
}

// Scroll (off camera) so an element's top sits y pixels below the top of the window.
async function scrollTopTo(page, locator, y) {
  const box = await locator.boundingBox();
  await page.evaluate((dy) => scrollBy(0, dy), box.y - y);
  await settle(page);
}

// ---------------------------------------------------------------------------------------------
// The takes. Each has a setup (off camera) and a run (on camera). The run calls cut('name') at the
// start of each step; those times go into <take>-cuts.json.

const takes = {
  // 14 to 20 s: the whole tool, start to finish. Becomes project-pomfret-scrub.
  flow: {
    async setup(page) {
      await openDemo(page);
      // Outside the window, so the first frame (the poster) has no pointer.
      await park(page, { x: 1660, y: 640 });
    },
    async run(page, cut) {
      cut('table');
      await wait(1100);
      cut('scroll');
      await scroll(page, 330, 1300);
      await wait(700);
      await scroll(page, -330, 1100);
      cut('scroll-end');
      await wait(500);
      await glide(page, page.getByRole('button', { name: 'Next: place students' }).first());
      await wait(200);
      await press(page);
      cut('place');
      await wait(900);
      await glide(page, page.getByRole('button', { name: 'Create draft placements' }));
      await wait(200);
      await press(page);
      cut('create');
      await page.getByText('Taking a Major').waitFor();
      await wait(1700);
      await glide(page, page.locator('summary', { hasText: 'Weak interest matches' }), 24);
      await wait(150);
      await press(page);
      cut('review');
      await wait(700);
      await scroll(page, 330, 900);
      await wait(1300);
      await glide(page, page.getByRole('button', { name: 'By project' }), 22);
      await wait(150);
      await press(page);
      cut('by-project');
      await wait(500);
      await scroll(page, 420, 1000);
      await wait(1000);
      await glide(page, page.locator('.roster-grid button', { hasText: FLOW_STUDENT }), 24);
      await wait(150);
      await press(page);
      cut('why');
      await wait(2600);
    },
  },

  // 8 to 12 s: "Create draft placements", then the numbers and Needs review land and hold.
  // The pointer starts and ends outside the window, so the first frame can be the poster.
  hero: {
    async setup(page) {
      await openDemo(page);
      await toPlaceStudents(page);
      await park(page, { x: 1660, y: 560 });
    },
    async run(page, cut) {
      cut('place');
      await wait(1100);
      await glide(page, page.getByRole('button', { name: 'Create draft placements' }), 30);
      await wait(250);
      await press(page);
      cut('create');
      await page.getByText('Taking a Major').waitFor();
      await wait(1300);
      await glide(page, { x: 1660, y: 640 }, 26);
      cut('pointer-out');
      await toastGone(page);
      cut('still');
      await wait(2300);
    },
  },

  // 6 to 10 s: the interest table drifting down and back up, so the loop has no jump. The
  // pointer waits in the sidebar, far from the middle of the square the home page shows.
  docket: {
    async setup(page) {
      await openDemo(page);
      await scrollTopTo(page, page.locator('table').first(), 60);
      await park(page, { x: 110, y: 640 });
    },
    async run(page, cut) {
      cut('start');
      await wait(600);
      cut('down');
      await scroll(page, 400, 3400);
      cut('hold');
      await wait(500);
      cut('up');
      await scroll(page, -400, 3400);
      cut('end');
      await wait(600);
    },
  },

  // 5 to 8 s: one student's "Why this placement". It starts and ends with the panel open and the
  // pointer out of the crop; in between, the panel closes and opens again from the By student list.
  detail1: {
    async setup(page) {
      await openDemo(page);
      await toDraft(page);
      const name = page.locator('table button', { hasText: DETAIL_STUDENT }).first();
      await scrollTopTo(page, name, 470);
      await name.click();
      await settle(page);
      await park(page, { x: 1300, y: 640 });
    },
    async run(page, cut) {
      cut('open');
      await wait(2300);
      await glide(page, page.locator('#student-dialog').getByRole('button', { name: /close/i }).first(), 22);
      await wait(150);
      await press(page);
      cut('closed');
      await wait(500);
      await glide(page, page.locator('table button', { hasText: DETAIL_STUDENT }).first(), 24);
      await wait(150);
      await press(page);
      cut('reopen');
      await wait(400);
      await glide(page, { x: 1300, y: 640 }, 24);
      cut('pointer-out');
      await wait(2000);
    },
  },

  // 5 to 8 s: By project, Week 1 to Week 2 and back. Minor groups change; Majors stay.
  detail2: {
    async setup(page) {
      await openDemo(page);
      await toDraft(page);
      await page.getByRole('button', { name: 'By project' }).click();
      await settle(page);
      await scrollTopTo(page, page.getByRole('heading', { name: 'Project groups' }), 70);
      await park(page, { x: 1580, y: 700 });
    },
    async run(page, cut) {
      cut('week1');
      await wait(900);
      await glide(page, page.locator('#week-filter'), 24);
      await wait(300);
      await page.selectOption('#week-filter', '2');
      cut('week2');
      await wait(2200);
      await glide(page, page.locator('#week-filter'), 8);
      await page.selectOption('#week-filter', '1');
      cut('back');
      await wait(900);
      // Drop the menu's focus ring, so the last frame matches the first and the loop has no jump.
      await page.evaluate(() => document.activeElement.blur());
      await glide(page, { x: 1580, y: 700 }, 24);
      cut('pointer-out');
      await wait(700);
    },
  },
};

// The students whose placements are opened. Practice Student 012 has a placement on a project
// they didn't check, so its reason and its "Not checked / Type match / Goal match" tags say the
// most. FLOW_STUDENT is in the first row of project cards.
const DETAIL_STUDENT = 'Practice Student 012';
const FLOW_STUDENT = 'Practice Student 003';

// ---------------------------------------------------------------------------------------------
// Recording one take.

async function record(browser, name) {
  const take = takes[name];
  const frameDir = path.join(OUT, `${name}-frames`);
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });

  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, bypassCSP: true });
  await context.addInitScript(installPointer);
  const page = await context.newPage();
  pointer = { x: 0, y: 0 };
  await take.setup(page);

  // Start the screencast. Every frame is acked at once and written to disk in the background.
  const cdp = await context.newCDPSession(page);
  const frames = [];
  const writes = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    const file = path.join(frameDir, `${String(frames.length).padStart(5, '0')}.png`);
    frames.push({ file, t: metadata.timestamp });
    writes.push(fs.promises.writeFile(file, Buffer.from(data, 'base64')));
  });
  await cdp.send('Page.startScreencast', {
    format: 'png', maxWidth: VIEW.width * SCALE, maxHeight: VIEW.height * SCALE, everyNthFrame: 1,
  });
  // Nudge the drawn pointer by a pixel and back, so Chrome sends a first frame right away.
  await page.evaluate(({ x, y }) => window.__movePointer(x + 1, y), pointer);
  await page.evaluate(({ x, y }) => window.__movePointer(x, y), pointer);
  for (let i = 0; i < 100 && !frames.length; i++) await wait(20);
  if (!frames.length) throw new Error(`${name}: the screencast sent no frames`);
  const start = frames[0].t;

  const cuts = [];
  const cut = (step) => cuts.push({ step, t: Number((Date.now() / 1000 - start).toFixed(3)) });

  // The name guard runs beside the take and stops it the moment a banned name is on screen.
  let guardTimer;
  const guard = new Promise((_, reject) => {
    guardTimer = setInterval(async () => {
      const found = await page.evaluate(findBannedText, BANNED.source).catch(() => null);
      if (found) reject(new Error(`Name guard stopped take "${name}": "${found}" is on screen.`));
    }, 200);
  });
  try {
    await Promise.race([take.run(page, cut), guard]);
    const found = await page.evaluate(findBannedText, BANNED.source);
    if (found) throw new Error(`Name guard stopped take "${name}": "${found}" is on screen.`);
  } finally {
    clearInterval(guardTimer);
    guard.catch(() => {});
  }
  const end = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await Promise.all(writes);
  await context.close();

  // Turn the frames into a steady 30 fps master. Each frame lasts until the next one arrived;
  // the last one lasts until the take ended. "option framerate 1000" makes ffmpeg keep each
  // frame's time to the millisecond (by default it rounds to 1/25 s), and -t cuts the master to
  // the take's exact length (ffmpeg would otherwise hold the last frame a little too long).
  const list = ['ffconcat version 1.0'];
  frames.forEach((frame, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : end;
    list.push(`file '${path.basename(frame.file)}'`, 'option framerate 1000', `duration ${Math.max(next - frame.t, 0.001).toFixed(4)}`);
  });
  list.push(`file '${path.basename(frames.at(-1).file)}'`, 'option framerate 1000');
  fs.writeFileSync(path.join(frameDir, 'frames.txt'), list.join('\n') + '\n');

  const master = path.join(OUT, `${name}-master.mp4`);
  const ffmpeg = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', path.join(frameDir, 'frames.txt'),
    '-vf', 'fps=30,format=yuv420p', '-an', '-t', (end - start).toFixed(3),
    '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    master,
  ], { stdio: 'inherit' });
  if (ffmpeg.status !== 0) throw new Error(`${name}: ffmpeg failed`);

  // Frames per second while something was moving (gaps over 100 ms are holds, when Chrome sends
  // nothing because nothing changed).
  let moving = 0;
  let movingTime = 0;
  for (let i = 1; i < frames.length; i++) {
    const gap = frames[i].t - frames[i - 1].t;
    if (gap < 0.1) { moving++; movingTime += gap; }
  }
  const report = {
    take: name,
    duration: Number((end - start).toFixed(3)),
    frameSize: [VIEW.width * SCALE, VIEW.height * SCALE],
    frames: frames.length,
    fpsWhileMoving: Number((moving / (movingTime || 1)).toFixed(1)),
    cuts,
  };
  fs.writeFileSync(path.join(OUT, `${name}-cuts.json`), JSON.stringify(report, null, 2) + '\n');
  if (!process.env.KEEP_FRAMES) fs.rmSync(frameDir, { recursive: true, force: true });
  console.log(`${name}: ${report.duration} s, ${report.frames} frames, ${report.fpsWhileMoving} fps while moving -> ${path.relative(process.cwd(), master)}`);
}

// ---------------------------------------------------------------------------------------------

const wanted = process.argv[2];
const names = wanted === 'all' ? Object.keys(takes) : [wanted];
if (!wanted || names.some((n) => !takes[n])) {
  console.error(`Usage: node capture/case-f.mjs <${Object.keys(takes).join('|')}|all>`);
  process.exit(1);
}
try {
  await fetch(DEMO);
} catch {
  console.error(`The demo isn't running at ${DEMO}. In ../case-f-project-pomfret run: npm run build:demo && npm run preview`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
// Chrome's screencast ignores the page's deviceScaleFactor and sends frames at 1600 x 900 unless
// the whole browser is told to draw at that scale too.
const browser = await chromium.launch({ headless: true, args: [`--force-device-scale-factor=${SCALE}`] });
let failed = false;
for (const name of names) {
  try {
    await record(browser, name);
  } catch (error) {
    failed = true;
    console.error(error.message);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
