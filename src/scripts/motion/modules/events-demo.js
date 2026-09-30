// events-demo.js: the demo "sheet" on an event page: one typed prompt, then the finished deck it
// built (src/components/events/EventSheet.astro).
//
// Asked for with:
//   <div data-events-demo>                           the ink band
//     <figure data-events-demo-frame="0"> and "1"      the two photos (the prompt, the deck)
//     <div data-events-demo-caption="0"> and "1"       their captions
//     <span data-events-demo-edge>                     a 1px line inside the deck's window
//
// Two ways it plays:
//   1. Laptops and larger (PIN_QUERY in helpers/events-shared.js) with motion on: "pinned". The
//      band becomes 220% of a screen tall and its stage stays still on screen (CSS, from the class
//      "is-pinned"; the stage is marked data-header-keep so the header stays in view). Both photos
//      sit in the same place, the deck on top, and the scroll through the stretch is the
//      playhead, p, from 0 to 1:
//        - from p = 0.2 to 0.7 the deck is laid over the prompt from the bottom up (its visible
//          part grows from nothing at the bottom edge: clip-path inset(100% 0 0 0) to inset(0)),
//          tied directly to the scroll, like the site's page-change sheet. A thin light line
//          rides the deck's top edge while it moves (hidden before the deck starts and once it
//          covers the prompt), so the edge reads as a new sheet lying on top, not as a seam in one
//          photo.
//          Over the same stretch the prompt's photo pushes in from 100% to 106% around the typed
//          words on its screen (64% across, 72% down). It is never darkened. The deck's picture
//          also slides up inside its window as it is laid over (from 30% of its height lower to
//          its place, the same slide as the photo opening M3, the other way up), so the two
//          photos, taken from almost the same spot, never line up into one image while the edge
//          crosses the speakers; it reads as a second sheet coming in;
//        - at p = 0.45 the prompt's caption leaves upward and the deck's caption rises 0.15 s
//          later. (Each caption carries its own plate number, "Plate 2" and "Plate 3".)
//        - scrolling back plays all of it the other way.
//      The prompt's photo opens from the top as it arrives (M3, the shared media-open.js). When
//      the band is one screen away, both photos are fetched and decoded straight away (instead of
//      lazily), and the deck is only laid over once it is ready, so it never arrives half-drawn.
//   2. Everything else with motion on: the two photos one after the other, each opening from the
//      top (M3), with their captions rising as they come into view.
// Motion off, reduced motion or no JavaScript: this module doesn't run, and the two photos are
// simply stacked with their captions.

import { gsap, ScrollTrigger } from '../core.js';
import { PIN_QUERY, splitWords, riseIn, leaveOut } from '../helpers/events-shared.js';

// The stretch of the playhead over which the deck is laid over the prompt, and when the captions
// change.
const WIPE_FROM = 0.2;
const WIPE_TO = 0.7;
const SWAP_AT = 0.45;
// How far below its place the deck's picture starts, as a share of its height (in percent).
const DECK_SLIDE = 30;

