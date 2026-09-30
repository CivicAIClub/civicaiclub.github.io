// events-question.js: Exhibit 2 on an event page, "the question every model failed", proofread
// on screen as you scroll (src/components/events/EventQuestion.astro).
//
// Asked for with:
//   <section data-events-question>                 the section (ink)
//     <blockquote data-reveal="lines">               the question (it rises with the shared M1)
//       <span data-events-strike-word>walk</span>    the word to strike out
//       <mark data-events-mark>drive</mark>          the word to mark in crimson
//     <p data-events-q-verdict="1"> "2" "3"          the three verdict lines
//     <span data-events-strike>                      the strike line this module draws
//     <span data-events-q-progress>                  the thin progress line (pinned only)
//
// Two ways it plays:
//   1. Laptops and larger (PIN_QUERY in helpers/events-shared.js) with motion on: "pinned". The
//      section becomes two and a half screens tall and its stage stays still on screen (CSS, from
//      the class "is-pinned"); the stage is marked data-header-keep so the header stays in view.
//      The scroll through that stretch is the playhead, p, from 0 to 1:
//        - p ≥ 0.25: a paper-colored line strikes "walk" out from the left (0.8 s, civic curve)
//          and the first verdict rises ("Every model, across three companies, advised walking.");
//        - p ≥ 0.55: the crimson marker sweeps across "drive" (0.9 s, civic), its letters turning
//          light as the bar passes, and the other two verdict lines rise 0.15 s and 0.3 s later;
//        - scrolling back above either point undoes it: the strike shrinks away to the right
//          (0.6 s), the marker drains (0.6 s) and those verdict lines leave upward;
//        - the thin crimson line at the stage's foot follows p all the way.
//   2. Everything else with motion on (phones, tablets, touch screens, short windows): no
//      pinning. When the question's bottom edge is three quarters of the way up the window, the
//      same marks play once, one after the other: the strike and the first verdict at 0.2 s, the
//      marker at 1.2 s, the second verdict at 1.35 s and the third at 1.6 s. (If the question is
//      still rising at that moment, it waits until it has landed.)
// Motion off, reduced motion or no JavaScript: this module doesn't run, and the CSS in
// src/styles/events.css shows the finished marks (the browser's own line through "walk", the full
// marker on "drive", every verdict line in place).
//
// The question itself is cut into lines and words by the shared line-rise (reveal-lines.js), which
// cuts it again after a resize and rebuilds its contents. So this module never keeps hold of the
// two marked words: it looks them up whenever it needs them, re-measures the strike, and puts the
// marker back whenever the question is rebuilt.

import { gsap, ScrollTrigger, EASE } from '../core.js';
import { PIN_QUERY, splitWords, riseIn, leaveOut } from '../helpers/events-shared.js';

// Where each beat starts on the pinned playhead.
const STRIKE_AT = 0.25;
const MARK_AT = 0.55;

