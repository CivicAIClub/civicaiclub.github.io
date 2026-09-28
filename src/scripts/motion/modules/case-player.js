// case-player.js: the "How it works" recording on a case page when motion is OFF.
//
// When the visitor's device asks for reduced motion, or they switch Motion off in the footer,
// the recording (src/components/case/Playhead.astro) must not scroll, stick or play by itself.
// Instead it shows its poster (the clip's first frame) with a Play button, and every caption is
// written out below it. This module:
//   - swaps the browser's built-in video controls for the site's own Play/Pause button,
//   - plays the clip (on a loop) only when someone presses Play, and pauses it when it scrolls
//     out of view or the tab is hidden,
//   - while it plays, moves the timecode and the thin progress line, and lights up the written
//     caption for the current moment (a color change only, nothing moves).
// It runs whether motion is on or off ("always: true"), but only does anything while motion is
// off. When motion comes back on, modules/case-playhead.js takes over, and the other way round.
// The shared small jobs (timecodes, which caption is current) are in ../helpers/case-playhead.js.

import { motionAllowed } from '../core.js';
import { readChapter, makeReadout } from '../helpers/case-playhead.js';

export default {
  name: 'case-player',
  always: true,
  init() {
    const track = document.querySelector('[data-playhead]');
    if (!track) return undefined;
    const chapter = readChapter(track);
    if (!chapter) return undefined;
    const { video, toggle, toggleLabel } = chapter;

    let active = false;
    let inView = false;
    let frame = 0;
    const readout = makeReadout(chapter);

    // Make the button match what the video is doing.
    const render = () => {
      const playing = !video.paused && !video.ended;
      if (toggleLabel) toggleLabel.textContent = playing ? 'Pause' : 'Play';
    };
    // While playing, keep the timecode, the progress line and the lit caption up to date on
    // every screen refresh.
    const tick = () => {
      readout(video.currentTime);
      frame = video.paused ? 0 : requestAnimationFrame(tick);
    };
    const onPlay = () => {
      render();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    // Play or pause when the button is pressed. Some phones refuse to play (Low Power Mode);
    // then the poster simply stays and the button keeps saying "Play".
    const onToggle = () => {
      if (video.paused) {
        video.loop = true;
        video.preload = 'auto';
        const attempt = video.play();
        if (attempt && typeof attempt.catch === 'function') attempt.catch(render);
      } else {
        video.pause();
      }
    };
    // Scrolled away or tab hidden: pause (it won't restart by itself).
    const pauseIfGone = () => {
      if ((!inView || document.hidden) && !video.paused) video.pause();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        pauseIfGone();
      },
      { threshold: 0.25 }
    );

    // Take over the recording (motion just went off, or was off when the page loaded).
    function activate() {
      active = true;
      video.removeAttribute('controls');
      if (toggle) {
        toggle.hidden = false;
        toggle.addEventListener('click', onToggle);
      }
      video.addEventListener('play', onPlay);
      video.addEventListener('pause', render);
      document.addEventListener('visibilitychange', pauseIfGone);
      observer.observe(track.querySelector('[data-playhead-screen]') || video);
      render();
    }

    // Hand the recording back (motion just came back on). By the time this runs, the motion
    // module has already set the recording up its own way (it pauses the clip, shows or hides
    // the button and moves the readouts itself), so this only stops listening.
    function deactivate() {
      active = false;
      observer.disconnect();
      if (toggle) toggle.removeEventListener('click', onToggle);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', render);
      document.removeEventListener('visibilitychange', pauseIfGone);
      cancelAnimationFrame(frame);
    }

    // Decide who is in charge. This waits a moment ("setTimeout 0") after a change, so that the
    // motion module has finished tidying up before this one takes over, or the other way round.
    const sync = () => {
      const wanted = !motionAllowed();
      if (wanted && !active) activate();
      else if (!wanted && active) deactivate();
    };
    const later = () => setTimeout(sync, 0);
    document.addEventListener('civic:motion', later);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', later);
    sync();

    return undefined;
  },
};
