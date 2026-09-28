// case-playhead.js: "scroll is the playhead", the recording in a case page's "How it works".
//
// The chapter is drawn by src/components/case/Playhead.astro (marked data-playhead). This module
// only runs while motion is on; with motion off, modules/case-player.js shows a Play button.
// It works in one of two ways, depending on the visitor's device:
//
//   Laptops and desktops (a mouse or trackpad, at least 768px wide): "scroll is the playhead".
//     The chapter is three screens tall and its stage sticks to the window (CSS does that). As
//     the visitor scrolls through it, the scroll position (0 at the start, 1 at the end):
//       - from 0.15 to 0.55 opens the grey 16:10 window to fill the screen, turns the footage
//         from black and white to color, and shrinks the case letter into a small mark
//         (all by moving one number, --open, that the CSS reads),
//       - from 0.15 to 0.95 picks the moment of the recording that is shown, like dragging a
//         video's playhead. Captions rise in the bar as that moment passes each one, next to
//         a timecode (or, for the Pomfret Voices timeline, the year) and a thin progress line.
//     To make jumping around the clip instant, the whole clip (1 to 2 MB) is downloaded once
//     when the chapter is about one screen away, and a new jump is only asked for after the
//     browser has shown the previous one.
//
//   Phones and tablets (touch): no sticking and no scrubbing. The clip plays by itself while it
//     is on screen, with a Pause button, and the captions rise in as it plays. The first caption
//     is already up when the chapter arrives (also when the phone refuses to play the clip).
//
// Rotating a tablet or resizing a window across 768px switches between the two.
// The shared small jobs (timecodes, the year counter, which caption is current, downloading
// the clip) are in ../helpers/case-playhead.js.

import { gsap, ScrollTrigger, SplitText, EASE, PLAY_ONCE, later } from '../core.js';
import {
  readChapter,
  makeReadout,
  resetReadout,
  beatIndexAt,
  loadWholeClip,
} from '../helpers/case-playhead.js';

// The devices that get the scroll-driven version. Playhead.astro's CSS uses the same test.
const SCRUB_QUERY = '(min-width: 768px) and (hover: hover) and (pointer: fine)';

// Where things happen, as shares of the chapter's scroll (0 = its top reaches the top of the
// window, 1 = its bottom reaches the bottom of the window).
const OPEN_FROM = 0.15;
const OPEN_TO = 0.55;
const PLAY_FROM = 0.15;
const PLAY_TO = 0.95;

// One frame of a 30-frames-per-second clip, in seconds.
const FRAME = 1 / 30;

// ---- Captions ------------------------------------------------------------------------------
// Every caption sits in the same spot in the bar, one on top of the other. Each is cut into
// lines and words (SplitText), and every word waits below its line's window. Showing a caption
// brings the new one's words up into place on expo.out: 0.85s, 0.008s apart when scrolling (quick
// enough to read while the scroll moves on), or motion M1's 1.4s, 0.012s apart when the clip
// plays by itself. At the same moment the old one's words leave upward, on the same curve but
// over a little more than twice as long, so the new words are half in before the old ones are
// half out: the two roll past each other and there is never a moment with nothing to read.
// Scrolling backward runs the other way round.
// Position -1 is the hint "Scroll to play" (or nothing, when there is no hint).
// Words wait 135% of their height away (not the usual 110%): the site's line windows are cut a
// little taller than the lines (see base.css), and captions stacked in one spot would otherwise
// show the tips of their waiting letters.
const AWAY = 135;

