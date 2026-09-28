// footer.js: the footer's curtain reveal and the CIVIC that rebuilds (Footer.astro).
//
// 1. The curtain. If the footer fits in the window, it is stuck to the bottom of the window
//    underneath the page (class "is-curtain"), so scrolling to the end lifts the page away like
//    a curtain and reveals it. As that happens, the footer's content moves from 20% higher down
//    to its resting place, tied directly to the scroll (motion M4).
// 2. The wordmark. The big CIVIC's letters start hidden above their window. When half of the
//    footer is showing, they drop into place from the center outward (the V first, then the Is,
//    then the Cs): 1.8 seconds each on expo.out. It plays once.

import { gsap, ScrollTrigger, EASE, PLAY_ONCE, getLenis } from '../core.js';

export default {
  name: 'footer',
  init() {
    const footer = document.querySelector('[data-footer]');
    const main = document.querySelector('.site-main');
    if (!footer || !main) return undefined;
    const inner = footer.querySelector('[data-footer-inner]');
    const cleanups = [];

    // ---- 1. The curtain ----
    // Only when the whole footer fits on screen; otherwise its top would never be seen.
    const fits = () => footer.offsetHeight <= window.innerHeight;
    // "is-set" shows the footer again (Footer.astro keeps it invisible until this has run), so it
    // appears straight in its stuck place instead of jumping there, which browsers would count
    // as the page "shifting" (a Core Web Vitals score) even though the page covers it.
    // It is only shown once the site's fonts have arrived (or after 8 seconds at most): on a slow
    // phone connection the motion can start before them, and the footer's text would then
    // re-wrap in the real fonts and change its height while showing, which counts as shifting too.
    let fontsDone = !document.fonts || document.fonts.status === 'loaded';
    let stopped = false;
    // The footer is moved into its stuck place first, and only shown two frames later, so the
    // browser never sees it moving while it is visible.
    let showQueued = false;
    const setCurtain = () => {
      footer.classList.toggle('is-curtain', fits());
      if (!fontsDone || showQueued || footer.classList.contains('is-set')) return;
      showQueued = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          showQueued = false;
          if (!stopped) footer.classList.add('is-set');
        })
      );
    };
    setCurtain();
    ScrollTrigger.addEventListener('refreshInit', setCurtain);
    if (!fontsDone) {
      const whenFonts = () => {
        if (fontsDone || stopped) return;
        fontsDone = true;
        setCurtain();
      };
      document.fonts.ready.then(whenFonts);
      const fontTimer = setTimeout(whenFonts, 8000);
      cleanups.push(() => clearTimeout(fontTimer));
    }

    // A keyboard user tabbing into the footer must be able to see where they are, but the
    // footer can still be tucked under the page. So when focus lands in the footer, scroll to
    // the very end, where the footer is fully uncovered.
    const onFocus = () => {
      if (!footer.classList.contains('is-curtain')) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo('bottom', { immediate: true });
      else window.scrollTo(0, document.documentElement.scrollHeight);
    };
    footer.addEventListener('focusin', onFocus);

    cleanups.push(() => {
      stopped = true;
      ScrollTrigger.removeEventListener('refreshInit', setCurtain);
      footer.removeEventListener('focusin', onFocus);
      footer.classList.remove('is-curtain', 'is-set');
    });

    // The footer is revealed while the bottom of the page content travels from the bottom of
    // the window up by one footer height.
    if (inner) {
      gsap.fromTo(
        inner,
        { yPercent: -20 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: main,
            start: 'bottom bottom',
            end: () => `bottom bottom-=${footer.offsetHeight}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
    }

    // ---- 2. The wordmark rebuild ----
    const word = footer.querySelector('[data-wordmark="footer"]');
    const svg = word?.querySelector('svg');
    if (word && svg) {
      const letters = svg.querySelectorAll('path');
      // Move each letter just above the top of the logo's window (in the logo's own units).
      const lift = svg.viewBox.baseVal.height * 1.1;
      gsap.set(letters, { y: -lift });
      word.classList.add('is-ready');
      gsap.to(letters, {
        y: 0,
        duration: 1.8,
        ease: EASE.out,
        stagger: { each: 0.09, from: 'center' },
        scrollTrigger: {
          trigger: main,
          // "Half the footer is showing" (or half the window, for a very tall footer).
          start: () => `bottom bottom-=${Math.min(footer.offsetHeight, window.innerHeight) * 0.5}`,
          toggleActions: PLAY_ONCE,
          invalidateOnRefresh: true,
        },
      });
      cleanups.push(() => word.classList.remove('is-ready'));
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  },
};
