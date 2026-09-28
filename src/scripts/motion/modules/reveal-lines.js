// reveal-lines.js: motion M1, "line rise". Text rises out of hidden masks, word by word.
//
// Asked for with:  <p data-reveal="lines">Some text</p>
// Optional extras:
//   data-reveal-delay="0.2"     wait this many seconds first
//   data-reveal-on="intro"      play when the page first appears (page tops), not on scroll
//   data-reveal-start="top 80%" start when the element's top reaches 80% down the screen
//                               (default "top 92%": just as it comes into view)
//
// How it works: SplitText (a GSAP helper) cuts the text into lines and words, each line inside a
// clipped "mask". Every word starts pushed down below its line's mask (110% of its height) and
// moves up into place over 1.4 seconds on the expo.out curve, 0.012s after the word before it.
// It plays once. When the window is resized, the text is split again at the new line breaks
// ("autoSplit") and the animation carries on from where it was.
// When it finishes it sends "civic:revealed" from the element; modules/mark.js listens for that.

import { gsap, SplitText, EASE, PLAY_ONCE, onIntro, numberAttr, emit } from '../core.js';

// When SplitText cuts text into lines, a link (or a marked phrase) that sits across a line break
// is copied once per line, and a copy can even be left empty on the line before. For keyboard
// and screen-reader users that would mean empty links, or one link heard and tabbed to twice.
// tidySplit() fixes that after every split:
//   - empty copies (no text, nothing inside) are removed;
//   - when a link was cut into pieces, the first piece gets the whole link text as its name and
//     stays in the Tab order; the other pieces are skipped by Tab and hidden from screen
//     readers. All pieces still work with a mouse or a tap.
// Every link is numbered (data-split-link) before the first split, so its pieces can be found.
function numberLinks(el) {
  el.querySelectorAll('a').forEach((link, i) => link.setAttribute('data-split-link', String(i)));
}

function tidySplit(el) {
  el.querySelectorAll('a, mark, em, strong').forEach((node) => {
    if (!node.textContent.trim() && !node.firstElementChild) node.remove();
  });
  const groups = new Map();
  el.querySelectorAll('a[data-split-link]').forEach((link) => {
    const key = link.getAttribute('data-split-link');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(link);
  });
  groups.forEach((pieces) => {
    if (pieces.length < 2) return;
    const name = pieces.map((piece) => piece.textContent.trim()).join(' ');
    pieces.forEach((piece, i) => {
      if (i === 0) {
        piece.setAttribute('aria-label', name);
      } else {
        piece.setAttribute('tabindex', '-1');
        piece.setAttribute('aria-hidden', 'true');
      }
    });
  });
}

export default {
  name: 'reveal-lines',
  init() {
    const elements = document.querySelectorAll('[data-reveal="lines"]');

    elements.forEach((el) => {
      const delay = numberAttr(el, 'data-reveal-delay', 0);
      const onPageIntro = el.getAttribute('data-reveal-on') === 'intro';
      const start = el.getAttribute('data-reveal-start') || 'top 92%';

      numberLinks(el);
      SplitText.create(el, {
        type: 'lines,words',
        mask: 'lines',
        autoSplit: true,
        // Plain <span>s keep the HTML valid inside paragraphs and links. "aria: none" leaves
        // the words readable to screen readers exactly as they were.
        tag: 'span',
        aria: 'none',
        // Keep pieces that touch without a space together, e.g. a marked "week" and the "."
        // after it, so a line never starts with a lone full stop.
        smartWrap: true,
        // Tidy the spaces ourselves instead of letting SplitText do it: its own tidy-up turns the
        // "no-break space" in names like "Keke Li ’27" into a normal space, and then a narrow
        // screen can start a line with a lone ’27. This squeezes runs of ordinary spaces and line
        // breaks into one space and leaves no-break spaces alone, so a name and its year stay
        // together as one word.
        reduceWhiteSpace: false,
        prepareText: (text) => text.replace(/[ \t\n\r\f\v]+/g, ' '),
        linesClass: 'split-line',
        wordsClass: 'split-word',
        // Runs after every split (the first one, and again after a resize).
        onSplit(self) {
          tidySplit(el);
          const tween = gsap.from(self.words, {
            yPercent: 110,
            duration: 1.4,
            ease: EASE.out,
            stagger: 0.012,
            delay,
            paused: onPageIntro,
            scrollTrigger: onPageIntro ? undefined : { trigger: el, start, toggleActions: PLAY_ONCE },
            onComplete: () => {
              el.classList.add('is-revealed');
              emit('civic:revealed', {}, el);
            },
          });
          // The words are now hidden in their masks, so the block itself can be shown.
          el.classList.add('is-split');
          if (onPageIntro) onIntro(() => tween.play());
          // Handing the animation back lets SplitText keep its progress after a re-split.
          return tween;
        },
      });
    });
  },
};
