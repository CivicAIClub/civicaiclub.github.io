// about-proof.js: the About page's giant "Merged" (src/components/about/Proof.astro).
//
// Asked for with:  <h2 data-about-flip> with one <span data-about-flip-char> per letter and a
//                  <span data-about-flip-count> for the small "(×50)".
//
// What it does: once the whole word is in view (its bottom edge reaches 92% of the way down the
// window, so no letter is still below the screen when the flip starts), each letter flips up
// into place in 3D, hinged on its bottom edge like a card being stood up on a table: it starts
// lying flat (turned 90 degrees back, and 5 degrees sideways) and
// swings upright over 1.8 seconds on the expo.out curve (a fast start and a long, soft stop).
// The letters go one after another, 0.06 seconds apart. The count fades in 0.8 seconds after
// the first letter starts. It plays once.
// The "depth" (perspective) comes from the word's CSS in Proof.astro.
//
// Runs only when motion is on (index.js starts it). Without motion the word is simply there.

import { gsap, EASE, PLAY_ONCE } from '../core.js';

export default {
  name: 'about-proof',
  init() {
    const words = document.querySelectorAll('[data-about-flip]');
    if (!words.length) return undefined;

    words.forEach((word) => {
      const letters = word.querySelectorAll('[data-about-flip-char]');
      const count = word.querySelector('[data-about-flip-count]');

      // Lay every letter flat, and hide the count, before the word is shown.
      gsap.set(letters, { rotationX: 90, rotationY: -5, transformOrigin: '50% 100%' });
      if (count) gsap.set(count, { opacity: 0 });
      // The letters are in their starting positions, so the CSS that hid them can step aside.
      word.classList.add('is-ready');

      // One timeline: the letters stand up one by one, and the count fades in on top.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: word, start: 'bottom 92%', toggleActions: PLAY_ONCE },
      });
      tl.to(letters, { rotationX: 0, rotationY: 0, duration: 1.8, ease: EASE.out, stagger: 0.06 }, 0);
      if (count) tl.to(count, { opacity: 1, duration: 1.2, ease: EASE.out }, 0.8);
    });

    // Switching Motion off: forget "is-ready" so the next start sets the letters up again.
    // (GSAP itself puts every letter back upright when the motion context is undone.)
    return () => words.forEach((word) => word.classList.remove('is-ready'));
  },
};
