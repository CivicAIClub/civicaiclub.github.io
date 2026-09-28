// about-workshop.js: the slow push-in on the About page's workshop clip
// (src/components/about/Workshop.astro).
//
// Asked for with:  <div data-about-pushin> around a Video (Video.astro), whose <video> the CSS
//                  already shows a little enlarged (a crop, set in Workshop.astro).
//
// What it does: while the frame scrolls through the window (from its top entering at the
// bottom to its bottom leaving at the top), the footage grows by another 12% around the same
// spot (GitHub's "Merged" label), tied directly to the scroll, so the camera seems to lean in
// as you read. Only the picture moves; the frame stays still.
// Runs only when motion is on. Without motion the clip keeps its plain crop.

import { gsap } from '../core.js';

// How much the footage grows over the scroll: 1.12 = 12% bigger at the end.
const PUSH = 1.12;

export default {
  name: 'about-workshop',
  init() {
    const frames = document.querySelectorAll('[data-about-pushin]');
    if (!frames.length) return undefined;

    frames.forEach((frame) => {
      const video = frame.querySelector('video');
      if (!video) return;
      // Start from the crop the CSS already applies (for example 1.1), and end 12% larger.
      const crop = gsap.getProperty(video, 'scale') || 1;
      gsap.fromTo(
        video,
        { scale: crop },
        {
          scale: crop * PUSH,
          ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    });

    // Switching Motion off: GSAP undoes the push-in by itself (the CSS crop stays).
    return undefined;
  },
};
