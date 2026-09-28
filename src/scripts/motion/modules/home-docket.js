// home-docket.js: the home page's docket of cases A to E (src/components/home/Docket.astro).
//
// Asked for with:  <section data-docket>  (plus the data-dk-* parts inside it)
//
// The docket shows each case as a giant letter (traced from Host Grotesk Bold) cut out of an ink
// sheet, with the case's footage playing through the hole in full color. This module runs only
// while motion is on, and does one of two things depending on the screen:
//
// A. Laptops and desktops (1024px and wider, with a mouse or trackpad): "the stage".
//    - The section becomes five screens tall and the stage stays stuck to the window while you
//      scroll through it. Each fifth of that scroll shows one case (not tied smoothly to the
//      scroll: a case changes as you cross into its fifth).
//    - Changing case: the old letter rolls up out of its window while the new one rolls up
//      into it (motion M9, 0.9s on expo.out), the footage fades across in 0.4s, and the words
//      on the right swap the same way, word by word (M1's rise, at 0.9s), together with the
//      "Built by" and "Status" rows. The A to E rail underlines the current letter (M8).
//    - Pointing at the letter pushes the footage in a little (it grows from 100% to 104% of
//      its size over 0.6s), and the cursor label reads "Open Case A ↗".
//    - Clicking the letter (or "Open case") zooms through it: the hole grows around a point
//      inside one of the letter's strokes, about 40 times over 0.7s on the "civic" curve,
//      until the footage fills the screen; then the case page opens. The stage is given the
//      name "case-media-<slug>" for the browser's page-change animation, so a case page whose
//      hero footage uses the same name continues from this picture.
//    - "List view" swaps the letter for a centered list of every case name, the current one
//      in paper white, with a small window of its footage beside it.
//    - A Pause button stops the case footage (and it stays stopped until Play).
// B. Phones, tablets and touch screens: a plain stack of letter windows, each opening like a
//    shutter as it scrolls into view (motion M3) with its words rising in (M1). Only the window
//    in the middle of the screen plays its footage; the others wait on their still picture (so
//    a tablet showing two or three windows at once never plays them all). Tapping a window
//    follows its link with the normal page change.
// With motion off (the device setting or the footer switch) this module does nothing, and the
// stack of letter windows is simply there, each a plain link.

import { gsap, ScrollTrigger, SplitText, EASE, PLAY_ONCE, getLenis, emit } from '../core.js';
import { rollText } from '../helpers/letter-roll.js';
import glyphs from '../../../components/home/docket-letters.json';

// Which screens get the stage: wide enough, and with a real mouse or trackpad.
const STAGE_QUERY = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
const STACK_QUERY = `not all and ${STAGE_QUERY}`;

// How far words and single lines wait outside their windows (in % of their own height). Single
// lines (the office, the link) have roomier windows, so they wait further away.
const WORD_OFF = 110;
const LINE_OFF = 200;
// Words leaving go further (140%): each line's window is cut a little larger than the line (see
// base.css), and at 110% the tails of letters like g, p and y would still show at its edge.
const WORD_OUT = 140;

// Pointing at the letter pushes the footage in to 104% of its size, over 0.6s.
const PUSH = 1.04;

// Split a block of text into lines and words, each line in its own clipped window, using the
// same class names as the site's M1 text so the same window sizes apply (see base.css).
function splitLines(el, onSplit) {
  return SplitText.create(el, {
    type: 'lines,words',
    mask: 'lines',
    autoSplit: true,
    tag: 'span',
    aria: 'none',
    linesClass: 'split-line',
    wordsClass: 'split-word',
    onSplit,
  });
}

// Read a size token from the page's design values (tokens.css), e.g. "--margin" gives 40.
function token(name) {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}

export default {
  name: 'home-docket',
  init() {
    const section = document.querySelector('[data-docket]');
    if (!section) return undefined;
    const mm = gsap.matchMedia();
    mm.add(STAGE_QUERY, () => setupStage(section));
    mm.add(STACK_QUERY, () => setupStack(section));
    section.classList.add('is-ready');
    return () => {
      mm.revert();
      section.classList.remove('is-ready');
    };
  },
};

