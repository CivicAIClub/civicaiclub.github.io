// header.js: the header's two moves (Header.astro).
//
// 1. Arrival (home page only, html data-intro="home"): the griffin, the name, the links and the
//    call to action (on phones: the Menu button) drop into place from just above their windows,
//    0.06s apart over 1.2s, on the page's intro beat (the same moment the big CIVIC starts
//    landing).
// 2. The swap: when a section marked data-header-swap reaches the top of the window (the reel on
//    the home page), "Civic AI Club / Pomfret School" rolls up and out and a small CIVIC rolls up
//    into its place (motion M9, 0.9s on expo.out). Scrolling back above that section swaps back.
// 3. Hide on scroll: once the visitor is well into the page, scrolling down slides the whole
//    header (the bar and the ink strip behind it, see src/scripts/site/header-backdrop.js) up
//    and out of sight, 0.6s on the "civic" curve, so it never prints over the page's own text
//    and footage. It slides back as soon as the visitor scrolls up a little (8px or more).
//    It only starts hiding once the name-to-CIVIC swap has happened and has had 0.6s to play
//    (or one screen down on pages without a swap), so the swap is always seen. (Waiting for half
//    a screen more was tried: on the case pages it left the header printed over the first lines
//    of "The chore".) It always stays on show:
//      - near the top of the page and near the footer,
//      - while anything in the header has keyboard focus (tabbing into it brings it back),
//      - while the phone menu is open,
//      - while an element marked data-header-keep is stuck to the top of the window (the home
//        page's docket stage and the About page's Frame, which are designed with the header in
//        view). Once it starts scrolling away, the header may hide again.
//    With motion off none of this runs, and the header simply stays put.

import { gsap, ScrollTrigger, EASE, onIntro, later } from '../core.js';

// How far (in pixels) the visitor must scroll up before a hidden header comes back.
const SHOW_AFTER_UP = 8;
// How long (in milliseconds) the name-to-CIVIC swap plays before the header may hide.
const SWAP_SEEN = 600;

export default {
  name: 'header',
  init() {
    const bar = document.querySelector('[data-header]');
    if (!bar) return undefined;
    const root = document.documentElement;
    const cleanups = [];

    // ---- 1. Arrival ----
    if (root.getAttribute('data-intro') === 'home') {
      // Only the items shown at this screen size (on phones the links are replaced by the Menu
      // button), so the stagger has no invisible gaps.
      const items = [...bar.querySelectorAll('[data-header-item]')].filter((item) => item.getClientRects().length > 0);
      bar.classList.add('is-intro');
      gsap.set(items, { yPercent: -110 });
      bar.classList.add('is-ready');
      onIntro(() => {
        gsap.to(items, {
          yPercent: 0,
          duration: 1.2,
          ease: EASE.out,
          stagger: 0.06,
          // Afterwards, remove the clipping windows so focus rings are never cut off.
          onComplete: () => bar.classList.remove('is-intro'),
        });
      });
      cleanups.push(() => bar.classList.remove('is-intro', 'is-ready'));
    }

    // ---- 2. The swap ----
    const swapSection = document.querySelector('[data-header-swap]');
    const tagline = bar.querySelector('[data-header-tagline]');
    const mark = bar.querySelector('[data-header-mark]');
    // Whether the small CIVIC is showing, and when it started rolling in (used by part 3).
    let showingMark = false;
    let swappedAt = 0;
    if (swapSection && tagline && mark) {
      gsap.set(mark, { yPercent: 110, visibility: 'visible' });

      const swap = (toMark) => {
        if (toMark === showingMark) return;
        showingMark = toMark;
        if (toMark) swappedAt = performance.now();
        later(() => {
          gsap.to(tagline, { yPercent: toMark ? -110 : 0, duration: 0.9, ease: EASE.out, overwrite: true });
          gsap.fromTo(
            mark,
            { yPercent: toMark ? 110 : 0 },
            { yPercent: toMark ? 0 : 110, duration: 0.9, ease: EASE.out, overwrite: true }
          );
        });
      };

      ScrollTrigger.create({
        trigger: swapSection,
        // "top top+=31": when the section's top edge reaches the middle of the 62px header.
        start: () => `top top+=${Math.round(bar.offsetHeight / 2)}`,
        onEnter: () => swap(true),
        onLeaveBack: () => swap(false),
      });
      cleanups.push(() => gsap.set([tagline, mark], { clearProps: 'all' }));
    }

    // ---- 3. Hide on scroll ----
    const header = bar.closest('header');
    const strip = document.querySelector('[data-header-backdrop]');
    const main = document.querySelector('main');
    // The bar and the strip move together. (The <header> itself can't be moved: that would stop
    // the bar's blend from reaching the page behind it.)
    const moving = [bar, strip].filter(Boolean);
    let hidden = false;
    let lastY = window.scrollY;
    let upDistance = 0;
    let queued = false;

    // May the header hide yet? On pages with a swap: once the small CIVIC has been rolling in
    // for 0.6s. On pages without one: once the visitor is one screen down.
    const mayHide = (y) => {
      if (swapSection && tagline && mark) return showingMark && performance.now() - swappedAt >= SWAP_SEEN;
      return y >= window.innerHeight;
    };

    // Slide the header out of sight, or back in.
    const setHidden = (hide) => {
      if (hide === hidden) return;
      hidden = hide;
      later(() => gsap.to(moving, { yPercent: hide ? -100 : 0, duration: 0.6, ease: EASE.civic, overwrite: true }));
    };

    // True while something asks for the header to stay on show (see the list at the top).
    const mustShow = (y) => {
      if (!mayHide(y)) return true;
      if (header && header.matches(':focus-within')) return true;
      if (root.classList.contains('menu-open')) return true;
      // Near the footer: the page's bottom edge is within about a screen of the window's bottom.
      if (main && main.getBoundingClientRect().bottom < window.innerHeight * 1.1) return true;
      // Only while it is stuck at the top (its top edge at 0): once it starts scrolling away, the
      // header may hide again, so it never prints over the stage's last lines as they pass under it.
      const band = bar.offsetHeight;
      return [...document.querySelectorAll('[data-header-keep]')].some((el) => {
        const box = el.getBoundingClientRect();
        return box.height > 0 && Math.abs(box.top) <= 1 && box.bottom >= band;
      });
    };

    // Look at the scroll once per frame: which way did it go, and should the header hide?
    const decide = () => {
      queued = false;
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (dy < 0) upDistance -= dy;
      else if (dy > 0) upDistance = 0;
      if (mustShow(y)) setHidden(false);
      else if (dy > 0) setHidden(true);
      else if (upDistance >= SHOW_AFTER_UP) setHidden(false);
    };
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(decide);
    };
    // Keyboard focus arriving in the header shows it at once (focus moving out is checked too).
    const onFocus = () => {
      upDistance = 0;
      queue();
    };

    window.addEventListener('scroll', queue, { passive: true });
    document.addEventListener('civic:scroll-lock', queue);
    if (header) {
      header.addEventListener('focusin', onFocus);
      header.addEventListener('focusout', onFocus);
    }
    decide();
    cleanups.push(() => {
      window.removeEventListener('scroll', queue);
      document.removeEventListener('civic:scroll-lock', queue);
      if (header) {
        header.removeEventListener('focusin', onFocus);
        header.removeEventListener('focusout', onFocus);
      }
      gsap.killTweensOf(moving);
      gsap.set(moving, { clearProps: 'transform' });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  },
};
