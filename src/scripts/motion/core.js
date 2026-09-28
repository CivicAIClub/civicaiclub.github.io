// core.js: the shared toolbox for every animation on the site.
//
// The site's animations use GSAP (a widely used animation library, free since 2025) and two of
// its helpers: ScrollTrigger (start or scrub an animation as you scroll) and SplitText (cut text
// into lines, words or letters so each can move). Smooth scrolling uses Lenis.
// This file loads those once, sets up the site's two speed curves, and offers small helpers that
// the modules in ./modules/ share: "is motion allowed?", "run this when the page's intro starts",
// "the smooth scroller", and "stop everything".
//
// Rule for the club: GSAP and Lenis are only ever imported inside src/scripts/motion/.
// Pages and components ask for motion with data- attributes instead (see MOTION.md).
// A CI check (scripts/check-gsap-imports.mjs) enforces this.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Tell GSAP which helpers we use. This must happen once, before any animation is made.
gsap.registerPlugin(ScrollTrigger, SplitText);

// Build a speed curve from the four numbers of a CSS "cubic-bezier(x1, y1, x2, y2)". GSAP asks
// the curve "how far along should the animation be at this moment?" with a number from 0 (start)
// to 1 (end), and the curve answers with a number from 0 to 1.
// The four numbers describe an S-shaped line; this finds the point on that line for the moment
// asked about (by repeatedly halving the search range, which is simple and always exact enough).
function cubicBezier(x1, y1, x2, y2) {
  // Where the curve is, across (x) and up (y), at step t along it (t goes from 0 to 1).
  const at = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (progress) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    let low = 0;
    let high = 1;
    let t = progress;
    // 24 halvings pin t down to better than one millionth, far finer than a screen pixel.
    for (let i = 0; i < 24; i++) {
      if (at(t, x1, x2) < progress) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return at(t, y1, y2);
  };
}

// The site's own curve, "civic": a slow start, a fast middle and a slow end. It is the same curve
// as --ease-civic in src/styles/tokens.css ("cubic-bezier(0.7, 0, 0.3, 1)"), so CSS and GSAP motion
// feel alike. (GSAP's CustomEase helper could draw it too, but costs 3 KB more to download.)
gsap.registerEase('civic', cubicBezier(0.7, 0, 0.3, 1));

// The only two curves the site uses, by name. "out" is GSAP's expo.out: a fast start and a long,
// soft stop. Modules write EASE.out instead of typing 'expo.out', so a change happens in one place.
export const EASE = {
  civic: 'civic',
  out: 'expo.out',
  none: 'none',
};

export { gsap, ScrollTrigger, SplitText };

const root = document.documentElement;

// ---- Is motion allowed? --------------------------------------------------------------------

// The device-wide "reduce motion" setting, as a media query GSAP and CSS both understand.
export const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';

// True when the visitor's device asks websites to move less.
export function systemReducesMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// True when the visitor switched Motion off in the footer (Base.astro sets data-motion="off").
export function userTurnedMotionOff() {
  return root.getAttribute('data-motion') === 'off';
}

// True when animations may run: neither the device nor the visitor asked for less motion.
export function motionAllowed() {
  return !systemReducesMotion() && !userTurnedMotionOff();
}

// True on devices with a real mouse or trackpad (not touch screens). The cursor label and
// hover-only effects check this.
export function hasFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

// ---- The smooth scroller --------------------------------------------------------------------

let lenis = null;

// The Lenis smooth scroller while motion is on, or null when it is off (then the browser's
// normal scrolling is used). Always check for null before using it.
export function getLenis() {
  return lenis;
}

// Used by index.js only.
export function setLenis(instance) {
  lenis = instance;
}

// ---- Running things inside the motion "context" -----------------------------------------------
// GSAP can remember every animation made inside a "context" and undo them all at once. index.js
// makes one context while motion is on. Animations made later (on hover, on a click, on the
// intro beat) should be made through later(), so switching Motion off can undo them too.

let context = null;

// Used by index.js only.
export function setContext(ctx) {
  context = ctx;
}

// Run a function inside the motion context (or straight away if there isn't one).
export function later(fn) {
  if (context) return context.add(fn);
  return fn();
}

// ---- The intro beat ---------------------------------------------------------------------------
// The moment a page "arrives": straight away on most pages, or 0.6s into the home page's
// preloader. Modules ask to be told with onIntro(), e.g. the big CIVIC waits for it to land.

let introFired = false;
let introClaimed = false;
const introQueue = [];

// Run fn at the intro beat (or now, if it has already happened).
export function onIntro(fn) {
  if (introFired) later(fn);
  else introQueue.push(fn);
}

// The preloader calls this while it sets up, meaning "I'll say when the intro starts".
export function claimIntro() {
  introClaimed = true;
}

// True when a module (the preloader) will start the intro itself.
export function introIsClaimed() {
  return introClaimed;
}

// Start the intro: run everything that asked to be told.
export function fireIntro() {
  if (introFired) return;
  introFired = true;
  introQueue.splice(0).forEach((fn) => later(fn));
  document.dispatchEvent(new CustomEvent('civic:intro'));
}

// Used by index.js when motion stops, so turning it back on starts fresh.
export function resetIntro() {
  introFired = false;
  introClaimed = false;
  introQueue.length = 0;
}

// ---- Ready ------------------------------------------------------------------------------------
// "Ready" means the fonts have loaded and every module has set itself up.

const readyQueue = [];
let isReady = false;

// Run fn once motion is ready (or now, if it already is).
export function onReady(fn) {
  if (isReady) later(fn);
  else readyQueue.push(fn);
}

// Used by index.js only.
export function markReady(ready) {
  isReady = ready;
  if (ready) readyQueue.splice(0).forEach((fn) => later(fn));
}

// ---- Stop everything --------------------------------------------------------------------------

let stopper = null;

// Used by index.js to register how to stop the motion system.
export function setStopper(fn) {
  stopper = fn;
}

// Stop every animation, undo every text split and scroll effect, and hand scrolling back to the
// browser. The footer's Motion switch uses this (through index.js).
export function killAll() {
  if (stopper) stopper();
}

// ---- Small helpers ----------------------------------------------------------------------------

// "Play once" for scroll-started animations: play when the start line is crossed going down, and
// never reverse or replay. We use this instead of ScrollTrigger's `once: true`, because a `once`
// trigger deletes itself, and if that happens while GSAP is re-measuring every trigger (for
// example when Motion is switched back on near the bottom of a page) GSAP can trip over the gap.
export const PLAY_ONCE = 'play none none none';

// Read a number from a data- attribute, e.g. data-reveal-delay="0.2", with a fallback.
export function numberAttr(el, name, fallback) {
  const value = parseFloat(el.getAttribute(name) ?? '');
  return Number.isFinite(value) ? value : fallback;
}

// Send a named message on the page that other scripts can listen for.
export function emit(name, detail = {}, target = document) {
  target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}
