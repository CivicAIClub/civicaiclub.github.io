// about-frame.js: "the Frame" on the About page (src/components/about/Frame.astro).
//
// Asked for with:
//   <section data-about-frame>              the section (ink)
//     <h2 data-about-frame-title>            "Built to hand over."
//     <span data-about-frame-side> x 4       the rectangle's sides: top, right, bottom, left
//     <span data-about-frame-label> x 4      the words on the sides: Goal, Data source, ...
//     <li data-about-frame-step> x 5         the steps; the text inside that moves is marked
//       <p data-about-frame-lines>           data-about-frame-lines
//     <div data-about-frame-media>           the window onto the finished tool (a Video.astro)
//
// Two ways it plays:
//   1. Laptops and bigger screens (at least 1024px wide and 600px tall): "pinned". The section
//      becomes four screens tall and its stage stays still on screen for the last three (CSS
//      "sticky", switched on with the class "is-pinned"). While you scroll through those three
//      screens, the scroll position is the playhead:
//        - 0% to 60%: the four sides draw one at a time, clockwise from the top left, each over
//          15% of the scroll, tied directly to the scrollbar. Each side's word appears as its
//          line starts.
//        - every 20%: the step inside the rectangle changes. The old step's words leave upward
//          and the new step's words rise in (motion M1: 1.4 seconds on expo.out, 0.012 seconds
//          apart). Scrolling back plays it the other way round.
//        - steps 1 to 4: the rectangle is short. It hugs a band at its top that holds the step's
//          words, centered where the full rectangle will be, so the frame is never a big empty
//          box.
//        - at 80%: the rectangle grows to its full height (1.2 seconds on expo.out) and a window
//          below the band, across the whole inside width, opens from the top onto the finished
//          tool (motion M3: 1.6 seconds on expo.out, the footage sliding down from 30% higher).
//          Scrolling back above 80% shuts the window and shortens the rectangle again.
//      Step 1 and the title rise when the section comes into view. While the stage is pinned it
//      is marked data-header-keep, so the header stays in view (modules/header.js).
//   2. Phones and tablets: no pinning. The steps are listed. When the rectangle comes into view
//      its four sides draw once, one after another (2.2 seconds in all), and the title, each
//      step and the window rise or open as they scroll in, like the rest of the site.
// With reduced motion or Motion: Off this module doesn't run at all, and Frame.astro's plain
// layout shows the whole frame with all five steps listed.

import { gsap, ScrollTrigger, SplitText, EASE, PLAY_ONCE, getLenis } from '../core.js';

// When the frame pins. (The CSS side of pinning is the class "is-pinned" in Frame.astro.)
const PIN_QUERY = '(min-width: 1024px) and (min-height: 600px)';

// Which share of the scroll each part takes (pinned layout).
const SIDES_END = 0.6; // the four sides finish drawing at 60%
const STEP_EVERY = 0.2; // a new step every 20%
const MEDIA_AT = 0.8; // the window opens at 80%

// Cut one block of text into lines and words, each line inside a clipped "mask", the way the
// site's line-rise effect (modules/reveal-lines.js) does. When the window is resized the text
// is cut again at its new line breaks ("autoSplit"), and onSplit runs again each time.
function splitLines(el, onSplit) {
  return SplitText.create(el, {
    type: 'lines,words',
    mask: 'lines',
    autoSplit: true,
    tag: 'span',
    aria: 'none',
    smartWrap: true,
    linesClass: 'split-line',
    wordsClass: 'split-word',
    onSplit,
  });
}

