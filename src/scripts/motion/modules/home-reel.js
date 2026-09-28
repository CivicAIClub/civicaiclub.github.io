// home-reel.js: the home page reel's scroll motion (src/components/home/HomeReel.astro).
//
// Asked for with:  <section data-home-reel>  (the reel section)
//
// What it does, with motion on:
//   1. The footage is shown a little larger than its frame and slides inside it as the reel
//      passes through the window, tied directly to the scroll (motion M4). That gives the flat
//      screen recording some depth without cropping away much of it. How much depends on the
//      screen:
//        - laptops (1024px and wider, held sideways): 108% size, sliding from 6% above to 6%
//          below,
//        - tablets (768 to 1023px, and tablets up to 1100px held upright, which show the reel
//          in its own 16:9 shape): 106% size, sliding from 4% above to 4% below,
//        - phones (under 768px): 104% size, sliding from 3% above to 3% below. Phones show the
//          taller 4:5 copy of the reel in a 4:5 frame, and the quotes in it sit close to the
//          edges, so it is enlarged the least.
//      The slide is a little longer than the spare size, so near the very start and end of the
//      slide a thin strip of the frame's far edge is uncovered. That only happens while that
//      edge is off screen (the frame is still below the window, or already above it), so no
//      edge of the footage is ever seen.
//   2. "Casework" rises out of its mask when the reel is 60% of the way up the window (M1).
// Everything here is undone when motion is switched off (the footage goes back to its normal
// size and "Casework" simply shows).

import { gsap, SplitText, EASE, PLAY_ONCE } from '../core.js';

// Size and slide range for each kind of screen. The frame's shape follows the same rules (see
// HomeReel.astro): a tablet held upright, up to 1100px wide, counts as a tablet, never as a laptop.
const SETTINGS = {
  '(min-width: 1101px), (min-width: 1024px) and (orientation: landscape)': { scale: 1.08, range: 6 },
  '(min-width: 768px) and (max-width: 1023px), (min-width: 1024px) and (max-width: 1100px) and (orientation: portrait)':
    { scale: 1.06, range: 4 },
  '(max-width: 767px)': { scale: 1.04, range: 3 },
};

export default {
  name: 'home-reel',
  init() {
    const section = document.querySelector('[data-home-reel]');
    if (!section) return undefined;
    const video = section.querySelector('video');
    const title = section.querySelector('[data-reel-title]');

    // ---- 1. The footage drifts inside its frame ----
    // gsap.matchMedia runs the right setup for the current screen width and swaps it when the
    // window is resized across a breakpoint.
    const mm = gsap.matchMedia();
    if (video) {
      Object.entries(SETTINGS).forEach(([query, { scale, range }]) => {
        mm.add(query, () => {
          gsap.set(video, { scale });
          gsap.fromTo(
            video,
            { yPercent: -range },
            {
              yPercent: range,
              ease: 'none',
              scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
            }
          );
          // Put the footage back to normal when this screen size no longer applies.
          return () => gsap.set(video, { clearProps: 'transform' });
        });
      });
    }

    // ---- 2. "Casework" rises in ----
    let split = null;
    if (title) {
      split = SplitText.create(title, {
        type: 'lines,words',
        mask: 'lines',
        tag: 'span',
        aria: 'none',
        linesClass: 'split-line',
        wordsClass: 'split-word',
      });
      gsap.from(split.words, {
        yPercent: 110,
        duration: 1.4,
        ease: EASE.out,
        scrollTrigger: { trigger: section, start: 'top 60%', toggleActions: PLAY_ONCE },
      });
    }

    return () => {
      mm.revert();
      if (split) split.revert();
    };
  },
};