export default {
  name: 'events-demo',
  init() {
    const sheet = document.querySelector('[data-events-demo]');
    if (!sheet) return undefined; // no demo sheet on this page
    const track = sheet.querySelector('.sheet__track');
    const stage = sheet.querySelector('.sheet__stage');
    const frames = [0, 1].map((i) => sheet.querySelector(`[data-events-demo-frame="${i}"]`));
    const captions = [0, 1].map((i) => sheet.querySelector(`[data-events-demo-caption="${i}"]`));
    const edge = sheet.querySelector('[data-events-demo-edge]');
    if (!track || !stage || frames.some((f) => !f) || captions.some((c) => !c)) return undefined;

    // The prompt's photo (the one that pushes in), the deck's photo (the one that slides up as it
    // is laid over) and both <img> elements (to load early).
    const promptPicture = frames[0].querySelector('picture');
    const deckPicture = frames[1].querySelector('picture');
    const images = frames.map((frame) => frame.querySelector('img')).filter(Boolean);

    const layouts = gsap.matchMedia();
    layouts.add({ pinned: PIN_QUERY, flow: `not all and ${PIN_QUERY}` }, (context) => {
      const { pinned } = context.conditions;
      // Anything made later (on a scroll beat) is made through this, so it is undone with the layout.
      const act = (fn) => context.add(fn);
      // Which caption is showing its words (the prompt's at first in the pinned layout).
      const shown = [pinned, false];
      // False once this layout has been undone, so a photo that finishes decoding later changes
      // nothing.
      let alive = true;

      // Cut every line of both captions into words; each caption's words wait below their masks
      // unless that caption is showing. (Put back the same way after a resize re-cuts them.)
      const splits = captions.map((caption, i) =>
        [...caption.querySelectorAll('p')].map((p) =>
          splitWords(p, (self) => gsap.set(self.words, { yPercent: shown[i] ? 0 : 110 }))
        )
      );
      const rise = (i, delay) => splits[i].forEach((split) => riseIn(split, delay));
      const leave = (i) => splits[i].forEach((split) => leaveOut(split));

      if (pinned) {
        sheet.classList.add('is-pinned');
        stage.setAttribute('data-header-keep', '');
        // The deck starts fully covered (nothing visible yet); the prompt's photo at its own size,
        // ready to push in around the typed words.
        gsap.set(frames[1], { clipPath: 'inset(100% 0% 0% 0%)' });
        if (edge) gsap.set(edge, { yPercent: 100, autoAlpha: 0 });
        if (promptPicture) gsap.set(promptPicture, { scale: 1, transformOrigin: '64% 72%' });
        if (deckPicture) gsap.set(deckPicture, { yPercent: DECK_SLIDE });

        // Whether both photos are decoded, and the last playhead position (to catch up once
        // they are).
        let ready = false;
        let lastProgress = 0;

        // Swap the captions (forward past 0.45, back before it).
        let swapped = false;
        const swap = (on) => {
          if (swapped === on) return;
          swapped = on;
          shown[0] = !on;
          shown[1] = on;
          act(() => {
            leave(on ? 0 : 1);
            rise(on ? 1 : 0, 0.15);
          });
        };

        // The playhead: lay the deck over the prompt (its picture sliding up into place inside
        // the window; the window hides the gap this leaves under the picture, because the part
        // on show always starts lower down than the picture's top edge), push the prompt in, and
        // swap the captions at the middle.
        const apply = (p) => {
          lastProgress = p;
          const wipe = ready ? gsap.utils.clamp(0, 1, (p - WIPE_FROM) / (WIPE_TO - WIPE_FROM)) : 0;
          gsap.set(frames[1], { clipPath: `inset(${(1 - wipe) * 100}% 0% 0% 0%)` });
          // The edge line sits on the clip edge (the top of its window-sized box moves down by
          // the same share), and shows only while the deck is part way over.
          if (edge) gsap.set(edge, { yPercent: (1 - wipe) * 100, autoAlpha: wipe > 0 && wipe < 1 ? 1 : 0 });
          if (promptPicture) gsap.set(promptPicture, { scale: 1 + 0.06 * wipe });
          if (deckPicture) gsap.set(deckPicture, { yPercent: DECK_SLIDE * (1 - wipe) });
          swap(p >= SWAP_AT);
        };
        // Fetch and decode both photos when the band is one screen away; until then (or if that
        // fails, until it has been tried) the deck waits.
        let asked = false;
        const load = () => {
          if (asked) return;
          asked = true;
          images.forEach((img) => {
            img.loading = 'eager';
          });
          Promise.all(images.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))).then(() => {
            if (!alive) return;
            ready = true;
            apply(lastProgress);
          });
        };
        ScrollTrigger.create({
          trigger: track,
          start: 'top bottom+=100%',
          onEnter: load,
          onEnterBack: load,
          onLeave: load,
        });

        ScrollTrigger.create({
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => apply(self.progress),
          onRefresh: (self) => apply(self.progress),
        });
      } else {
        // Each caption rises once when it comes into view (like the site's M1).
        captions.forEach((caption, i) => {
          let done = false;
          const show = () => {
            if (done) return;
            done = true;
            shown[i] = true;
            act(() => rise(i, 0));
          };
          ScrollTrigger.create({ trigger: caption, start: 'top 92%', onEnter: show, onEnterBack: show, onLeave: show });
        });
      }

      // Everything is in its starting place, so the CSS that hid it can step aside.
      sheet.classList.add('is-ready');

      // Undo this layout (the screen crossed the line, or motion was switched off).
      return () => {
        alive = false;
        splits.flat().forEach((split) => split.revert());
        gsap.set([frames[1], promptPicture, deckPicture].filter(Boolean), { clearProps: 'clipPath,transform,transformOrigin,scale' });
        if (edge) gsap.set(edge, { clearProps: 'transform,opacity,visibility' });
        stage.removeAttribute('data-header-keep');
        sheet.classList.remove('is-pinned', 'is-ready');
      };
    });

    // Switching Motion off undoes both layouts.
    return () => layouts.revert();
  },
};
