// letter-roll.js: the "letter roll" (motion M9), shared by several modules.
//
// A letter roll swaps one piece of text for another inside a small window: the old text moves up
// and out of the window (to -110% of its height) while the new text comes up from below (from
// +110%), over 0.9 seconds on the expo.out curve. It is used for the cursor label, the header's
// name-to-CIVIC swap and the case letters.
//
// The element being rolled must be a "slot": an inline-block with overflow clipped, holding one
// <span> with the current text. makeSlot() prepares an element like that.
// Not a module by itself (modules/ loads only files that set things up on the page); modules import it:
//   import { rollText, rollThrough } from '../helpers/letter-roll.js';

import { gsap, EASE } from '../core.js';

// Turn an element into a roll slot: a clipped window with one inner span holding its text.
// Gives back the element.
export function makeSlot(el) {
  if (el.dataset.rollSlot) return el;
  el.dataset.rollSlot = '';
  el.style.position = 'relative';
  el.style.display = 'inline-block';
  el.style.overflow = 'clip';
  el.style.verticalAlign = 'top';
  const text = el.textContent ?? '';
  el.textContent = '';
  const item = document.createElement('span');
  item.className = 'roll-slot__item';
  item.style.display = 'inline-block';
  item.textContent = text;
  el.appendChild(item);
  return el;
}

// Each slot remembers the roll it is running, so a new roll can finish the old one first.
const running = new WeakMap();
const sequences = new WeakMap();

// Roll the slot to show new text. Options:
//   duration (seconds, default 0.9), direction (1 = the new text comes up from below,
//   -1 = it comes down from above), resize (animate the slot's width to fit the new text).
// Gives back the GSAP timeline, so callers can wait for it or chain it.
export function rollText(el, text, { duration = 0.9, direction = 1, resize = true } = {}) {
  makeSlot(el);
  // If a roll is still running here, jump it to its end first. That tidies up after it, so the
  // slot always holds exactly one piece of text before a new roll starts.
  const previous = running.get(el);
  if (previous) previous.progress(1);

  const current = el.querySelector('.roll-slot__item');
  if (current && current.textContent === text) return gsap.timeline();

  // The incoming text: laid over the old text, waiting just outside the window.
  const next = document.createElement('span');
  next.className = 'roll-slot__item';
  next.style.display = 'inline-block';
  next.style.position = 'absolute';
  next.style.left = '0';
  next.style.top = '0';
  next.style.whiteSpace = 'nowrap';
  next.textContent = text;
  el.appendChild(next);

  const fromWidth = el.offsetWidth;
  const toWidth = next.offsetWidth;

  const tl = gsap.timeline({
    onComplete: () => {
      // Tidy up: the new text becomes the only, normal item and the window sizes itself again.
      if (current) current.remove();
      next.style.position = '';
      next.style.left = '';
      next.style.top = '';
      gsap.set(next, { clearProps: 'transform' });
      el.style.width = '';
      if (running.get(el) === tl) running.delete(el);
    },
  });
  running.set(el, tl);
  if (current) tl.to(current, { yPercent: -110 * direction, duration, ease: EASE.out }, 0);
  tl.fromTo(next, { yPercent: 110 * direction }, { yPercent: 0, duration, ease: EASE.out }, 0);
  if (resize && fromWidth !== toWidth) {
    tl.fromTo(el, { width: fromWidth }, { width: toWidth, duration, ease: EASE.out }, 0);
  }
  return tl;
}

// Roll a single letter through every letter in between, like a counter: from "A" to "D" it shows
// B and C on the way. Each step is quicker, so the whole run takes about as long as one roll.
// Starting a new run stops the one before it.
export function rollThrough(el, from, to, { duration = 0.9 } = {}) {
  const previous = sequences.get(el);
  if (previous) previous.kill();
  const start = from.charCodeAt(0);
  const end = to.charCodeAt(0);
  const direction = end >= start ? 1 : -1;
  const steps = Math.abs(end - start);
  const tl = gsap.timeline();
  sequences.set(el, tl);
  if (steps === 0) return tl;
  const stepTime = Math.max(0.12, duration / (steps + 1));
  for (let i = 1; i <= steps; i++) {
    const letter = String.fromCharCode(start + i * direction);
    const last = i === steps;
    tl.call(() => rollText(el, letter, { duration: last ? duration : stepTime * 1.4, direction }), [], (i - 1) * stepTime);
  }
  return tl;
}