export default {
  name: 'events-question',
  init() {
    const section = document.querySelector('[data-events-question]');
    if (!section) return undefined; // not an event page with a staged question
    const stage = section.querySelector('.question__stage');
    const track = section.querySelector('.question__track');
    const quote = section.querySelector('.question__text');
    const strike = section.querySelector('[data-events-strike]');
    const progressLine = section.querySelector('[data-events-q-progress]');
    const verdicts = [1, 2, 3].map((n) => section.querySelector(`[data-events-q-verdict="${n}"]`));
    if (!stage || !track || !quote || !strike) return undefined;

    // The two marked words, looked up fresh each time (see the note at the top). Cutting the text
    // into lines can leave an empty copy of a tag at the end of the line before, so only the
    // pieces that hold letters count.
    const withText = (selector) => [...quote.querySelectorAll(selector)].filter((el) => el.textContent.trim());
    const strikeWord = () => withText('[data-events-strike-word]')[0];
    const markPieces = () => withText('[data-events-mark]');

    // ---- The strike line's place ----
    // Lay the strike over "walk": as wide as the word, a little below the middle of its box (at
    // 56% of its height, where the lowercase letters are), and 3% of the type size thick (never
    // under 2px). Measured against the stage, which the strike is placed in.
    function placeStrike() {
      const word = strikeWord();
      if (!word) return;
      const stageBox = stage.getBoundingClientRect();
      const box = word.getBoundingClientRect();
      if (!box.width) return;
      const size = parseFloat(getComputedStyle(quote).fontSize) || 16;
      const thickness = Math.max(2, 0.03 * size);
      strike.style.left = `${box.left - stageBox.left}px`;
      strike.style.top = `${box.top - stageBox.top + box.height * 0.56 - thickness / 2}px`;
      strike.style.width = `${box.width}px`;
      strike.style.height = `${thickness}px`;
    }

    // ---- The marker ----
    // How full the marker is, from 0 (empty) to 1 (the whole word), and whether it should be full.
    const marker = { fill: 0 };
    let marked = false;
    let sweeping = null;
    // Paint the marker at its current fill. A full marker is handed to the CSS ("is-marked"), so
    // it survives the question being rebuilt; an empty one goes back to the CSS's empty look.
    function paintMarker() {
      const pieces = markPieces();
      const widths = pieces.map((piece) => piece.getBoundingClientRect().width || 1);
      const total = widths.reduce((sum, width) => sum + width, 0);
      let covered = marker.fill * total;
      pieces.forEach((piece, i) => {
        if (marker.fill >= 1 || marker.fill <= 0) {
          piece.style.removeProperty('--mark-fill');
          piece.style.color = '';
          piece.classList.toggle('is-marked', marker.fill >= 1);
          return;
        }
        // Fill the pieces in turn (a phrase cut over two lines fills the first line first).
        const fill = Math.min(1, Math.max(0, covered / widths[i]));
        covered -= widths[i];
        piece.classList.remove('is-marked');
        piece.style.setProperty('--mark-fill', `${fill * 100}%`);
        // The letters turn light once the bar is 45% of the way under them.
        piece.style.color = fill > 0.45 ? 'var(--mark-text)' : 'inherit';
      });
    }

    // ---- The verdict lines ----
    // Each line is cut into words that wait below their masks until their beat. "shown" says
    // which lines should be in view, so a line cut again after a resize is put straight back.
    const shown = [false, false, false];
    let splits = [];

    // ---- The two layouts ----
    const layouts = gsap.matchMedia();
    layouts.add({ pinned: PIN_QUERY, flow: `not all and ${PIN_QUERY}` }, (context) => {
      const { pinned } = context.conditions;
      // Anything made later (on a scroll beat) is made through this, so it is undone with the layout.
      const act = (fn) => context.add(fn);
      let struck = false;
      marked = false;
      marker.fill = 0;
      shown.fill(false);

      // Cut the verdict lines and tuck their words away.
      splits = verdicts.map((el, i) =>
        el
          ? splitWords(el, (self) => {
              gsap.set(self.words, { yPercent: shown[i] ? 0 : 110 });
            })
          : null
      );
      gsap.set(strike, { scaleX: 0, transformOrigin: '0% 50%' });
      paintMarker();
      section.classList.add('is-ready');

      // Show or hide one verdict line (rising in, or leaving upward).
      const verdict = (i, show, delay = 0) => {
        const split = splits[i];
        if (!split || shown[i] === show) return;
        shown[i] = show;
        act(() => (show ? riseIn(split, delay) : leaveOut(split)));
      };

      // Strike "walk" out (from the left), or take the strike back (shrinking to the right).
      const setStrike = (on) => {
        if (struck === on) return;
        struck = on;
        act(() => {
          if (on) {
            gsap.set(strike, { transformOrigin: '0% 50%' });
            gsap.to(strike, { scaleX: 1, duration: 0.8, ease: EASE.civic, overwrite: true });
          } else {
            gsap.set(strike, { transformOrigin: '100% 50%' });
            gsap.to(strike, { scaleX: 0, duration: 0.6, ease: EASE.civic, overwrite: true });
          }
        });
      };

      // Sweep the marker across "drive", or drain it away.
      const setMark = (on) => {
        if (marked === on) return;
        marked = on;
        act(() => {
          if (sweeping) sweeping.kill();
          sweeping = gsap.to(marker, {
            fill: on ? 1 : 0,
            duration: on ? 0.9 : 0.6,
            ease: EASE.civic,
            onUpdate: paintMarker,
            onComplete: () => {
              sweeping = null;
              paintMarker();
            },
          });
        });
      };

      // Put the strike and the marker back after the question is cut again (a resize), and
      // re-measure the strike whenever the page is re-measured.
      let queued = false;
      const refit = () => {
        queued = false;
        placeStrike();
        if (!sweeping) paintMarker();
      };
      const observer = new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(refit);
      });
      observer.observe(quote, { childList: true, subtree: true });

      if (pinned) {
        section.classList.add('is-pinned');
        stage.setAttribute('data-header-keep', '');
        const setProgress = progressLine ? gsap.quickSetter(progressLine, 'scaleX') : () => {};

        // The playhead: p runs from 0 (the stage just stuck) to 1 (it is about to scroll away).
        const update = (p) => {
          setProgress(p);
          setStrike(p >= STRIKE_AT);
          verdict(0, p >= STRIKE_AT);
          const markOn = p >= MARK_AT;
          setMark(markOn);
          verdict(1, markOn, markOn ? 0.15 : 0);
          verdict(2, markOn, markOn ? 0.3 : 0);
        };
        ScrollTrigger.create({
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => update(self.progress),
          onRefresh: (self) => {
            placeStrike();
            update(self.progress);
          },
        });
      } else {
        // One run, once: the marks one after the other.
        const run = gsap.timeline({ paused: true });
        run.call(() => setStrike(true), null, 0.2);
        run.call(() => verdict(0, true), null, 0.2);
        run.call(() => setMark(true), null, 1.2);
        run.call(() => verdict(1, true), null, 1.35);
        run.call(() => verdict(2, true), null, 1.6);

        // Start it when the question's bottom edge reaches 75% of the window (whichever way that
        // point is reached, even if the page was opened below it), but not before the question
        // has finished rising, so the strike lands on a word that is already in place.
        let started = false;
        const start = () => {
          if (started) return;
          started = true;
          if (quote.classList.contains('is-revealed') || quote.getAttribute('data-reveal') !== 'lines') run.play();
          else quote.addEventListener('civic:revealed', () => run.play(), { once: true });
        };
        ScrollTrigger.create({
          trigger: quote,
          start: 'bottom 75%',
          onEnter: start,
          onEnterBack: start,
          onLeave: start,
          onRefresh: placeStrike,
        });
      }
      placeStrike();

      // Undo this layout (the screen crossed the line, or motion was switched off).
      return () => {
        observer.disconnect();
        if (sweeping) sweeping.kill();
        sweeping = null;
        marker.fill = 0;
        marked = false;
        markPieces().forEach((piece) => {
          piece.classList.remove('is-marked');
          piece.style.removeProperty('--mark-fill');
          piece.style.color = '';
        });
        splits.forEach((split) => split && split.revert());
        splits = [];
        gsap.set([strike, progressLine].filter(Boolean), { clearProps: 'all' });
        stage.removeAttribute('data-header-keep');
        section.classList.remove('is-pinned', 'is-ready');
      };
    });

    // Switching Motion off undoes both layouts.
    return () => layouts.revert();
  },
};