// Options: withHint (start on "Scroll to play"), first (the caption already up at the start),
// rise and stagger (how long the arriving words take, and the gap between them, in seconds).
function makeCaptions(chapter, { withHint = false, first = null, rise = 1.4, stagger = 0.012 } = {}) {
  const elements = [...chapter.captions];
  const hint = withHint ? chapter.hint : null;
  let current = first ?? (hint ? -1 : -2);

  // Cut one caption into words. After a resize the caption is cut again at its new line
  // breaks ("autoSplit"), and its words are put straight back where they belong.
  const split = (el, position) =>
    SplitText.create(el, {
      type: 'lines,words',
      mask: 'lines',
      autoSplit: true,
      tag: 'span',
      aria: 'none',
      linesClass: 'split-line',
      wordsClass: 'split-word',
      onSplit(self) {
        gsap.set(self.words, { yPercent: position === current ? 0 : AWAY });
      },
    });
  const splits = elements.map((el, i) => split(el, i));
  const hintSplit = hint ? split(hint, -1) : null;
  elements.forEach((el, i) => el.classList.toggle('is-current', i === current));

  const wordsAt = (position) => {
    if (position === -1) return hintSplit ? hintSplit.words : null;
    return splits[position] ? splits[position].words : null;
  };

  return {
    // Show the caption at this position. "direction" 1 = moving forward in the clip.
    show(position, direction = 1) {
      const target = position < 0 ? (hint ? -1 : -2) : position;
      if (target === current) return;
      const leaving = wordsAt(current);
      const arriving = wordsAt(target);
      if (leaving && leaving.length) {
        gsap.to(leaving, { yPercent: -AWAY * direction, duration: rise * 2.2, ease: EASE.out, stagger: 0.006, overwrite: true });
      }
      if (arriving && arriving.length) {
        gsap.fromTo(
          arriving,
          { yPercent: AWAY * direction },
          { yPercent: 0, duration: rise, ease: EASE.out, stagger, overwrite: true }
        );
      }
      current = target;
      // Mark the caption on screen (for anyone checking the chapter from outside, like a test).
      elements.forEach((el, i) => el.classList.toggle('is-current', i === current));
    },
    // Undo the cutting-up, so the captions are plain text again.
    revert() {
      elements.forEach((el) => el.classList.remove('is-current'));
      splits.forEach((s) => s.revert());
      if (hintSplit) hintSplit.revert();
    },
  };
}

// ---- The letter's rise ---------------------------------------------------------------------
// The huge case letter rises out of its window (like motion M1, 1.4s on expo.out) when the
// chapter's recording comes into view. Plays once.
function riseLetter(chapter, start) {
  const inner = chapter.track.querySelector('[data-playhead-letter-inner]');
  if (!inner) return;
  gsap.fromTo(
    inner,
    { yPercent: 115 },
    {
      yPercent: 0,
      duration: 1.4,
      ease: EASE.out,
      scrollTrigger: { trigger: chapter.track, start, toggleActions: PLAY_ONCE },
    }
  );
}

