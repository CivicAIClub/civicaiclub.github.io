// letter-roll.js: motion M9, "letter roll", for any element that asks for it.
//
// Asked for with:  <button type="button" data-letter-roll="A,B,C,D,E">A</button>
// The element rolls to the next value in its list when it is clicked (use a <button>, so
// keyboards can press it too), and wraps around at the end. It deliberately does not roll on
// hover: the text changes width as it rolls, which would move the edge under the pointer and
// set off another hover, over and over. Other scripts can also roll it to a chosen value by sending it a
// message:  el.dispatchEvent(new CustomEvent('civic:roll-to', { detail: { value: 'C' } }))
// A single letter rolls through the letters in between, like a counter (A to C passes B).
// The rolling itself lives in ../helpers/letter-roll.js, which the cursor and header also use.

import { rollText, rollThrough, makeSlot } from '../helpers/letter-roll.js';
import { later } from '../core.js';

export default {
  name: 'letter-roll',
  init() {
    const cleanups = [];

    document.querySelectorAll('[data-letter-roll]').forEach((el) => {
      const values = (el.getAttribute('data-letter-roll') || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (!values.length) return;
      makeSlot(el);
      let index = Math.max(0, values.indexOf((el.textContent || '').trim()));

      // Roll to the value at position "next" in the list.
      const go = (next) => {
        const from = values[index];
        const to = values[next];
        index = next;
        later(() => {
          const single = from.length === 1 && to.length === 1;
          if (single) rollThrough(el, from, to);
          else rollText(el, to);
        });
      };
      const advance = () => go((index + 1) % values.length);
      const onRollTo = (event) => {
        const next = values.indexOf(event.detail?.value);
        if (next !== -1 && next !== index) go(next);
      };

      el.addEventListener('click', advance);
      el.addEventListener('civic:roll-to', onRollTo);
      cleanups.push(() => {
        el.removeEventListener('click', advance);
        el.removeEventListener('civic:roll-to', onRollTo);
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  },
};
