// home-glance-clips.js: the three short clips on the "at a glance" cards
// (src/components/home/Glance.astro).
//
// Asked for with:  <figure data-glance-clip>  (a video, plus a Play/Pause button)
//
// The clips behave differently depending on the device and the visitor's motion setting:
//   - Mouse or trackpad, motion on ("hover"): a clip plays while the pointer is over its card.
//     When the pointer leaves, it runs backwards at double speed to its first frame, rather
//     than cutting back (it asks the video for an earlier moment on every screen frame, never
//     faster than the video can answer).
//   - Touch screen, motion on ("auto"): a clip plays while at least half of it is on screen,
//     like the other loops on the site. The Pause button under the strip stops all three.
//   - Motion off, from the device setting or the footer switch ("manual"): nothing plays by
//     itself; each clip shows its still picture and its own Play button.
// It runs whether motion is on or off ("always: true") and switches behavior when the footer's
// Motion switch or the device setting changes. Some phones refuse to play video in Low Power
// Mode; then the still pictures stay and every card shows its own Play button.
// (On laptops the Pause button under the strip belongs to the drifting strip, home-glance.js.)

import { motionAllowed, hasFinePointer } from '../core.js';

export default {
  name: 'home-glance-clips',
  always: true,
  init() {
    const section = document.querySelector('[data-glance]');
    if (!section) return undefined;
    const pause = section.querySelector('[data-glance-pause]');
    const pauseLabel = section.querySelector('[data-glance-pause-label]');

    const clips = [...section.querySelectorAll('[data-glance-clip]')].map((figure) => ({
      figure,
      card: figure.closest('[data-glance-card]') || figure,
      video: figure.querySelector('video'),
      button: figure.querySelector('[data-glance-toggle]'),
      label: figure.querySelector('[data-glance-toggle-label]'),
      inView: false,
      rewind: 0,
    }));
    if (!clips.length) return undefined;

    let autoPaused = false;

    // Which behavior applies right now.
    const mode = () => (!motionAllowed() ? 'manual' : hasFinePointer() ? 'hover' : 'auto');

    // Some phones refuse to play video by itself (Low Power Mode, data saver). Once that has
    // happened, every card shows its own Play button, so the visitor can still start each clip.
    let blocked = false;
    function showButtons() {
      blocked = true;
      clips.forEach((clip) => {
        if (clip.button) clip.button.hidden = false;
        render(clip);
      });
    }

    // Ask the browser to play. If it refuses, the still picture stays and the buttons appear.
    function play(clip) {
      stopRewind(clip);
      const attempt = clip.video.play();
      if (attempt && attempt.catch) attempt.catch(showButtons);
    }

    // Keep the clip's own button label in step with the video.
    function render(clip) {
      if (clip.label) clip.label.textContent = clip.video.paused ? 'Play' : 'Pause';
    }

    // Run the clip backwards at double speed to its start. Each frame works out where the clip
    // should be by now (twice as far back as the time that has passed) and, if the video has
    // finished finding the last requested moment, asks for this one.
    function rewind(clip) {
      stopRewind(clip);
      const video = clip.video;
      video.pause();
      const from = video.currentTime;
      if (!from) return;
      const began = performance.now();
      const step = (now) => {
        const target = Math.max(0, from - ((now - began) / 1000) * 2);
        if (!video.seeking) video.currentTime = target;
        if (target > 0) clip.rewind = requestAnimationFrame(step);
        else clip.rewind = 0;
      };
      clip.rewind = requestAnimationFrame(step);
    }
    function stopRewind(clip) {
      if (clip.rewind) cancelAnimationFrame(clip.rewind);
      clip.rewind = 0;
    }

    // Decide, for the current behavior, whether a clip should be playing, and make it so.
    function update(clip) {
      const m = mode();
      if (m === 'auto') {
        if (clip.inView && !autoPaused) play(clip);
        else clip.video.pause();
      } else if (m === 'hover') {
        // Played only by pointing at it (see below).
        if (!clip.card.matches(':hover')) clip.video.pause();
      } else if (!clip.inView) {
        // Manual: a clip someone started stops when it scrolls away.
        clip.video.pause();
      }
    }

    // Switch behavior (on load, and whenever the motion setting changes).
    function apply() {
      const m = mode();
      clips.forEach((clip) => {
        stopRewind(clip);
        if (clip.button) clip.button.hidden = m !== 'manual' && !blocked;
        if (m === 'manual') clip.video.pause();
        update(clip);
        render(clip);
      });
      // On touch screens, the Pause button under the strip stops the clips.
      if (pause && m === 'auto') {
        pause.hidden = false;
        if (pauseLabel) pauseLabel.textContent = autoPaused ? 'Play' : 'Pause';
      } else if (pause && m === 'manual') {
        pause.hidden = true;
      }
    }

    clips.forEach((clip) => {
      // With JavaScript running we use our own controls, so hide the browser's.
      clip.video.removeAttribute('controls');
      clip.video.addEventListener('play', () => render(clip));
      clip.video.addEventListener('pause', () => render(clip));

      // Hover: play on enter, rewind on leave.
      clip.card.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse' && mode() === 'hover') play(clip);
      });
      clip.card.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'mouse' && mode() === 'hover') rewind(clip);
      });

      // Manual: the clip's own Play/Pause button.
      if (clip.button) {
        clip.button.addEventListener('click', () => {
          if (clip.video.paused) play(clip);
          else clip.video.pause();
        });
      }
    });

    // Which clips are on screen (at least half of each).
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const clip = clips.find((c) => c.figure === entry.target);
          if (!clip) return;
          clip.inView = entry.isIntersecting;
          update(clip);
        });
      },
      { threshold: 0.5 }
    );
    clips.forEach((clip) => observer.observe(clip.figure));

    // On touch screens only the clips scrolled into the strip's view ever try to play, so a
    // phone that refuses to play would otherwise never show the buttons on the cards further
    // along. The first time the strip comes on screen, try the first clip once: if the phone
    // refuses, every card gets its Play button; if it plays but isn't in view yet, stop it again.
    const probe = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      probe.disconnect();
      if (mode() !== 'auto' || blocked) return;
      const first = clips[0];
      const attempt = first.video.play();
      if (attempt && attempt.then) {
        attempt.then(() => update(first), showButtons);
      }
    });
    probe.observe(section);

    // The Pause button, when it belongs to the clips (touch screens with motion on).
    if (pause) {
      pause.addEventListener('click', () => {
        if (mode() !== 'auto') return;
        autoPaused = !autoPaused;
        if (pauseLabel) pauseLabel.textContent = autoPaused ? 'Play' : 'Pause';
        clips.forEach(update);
      });
    }

    // React to the footer's Motion switch, the device setting, and the tab being hidden.
    document.addEventListener('civic:motion', () => apply());
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => apply());
    document.addEventListener('visibilitychange', () => {
      clips.forEach((clip) => (document.hidden ? clip.video.pause() : update(clip)));
    });

    apply();
    // The page's clips stay for the page's whole life, so nothing needs undoing.
    return undefined;
  },
};
