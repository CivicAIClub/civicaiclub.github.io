// draw.js: motion M2, "divider draw". A thin line draws itself from the left.
//
// Asked for with:  <div class="rule" data-draw></div>   (Divider.astro does this for you)
//   data-draw="y"              draw a vertical line from the top instead
//   data-draw-start="top 80%"  when to start (default "top 90%")
//
// The line grows from zero width to full width over 1.0 second on the site's "civic" curve,
// once, when it scrolls into view.

import { gsap, EASE, PLAY_ONCE } from '../core.js';

export default {
  name: 'draw',
  init() {
    document.querySelectorAll('[data-draw]').forEach((line) => {
      const vertical = line.getAttribute('data-draw') === 'y';
      const start = line.getAttribute('data-draw-start') || 'top 90%';
      gsap.fromTo(
        line,
        vertical ? { scaleY: 0 } : { scaleX: 0 },
        {
          ...(vertical ? { scaleY: 1 } : { scaleX: 1 }),
          transformOrigin: vertical ? '50% 0%' : '0% 50%',
          duration: 1.0,
          ease: EASE.civic,
          scrollTrigger: { trigger: line, start, toggleActions: PLAY_ONCE },
        }
      );
      // GSAP now holds the line at zero width itself, so the CSS starting rule can step aside.
      line.classList.add('is-drawn');
    });
  },
};
