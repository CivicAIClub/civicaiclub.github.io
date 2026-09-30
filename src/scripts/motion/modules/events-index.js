// events-index.js: the head of /events/ (src/pages/events/index.astro): the giant "Events" and
// the latest event's photo band under it.
//
// Asked for with:  <h1 data-events-title> holding one <span data-events-title-char> per letter
//                  (each inside its own clipped window) and a <span data-events-title-count> for
//                  the small "(01)";
//                  <div data-events-feature-window> the photo band's window, holding
//                  <div data-events-feature-inner> (the photo).
//
// What it does, on the page's intro beat:
//   1. The letters rise into their windows from just below (110% of their height) over 1.6
//      seconds on expo.out, 0.09 seconds apart, starting from both ends at once: E and s first,
//      then v and n, then e and t. It is the same entrance as the big CIVIC on the home page
//      (modules/wordmark.js). The count fades in 0.8 seconds after the first letter starts, over
//      1.2 seconds.
//   2. 0.5 seconds in, when the outer letters are about halfway up, the photo band opens from the
//      top down like every photo on the site (motion M3: its visible part grows from nothing to
//      the full band, while the photo inside slides down from 30% higher into place), over 1.6
//      seconds on expo.out. So the word lands first and the photo opens under it. (The band
//      would otherwise open on its own the moment the page loads, before any letter shows.)
// Runs only when motion is on (index.js starts it). Without motion the word and the photo are
// simply there.

import { gsap, EASE, onIntro } from '../core.js';

export default {
  name: 'events-index',
  init() {
    const title = document.querySelector('[data-events-title]');
    if (!title) return undefined; // not the /events/ page
    const letters = [...title.querySelectorAll('[data-events-title-char]')];
    const count = title.querySelector('[data-events-title-count]');
    const band = document.querySelector('[data-events-feature-window]');
    const inner = band ? band.querySelector('[data-events-feature-inner]') : null;

    // Tuck every letter below its window and hide the count, then let the CSS that hid them
    // before this moment step aside ("is-ready").
    gsap.set(letters, { yPercent: 110 });
    if (count) gsap.set(count, { opacity: 0 });
    title.classList.add('is-ready');
    // Close the band (GSAP holds it closed from now on, so its CSS starting rule steps aside too:
    // "is-open").
    if (band) {
      gsap.set(band, { clipPath: 'inset(0% 0% 100% 0%)' });
      if (inner) gsap.set(inner, { yPercent: -30 });
      band.classList.add('is-open');
    }

    // On the intro beat: the letters rise from both ends, the count fades in on top, and the band
    // opens once the letters are halfway up.
    onIntro(() => {
      const tl = gsap.timeline();
      tl.to(letters, { yPercent: 0, duration: 1.6, ease: EASE.out, stagger: { each: 0.09, from: 'edges' } }, 0);
      if (count) tl.to(count, { opacity: 1, duration: 1.2, ease: EASE.out }, 0.8);
      if (band) {
        tl.to(band, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: EASE.out }, 0.5);
        if (inner) tl.to(inner, { yPercent: 0, duration: 1.6, ease: EASE.out }, 0.5);
      }
    });

    // Switching Motion off: forget "is-ready" and "is-open" so the next start sets everything up
    // again. (GSAP itself puts every letter and the band back when the motion context is undone.)
    return () => {
      title.classList.remove('is-ready');
      if (band) band.classList.remove('is-open');
    };
  },
};