// =====================================================================================
// B. The stack (phones, tablets, touch screens)
// =====================================================================================
function setupStack(section) {
  const splits = [];
  const windows = [];
  section.querySelectorAll('[data-dk-case]').forEach((caseEl) => {
    const win = caseEl.querySelector('.dk-case__window');
    windows.push({ win, video: win.querySelector('[data-dk-media] video'), onScreen: false, inBand: false });
    const inside = [...win.querySelectorAll('.dk-case__media, .dk-case__ink')];
    // The window opens like a shutter from the top while its contents slide down into place.
    const open = gsap.timeline({ scrollTrigger: { trigger: win, start: 'top 85%', toggleActions: PLAY_ONCE } });
    open.fromTo(win, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: EASE.out }, 0);
    // (clearProps: once in place, the footage layer keeps no transform, which would otherwise
    // trap the clip's Pause button underneath the ink sheet.)
    open.fromTo(inside, { yPercent: -30 }, { yPercent: 0, duration: 1.6, ease: EASE.out, clearProps: 'transform' }, 0);

    // The words rise out of their line windows (M1) when the text block comes into view.
    const text = caseEl.querySelector('[data-dk-text]');
    const lines = [...text.querySelectorAll('[data-dk-line], [data-dk-fact]')];
    const rise = gsap.timeline({ paused: true });
    let played = false;
    text.querySelectorAll('[data-dk-split]').forEach((el) => {
      splits.push(
        splitLines(el, (self) => {
          // After a re-split (the window was resized), show the words at once if it already played.
          gsap.set(self.words, { yPercent: played ? 0 : WORD_OFF });
        })
      );
    });
    gsap.set(lines, { yPercent: LINE_OFF });
    ScrollTrigger.create({
      trigger: text,
      start: 'top 92%',
      onEnter: () => {
        if (played) return;
        played = true;
        const targets = [...text.querySelectorAll('.split-word, [data-dk-line], [data-dk-fact]')];
        rise.to(targets, { yPercent: 0, duration: 1.4, ease: EASE.out, stagger: 0.012 });
        rise.play();
      },
    });
  });
  const stopCentering = playCentered(section, windows);
  return () => {
    stopCentering();
    splits.forEach((split) => split.revert());
  };
}

// Play only the letter window in the middle of the screen (stacked layout).
// Two watchers ("IntersectionObserver", the browser's built-in way to be told when something
// scrolls into or out of view): one for the band across the middle of the screen (the middle 30%
// of its height), one for the whole screen. The window nearest the middle of that band gets the
// class "is-centered" and plays; every other window pauses on its still picture. Between two
// windows (none in the band) the last one keeps playing until it leaves the screen.
function playCentered(section, windows) {
  const withVideo = windows.filter((w) => w.video);
  if (!withVideo.length || typeof IntersectionObserver !== 'function') return () => {};
  // Take these clips over from the page-wide video player (see "is-centering" in Docket.astro).
  section.classList.add('is-centering');
  let current = null;

  // Ask the browser to play; a refusal (Low Power Mode) simply keeps the still picture.
  function play(video) {
    const attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(() => {});
  }

  // Pick the window nearest the middle of the screen, and play it alone.
  function choose() {
    const middle = window.innerHeight / 2;
    const inBand = withVideo.filter((w) => w.inBand);
    let next = current && current.onScreen ? current : null;
    if (inBand.length) {
      next = inBand.reduce((best, w) => {
        const r = w.win.getBoundingClientRect();
        const b = best.win.getBoundingClientRect();
        return Math.abs(r.top + r.height / 2 - middle) < Math.abs(b.top + b.height / 2 - middle) ? w : best;
      });
    }
    current = next;
    withVideo.forEach((w) => {
      const on = w === current && !document.hidden;
      w.win.classList.toggle('is-centered', w === current);
      if (on && w.video.paused && !w.userPaused) play(w.video);
      else if (!on && !w.video.paused) w.video.pause();
    });
  }

  const band = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const w = withVideo.find((o) => o.win === entry.target);
        if (w) w.inBand = entry.isIntersecting;
      });
      choose();
    },
    { rootMargin: '-35% 0px -35% 0px' }
  );
  const screen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const w = withVideo.find((o) => o.win === entry.target);
      if (w) w.onScreen = entry.isIntersecting;
    });
    choose();
  });
  withVideo.forEach((w) => {
    band.observe(w.win);
    screen.observe(w.win);
  });

  // A visitor's own Pause (the button on each window) is kept until they press Play again, so the
  // window doesn't start again by itself the next time it reaches the middle of the screen.
  // (Read a moment after the click, once the page-wide video player has paused or played it.)
  const toggles = withVideo.map((w) => {
    const toggle = w.win.querySelector('[data-video-toggle]');
    const onToggle = () => setTimeout(() => (w.userPaused = w.video.paused), 0);
    if (toggle) toggle.addEventListener('click', onToggle);
    return () => toggle && toggle.removeEventListener('click', onToggle);
  });

  // While two windows share the band (a tall tablet screen), keep checking which one is nearer
  // the middle as the page scrolls (at most once per screen frame).
  let queued = 0;
  const onScroll = () => {
    if (queued || withVideo.filter((w) => w.inBand).length < 2) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      choose();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  // Leaving the tab pauses; coming back plays the middle one again. (A moment later, so the
  // page-wide video player, which pauses clips it thinks are off screen, has had its turn.)
  const onVisibility = () => setTimeout(choose, 0);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    band.disconnect();
    screen.disconnect();
    cancelAnimationFrame(queued);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    toggles.forEach((undo) => undo());
    withVideo.forEach((w) => {
      w.win.classList.remove('is-centered');
      w.video.pause();
    });
    // Hand the clips back to the page-wide video player.
    section.classList.remove('is-centering');
  };
}

