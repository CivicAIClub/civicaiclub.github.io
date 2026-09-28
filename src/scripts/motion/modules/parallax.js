// parallax.js: motion M4, "parallax". Things move at a different speed from the page as you
// scroll, which adds depth. Always tied directly to the scroll position (no delay, no easing),
// and it only moves things (transform), which keeps scrolling smooth.
//
// Two ways to ask for it:
//   data-parallax="0.5"
//       Speed. The element drifts by half of the distance you scroll while its section is on
//       screen, so it seems to move at half speed. If the element is on screen when the page
//       loads (a hero), it starts in place; otherwise it is in place when its section is
//       centered in the window.
//   data-parallax-y="-12,12"
//       A range, in percent of the element's own height: here it moves from 12% up to 12% down
//       while its section passes through the window. Good for footage inside a frame; add
//       data-parallax-scale="1.3" to enlarge the footage so its edges never show.
// Optional: data-parallax-trigger="section" picks which surrounding element sets the timing
// (default: the closest <section>, or the element's parent).

import { gsap, ScrollTrigger } from '../core.js';

// Find the element whose trip through the window drives this element's movement.
function triggerFor(el) {
  const selector = el.getAttribute('data-parallax-trigger');
  return (selector && el.closest(selector)) || el.closest('section') || el.parentElement || el;
}

export default {
  name: 'parallax',
  init() {
    // Speed-based parallax.
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-parallax') || '0');
      if (!speed) return;
      const setY = gsap.quickSetter(el, 'y', 'px');
      // Move the element for the trigger's current progress (0 at the start, 1 at the end).
      // ScrollTrigger can ask for this while it is still being set up, before "trigger" exists,
      // so it checks first.
      let trigger = null;
      const apply = () => {
        if (!trigger) return;
        const distance = trigger.end - trigger.start;
        const anchor = trigger.start <= 0 ? 0 : 0.5;
        setY(speed * distance * (trigger.progress - anchor));
      };
      // "clamp()" keeps the start and end inside the page, so a hero at the very top starts at 0.
      trigger = ScrollTrigger.create({
        trigger: triggerFor(el),
        start: 'clamp(top bottom)',
        end: 'clamp(bottom top)',
        onUpdate: apply,
        onRefresh: apply,
      });
      apply();
    });

    // Range-based parallax.
    document.querySelectorAll('[data-parallax-y]').forEach((el) => {
      const [from, to] = (el.getAttribute('data-parallax-y') || '')
        .split(',')
        .map((value) => parseFloat(value));
      if (!Number.isFinite(from) || !Number.isFinite(to)) return;
      const scale = parseFloat(el.getAttribute('data-parallax-scale') || '');
      if (Number.isFinite(scale)) gsap.set(el, { scale });
      gsap.fromTo(
        el,
        { yPercent: from },
        {
          yPercent: to,
          ease: 'none',
          scrollTrigger: {
            trigger: triggerFor(el),
            start: 'clamp(top bottom)',
            end: 'clamp(bottom top)',
            scrub: true,
          },
        }
      );
    });
  },
};