export default {
  name: 'about-frame',
  init() {
    const section = document.querySelector('[data-about-frame]');
    if (!section) return undefined;
    const title = section.querySelector('[data-about-frame-title]');
    const sides = [...section.querySelectorAll('[data-about-frame-side]')];
    const labels = [...section.querySelectorAll('[data-about-frame-label]')];
    const steps = [...section.querySelectorAll('[data-about-frame-step]')];
    const box = sides[0]?.parentElement;
    const mediaWrap = section.querySelector('[data-about-frame-media]');
    const mediaInner = mediaWrap?.querySelector('[data-media-inner]');
    const video = mediaWrap?.querySelector('video');
    if (!title || sides.length !== 4 || !box) return undefined;

    // ---- Shared pieces ----------------------------------------------------------------------

    // Draw the four sides for a drawing progress q from 0 (nothing) to 1 (the whole rectangle):
    // the top side fills during the first quarter, then the right, the bottom and the left.
    // Top and bottom grow sideways (scaleX), left and right grow up or down (scaleY); the CSS
    // sets which end each one grows from, so the line travels clockwise.
    const setters = sides.map((side, i) => gsap.quickSetter(side, i % 2 === 0 ? 'scaleX' : 'scaleY'));
    // Every side can also be moved up or down, for the short rectangle.
    const shift = sides.map((side) => gsap.quickSetter(side, 'y', 'px'));
    const labelShown = labels.map(() => false);
    const amounts = [0, 0, 0, 0];
    // How tall the rectangle is drawn, as a share of its full height (1 = full), and its full
    // height in pixels. Only the pinned layout ever makes it shorter.
    const shape = { height: 1 };
    let fullHeight = 0;
    // A short rectangle stays centered where the full one would be: its top side moves down and
    // its bottom side up by half the missing height each ("lift" is the whole missing height).
    function render() {
      const lift = (1 - shape.height) * fullHeight;
      setters[0](amounts[0]);
      setters[1](amounts[1] * shape.height);
      setters[2](amounts[2]);
      setters[3](amounts[3] * shape.height);
      shift[0](lift / 2);
      shift[1](lift / 2);
      shift[2](-lift / 2);
      shift[3](-lift / 2);
      // The labels, the steps and the tool's window follow (Frame.astro reads --lift).
      box.style.setProperty('--lift', `${lift}px`);
    }
    function drawSides(q) {
      sides.forEach((side, i) => {
        amounts[i] = gsap.utils.clamp(0, 1, q * 4 - i);
        // A side's word appears as soon as its line starts, and hides again if scrolled back.
        showLabel(i, amounts[i] > 0.02);
      });
      render();
    }

    // Show or hide one side's word: it rises into its little window (or drops back out).
    function showLabel(i, show) {
      const label = labels[i];
      if (!label || labelShown[i] === show) return;
      labelShown[i] = show;
      gsap.to(label, {
        yPercent: show ? 0 : 110,
        opacity: show ? 1 : 0,
        duration: show ? 0.9 : 0.5,
        ease: EASE.out,
        overwrite: true,
      });
    }

    // The starting positions every layout shares: sides not drawn, words tucked away.
    function resetShared() {
      // Both directions at full size first, so only the one that draws starts at zero.
      gsap.set(sides, { scaleX: 1, scaleY: 1 });
      drawSides(0);
      labels.forEach((label, i) => {
        labelShown[i] = false;
        gsap.set(label, { yPercent: 110, opacity: 0 });
      });
    }

    // The title rises once (M1), when its trigger crosses the given line.
    function riseTitle(trigger, start) {
      return splitLines(title, (self) =>
        gsap.from(self.words, {
          yPercent: 110,
          duration: 1.4,
          ease: EASE.out,
          stagger: 0.012,
          scrollTrigger: { trigger, start, toggleActions: PLAY_ONCE },
        })
      );
    }

    // The window onto the finished tool: open it from the top (M3), or close it upward.
    function openMedia(open) {
      if (!mediaWrap) return;
      if (open) {
        // Start the clip from its beginning, so it opens on the Doc being made. (The video
        // player in modules/video.js decides whether it actually plays.)
        if (video && video.readyState > 0) video.currentTime = 0;
        gsap.to(mediaWrap, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: EASE.out, overwrite: true });
        if (mediaInner) gsap.fromTo(mediaInner, { yPercent: -30 }, { yPercent: 0, duration: 1.6, ease: EASE.out, overwrite: true });
      } else {
        gsap.to(mediaWrap, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: EASE.out, overwrite: true });
      }
    }

    // ---- The two layouts ---------------------------------------------------------------------
    // gsap.matchMedia runs one setup or the other depending on the screen, and undoes it when
    // the screen changes size across the line (or when motion is switched off).
    const layouts = gsap.matchMedia();

    layouts.add({ pinned: PIN_QUERY, flow: `not all and ${PIN_QUERY}` }, (context) => {
      const { pinned } = context.conditions;
      const splits = [];
      const undo = []; // extra clean-up steps (event listeners) for this layout

      if (pinned) {
        section.classList.add('is-pinned');
        // Keep the header in view while the stage is pinned (modules/header.js).
        const stage = title.parentElement;
        stage.setAttribute('data-header-keep', '');
        undo.push(() => stage.removeAttribute('data-header-keep'));
        resetShared();
        if (mediaWrap) gsap.set(mediaWrap, { clipPath: 'inset(0% 0% 100% 0%)' });

        // Measure the band at the top of the rectangle: how tall the tallest of steps 1 to 4 is
        // (the short rectangle hugs it), and how tall step 5 is (the tool's window starts just
        // below it). Measured again whenever the page is re-measured (after a resize).
        let shortHeight = 1;
        let mediaOpen = false;
        const measureBand = () => {
          const pad = parseFloat(getComputedStyle(section).getPropertyValue('--band-pad')) || 32;
          fullHeight = box.clientHeight;
          const bands = steps.map((step) => step.offsetHeight + pad * 2);
          const lastBand = bands[bands.length - 1] || 0;
          const tallest = Math.max(0, ...bands.slice(0, -1));
          shortHeight = fullHeight ? Math.min(1, tallest / fullHeight) : 1;
          box.style.setProperty('--media-top', `${lastBand}px`);
          if (!growing) shape.height = mediaOpen ? 1 : shortHeight;
          render();
        };
        // Grow the rectangle to its full height (for the tool) or shorten it to the band.
        let growing = null;
        const grow = (full) => {
          if (growing) growing.kill();
          growing = gsap.to(shape, {
            height: full ? 1 : shortHeight,
            duration: full ? 1.2 : 0.8,
            ease: EASE.out,
            onUpdate: render,
            onComplete: () => {
              growing = null;
            },
          });
        };

        // Cut every step's text into lines and words. Only the current step's words sit in
        // view; the others wait just below their masks. (After a resize the text is cut again
        // and each step is put straight back where it belongs.)
        let current = -1; // no step shown yet
        const stepSplits = steps.map((step, i) =>
          [...step.querySelectorAll('[data-about-frame-lines]')].map((el) => {
            const split = splitLines(el, (self) => {
              gsap.set(self.words, { yPercent: i === current ? 0 : 110 });
            });
            splits.push(split);
            return split;
          })
        );
        const wordsOf = (i) => stepSplits[i].flatMap((split) => split.words);

        // Change the step shown: the old one's words leave (upward when moving forward,
        // downward when scrolling back), and the new one's words rise in 0.15 seconds later
        // from the other side. The leaving words travel a little further (140% of their height)
        // so the tails of letters like g and y clear the top of their window completely.
        function goTo(next) {
          if (next === current) return;
          const direction = next > current ? 1 : -1;
          if (current >= 0) {
            gsap.to(wordsOf(current), {
              yPercent: -140 * direction,
              duration: 0.8,
              ease: EASE.out,
              stagger: 0.008,
              overwrite: true,
            });
          }
          gsap.fromTo(
            wordsOf(next),
            { yPercent: 110 * direction },
            { yPercent: 0, duration: 1.4, ease: EASE.out, stagger: 0.012, delay: current >= 0 ? 0.15 : 0, overwrite: true }
          );
          current = next;
        }

        // Everything is in its starting position, so the CSS that hid it can step aside.
        section.classList.add('is-ready');

        // The title and step 1 rise as the section comes up the window (before it pins).
        splits.push(riseTitle(section, 'top 55%'));
        // (If the page was opened further down, step 1 still appears, whichever way it is
        // reached.)
        const firstStep = () => {
          if (current < 0) goTo(0);
        };
        ScrollTrigger.create({
          trigger: section,
          start: 'top 55%',
          onEnter: firstStep,
          onLeave: firstStep,
          onEnterBack: firstStep,
        });

        // The playhead: the scroll through the pinned stretch, from 0 (it just stuck) to 1.
        const update = (progress) => {
          drawSides(progress / SIDES_END);
          if (current >= 0 || progress > 0) {
            goTo(Math.min(steps.length - 1, Math.floor(progress / STEP_EVERY + 1e-6)));
          }
          const open = progress >= MEDIA_AT;
          if (open !== mediaOpen) {
            mediaOpen = open;
            grow(open);
            openMedia(open);
          }
        };
        const playhead = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => update(self.progress),
          onRefresh: (self) => {
            measureBand();
            update(self.progress);
          },
        });
        undo.push(() => {
          if (growing) growing.kill();
          shape.height = 1;
          box.style.removeProperty('--lift');
          box.style.removeProperty('--media-top');
        });

        // A keyboard user can tab to the clip's Pause button while its window is still shut.
        // Then scroll to 90% of the pinned stretch, where the window is open, so they can see
        // where they are (the same idea as the footer's focus handling).
        const onFocus = () => {
          if (mediaOpen) return;
          const y = playhead.start + (playhead.end - playhead.start) * 0.9;
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
        };
        if (mediaWrap) {
          mediaWrap.addEventListener('focusin', onFocus);
          undo.push(() => mediaWrap.removeEventListener('focusin', onFocus));
        }
      } else {
        // Phones and tablets: the plain layout, with each part rising or opening once.
        resetShared();
        section.classList.add('is-ready');

        // The four sides draw one after another when the rectangle is a quarter into view.
        const drawing = { q: 0 };
        gsap.to(drawing, {
          q: 1,
          duration: 2.2,
          ease: EASE.civic,
          onUpdate: () => drawSides(drawing.q),
          scrollTrigger: { trigger: box, start: 'top 75%', toggleActions: PLAY_ONCE },
        });

        splits.push(riseTitle(title, 'top 92%'));
        steps.forEach((step) => {
          step.querySelectorAll('[data-about-frame-lines]').forEach((el) => {
            splits.push(
              splitLines(el, (self) =>
                gsap.from(self.words, {
                  yPercent: 110,
                  duration: 1.4,
                  ease: EASE.out,
                  stagger: 0.012,
                  scrollTrigger: { trigger: step, start: 'top 92%', toggleActions: PLAY_ONCE },
                })
              )
            );
          });
        });

        if (mediaWrap) {
          gsap.set(mediaWrap, { clipPath: 'inset(0% 0% 100% 0%)' });
          // It opens once, whichever way it is reached (even if the page was opened below it).
          let opened = false;
          const reveal = () => {
            if (opened) return;
            opened = true;
            openMedia(true);
          };
          ScrollTrigger.create({ trigger: mediaWrap, start: 'top 85%', onEnter: reveal, onLeave: reveal, onEnterBack: reveal });
        }
      }

      // Undo this layout (the screen crossed the line, or motion was switched off).
      // The sides were drawn directly (not by a tween), so their sizes are cleared by hand.
      return () => {
        undo.forEach((fn) => fn());
        splits.forEach((split) => split.revert());
        gsap.set([...sides, ...labels, mediaWrap, mediaInner].filter(Boolean), { clearProps: 'all' });
        section.classList.remove('is-pinned', 'is-ready');
      };
    });

    // Switching Motion off undoes both layouts.
    return () => layouts.revert();
  },
};