// =====================================================================================
// A. The stage (laptops and desktops)
// =====================================================================================
function setupStage(section) {
  const stage = section.querySelector('[data-docket-stage]');
  const ink = section.querySelector('[data-dk-ink]');
  const hit = section.querySelector('[data-dk-hit]');
  const list = section.querySelector('[data-dk-list]');
  const bar = section.querySelector('[data-dk-bar]');
  const casesList = section.querySelector('.docket__cases');
  if (!stage || !ink || !hit || !list || !bar || !casesList) return undefined;

  const slotRect = ink.querySelector('[data-dk-slot]');
  const mask = ink.querySelector('[data-dk-mask]');
  const maskBg = ink.querySelector('[data-dk-mask-bg]');
  const sheet = ink.querySelector('[data-dk-sheet]');
  const holes = ink.querySelector('[data-dk-holes]');
  const thumb = ink.querySelector('[data-dk-thumb]');
  const pause = bar.querySelector('[data-dk-pause]');
  const pauseLabel = bar.querySelector('[data-dk-pause-label]');
  const pill = bar.querySelector('[data-dk-pill]');
  const pillLabel = bar.querySelector('[data-dk-pill-label]');
  const rail = [...bar.querySelectorAll('[data-dk-go]')];
  const listItems = [...list.querySelectorAll('[data-dk-list-item]')];

  // Everything we need about each case.
  const cases = [...section.querySelectorAll('[data-dk-case]')].map((el, i) => {
    const letter = el.dataset.letter;
    const hole = ink.querySelector(`[data-dk-hole="${letter}"]`);
    return {
      i,
      el,
      letter,
      slug: el.dataset.slug,
      href: el.dataset.href || '',
      glyph: glyphs.letters[letter],
      hole,
      media: el.querySelector('[data-dk-media]'),
      // The layer inside the footage that the hover push-in scales (around its middle).
      inner: el.querySelector('[data-dk-media] .video__inner'),
      video: el.querySelector('[data-dk-media] video'),
      text: el.querySelector('[data-dk-text]'),
      // Where the letter is in its window: 0 = in place, -1.1 = gone above, 1.1 = waiting below.
      roll: { v: 1.1 },
      // True while this case's footage is fading out (it keeps playing until it has gone).
      fading: false,
    };
  });
  const n = cases.length;

  // The stage's state, in one place:
  let active = -1; // the case on screen (-1 before the first one rolls in)
  let started = false; // has the first case rolled in yet?
  let visible = false; // is any part of the stage on screen?
  let userPaused = false; // did the visitor press Pause?
  let listMode = false; // is the list view on?
  let listFocus = -1; // in the list view, the name being shown
  let zooming = false; // is the zoom into a case running?
  let hovering = false; // is the pointer over the letter?
  let zoomTimeline = null;

  // ---- Switch the section into its stage layout ----
  section.classList.add('is-stage');
  // (toggleAttribute, not .hidden: the ink sheet is an SVG drawing, which has no .hidden property.)
  [ink, hit, list, bar].forEach((el) => el.toggleAttribute('hidden', false));
  list.inert = true;

  // ---- Measuring: where the letter, its window and the footage go at this window size ----
  const geo = { W: 0, H: 0, margin: 0, L: 0, k: 1, top: 0, S: 0 };

  function measure() {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const margin = token('--margin');
    const gutter = token('--gutter');
    const cols = token('--cols') || 12;
    const col = (W - 2 * margin - (cols - 1) * gutter) / cols;
    const sixCols = 6 * col + 5 * gutter;
    // The letters are about 78% of the window's height, but never wider than six columns.
    const widest = Math.max(...Object.values(glyphs.letters).map((g) => g.width));
    const L = Math.min(0.78 * H, (sixCols * glyphs.capHeight) / widest);
    const k = L / glyphs.capHeight;
    const top = Math.round((H - L) / 2);
    // The footage squares are drawn at a size that covers the whole stage (for the zoom's last
    // frame) and shrunk down to sit behind the letter the rest of the time.
    const S = Math.ceil(Math.max(W, H) * 1.02);
    Object.assign(geo, { W, H, margin, L, k, top, S, sixCols });

    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    [mask, maskBg, sheet].forEach((el) => {
      el.setAttribute('x', '0');
      el.setAttribute('y', '0');
      el.setAttribute('width', String(W));
      el.setAttribute('height', String(H));
    });
    // The letters' window: a little taller than a capital, because round letters overshoot.
    const pad = 0.03 * L;
    slotRect.setAttribute('x', String(margin - pad));
    slotRect.setAttribute('y', String(top - pad));
    slotRect.setAttribute('width', String(sixCols + 2 * pad));
    slotRect.setAttribute('height', String(L + 2 * pad));

    stage.style.setProperty('--dk-media', `${S}px`);
    stage.style.setProperty('--dk-top', `${top}px`);
    // The letter's height, which places the "Built by" and "Status" rows (see Docket.astro).
    stage.style.setProperty('--dk-l', `${L}px`);
    cases.forEach(placeHole);
    cases.forEach((c) => c.media && gsap.set(c.media, idleMedia(c)));
    placeHit();
    if (listMode) placeThumb(true);
  }

  // Draw a letter at its current roll position.
  function placeHole(c) {
    if (!c.hole) return;
    const y = geo.top + c.roll.v * geo.L;
    c.hole.setAttribute('transform', `translate(${geo.margin} ${y}) scale(${geo.k})`);
  }

  // Where a case's footage square sits when it is seen through its letter: centered on the
  // letter, just big enough that the letter shows the middle 80% of the clip.
  function idleMedia(c) {
    const side = geo.L / 0.8;
    const cx = geo.margin + (c.glyph.width * geo.k) / 2;
    const cy = geo.top + geo.L / 2;
    return { x: cx - side / 2, y: cy - side / 2, scale: side / geo.S };
  }

  // The invisible link over the current letter (hover for color, click to zoom).
  function placeHit() {
    const c = cases[active] ?? cases[0];
    stage.style.setProperty('--dk-hit-x', `${geo.margin}px`);
    stage.style.setProperty('--dk-hit-y', `${geo.top}px`);
    stage.style.setProperty('--dk-hit-w', `${c.glyph.width * geo.k}px`);
    stage.style.setProperty('--dk-hit-h', `${geo.L}px`);
  }

  // ---- The words: split each case's name and line into words, hide them below ----
  const splits = [];
  cases.forEach((c) => {
    c.lines = [...c.text.querySelectorAll('[data-dk-line]')];
    // The values in the "Built by" and "Status" rows.
    c.facts = [...c.text.querySelectorAll('[data-dk-fact]')];
    gsap.set(c.facts, { yPercent: c.i === active ? 0 : LINE_OFF });
    c.text.querySelectorAll('[data-dk-split]').forEach((el) => {
      splits.push(
        splitLines(el, (self) => {
          // Freshly split words (first time, or after a resize) take the case's current state.
          gsap.set(self.words, { yPercent: c.i === active && !listMode ? 0 : WORD_OFF });
        })
      );
    });
    gsap.set(c.lines, { yPercent: c.i === active ? 0 : LINE_OFF });
  });
  const pieces = (c) => [...c.text.querySelectorAll('.split-word, [data-dk-line]')];

  // Words leave upward (or downward when scrolling back) and the next case's words rise in.
  // The two rows' values move at the same moment as the case name, on the same timing, so the
  // whole column changes as one.
  function textOut(c, dir) {
    const targets = pieces(c);
    gsap.to(targets, {
      yPercent: (i) => (targets[i].hasAttribute('data-dk-line') ? -LINE_OFF : -WORD_OUT) * dir,
      duration: 0.9,
      ease: EASE.out,
      stagger: 0.012,
      overwrite: true,
    });
    gsap.to(c.facts, { yPercent: -LINE_OFF * dir, duration: 0.9, ease: EASE.out, stagger: 0.012, overwrite: true });
  }
  // (The new words start 0.12s after the old ones, so the two never crowd the same line.)
  function textIn(c, dir, instant = false) {
    const targets = pieces(c);
    gsap.fromTo(
      targets,
      // (Words coming down from above wait further out, for the same reason as WORD_OUT.)
      { yPercent: (i) => (targets[i].hasAttribute('data-dk-line') ? LINE_OFF : dir > 0 ? WORD_OFF : WORD_OUT) * dir },
      {
        yPercent: 0,
        duration: instant ? 0 : 0.9,
        delay: instant ? 0 : 0.12,
        ease: EASE.out,
        stagger: instant ? 0 : 0.012,
        overwrite: true,
      }
    );
    gsap.fromTo(
      c.facts,
      { yPercent: LINE_OFF * dir },
      {
        yPercent: 0,
        duration: instant ? 0 : 0.9,
        delay: instant ? 0 : 0.12,
        ease: EASE.out,
        stagger: instant ? 0 : 0.012,
        overwrite: true,
      }
    );
  }

  // ---- The letter roll (M9) ----
  function rollTo(c, to, from) {
    if (!c.hole) return;
    if (from !== undefined) c.roll.v = from;
    gsap.to(c.roll, { v: to, duration: 0.9, ease: EASE.out, overwrite: true, onUpdate: () => placeHole(c) });
  }

  // ---- The footage ----

  // The case whose footage is showing: the current case, or in the list view the name being
  // pointed at.
  const shown = () => (listMode && listFocus >= 0 ? listFocus : active);

  // Play the shown case's clip while the stage is on screen (and not paused); stop the rest.
  function syncPlayback() {
    cases.forEach((c) => {
      if (!c.video) return;
      const should = c.i === shown() && visible && !userPaused && !document.hidden;
      if (should && c.video.paused) {
        const attempt = c.video.play();
        if (attempt && attempt.catch) attempt.catch(() => {});
      } else if (!should && !c.fading && !c.video.paused) {
        c.video.pause();
      }
    });
    pauseLabel.textContent = userPaused ? 'Play' : 'Pause';
    // Case E has no footage, so there is nothing to pause: the button steps aside (keeping its
    // place in the bar) while E is shown.
    const current = cases[shown()];
    pause.style.visibility = current && !current.video ? 'hidden' : '';
  }

  // Fade one case's footage in or out (0.4s), or switch it at once ("instant").
  function fade(c, on, instant = false) {
    if (!c.media) return;
    c.fading = !on;
    gsap.to(c.media, {
      opacity: on ? 1 : 0,
      duration: instant ? 0 : 0.4,
      ease: EASE.civic,
      overwrite: 'auto',
      onComplete: () => {
        c.fading = false;
        syncPlayback();
      },
    });
  }

  // ---- Going from one case to another ----
  function goTo(next, { instant = false } = {}) {
    if (next === active || next < 0 || next >= n) return;
    const prev = active;
    const dir = prev < 0 || next > prev ? 1 : -1;
    active = next;
    const c = cases[next];

    if (!listMode) {
      // The letters roll, the words swap and the footage fades across.
      if (prev >= 0) rollTo(cases[prev], -1.1 * dir);
      if (instant) {
        gsap.killTweensOf(c.roll);
        c.roll.v = 0;
        placeHole(c);
      } else {
        rollTo(c, 0, 1.1 * dir);
      }
      if (prev >= 0) textOut(cases[prev], dir);
      textIn(c, dir, instant);
      if (prev >= 0) fade(cases[prev], false);
      if (c.media) {
        gsap.set(c.media, idleMedia(c));
        // Arriving straight on a case (the "Cases" link, a reload) shows its footage at once:
        // no fade up from black, so nothing blinks while the page settles. (Until the clip's
        // first frame is ready the browser shows its still picture, which is that same frame.)
        fade(c, true, instant);
      }
    } else {
      // In the list view, the list's highlight and its small window move instead.
      focusList(next);
    }

    // Classes, the rail and the invisible link follow the current case.
    cases.forEach((o) => o.el.classList.toggle('is-active', o.i === next));
    rail.forEach((button, i) => {
      button.classList.toggle('is-active', i === next);
      if (i === next) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    hit.hidden = !c.href;
    hit.href = c.href || '#cases';
    if (c.href) hit.setAttribute('data-cursor', `Open Case ${c.letter} ↗`);
    else hit.removeAttribute('data-cursor');
    emit('civic:cursor-refresh');
    placeHit();
    syncPlayback();
    // (A case that arrives under a still pointer is pushed in too; the one leaving lets go.)
    if (hovering) push();
  }

  // Which case the scroll position asks for: each fifth of the stage's scroll is one case.
  const track = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      if (!started || zooming) return;
      goTo(Math.min(n - 1, Math.floor(self.progress * n)));
    },
  });

  // The first case rolls in when the stage is a third of the way up the window. If the page
  // opens further down (a reload, or the "Cases" link), the right case is shown at once.
  // Once a case is showing, the intro trigger has done its job and is switched off, so it can
  // never play the case that is already on screen a second time.
  function start(instant) {
    if (started) return;
    started = true;
    goTo(Math.min(n - 1, Math.floor(track.progress * n)), { instant });
    if (intro) intro.disable(false);
  }
  let intro = null;
  intro = ScrollTrigger.create({
    trigger: section,
    start: 'top 65%',
    onEnter: () => start(false),
  });
  // Play the footage only while any part of the stage is on screen.
  const onScreen = ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      visible = self.isActive;
      syncPlayback();
    },
  });

  // ---- Hover: the footage pushes in a little ----
  // While the pointer is over the letter, the current case's footage grows to 104% around the
  // middle of the letter (0.6s on expo.out) and shrinks back when it leaves. Only the size
  // changes: the footage is in full color all the time.
  function push() {
    cases.forEach((c) => {
      if (!c.inner) return;
      const on = hovering && c.i === active && !listMode && !zooming;
      gsap.to(c.inner, { scale: on ? PUSH : 1, duration: 0.6, ease: EASE.out, overwrite: 'auto' });
    });
  }
  const hoverOn = () => {
    hovering = true;
    section.classList.add('is-hover');
    push();
  };
  const hoverOff = () => {
    hovering = false;
    section.classList.remove('is-hover');
    push();
  };
  hit.addEventListener('pointerenter', hoverOn);
  hit.addEventListener('pointerleave', hoverOff);

  // ---- The rail: scroll to a case (smoothly, so the letters roll through the ones between) ----
  function scrollYFor(i) {
    const top = section.getBoundingClientRect().top + window.scrollY;
    const segment = (section.offsetHeight - window.innerHeight) / n;
    return top + (i + 0.5) * segment;
  }
  function scrollToCase(i, immediate = false) {
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(scrollYFor(i), immediate ? { immediate: true, force: true } : { duration: 1.2, force: true });
    else window.scrollTo({ top: scrollYFor(i), behavior: immediate ? 'auto' : 'smooth' });
  }
  const onRail = (event) => {
    const button = event.target.closest('[data-dk-go]');
    if (button) scrollToCase(Number(button.dataset.dkGo));
  };
  bar.addEventListener('click', onRail);

  // Keyboard users tabbing onto a case's link (or a name in the list) are taken to that case,
  // so what has focus is always what is on screen.
  const onFocus = (event) => {
    const caseEl = event.target.closest('[data-dk-case]');
    const item = event.target.closest('[data-dk-list-item]');
    const i = caseEl ? Number(caseEl.dataset.dkCase) : item ? Number(item.dataset.dkListItem) : -1;
    if (i >= 0 && i !== active) {
      start(true);
      scrollToCase(i, true);
      goTo(i, { instant: true });
    }
  };
  stage.addEventListener('focusin', onFocus);

  // ---- Pause / Play for the case footage ----
  const onPause = () => {
    userPaused = !userPaused;
    syncPlayback();
  };
  pause.addEventListener('click', onPause);
  const onVisibility = () => syncPlayback();
  document.addEventListener('visibilitychange', onVisibility);

  // =================== List view ===================
  const thumbState = { cy: 0, h: 0 };

  // The small window beside the focused name: its size, and where the focused row is.
  function thumbSize() {
    const row = listItems[0]?.getBoundingClientRect().height || 60;
    return Math.round(row * 2.4);
  }
  function rowCenter(i) {
    const item = listItems[i];
    if (!item) return geo.H / 2;
    const r = item.getBoundingClientRect();
    return r.top + r.height / 2 - stage.getBoundingClientRect().top;
  }
  function drawThumb() {
    const T = thumbSize();
    thumb.setAttribute('x', String(geo.margin));
    thumb.setAttribute('width', String(T));
    thumb.setAttribute('y', String(thumbState.cy - thumbState.h / 2));
    thumb.setAttribute('height', String(Math.max(0, thumbState.h)));
  }
  // Open, close or move the small window to the focused name, and slide the footage with it.
  function placeThumb(instant) {
    const c = cases[shown()];
    const T = thumbSize();
    const target = { cy: rowCenter(c ? c.i : 0), h: listMode && c && c.media ? T : 0 };
    if (instant) {
      gsap.killTweensOf(thumbState);
      Object.assign(thumbState, target);
      drawThumb();
    } else {
      gsap.to(thumbState, { ...target, duration: 0.9, ease: EASE.out, overwrite: true, onUpdate: drawThumb });
    }
    // The footage square sits centered behind the window, a little bigger than it.
    const side = T / 0.85;
    const media = { x: geo.margin + T / 2 - side / 2, y: target.cy - side / 2, scale: side / geo.S };
    cases.forEach((o) => {
      if (o.media) gsap.to(o.media, { ...media, duration: instant ? 0 : 0.9, ease: EASE.out, overwrite: 'auto' });
    });
  }

  // Highlight a name in the list, and show that case's footage in the small window.
  function focusList(i) {
    if (i === listFocus) return;
    const prev = listFocus;
    listFocus = i;
    listItems.forEach((item, j) => item.classList.toggle('is-focus', j === i));
    if (prev >= 0) fade(cases[prev], false);
    fade(cases[i], true);
    placeThumb(false);
    syncPlayback();
  }

  // Switch between the letter and the list.
  function setList(on) {
    if (on === listMode || zooming || active < 0) return;
    listMode = on;
    section.classList.toggle('is-list', on);
    // The letter (and its hover area) leaves, so any hover push-in lets go.
    if (on) hoverOff();
    rollText(pillLabel, on ? 'Full view' : 'List view');
    const c = cases[active];
    const inners = listItems.map((item) => item.querySelector('[data-dk-list-in]'));
    if (on) {
      // Out: the letter rolls down and away and the words leave upward. In: the names rise,
      // and the small window opens beside the current one.
      cases.forEach((o) => {
        if (o.i === active) {
          rollTo(o, 1.1);
        } else {
          // Letters already out of sight jump straight to below, without crossing the window.
          gsap.killTweensOf(o.roll);
          o.roll.v = 1.1;
          placeHole(o);
        }
      });
      textOut(c, 1);
      casesList.inert = true;
      list.inert = false;
      gsap.fromTo(inners, { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: EASE.out, stagger: 0.05, overwrite: true });
      listFocus = active;
      listItems.forEach((item, j) => item.classList.toggle('is-focus', j === active));
      placeThumb(false);
    } else {
      // The names leave upward, the window closes, and the current case's letter, words and
      // footage come back.
      gsap.to(inners, { yPercent: -WORD_OUT, duration: 0.9, ease: EASE.out, stagger: 0.03, overwrite: true });
      list.inert = true;
      casesList.inert = false;
      if (listFocus >= 0 && listFocus !== active) fade(cases[listFocus], false);
      listFocus = -1;
      listItems.forEach((item) => item.classList.remove('is-focus'));
      gsap.to(thumbState, { h: 0, duration: 0.6, ease: EASE.out, overwrite: true, onUpdate: drawThumb });
      rollTo(c, 0, -1.1);
      textIn(c, -1);
      if (c.media) {
        fade(c, true);
        gsap.to(c.media, { ...idleMedia(c), duration: 0.9, ease: EASE.out, overwrite: 'auto' });
      }
      syncPlayback();
    }
  }
  const onPill = () => setList(!listMode);
  pill.addEventListener('click', onPill);
  // Pointing at a name in the list shows its footage; leaving the list goes back to the case
  // the scroll position is on.
  const onListOver = (event) => {
    const item = event.target.closest('[data-dk-list-item]');
    if (item && listMode) focusList(Number(item.dataset.dkListItem));
  };
  const onListLeave = () => listMode && focusList(active);
  list.addEventListener('pointerover', onListOver);
  list.addEventListener('pointerleave', onListLeave);

  // =================== The zoom through the letter ===================

  // The site header's bar (Header.astro), named for the page change along with the stage.
  const headerBar = document.querySelector('[data-header]');

  function zoom(c) {
    if (zooming || !c.href || !c.hole) return;
    zooming = true;
    emit('civic:scroll-lock', { locked: true });
    section.classList.add('is-zooming');
    // The footage keeps its hover push-in and grows on from there.
    hovering = false;
    section.classList.remove('is-hover');
    // Let the hole grow past the letter's own window, and hide every other letter.
    holes.removeAttribute('clip-path');
    cases.forEach((o) => o.hole && o !== c && o.hole.setAttribute('visibility', 'hidden'));

    // The point inside a stroke to zoom around (on screen), and the radius of the stroke there.
    const px = geo.margin + c.glyph.zoom.x * geo.k;
    const py = geo.top + c.glyph.zoom.y * geo.k;
    const r = c.glyph.zoom.r * geo.k;
    // Zoom far enough that the stroke around that point covers every corner of the screen.
    const corners = [[0, 0], [geo.W, 0], [0, geo.H], [geo.W, geo.H]];
    const Z = (Math.max(...corners.map(([x, y]) => Math.hypot(x - px, y - py))) / r) * 1.08;
    // "p" runs from 0 to 1 on the civic curve. The scale grows exponentially with it (Z to the
    // power p), so the zoom feels steady instead of leaping in its first moments.
    const z = { p: 0 };

    zoomTimeline = gsap.timeline({ onComplete: () => navigate(c) });
    zoomTimeline.to([c.text, bar], { autoAlpha: 0, duration: 0.3, ease: EASE.civic }, 0);
    zoomTimeline.to(
      z,
      {
        p: 1,
        duration: 0.7,
        ease: EASE.civic,
        onUpdate: () => {
          // Scale the letter around (px, py): every point moves away from it by the same factor.
          const s = Math.pow(Z, z.p);
          const tx = px * (1 - s) + s * geo.margin;
          const ty = py * (1 - s) + s * geo.top;
          c.hole.setAttribute('transform', `translate(${tx} ${ty}) scale(${s * geo.k})`);
        },
      },
      0
    );
    // Meanwhile the footage grows from its square behind the letter to cover the screen (fast at
    // first, on expo.out, so it always reaches further than the growing hole). It stays in full
    // color at full strength: no dark layer, because the case page shows its footage unveiled
    // too.
    if (c.media) {
      zoomTimeline.to(
        c.media,
        { x: (geo.W - geo.S) / 2, y: (geo.H - geo.S) / 2, scale: 1, duration: 0.7, ease: EASE.out },
        0
      );
    }
  }

  // Name the stage for the browser's page-change animation, then open the case page. The case
  // page's hero footage carries the same name (and the shared class "case-media", styled in
  // src/styles/case.css), so the browser fades this full-screen picture into that hero.
  function navigate(c) {
    stage.style.setProperty('view-transition-name', `case-media-${c.slug}`);
    stage.style.setProperty('view-transition-class', 'case-media');
    // Name the header too, and leave the case page a note (read by Base.astro), so the case page
    // keeps its header and its title above the growing footage during the change.
    if (headerBar) headerBar.style.setProperty('view-transition-name', 'site-header');
    try {
      sessionStorage.setItem('civic:handoff', new URL(c.href, window.location.href).pathname);
    } catch (error) {
      // Private browsing can refuse storage; the hand-off then simply skips those two layers.
    }
    window.location.assign(c.href);
  }

  // Coming back with the browser's Back button can show this page exactly as it was left
  // (mid-zoom). Put the stage back to normal.
  function resetZoom() {
    if (!zooming) return;
    if (zoomTimeline) zoomTimeline.kill();
    zooming = false;
    stage.style.removeProperty('view-transition-name');
    stage.style.removeProperty('view-transition-class');
    if (headerBar) headerBar.style.removeProperty('view-transition-name');
    section.classList.remove('is-zooming');
    holes.setAttribute('clip-path', 'url(#dk-slot)');
    cases.forEach((o) => {
      if (o.hole) o.hole.removeAttribute('visibility');
      placeHole(o);
      if (o.media) gsap.set(o.media, idleMedia(o));
      if (o.inner) gsap.set(o.inner, { scale: 1 });
    });
    gsap.set(cases.map((o) => o.text).concat(bar), { autoAlpha: 1 });
    emit('civic:scroll-lock', { locked: false });
  }
  const onPageShow = (event) => {
    if (event.persisted) resetZoom();
  };
  window.addEventListener('pageshow', onPageShow);

  // Clicks on the letter, or on a case's "Open case" link, zoom (a plain click only: a click
  // with Cmd, Ctrl or Shift, or the middle button, opens a new tab or window as usual).
  const onClick = (event) => {
    const link = event.target.closest('[data-dk-hit], [data-dk-open]');
    if (!link) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const i = link.hasAttribute('data-dk-hit') ? active : Number(link.getAttribute('data-dk-open'));
    const c = cases[i];
    if (!c || !c.href || listMode) return;
    event.preventDefault();
    if (i !== active) goTo(i, { instant: true });
    zoom(c);
  };
  stage.addEventListener('click', onClick);

  // ---- Keep the drawing in step with the window size ----
  measure();
  const resize = new ResizeObserver(() => measure());
  resize.observe(stage);
  // If the page opened already scrolled into (or past) the docket, show its case straight away.
  // (Arriving from another page's "Cases" link, the browser has already jumped to the section,
  // leaving room for the header; move the last few pixels so the stage is stuck in place.)
  requestAnimationFrame(() => {
    const top = section.getBoundingClientRect().top;
    if (window.location.hash === '#cases' && top > 0 && top < 160) {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(section, { immediate: true, force: true });
      else window.scrollBy(0, top);
    }
    if (section.getBoundingClientRect().top < window.innerHeight * 0.65) start(true);
  });

  // ---- Undo everything (motion switched off, or the window became too narrow) ----
  return () => {
    resetZoom();
    resize.disconnect();
    [track, intro, onScreen].forEach((st) => st.kill());
    hit.removeEventListener('pointerenter', hoverOn);
    hit.removeEventListener('pointerleave', hoverOff);
    bar.removeEventListener('click', onRail);
    stage.removeEventListener('focusin', onFocus);
    stage.removeEventListener('click', onClick);
    pause.removeEventListener('click', onPause);
    pause.style.visibility = '';
    pill.removeEventListener('click', onPill);
    list.removeEventListener('pointerover', onListOver);
    list.removeEventListener('pointerleave', onListLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
    splits.forEach((split) => split.revert());
    cases.forEach((c) => {
      gsap.killTweensOf(c.roll);
      if (c.media) gsap.set(c.media, { clearProps: 'all' });
      if (c.inner) gsap.set(c.inner, { clearProps: 'transform' });
      gsap.set(c.lines.concat(c.facts), { clearProps: 'transform' });
      if (c.video) c.video.pause();
    });
    section.classList.remove('is-stage', 'is-hover', 'is-list', 'is-zooming');
    [ink, hit, list, bar].forEach((el) => el.toggleAttribute('hidden', true));
    list.inert = false;
    casesList.inert = false;
    cases.forEach((c) => c.el.classList.remove('is-active'));
    stage.removeAttribute('style');
  };
}
