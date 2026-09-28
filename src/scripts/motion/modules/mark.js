// mark.js: motion M5, "the marker". A crimson bar sweeps in behind one phrase per page.
//
// Asked for with:  <mark data-mark>eats their week</mark>   (inside a data-reveal="lines" block)
//
// How it plays: 0.3 seconds after the surrounding text has finished rising (motion M1), a crimson
// bar grows behind the phrase from left to right over 0.9 seconds on the "civic" curve, and the
// phrase's letters turn paper-colored as the bar passes under them. If the phrase wraps onto two
// lines, the bar sweeps the first line and then carries on along the second, like a real
// highlighter. A marked phrase outside any rising text starts when it scrolls into view.
// Without motion the phrase simply has its crimson bar from the start (see base.css).

import { gsap, EASE, ScrollTrigger } from '../core.js';

// Sweep the marker across every piece of the phrase inside "owner" (after the text is split
// into lines, one phrase can be cut into one piece per line).
function sweep(owner) {
  if (owner.classList.contains('has-marked')) return;
  const pieces = owner.matches('[data-mark]') ? [owner] : [...owner.querySelectorAll('[data-mark]')];
  if (!pieces.length) return;
  const widths = pieces.map((piece) => piece.getBoundingClientRect().width || 1);
  const total = widths.reduce((sum, width) => sum + width, 0);
  const progress = { value: 0 };

  gsap.to(progress, {
    value: 1,
    duration: 0.9,
    delay: 0.3,
    ease: EASE.civic,
    // On every frame, fill each piece in turn: the first line fills completely before the
    // second starts, so the bar reads as one continuous stroke.
    onUpdate() {
      let covered = progress.value * total;
      pieces.forEach((piece, i) => {
        const fill = Math.min(1, Math.max(0, covered / widths[i]));
        covered -= widths[i];
        piece.style.setProperty('--mark-fill', `${fill * 100}%`);
        piece.style.color = fill > 0.45 ? 'var(--mark-text)' : '';
      });
    },
    // Once done, hand the look back to CSS (so a later re-split of the text keeps the bar).
    onComplete() {
      owner.classList.add('has-marked');
      pieces.forEach((piece) => {
        piece.style.removeProperty('--mark-fill');
        piece.style.color = '';
        piece.classList.add('is-marked');
      });
    },
  });
}

export default {
  name: 'mark',
  init() {
    const cleanups = [];
    const owners = new Set();

    document.querySelectorAll('[data-mark]').forEach((mark) => {
      // The "owner" is the rising text block the phrase sits in, or the phrase itself.
      const owner = mark.closest('[data-reveal="lines"]') || mark;
      if (owners.has(owner)) return;
      owners.add(owner);

      if (owner === mark) {
        // sweep() only ever runs once per phrase (it checks for "has-marked").
        ScrollTrigger.create({ trigger: mark, start: 'top 85%', onEnter: () => sweep(mark) });
        return;
      }
      // Inside rising text: wait for modules/reveal-lines.js to say the text has landed.
      const onRevealed = () => sweep(owner);
      owner.addEventListener('civic:revealed', onRevealed);
      cleanups.push(() => owner.removeEventListener('civic:revealed', onRevealed));
      if (owner.classList.contains('is-revealed')) sweep(owner);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      owners.forEach((owner) => owner.classList.remove('has-marked'));
    };
  },
};