// ---- Mode 1: scroll is the playhead (laptops and desktops) ------------------------------------
function scrubMode(chapter) {
  const { track, stage, video } = chapter;
  const screen = track.querySelector('[data-playhead-screen]');
  const ghost = track.querySelector('[data-playhead-window]');
  const ctx = gsap.context(() => {});
  const cleanups = [];

  track.classList.add('is-scrub');
  // Scrolling is the only control: no browser controls, no looping, never playing by itself.
  video.removeAttribute('controls');
  video.loop = false;
  video.pause();

  const readout = makeReadout(chapter, { roll: true });
  let captions = null;
  let currentBeat = -1;
  let ready = false;
  let busy = false;
  let target = 0;
  let safety = 0;

  // The footage starts shrunk to fit the grey window. How much to shrink it depends on the
  // window's size, so it is measured here (and again whenever the page is re-measured) and
  // handed to the CSS as --z0. "Fit" means covering the window completely, like a photo
  // cropped to fill a frame.
  const measure = () => {
    if (!ghost || !screen) return;
    const win = ghost.getBoundingClientRect();
    const full = screen.getBoundingClientRect();
    if (!full.width || !full.height) return;
    const z0 = Math.max(win.width / full.width, win.height / full.height);
    stage.style.setProperty('--z0', z0.toFixed(4));
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);
  cleanups.push(() => ScrollTrigger.removeEventListener('refreshInit', measure));

  // Ask the video to show the moment the scroll has picked. Only one jump ("seek") is asked
  // for at a time: the next one waits until the browser has actually drawn the last one, so
  // fast scrolling never piles up jumps and the picture always catches up with the scroll.
  const release = () => {
    busy = false;
    clearTimeout(safety);
    seek();
  };
  function seek() {
    if (!ready || busy) return;
    // Round to a whole frame, so tiny scroll movements don't ask for the same picture twice.
    const time = Math.min(chapter.duration - FRAME, Math.round(target / FRAME) * FRAME);
    if (Math.abs(video.currentTime - time) < FRAME / 2) return;
    busy = true;
    video.currentTime = time;
    // Safety net: if the browser never reports the new picture, carry on after 120ms.
    safety = setTimeout(release, 120);
  }
  // "requestVideoFrameCallback" tells us when a new video picture reaches the screen. Browsers
  // without it fall back to the next screen refresh.
  const onSeeked = () => {
    if (typeof video.requestVideoFrameCallback === 'function') video.requestVideoFrameCallback(release);
    else requestAnimationFrame(release);
  };
  video.addEventListener('seeked', onSeeked);
  cleanups.push(() => {
    video.removeEventListener('seeked', onSeeked);
    clearTimeout(safety);
  });

  // Download the whole clip when the chapter is about one screen away, then show the moment the
  // scroll has already picked. Until then the poster (the clip's first frame) is shown.
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      loadWholeClip(video).then(() => {
        ready = true;
        seek();
      });
    },
    { rootMargin: '100% 0px 100% 0px' }
  );
  near.observe(track);
  cleanups.push(() => near.disconnect());

  // Everything that follows the scroll, for one scroll position p (0 to 1).
  const follow = (p) => {
    const share = Math.min(1, Math.max(0, (p - PLAY_FROM) / (PLAY_TO - PLAY_FROM)));
    target = share * chapter.duration;
    readout(target);
    const beat = p < PLAY_FROM ? -1 : beatIndexAt(chapter.beats, target);
    if (captions && beat !== currentBeat) {
      captions.show(beat, beat > currentBeat ? 1 : -1);
      currentBeat = beat;
    }
    seek();
  };

  ctx.add(() => {
    captions = makeCaptions(chapter, { withHint: true, rise: 0.85, stagger: 0.008 });
    riseLetter(chapter, 'top 70%');

    // One timeline, tied to the chapter's scroll. Its length is exactly 1, so a tween placed at
    // 0.15 with a length of 0.4 plays between 15% and 55% of the scroll. "scrub: true" means
    // the timeline's position always equals the scroll position (smoothed by Lenis).
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => follow(self.progress),
        onRefresh: (self) => follow(self.progress),
      },
    });
    tl.fromTo(
      stage,
      { '--open': 0 },
      { '--open': 1, duration: OPEN_TO - OPEN_FROM, ease: EASE.civic, immediateRender: true },
      OPEN_FROM
    );
    // An empty step at 1 makes the timeline exactly 1 long.
    tl.set({}, {}, 1);
  });

  track.classList.add('is-live');

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    if (captions) captions.revert();
    ctx.revert();
    track.classList.remove('is-scrub', 'is-live');
    stage.style.removeProperty('--z0');
    stage.style.removeProperty('--open');
    resetReadout(chapter);
    video.setAttribute('controls', '');
  };
}

