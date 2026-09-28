// case-hero-grow.js: a case page's hero frame grows to the full width of the window as the
// visitor scrolls it up to the header.
//
// Asked for with:  <div data-hero-grow>  (the frame's outer box in src/components/case/CaseHero.astro)
//
// At the top of a case page, the hero clip sits in an "exhibit frame" from margin to margin, under
// the case name. As the visitor scrolls, the frame grows, tied directly to the scroll: when its top
// edge reaches the bottom of the header, it is exactly as wide as the window, edge to edge. It
// grows from the middle of its top edge, so it stays centered and its top follows the page.
// Only the frame's size changes (a "transform"), which keeps scrolling smooth.
// The case name drifting at half speed above it is the shared M4 effect (data-parallax="0.5").
//
// With reduced motion, or Motion switched off in the footer, this module does nothing (and turning
// Motion off undoes it, and puts the words back in place too), so the frame simply stays inside
// the margins.

import { gsap } from '../core.js';

// Where an element's top edge sits on the page (not on the screen), ignoring any transform on it.
// "offsetTop" counts from the element's positioned parent, so add them up all the way to the page.
function pageTop(el) {
  let top = 0;
  for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
  return top;
}

export default {
  name: 'case-hero-grow',
  init() {
    const frame = document.querySelector('[data-hero-grow]');
    if (!frame) return undefined; // not a case page
    // The site header's bar (Header.astro). Its height is where the frame should be full width.
    const header = document.querySelector('[data-header]');

    // How big the frame must get to be exactly as wide as the window: the window's width
    // (without any scrollbar) divided by the frame's own width. About 1.06 on a laptop.
    const fullSize = () => document.documentElement.clientWidth / Math.max(1, frame.offsetWidth);
    // How far the page must scroll until the frame's top edge meets the header's bottom edge.
    const growDistance = () => Math.max(1, pageTop(frame) - (header ? header.offsetHeight : 0));

    // Grow from the middle of the top edge.
    gsap.set(frame, { transformOrigin: '50% 0%' });
    // One tween tied to the scroll ("scrub"): from the top of the page (scroll position 0) to the
    // moment the frame reaches the header. "invalidateOnRefresh" works both numbers out again
    // whenever the page is re-measured (a resize, a font loading, a phone turning).
    gsap.fromTo(
      frame,
      { scale: 1 },
      {
        scale: fullSize,
        ease: 'none',
        scrollTrigger: {
          start: 0,
          end: growDistance,
          scrub: true,
          invalidateOnRefresh: true,
        },
      }
    );
    // Switching Motion off undoes the tween and its scroll link. Once that is done (a moment
    // later, "setTimeout 0"), also wipe any leftover movement from the frame and from the words
    // above it (their half-speed drift, from the shared parallax module, would otherwise stay
    // where it was), so the hero is back to its plain layout: words, then the inset frame.
    const words = document.querySelector('.case-hero__text');
    return () => {
      setTimeout(() => {
        gsap.set([frame, words].filter(Boolean), { clearProps: 'transform,transformOrigin,translate,rotate,scale' });
      }, 0);
    };
  },
};
