// wordmark.js: the big CIVIC at the top of the home page (Wordmark.astro, variant="hero").
//
// 1. Landing. On the page's intro beat, each letter rises into view from just below the logo's
//    window: 1.6s on expo.out, 0.09s apart, starting from both ends at once. CIVIC reads the same
//    both ways, so the two Cs land first, then the two Is, then the V.
// 2. Scrolling. As the hero scrolls away, the whole logo moves down at half the scroll speed, so
//    it trails behind the page, and its letters drift apart evenly: the Cs by 1.5% of the window
//    width each way, the Is by 0.75%, the V stays put. Both are tied directly to the scroll.

import { gsap, EASE, onIntro } from '../core.js';

// How far each letter drifts sideways, in percent of the window width (vw), left to right.
const DRIFT_VW = [-1.5, -0.75, 0, 0.75, 1.5];

export default {
  name: 'wordmark',
  init() {
    const word = document.querySelector('[data-wordmark="hero"]');
    const svg = word?.querySelector('svg');
    if (!word || !svg) return undefined;
    const letters = [...svg.querySelectorAll('path')];
    const box = svg.viewBox.baseVal;

    // ---- 1. Landing ----
    // Push every letter just below the bottom of the logo's window (in the logo's own units).
    gsap.set(letters, { y: box.height * 1.1 });
    word.classList.add('is-ready');
    onIntro(() => {
      gsap.to(letters, {
        y: 0,
        duration: 1.6,
        ease: EASE.out,
        stagger: { each: 0.09, from: 'edges' },
      });
    });

    // ---- 2. Scrolling ----
    // The logo is drawn smaller or larger than its own units; this converts window-width
    // percentages into the logo's units at the current size.
    const unitsPerPixel = () => box.width / Math.max(1, svg.getBoundingClientRect().width);
    const hero = word.closest('section') || word.parentElement;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    tl.to(word, { y: () => hero.offsetHeight * 0.5, ease: 'none' }, 0);
    letters.forEach((letter, i) => {
      tl.to(
        letter,
        { x: () => (DRIFT_VW[i] ?? 0) * (window.innerWidth / 100) * unitsPerPixel(), ease: 'none' },
        0
      );
    });

    return () => word.classList.remove('is-ready');
  },
};