// ---- Mode 2: plays while on screen (phones and tablets) --------------------------------------
function playMode(chapter) {
  const { track, video, toggle, toggleLabel } = chapter;
  const ctx = gsap.context(() => {});
  const readout = makeReadout(chapter, { roll: true });
  let captions = null;
  // The first caption is up from the start, before the clip has played a single frame.
  let currentBeat = 0;
  let inView = false;
  let userPaused = false;
  let frame = 0;

  video.removeAttribute('controls');
  video.loop = true;
  if (toggle) toggle.hidden = false;

  // Make the button match what the video is doing.
  const render = () => {
    const playing = !video.paused && !video.ended;
    if (toggleLabel) toggleLabel.textContent = playing ? 'Pause' : 'Play';
  };

  // Captions follow the clip's own clock. They always rise, even when the loop jumps back to the
  // start. Before the first beat's moment the first caption stays up (it was shown from the
  // start).
  const onTime = () => {
    const beat = Math.max(0, beatIndexAt(chapter.beats, video.currentTime));
    if (captions && beat !== currentBeat) {
      captions.show(beat, 1);
      currentBeat = beat;
    }
  };

  // While playing, keep the timecode, the year, the progress line and the captions moving
  // together, every screen refresh ("requestAnimationFrame" = "run this just before the next
  // picture is drawn"), so the year counter and the caption always change on the same frame.
  // (The clip's own "timeupdate" event, a few times a second, does the same as a backup.)
  const sync = () => {
    readout(video.currentTime);
    onTime();
  };
  const tick = () => {
    sync();
    frame = video.paused ? 0 : requestAnimationFrame(tick);
  };

  const play = () => {
    video.preload = 'auto';
    const attempt = video.play();
    // Phones in Low Power Mode can refuse to play: keep the poster and offer "Play".
    if (attempt && typeof attempt.catch === 'function') attempt.catch(render);
  };

  // Play while at least a quarter of the clip is on screen, unless the visitor paused it.
  const update = () => {
    const shouldPlay = inView && !userPaused && !document.hidden;
    if (shouldPlay && video.paused) play();
    if (!shouldPlay && !video.paused) video.pause();
  };

  const onToggle = () => {
    userPaused = !video.paused;
    if (userPaused) video.pause();
    else play();
  };
  const onPlay = () => {
    render();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      update();
    },
    { threshold: 0.25 }
  );
  const screen = track.querySelector('[data-playhead-screen]');
  observer.observe(screen || video);

  video.addEventListener('play', onPlay);
  video.addEventListener('pause', render);
  video.addEventListener('timeupdate', sync);
  document.addEventListener('visibilitychange', update);
  if (toggle) toggle.addEventListener('click', onToggle);
  render();

  ctx.add(() => {
    captions = makeCaptions(chapter, { first: chapter.captions.length ? 0 : null });
    riseLetter(chapter, 'top 80%');
  });
  track.classList.add('is-live');

  return () => {
    observer.disconnect();
    video.removeEventListener('play', onPlay);
    video.removeEventListener('pause', render);
    video.removeEventListener('timeupdate', sync);
    document.removeEventListener('visibilitychange', update);
    if (toggle) {
      toggle.removeEventListener('click', onToggle);
      toggle.hidden = true;
    }
    cancelAnimationFrame(frame);
    video.pause();
    video.loop = false;
    if (captions) captions.revert();
    ctx.revert();
    track.classList.remove('is-live');
    resetReadout(chapter);
    video.setAttribute('controls', '');
  };
}

export default {
  name: 'case-playhead',
  init() {
    const track = document.querySelector('[data-playhead]');
    if (!track) return undefined;
    const chapter = readChapter(track);
    if (!chapter) return undefined;

    const query = window.matchMedia(SCRUB_QUERY);
    let stopMode = null;

    // Start the right mode for this device, stopping the other one first.
    const start = () => {
      if (stopMode) stopMode();
      stopMode = query.matches ? scrubMode(chapter) : playMode(chapter);
    };
    start();

    // The device changed (a window resized across 768px, a tablet rotated, a mouse plugged
    // in): switch modes, then re-measure every scroll animation on the page, because the
    // chapter's height changed.
    const onChange = () => {
      later(start);
      ScrollTrigger.refresh();
    };
    query.addEventListener('change', onChange);

    return () => {
      query.removeEventListener('change', onChange);
      if (stopMode) stopMode();
      stopMode = null;
    };
  },
};
