// events-shared.js: small tools shared by the events pages' motion modules.
//
// Not a module by itself (modules/ only loads files that set things up on the page); the events
// modules import it:
//   import { PIN_QUERY, onScreen, splitWords, riseIn, leaveOut } from '../helpers/events-shared.js';
// It holds:
//   - PIN_QUERY: which screens get the "pinned" versions of the question and the demo sheet,
//   - onScreen(): is enough of an element inside the window right now?
//   - splitWords(), riseIn(), leaveOut(): the site's line-rise (motion M1) for text that a module
//     shows and hides itself, in both directions, as the scroll moves back and forth.

import { gsap, SplitText, EASE } from '../core.js';

// Laptops and larger: at least 1024 x 600, with a mouse or trackpad. Touch screens scroll with a
// flick, and a section that holds still under a flick feels stuck, so they get the plain layout.
export const PIN_QUERY = '(min-width: 1024px) and (min-height: 600px) and (hover: hover) and (pointer: fine)';

// True when at least "share" of the element (a fifth by default) is inside the browser window.
export function onScreen(el, share = 0.2) {
  if (!el) return false;
  const box = el.getBoundingClientRect();
  const visible = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
  return box.height > 0 && box.width > 0 && visible / box.height >= share;
}

// Cut one block of text into lines and words, each line inside a clipped "mask", exactly the way
// the site's line-rise (modules/reveal-lines.js) does, with the same class names so base.css
// styles the pieces. When the window is resized the text is cut again at its new line breaks
// ("autoSplit"); "onSplit" runs after every cut, so the caller can put the words back where they
// belong (shown or tucked away). Gives back the split, whose .words are the word pieces.
export function splitWords(el, onSplit) {
  return SplitText.create(el, {
    type: 'lines,words',
    mask: 'lines',
    autoSplit: true,
    tag: 'span',
    aria: 'none',
    smartWrap: true,
    reduceWhiteSpace: false,
    prepareText: (text) => text.replace(/[ \t\n\r\f\v]+/g, ' '),
    linesClass: 'split-line',
    wordsClass: 'split-word',
    onSplit(self) {
      if (onSplit) onSplit(self);
    },
  });
}

// Words rise into view from just below their line's mask (110% of their height) over 1.4 s on
// expo.out, 0.012 s apart: motion M1. Starting from below every time means it also works after
// the words have left upward (see leaveOut). Gives back the animation.
export function riseIn(split, delay = 0) {
  return gsap.fromTo(
    split.words,
    { yPercent: 110 },
    { yPercent: 0, duration: 1.4, ease: EASE.out, stagger: 0.012, delay, overwrite: true }
  );
}

// Words leave upward, a little further than their mask (140%, so the tails of g, p and y clear
// it too), over 0.9 s on expo.out, 0.012 s apart. Gives back the animation.
export function leaveOut(split) {
  return gsap.to(split.words, { yPercent: -140, duration: 0.9, ease: EASE.out, stagger: 0.012, overwrite: true });
}
