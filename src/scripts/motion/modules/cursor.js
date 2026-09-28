// cursor.js: the label that trails the mouse over footage and actions (Cursor.astro).
//
// Asked for with:  data-cursor="Open Case A ↗"  on any element (a video, a link, a card).
//
// What it does, on mouse and trackpad devices with motion on:
//   - The label follows the pointer, 24px right and 24px below it, with a soft lag: every frame
//     it covers a share of the remaining distance (1 − e^(−10 × seconds since last frame)), so it
//     glides the same way on slow and fast screens.
//   - Over an element with data-cursor it opens (fades and scales in); elsewhere it closes.
//   - When the label's text changes, it rolls (motion M9). Moving between "Open Case A ↗" and
//     "Open Case C ↗" rolls just the letter, through B, like a counter.
//   - Other scripts can change an element's data-cursor (the video player switches "Pause" and
//     "Play") and send "civic:cursor-refresh" so the label updates straight away.
//   - When the page scrolls (or something slides) under a mouse that is standing still, it looks
//     again at what is under the pointer, so the label never shows the last thing's words.
// The normal pointer always stays visible; the label never catches clicks.

import { gsap, EASE, hasFinePointer, later } from '../core.js';
import { rollText, rollThrough, makeSlot } from '../helpers/letter-roll.js';

// Labels like "Open Case A ↗": the part before the letter, the letter, and the part after.
const CASE_LABEL = /^(.*\bCase )([A-Z])(.*)$/;

export default {
  name: 'cursor',
  init() {
    const el = document.querySelector('[data-cursor-el]');
    const box = el?.querySelector('.cursor__box');
    const label = el?.querySelector('[data-cursor-label]');
    if (!el || !box || !label || !hasFinePointer()) return undefined;

    const root = document.documentElement;
    root.classList.add('has-cursor');

    // Where the pointer is (target) and where the label is drawn (current).
    const target = { x: -100, y: -100 };
    const current = { x: -100, y: -100 };
    let text = '';
    let shown = false;
    let hovered = null;

    // The roll currently playing on the label (or null). A newer label always stops it first,
    // so an older roll can never finish late and put its words back (a stale label).
    let roll = null;
    function stopRoll() {
      if (roll) roll.kill();
      roll = null;
    }

    // Draw the label's text. Case labels get three parts so the letter can roll on its own.
    // Each drawing uses fresh elements, so nothing is left over from a roll that was stopped.
    function build(value) {
      stopRoll();
      label.textContent = '';
      const match = value.match(CASE_LABEL);
      if (match) {
        label.append(match[1]);
        const letter = document.createElement('span');
        letter.className = 'cursor__letter';
        letter.textContent = match[2];
        label.append(letter);
        makeSlot(letter);
        label.append(match[3]);
      } else {
        label.textContent = value;
      }
    }

    // Change the label to a new text, rolling it in.
    function setText(value) {
      if (value === text) return;
      const before = text.match(CASE_LABEL);
      const after = value.match(CASE_LABEL);
      const letter = label.querySelector('.cursor__letter');
      const wasShowing = Boolean(text) && shown;
      // The words the label is showing (or rolling to) now.
      const from = text;
      text = value;
      later(() => {
        stopRoll();
        if (before && after && letter && before[1] === after[1] && before[3] === after[3]) {
          // Same words, different case letter: roll the letter like a counter. Once the last
          // letter has landed, redraw the label, but only if it still should say these words.
          roll = rollThrough(letter, before[2], after[2], { duration: 0.6 });
          roll.call(() => {
            if (text === value) build(value);
          }, [], roll.duration() + 0.6);
        } else if (!wasShowing) {
          // Opening from closed: no roll needed, just set the words.
          build(value);
        } else {
          // Different words: roll the whole label (in a fresh window holding the words on show
          // now), then redraw it so a case letter can roll later, but only if nothing newer
          // has been asked for in the meantime.
          const slot = document.createElement('span');
          slot.textContent = from;
          label.textContent = '';
          label.append(slot);
          makeSlot(slot);
          roll = rollText(slot, value, { duration: 0.9 });
          roll.call(() => {
            if (text === value) build(value);
          });
        }
      });
    }

    function show() {
      if (shown) return;
      shown = true;
      later(() => gsap.to(box, { opacity: 1, scale: 1, duration: 0.5, ease: EASE.out }));
    }
    function hide() {
      if (!shown) return;
      shown = false;
      later(() => gsap.to(box, { opacity: 0, scale: 0.6, duration: 0.4, ease: EASE.out }));
    }

    // Look at what's under the pointer and update the label to match.
    function update() {
      const value = hovered?.getAttribute('data-cursor') || '';
      if (value) {
        setText(value);
        show();
      } else {
        hide();
      }
    }

    // Whatever is under a point on the screen that asks for a label (or null).
    const labelledAt = (x, y) => {
      const under = document.elementFromPoint(x, y);
      return under ? under.closest('[data-cursor]') : null;
    };
    // Switch to a new element under the pointer, if it changed.
    const hover = (over) => {
      if (over === hovered) return;
      hovered = over;
      update();
    };

    // Pointer moves: remember where it is and what it's over. The first move snaps the label
    // into place, so it doesn't fly in from the corner.
    let first = true;
    // Where the pointer itself is (without the 24px offset), and whether it is inside the window.
    const pointer = { x: 0, y: 0, inside: false };
    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      target.x = event.clientX + 24;
      target.y = event.clientY + 24;
      if (first) {
        current.x = target.x;
        current.y = target.y;
        first = false;
      }
      hover(event.target instanceof Element ? event.target.closest('[data-cursor]') : null);
    };
    const onLeave = () => {
      pointer.inside = false;
      hovered = null;
      hide();
    };

    // The page can move under a mouse that is standing still: scrolling with the keyboard or
    // the smooth scroller's glide, a section sliding past, a player closing. The browser only
    // tells us what the pointer is over when the mouse itself moves, so look again ourselves:
    // once on the next frame after any scroll, and a few times a second as a safety net.
    let recheckQueued = false;
    const recheck = () => {
      recheckQueued = false;
      if (!pointer.inside || first) return;
      hover(labelledAt(pointer.x, pointer.y));
    };
    const onScroll = () => {
      if (recheckQueued) return;
      recheckQueued = true;
      requestAnimationFrame(recheck);
    };
    // Another script changed a label: look again at what is under the pointer, then redraw.
    // This looks even if the browser said the pointer left the page: opening or closing a
    // pop-up player can say that while the mouse never moved.
    const onRefresh = () => {
      if (!first) hovered = labelledAt(pointer.x, pointer.y);
      update();
    };

    // Every frame: glide the label toward the pointer. Every quarter of a second, also check
    // what is under the pointer (see above).
    let sinceCheck = 0;
    const tick = (time, deltaMs) => {
      const k = 1 - Math.exp((-10 * deltaMs) / 1000);
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      el.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      sinceCheck += deltaMs;
      if (sinceCheck >= 250) {
        sinceCheck = 0;
        recheck();
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('civic:cursor-refresh', onRefresh);
    // "capture" catches scrolling inside sideways strips too, not just the page itself.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    gsap.ticker.add(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('civic:cursor-refresh', onRefresh);
      window.removeEventListener('scroll', onScroll, { capture: true });
      gsap.ticker.remove(tick);
      stopRoll();
      root.classList.remove('has-cursor');
      el.style.transform = '';
      gsap.set(box, { clearProps: 'opacity,transform' });
      label.textContent = '';
    };
  },
};
