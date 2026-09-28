// preloader.js: plays the home page's opening sheet (Preloader.astro) and hands off to the page.
//
// It only runs when the tiny script in Base.astro added the class "js-preload" (first page of the
// browser session, home page, motion allowed). The timing, in seconds from when it starts:
//   0 to 0.55  the griffin and the five words darken from light grey to ink, 0.075s apart,
//              each taking 0.25s;
//   0.6        the paper sheet lifts off the top of the screen (0.8s on the "civic" curve). The
//              line inside moves down by exactly as much, so it holds still while the sheet's
//              edge wipes past it. On this same beat the intro starts: the header drops in and
//              the big CIVIC lands (see header.js and wordmark.js);
//   1.0        smooth scrolling is switched back on;
//   1.4        done: the sheet is removed.

import { gsap, EASE, claimIntro, fireIntro, getLenis } from '../core.js';

export default {
  name: 'preloader',
  init() {
    const root = document.documentElement;
    const sheet = document.querySelector('[data-preloader]');
    if (!sheet || !root.classList.contains('js-preload')) return undefined;

    // Tell the motion system that this module will start the intro.
    claimIntro();
    root.classList.add('preload-running');

    // Start from the top of the page, with scrolling paused.
    window.scrollTo(0, 0);
    const lenis = getLenis();
    if (lenis) lenis.stop();

    const words = sheet.querySelectorAll('[data-preloader-word]');
    const hold = sheet.querySelector('[data-preloader-hold]');

    // Put everything back to normal and remove the sheet.
    const finish = () => {
      root.classList.remove('js-preload', 'preload-running', 'preload-lifting');
      sheet.hidden = true;
      gsap.set([sheet, hold, words], { clearProps: 'all' });
      const current = getLenis();
      if (current) current.start();
    };

    const tl = gsap.timeline();
    tl.fromTo(words, { color: '#c9c7c0' }, { color: '#0d0d0c', duration: 0.25, stagger: 0.075, ease: 'none' }, 0);
    tl.to(sheet, { yPercent: -100, duration: 0.8, ease: EASE.civic }, 0.6);
    if (hold) tl.to(hold, { yPercent: 100, duration: 0.8, ease: EASE.civic }, 0.6);
    tl.call(fireIntro, [], 0.6);
    tl.call(
      () => {
        root.classList.add('preload-lifting');
        const current = getLenis();
        if (current) current.start();
      },
      [],
      1.0
    );
    tl.call(finish, [], 1.4);

    return () => {
      tl.kill();
      finish();
    };
  },
};
