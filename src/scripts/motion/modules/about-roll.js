// about-roll.js: the About page's roll of every member (src/components/about/Roll.astro).
//
// Asked for with:  <ul data-about-roll> whose items each hold one <span data-about-roll-line>
//                  (one name). Each item is a clipped window ("mask") the name rises into.
//
// What it does: every name starts tucked just below its window (110% of its own height down).
// As the roll scrolls into view, the names rise into place row by row: a name starts rising
// when it comes 8% above the bottom of the window, and names that arrive together (the three
// names on one row, or several rows when scrolling fast) go 0.05 seconds apart, reading across
// each row. Each rise takes 1.4 seconds on the expo.out curve, like the site's other text
// (motion M1). Each name rises once.
//
// Runs only when motion is on. Without motion the names are simply there.

import { gsap, ScrollTrigger, EASE } from '../core.js';

export default {
  name: 'about-roll',
  init() {
    const lists = document.querySelectorAll('[data-about-roll]');
    if (!lists.length) return undefined;
    const triggers = [];

    lists.forEach((list) => {
      const lines = [...list.querySelectorAll('[data-about-roll-line]')];
      if (!lines.length) return;

      // Tuck every name under its window, then let the CSS that hid the list step aside.
      gsap.set(lines, { yPercent: 110 });
      list.classList.add('is-ready');

      // Rise the names handed over together. Read across each row: sort them from top to
      // bottom, then left to right, so the stagger follows the eye.
      const rise = (batch) => {
        const ordered = [...batch].sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return Math.round(ra.top - rb.top) || ra.left - rb.left;
        });
        gsap.to(ordered, { yPercent: 0, duration: 1.4, ease: EASE.out, stagger: 0.05, overwrite: 'auto' });
      };

      // "batch" watches every name and hands over, together, the ones that crossed the line
      // in the same moment, so a whole row rises as one gesture instead of name by name.
      // Names already scrolled past (the page was opened lower down, or scrolled quickly) are
      // raised too, whichever way they come back into view, so none can stay hidden.
      triggers.push(
        ...ScrollTrigger.batch(lines, {
          start: 'top 92%',
          interval: 0.08,
          onEnter: rise,
          onLeave: rise,
          onEnterBack: rise,
        })
      );
    });

    // Switching Motion off: forget "is-ready" (GSAP puts the names back in place by itself) and
    // remove the scroll watchers.
    return () => {
      triggers.forEach((trigger) => trigger.kill());
      lists.forEach((list) => list.classList.remove('is-ready'));
    };
  },
};
