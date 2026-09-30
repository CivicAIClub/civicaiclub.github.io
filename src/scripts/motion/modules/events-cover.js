// events-cover.js: the opening of an event page's cover (src/components/events/EventCover.astro).
//
// Asked for with:
//   <div data-events-cover-words>        the name, the leader and the facts (they drift, M4)
//   <span data-events-leader>            the thin line between "Week" and "May 17"
//   <p data-events-jump>                 holds the "The program" link in the facts row
//   <div data-events-cover-media>        the cover frame, holding the photo (a <picture>) and
//     <div data-events-bands>            six ink bands over it, one per two columns
//       <span data-events-band> x 6
//
// What it does, while motion is on:
//   1. The grid opens. The photo starts hidden under the ink bands (CSS in src/styles/events.css
//      shows them only with motion on). 0.25 seconds after the page's intro beat, each band lifts
//      off from the top down (its visible part shrinks towards its bottom edge, with clip-path
//      inset), 0.1 seconds apart from left to right, so the photo is uncovered column by column
//      like a shutter. The frame is tall and usually only its top part is on screen when the
//      page opens, so the lift is timed to that part: each band clears the part of the frame
//      that is inside the window over 0.9 seconds on the civic curve (a slow start, a quick
//      middle), and the rest of it, off screen, goes at once. At the same time the photo settles
//      from 106% of its size to 100% over 2.2 seconds. Then the frame is marked "is-open" (the
//      CSS hides the bands for good) and the photo's size is left alone. When none of the frame
//      is on screen (a page reloaded further down), the photo is simply shown.
//      Tablets show four bands and phones three (the grid has 8 and 6 columns there); only the
//      bands on screen move. The hidden ones are set fully lifted from the start, so turning a
//      tablet or widening the window during the opening never shows a band that stays down.
//      Showing the photo without the opening also lifts every band, and "is-open" hides them.
//      A photo handed over from the page before (Base.astro marks the page data-arrived="handoff",
//      see modules/events-handoff.js) is already in place, so the bands are skipped.
//   2. The leader line draws from the left, 0.55 seconds after the intro beat (1.0 second on the
//      civic curve).
//   3. "The program" link rises into its window (from 110% of its height, 1.4 seconds on
//      expo.out, like the line rise M1) 0.35 seconds after the intro beat, just after the facts
//      beside it, so nothing in the cover is on show before the name.
//      Keyboard: the words drift under the frame as the page scrolls, so when the link gets
//      keyboard focus while the frame covers it (for example Shift+Tab back up the page), the
//      page jumps back to the top, where the link sits on plain ink. (The CSS also lifts the words
//      above the frame while the link has focus.)
//   4. Clean-up: the frame's growth to full width reuses the case pages' module
//      (modules/case-hero-grow.js), which only puts a case page's words back in place when Motion
//      is switched off. This module does the same for the event's words.

import { gsap, EASE, onIntro, getLenis } from '../core.js';

