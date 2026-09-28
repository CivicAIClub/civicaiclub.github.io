// index.js: switches the site's motion on, and off again when asked.
//
// Base.astro loads this on every page. In plain words, it:
//   1. Loads every file in ./modules/ automatically. Each module handles one kind of motion
//      (text that rises, lines that draw, the cursor label, videos...). Adding motion to the site
//      means adding a new file there; nothing here needs to change.
//   2. Starts the modules marked "always" straight away. These work even when motion is off
//      (the video player: it still needs its Play buttons).
//   3. If motion is allowed (the device doesn't ask for less motion and the visitor hasn't
//      switched it off in the footer), it:
//        - adds the class "js-motion" to the page (elements may now start hidden),
//        - starts smooth scrolling (Lenis), driven by GSAP's clock so both stay in step,
//        - waits for the fonts (text must be measured in its real font before it is split
//          into lines), then starts every other module,
//        - starts the intro beat (unless the preloader will), and marks the page "motion-ready".
//   4. Stops everything cleanly if the device setting changes or the footer switch is flipped,
//      and starts it again if motion is turned back on.
//   5. On a page prepared in the background (a prerender), waits until the page is shown.

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {
  gsap,
  ScrollTrigger,
  MOTION_QUERY,
  userTurnedMotionOff,
  setLenis,
  getLenis,
  setContext,
  setStopper,
  introIsClaimed,
  fireIntro,
  resetIntro,
  markReady,
} from './core.js';

const root = document.documentElement;

// ---- 1. Find every module --------------------------------------------------------------------
// import.meta.glob (a feature of Vite, the tool Astro builds with) loads every .js file in
// ./modules/ and gives back their exports. Each module's "default" export looks like:
//   { name: 'reveal-lines', always: false, init() { ...; return cleanup; } }
const found = import.meta.glob('./modules/*.js', { eager: true });
const modules = Object.values(found)
  .map((file) => file.default)
  .filter((mod) => mod && typeof mod.init === 'function');

const alwaysModules = modules.filter((mod) => mod.always);
const motionModules = modules.filter((mod) => !mod.always);

// Start one module safely: if it has a bug, report it in the browser console and carry on with
// the others. If a motion module fails, also remove "js-motion" so no content stays hidden.
function startModule(mod) {
  try {
    return mod.init();
  } catch (error) {
    console.error(`[motion] The "${mod.name}" module failed to start.`, error);
    if (!mod.always) root.classList.remove('js-motion');
    return undefined;
  }
}

// Wait for the fonts, but never longer than 1.5 seconds (a slow font must not hold the page).
function fontsReady() {
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  return Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 1500))]);
}

// ---- 2. Modules that always run ----------------------------------------------------------------
alwaysModules.forEach(startModule);

// ---- 3. Motion on ------------------------------------------------------------------------------
let mm = null;

function start() {
  if (mm) return;
  // gsap.matchMedia runs the setup below only while the media query matches (no reduced-motion
  // request). If the device setting changes, GSAP undoes everything made inside it by itself.
  mm = gsap.matchMedia();
  let ran = false;
  mm.add(MOTION_QUERY, (context) => {
    // The footer switch can also turn motion off; then do nothing at all.
    if (userTurnedMotionOff()) return undefined;
    ran = true;

    root.classList.add('js-motion');
    setContext(context);

    // Smooth scrolling. GSAP's clock ("ticker") tells Lenis when to move, and every Lenis
    // scroll tells ScrollTrigger to update, so scroll animations never lag behind.
    const lenis = new Lenis({ autoRaf: false, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    // Don't let GSAP "catch up" after a slow frame; it would make scroll animations jump.
    gsap.ticker.lagSmoothing(0);
    setLenis(lenis);

    const cleanups = [];
    let stopped = false;

    fontsReady().then(() => {
      if (stopped) return;
      // Start every motion module inside the context, so all their animations can be undone.
      context.add(() => {
        motionModules.forEach((mod) => {
          const cleanup = startModule(mod);
          if (typeof cleanup === 'function') cleanups.push(cleanup);
        });
      });
      // No preloader on this page? Then the intro starts right away.
      if (!introIsClaimed()) fireIntro();
      // Measure every scroll animation's start and end now that the page's layout is final.
      ScrollTrigger.refresh();
      root.classList.add('motion-ready');
      markReady(true);
    });

    // What to do when motion stops (device setting changed, or the footer switch).
    return () => {
      stopped = true;
      cleanups.reverse().forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error('[motion] A module failed to clean up.', error);
        }
      });
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
      setContext(null);
      resetIntro();
      markReady(false);
      root.classList.remove('js-motion', 'motion-ready', 'js-preload', 'preload-running', 'preload-lifting');
    };
  });
  // If motion isn't allowed, the setup above never ran; make sure nothing is left hidden and
  // mark the page ready so the safety net in Base.astro has nothing to undo.
  if (!ran) {
    root.classList.remove('js-motion', 'js-preload');
    root.classList.add('motion-ready');
  }
}

// Stop all motion and undo everything it did (text goes back to normal, scrolling goes native).
function stop() {
  if (!mm) return;
  mm.revert();
  mm = null;
}

setStopper(stop);

// ---- 4. Listen for changes ----------------------------------------------------------------------

// The footer switch (src/scripts/site/motion-toggle.js) sends "civic:motion".
document.addEventListener('civic:motion', (event) => {
  if (event.detail && event.detail.enabled) start();
  else stop();
});

// The phone menu (src/scripts/site/menu.js) asks for scrolling to pause while it is open.
document.addEventListener('civic:scroll-lock', (event) => {
  const lenis = getLenis();
  if (!lenis) return;
  if (event.detail && event.detail.locked) lenis.stop();
  else lenis.start();
});

// A page Chrome prepared in the background (a "prerender", asked for by the speculation rules in
// Base.astro) runs its scripts before anyone sees it. Its motion waits until it is shown, so the
// page's intro (text rising, the hero arriving) plays for the visitor instead of out of sight.
if (document.prerendering) document.addEventListener('prerenderingchange', start, { once: true });
else start();
