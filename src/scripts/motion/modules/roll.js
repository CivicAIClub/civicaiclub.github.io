// roll.js: motion M6, "character roll". Hovering a link rolls its letters to a second phrase.
//
// Asked for with the markup RollLink.astro and BigLink.astro write:
//   <a data-roll="Meet the club">
//     <span class="roll__stack"><span class="roll__a">Who builds this?</span>
//       <span class="roll__b" aria-hidden="true">Meet the club</span></span>
//     <span class="roll__line"></span>   (optional underline, BigLink only)
//   </a>
//
// On hover (or keyboard focus) the first phrase's letters leave upward one after another
// (to -110%, 1.0s on expo.out, 0.01s apart) and the second phrase's letters come up from below
// 0.15s later. The 2px underline stretches or shrinks to the new phrase's width over 1.2s.
// Moving away rolls the first phrase back the same way (always upward, never in reverse).
// Only on devices with a mouse or trackpad; touch screens just follow the link.
//
// Screen readers: once a phrase is cut into single letters, some screen readers read the link
// as "C a s e s". So before cutting, the link gets a plain spoken name (aria-label): its first
// phrase ("Cases"), plus " (opens in a new tab)" for links that open a new tab. A BigLink already
// carries its own name with both phrases ("Who builds this? Meet the club"), which is kept.

import { gsap, SplitText, EASE, hasFinePointer, later } from '../core.js';

// The words a link should be read as: the phrase, tidied (arrows like ↗ are left out, since they
// are decoration, and runs of spaces become one).
function spokenText(el) {
  return (el.textContent || '').replace(/[↗↓←→]/g, '').replace(/\s+/g, ' ').trim();
}

export default {
  name: 'roll',
  init() {
    if (!hasFinePointer()) return undefined;
    const cleanups = [];

    document.querySelectorAll('[data-roll]').forEach((link) => {
      const a = link.querySelector('.roll__a');
      const b = link.querySelector('.roll__b');
      if (!a || !b) return;
      const line = link.querySelector('.roll__line');

      // Give the link its plain spoken name before its letters are cut apart (see the top of
      // this file). A name the component already wrote (BigLink) is left as it is.
      if (!link.hasAttribute('aria-label')) {
        const newTab = link.getAttribute('target') === '_blank' ? ' (opens in a new tab)' : '';
        link.setAttribute('aria-label', spokenText(a) + newTab);
        // Remember that this script added it, so switching Motion off can take it away again.
        link.setAttribute('data-roll-named', '');
      }

      // Cut both phrases into single letters.
      const options = { type: 'chars', tag: 'span', aria: 'none', charsClass: 'split-char' };
      const splitA = SplitText.create(a, options);
      const splitB = SplitText.create(b, options);
      // The second phrase waits below its window, and may now be made visible.
      gsap.set(splitB.chars, { yPercent: 110 });
      gsap.set(b, { visibility: 'visible' });

      let showingB = false;
      let timeline = null;

      // Roll from one phrase to the other.
      function rollTo(toB) {
        if (toB === showingB) return;
        showingB = toB;
        const leaving = toB ? splitA.chars : splitB.chars;
        const arriving = toB ? splitB.chars : splitA.chars;
        later(() => {
          if (timeline) timeline.kill();
          timeline = gsap.timeline();
          timeline.to(leaving, { yPercent: -110, duration: 1.0, ease: EASE.out, stagger: 0.01 }, 0);
          timeline.fromTo(
            arriving,
            { yPercent: 110 },
            { yPercent: 0, duration: 1.0, ease: EASE.out, stagger: 0.01 },
            0.15
          );
          if (line) {
            const ratio = toB ? b.offsetWidth / Math.max(1, a.offsetWidth) : 1;
            timeline.to(line, { scaleX: ratio, duration: 1.2, ease: EASE.out }, 0);
          }
        });
      }

      const enter = () => rollTo(true);
      const leave = () => rollTo(false);
      link.addEventListener('mouseenter', enter);
      link.addEventListener('mouseleave', leave);
      link.addEventListener('focus', enter);
      link.addEventListener('blur', leave);
      cleanups.push(() => {
        if (link.hasAttribute('data-roll-named')) {
          link.removeAttribute('aria-label');
          link.removeAttribute('data-roll-named');
        }
        link.removeEventListener('mouseenter', enter);
        link.removeEventListener('mouseleave', leave);
        link.removeEventListener('focus', enter);
        link.removeEventListener('blur', leave);
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  },
};
