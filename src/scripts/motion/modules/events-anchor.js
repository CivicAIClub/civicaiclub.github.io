// events-anchor.js: arriving on an event page at one of its own places, for example a shared link
// to /events/ai-literacy-week/#takeaways (the part after the "#" names a part of the page).
//
// Asked for with: nothing new. It only runs on pages with a part that gets pinned on a laptop:
// the demo sheet ([data-events-demo], events-demo.js) or the proofread question
// ([data-events-question], events-question.js).
//
// Why it exists: the browser jumps to the named part while the page loads, before the motion code
// starts. On a laptop the motion code then pins the demo sheet and the question, which makes
// them much taller (220% and 250% of a screen), so every part below them moves down by a few
// screens and the visitor is left looking at something else. Nothing moved them back before.
// What it does:
//   1. When it starts (before the pins are added: the modules start in the order of their file
//      names), it checks that the named part is still on screen, that is, the visitor is still
//      where the browser put them. If not (they have already scrolled away), it does nothing.
//   2. Once motion is "ready" (every module set up and every scroll effect measured; onReady in
//      core.js), it jumps to the named part again, unless the visitor has scrolled, tapped,
//      clicked or pressed a key in the meantime, so it never pulls anyone away from where they
//      chose to go.
// The jump goes through the smooth scroller (Lenis), to the same spot the browser's own jump
// uses: the part's top edge, less the room kept for the header (scroll-padding-top in
// src/styles/base.css) and any scroll-margin-top of the part itself.

import { onReady, getLenis } from '../core.js';

// The things a visitor does that mean "I'm moving the page myself".
const INPUTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

export default {
  name: 'events-anchor',
  init() {
    if (!document.querySelector('[data-events-demo], [data-events-question]')) return undefined;

    // The part named after the "#" in the address, if there is one. (A badly written address
    // can't be decoded; then there is simply nothing to jump to.)
    let id = '';
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      id = '';
    }
    const target = id ? document.getElementById(id) : null;
    if (!target) return undefined;

    // 1. Still where the browser put the visitor? (Its top edge is inside the window.)
    const top = target.getBoundingClientRect().top;
    if (top < -1 || top >= window.innerHeight) return undefined;

    // Anything the visitor does from now on cancels the jump.
    let moved = false;
    const stop = () => {
      moved = true;
    };
    INPUTS.forEach((kind) => window.addEventListener(kind, stop, { passive: true }));
    const forget = () => INPUTS.forEach((kind) => window.removeEventListener(kind, stop));

    // 2. Once everything is measured, jump to the part again (straight there, no glide).
    onReady(() => {
      forget();
      if (moved) return;
      const lenis = getLenis();
      if (!lenis) {
        target.scrollIntoView();
        return;
      }
      // The spot, worked out from the page's real scroll position. (Lenis may not have heard
      // about the browser's first jump yet, since that jump and this one can happen before the
      // browser reports any scrolling, so its own idea of the position can still be the top.)
      const room =
        (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) +
        (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
      const y = target.getBoundingClientRect().top + window.scrollY - room;
      // Lenis re-measures the page's height only a moment after it changes, and the pins have
      // just made it taller, so ask it to measure now; otherwise it would stop short.
      lenis.resize();
      lenis.scrollTo(Math.max(0, y), { immediate: true, force: true });
    });

    // Motion switched off before then: stop listening.
    return forget;
  },
};
