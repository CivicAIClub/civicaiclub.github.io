// media-open.js: motion M3, "media opens". A picture or video window opens from the top down.
//
// Asked for with:  <div data-media-open><div data-media-inner>...video or image...</div></div>
// (Video.astro does this for you with open={true}.)
//   data-media-start="top 70%"  when to start (default "top 85%")
//
// The window's visible area (its "clip-path") grows from nothing to the full frame over 1.6
// seconds on expo.out, while the footage inside slides down from 30% higher into place, so it
// feels like a shutter opening. Plays once. Put scroll parallax (data-parallax-y) on an element
// deeper inside, never on the same data-media-inner element, or the two would fight.

import { gsap, EASE, PLAY_ONCE } from '../core.js';

export default {
  name: 'media-open',
  init() {
    document.querySelectorAll('[data-media-open]').forEach((frame) => {
      const inner = frame.querySelector('[data-media-inner]');
      const start = frame.getAttribute('data-media-start') || 'top 85%';
      const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start, toggleActions: PLAY_ONCE } });
      tl.fromTo(
        frame,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: EASE.out },
        0
      );
      if (inner) tl.fromTo(inner, { yPercent: -30 }, { yPercent: 0, duration: 1.6, ease: EASE.out }, 0);
      // GSAP now holds the frame closed itself, so the CSS starting rule can step aside.
      frame.classList.add('is-open');
    });
  },
};