export default {
  name: 'events-cover',
  init() {
    const frame = document.querySelector('[data-events-cover-media]');
    const leader = document.querySelector('[data-events-leader]');
    const jump = document.querySelector('[data-events-jump]');
    if (!frame && !leader) return undefined; // not an event page
    const root = document.documentElement;

    // ---- 1. The grid opens ----
    const bandsBox = frame?.querySelector('[data-events-bands]');
    const picture = frame?.querySelector('picture');
    // Every band, and the ones shown at this screen size (the others are display: none in the
    // CSS until the window gets wider).
    const allBands = bandsBox ? [...bandsBox.querySelectorAll('[data-events-band]')] : [];
    const bands = allBands.filter((band) => band.getClientRects().length > 0);
    // True when this page arrived through the photo hand-off (Base.astro marks it).
    const handedOver = () => root.getAttribute('data-arrived') === 'handoff' || root.classList.contains('vt-handoff');
    let opening = null;
    // Show the photo as it is, with no bands: after a hand-off, or when there are no bands.
    const skipOpening = () => {
      if (opening) opening.kill();
      opening = null;
      if (picture) gsap.set(picture, { clearProps: 'transform,transformOrigin,scale' });
      if (allBands.length) gsap.set(allBands, { clearProps: 'clipPath' });
      frame.classList.add('is-open');
    };
    // A page Chrome prepared in the background can be marked a moment after this module starts,
    // when it is revealed; check again then.
    const onReveal = () => {
      if (frame && handedOver() && !frame.classList.contains('is-open')) skipOpening();
    };

    if (frame && (handedOver() || !bands.length)) {
      skipOpening();
    } else if (frame) {
      // Starting positions: every band on show fully covering its columns (the hidden ones
      // already lifted), the photo slightly enlarged.
      gsap.set(allBands, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(bands, { clipPath: 'inset(0% 0% 0% 0%)' });
      if (picture) gsap.set(picture, { scale: 1.06, transformOrigin: '50% 50%' });
      window.addEventListener('pagereveal', onReveal);
      onIntro(() => {
        if (handedOver()) {
          skipOpening();
          return;
        }
        // Which part of the frame is inside the window right now, as shares of its height: from
        // "top" (0 unless the page opened scrolled past the frame's top edge) to "bottom".
        const box = frame.getBoundingClientRect();
        const top = gsap.utils.clamp(0, 1, -box.top / box.height);
        const bottom = gsap.utils.clamp(0, 1, (window.innerHeight - box.top) / box.height);
        if (!box.height || bottom <= top) {
          skipOpening();
          return;
        }
        const inset = (share) => `inset(${(share * 100).toFixed(2)}% 0% 0% 0%)`;
        opening = gsap.timeline({
          delay: 0.25,
          onComplete: () => {
            frame.classList.add('is-open');
            if (picture) gsap.set(picture, { clearProps: 'transform,transformOrigin,scale' });
          },
        });
        bands.forEach((band, i) => {
          const at = i * 0.1;
          // Off screen above: gone at once. On screen: cleared slowly. Off screen below: gone as
          // soon as the on-screen part is.
          opening.set(band, { clipPath: inset(top) }, at);
          opening.to(band, { clipPath: inset(bottom), duration: 0.9, ease: EASE.civic }, at);
          opening.set(band, { clipPath: inset(1) }, at + 0.9);
        });
        if (picture) opening.to(picture, { scale: 1, duration: 2.2, ease: EASE.out }, 0);
      });
    }

    // ---- 2. The leader draws ----
    if (leader) {
      // GSAP holds the line at zero width from now on, so the CSS starting rule can step aside.
      gsap.set(leader, { scaleX: 0, transformOrigin: '0% 50%' });
      leader.classList.add('is-drawn');
      onIntro(() => {
        gsap.to(leader, { scaleX: 1, duration: 1.0, ease: EASE.civic, delay: 0.55 });
      });
    }

    // ---- 3. "The program" link rises ----
    const link = jump?.firstElementChild;
    if (jump && link) {
      // The link waits just below its window (the window cuts only at its bottom edge, so the
      // focus ring around the link is never clipped once it is up), then the CSS that hid it
      // before this moment steps aside ("is-ready").
      gsap.set(jump, { clipPath: 'inset(-1em -1em 0% -1em)' });
      gsap.set(link, { yPercent: 110 });
      jump.classList.add('is-ready');
      onIntro(() => {
        gsap.to(link, {
          yPercent: 0,
          duration: 1.4,
          ease: EASE.out,
          delay: 0.35,
          onComplete: () => {
            gsap.set(jump, { clearProps: 'clipPath' });
            gsap.set(link, { clearProps: 'transform' });
          },
        });
      });
    }

    // Keyboard focus on the link while the frame covers it: back to the top of the page.
    const onFocus = () => {
      if (!link || !frame) return;
      const a = link.getBoundingClientRect();
      const b = frame.getBoundingClientRect();
      const covered = a.bottom > b.top && a.top < b.bottom && a.right > b.left && a.left < b.right;
      if (!covered) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
    };
    if (link) link.addEventListener('focus', onFocus);

    // ---- 4. Clean-up when Motion is switched off ----
    return () => {
      window.removeEventListener('pagereveal', onReveal);
      if (link) link.removeEventListener('focus', onFocus);
      if (frame) frame.classList.remove('is-open');
      if (leader) leader.classList.remove('is-drawn');
      if (jump) jump.classList.remove('is-ready');
      // Once the motion code has undone its animations (a moment later, "setTimeout 0"), also
      // wipe the half-speed drift from the words (the shared parallax module moved them), so the
      // cover is back to its plain layout.
      setTimeout(() => {
        gsap.set('[data-events-cover-words]', { clearProps: 'transform,translate,rotate,scale' });
        if (picture) gsap.set(picture, { clearProps: 'transform,transformOrigin,scale' });
        if (allBands.length) gsap.set(allBands, { clearProps: 'clipPath' });
        if (jump) gsap.set(jump, { clearProps: 'clipPath' });
        if (link) gsap.set(link, { clearProps: 'transform' });
      }, 0);
    };
  },
};
