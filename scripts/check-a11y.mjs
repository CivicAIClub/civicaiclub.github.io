// check-a11y.mjs: an automatic accessibility check of every page, using axe (a widely used
// accessibility testing tool) inside a real browser.
//
// Run it with the site built and previewed in another terminal:
//   npm run build && npm run preview          (terminal 1)
//   npm run check:a11y                        (terminal 2)
// The first time only, download the browser it drives:  npx playwright-core install chromium
//
// For every page, at a laptop size (1440 x 900) and a phone size (390 x 844), and both with
// motion on and with the device asking for reduced motion, it:
//   1. opens the page and runs axe with the WCAG 2.2 A and AA rules at the top of the page,
//   2. scrolls to the bottom, so every animation has finished and all the text is in its final
//      place, and runs axe again (axe checks what is on screen, including color contrast),
//   3. lists every problem axe finds. "Serious" and "critical" problems make the script end with
//      exit code 1 (failure); "moderate" and "minor" ones are listed as warnings.
// Another address can be checked with:  BASE=http://localhost:4411 npm run check:a11y
//
// It also checks what screen readers call the rolling links (the header and footer links and
// every BigLink): the motion code cuts their letters apart, and without a proper name a screen
// reader would read "Cases" as "C a s e s". It asks Chrome itself for each link's name (through
// its developer protocol, "CDP"), and a name made of letters separated by spaces is a failure.
//
// One known blind spot: the header bar uses "mix-blend-mode: difference" (its light text turns
// dark over light sections by itself). axe can't work out the color of blended text, so it
// would report paper-on-paper text that no visitor ever sees. The header is therefore left out of
// the color-contrast rule only (every other rule still checks it); its contrast was checked by
// measuring screenshots instead (see the review notes).

import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = process.env.BASE || 'http://localhost:4321';

// The pages to check. The case pages, the events list and every event page are read from the
// site's own sitemap, so a new case or event is checked automatically.
async function pageList() {
  const pages = ['/', '/about/', '/spec/', '/404', '/styleguide/'];
  try {
    const xml = await (await fetch(new URL('/sitemap.xml', BASE))).text();
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const path = new URL(match[1]).pathname;
      if (path.startsWith('/cases/') || path.startsWith('/events/')) pages.push(path);
    }
  } catch (error) {
    console.error(`Could not read ${BASE}/sitemap.xml. Is "npm run preview" running?`);
    process.exit(1);
  }
  return pages;
}

// The screen sizes and motion settings each page is checked in.
const setups = [
  { name: 'laptop', viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
  { name: 'laptop, reduced motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' },
];

// Scroll to the bottom a screen at a time, then wait, so every scroll animation has played.
async function scrollThrough(page) {
  let last = -1;
  for (let i = 0; i < 200; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(60);
    const y = await page.evaluate(() => window.scrollY);
    if (Math.abs(y - last) < 1) break;
    last = y;
  }
  await page.waitForTimeout(2500);
}

// Run axe on the page as it is now: every WCAG 2.2 A/AA rule on the whole page, then the
// color-contrast rule once more on everything except the blended header bar (see above).
async function check(page) {
  const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
  const all = await new AxeBuilder({ page }).withTags(tags).disableRules(['color-contrast']).analyze();
  const contrast = await new AxeBuilder({ page }).withRules(['color-contrast']).exclude('.site-header__bar').analyze();
  return { violations: [...all.violations, ...contrast.violations] };
}

// The rolling links whose spoken names are checked.
const NAMED_LINKS = '.site-nav a, .site-footer__nav a, a.big-link';
// Three or more single letters in a row, each followed by a space: "C a s e s".
const SPACED_LETTERS = /(?:^|\s)(?:\S ){2,}\S(?:\s|$)/u;

// Ask Chrome for the name a screen reader would hear for every rolling link on the page, and
// give back the ones that come out as spaced-out letters (or with no name at all).
async function spacedNames(page) {
  const cdp = await page.context().newCDPSession(page);
  const bad = [];
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: NAMED_LINKS });
    for (const nodeId of nodeIds) {
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      // Links hidden at this screen size (the header links on phones) aren't read at all.
      const node = nodes.find((n) => !n.ignored);
      if (!node) continue;
      const name = (node.name && node.name.value) || '';
      if (!name.trim() || SPACED_LETTERS.test(name)) bad.push(name);
    }
  } finally {
    await cdp.detach().catch(() => {});
  }
  return bad;
}

const browser = await chromium.launch();
const pages = await pageList();
let serious = 0;
let minor = 0;

for (const setup of setups) {
  const { name, ...options } = setup;
  const context = await browser.newContext(options);
  for (const path of pages) {
    const page = await context.newPage();
    await page.goto(new URL(path, BASE).href, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    for (const where of ['top', 'bottom']) {
      if (where === 'bottom') await scrollThrough(page);
      const results = await check(page);
      for (const violation of results.violations) {
        const bad = violation.impact === 'serious' || violation.impact === 'critical';
        if (bad) serious += 1;
        else minor += 1;
        console.log(`${bad ? 'FAIL' : 'warn'} [${name}, ${where}] ${path}: ${violation.id} (${violation.impact}) ${violation.help}`);
        violation.nodes.slice(0, 5).forEach((node) => console.log(`       ${node.target.join(' ')}`));
      }
    }
    // After scrolling through, every rolling link has been set up: check their spoken names.
    for (const spoken of await spacedNames(page)) {
      serious += 1;
      console.log(`FAIL [${name}] ${path}: a rolling link is read as ${JSON.stringify(spoken)} (spaced-out letters or no name)`);
    }
    await page.close();
  }
  await context.close();
}
await browser.close();

console.log(`\nAccessibility check: ${pages.length} pages x ${setups.length} setups.`);
console.log(`${serious} serious or critical problem(s), ${minor} smaller one(s).`);
process.exit(serious > 0 ? 1 : 0);
