// video.js: plays and pauses every looping video made by Video.astro.
//
// This module runs whether motion is on or off ("always: true"), because the Play/Pause buttons
// must work either way. The rules:
//   - Motion on: a video plays by itself while at least a quarter of it is on screen, and pauses
//     when it scrolls away (so off-screen videos never use battery or data).
//   - Motion off (device setting or the footer switch): nothing plays by itself. The poster
//     stays, and the button says "Play". A visitor can still press Play; it then plays until
//     they pause it or scroll away.
//   - The "Pause" button always wins: a paused video stays paused, even when it comes back on
//     screen, until someone presses Play.
//   - Some phones refuse to play video in Low Power Mode (the browser "rejects" the play
//     request). Then we keep the poster, show "Play", and try again only if someone presses it.
//   - Clicking the footage itself does the same as the button. The cursor label (data-cursor)
//     says "Pause" or "Play" to match.
// Videos marked data-scrub are driven by scrolling instead (a case page's own module), so this
// module leaves them alone.

import { motionAllowed, emit } from '../core.js';

export default {
  name: 'video',
  always: true,
  init() {
    const figures = [...document.querySelectorAll('[data-video]')].filter(
      (figure) => !figure.querySelector('video[data-scrub]')
    );
    if (!figures.length) return undefined;

    // Everything we track about one video.
    const players = figures.map((figure) => ({
      figure,
      video: figure.querySelector('video'),
      button: figure.querySelector('[data-video-toggle]'),
      label: figure.querySelector('[data-video-toggle-label]'),
      inView: false,
      userPaused: false,
      userPlayed: false,
    }));

    // Make the button and the cursor label match what the video is doing.
    function render(player) {
      const playing = !player.video.paused && !player.video.ended;
      if (player.label) player.label.textContent = playing ? 'Pause' : 'Play';
      if (player.figure.hasAttribute('data-cursor')) {
        player.figure.setAttribute('data-cursor', playing ? 'Pause' : 'Play');
        emit('civic:cursor-refresh');
      }
      player.figure.dataset.state = playing ? 'playing' : 'paused';
    }

    // Ask the browser to play. If it refuses (Low Power Mode, data saver), keep the poster.
    function play(player) {
      const attempt = player.video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          player.figure.dataset.state = 'blocked';
          player.userPlayed = false;
          render(player);
        });
      }
    }

    // Decide whether this video should be playing right now, and make it so.
    function update(player) {
      const allowedToAutoplay = motionAllowed() && !player.userPaused;
      const shouldPlay = player.inView && (allowedToAutoplay || player.userPlayed);
      if (shouldPlay && player.video.paused) play(player);
      if (!shouldPlay && !player.video.paused) player.video.pause();
    }

    // Button or footage pressed: flip between playing and paused.
    function toggle(player) {
      if (player.video.paused) {
        player.userPaused = false;
        player.userPlayed = true;
        play(player);
      } else {
        player.userPaused = true;
        player.userPlayed = false;
        player.video.pause();
      }
    }

    // Watch which videos are on screen ("IntersectionObserver" is the browser's built-in way to
    // be told when something scrolls into or out of view).
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const player = players.find((p) => p.figure === entry.target);
          if (!player) return;
          player.inView = entry.isIntersecting;
          // Scrolling away from a video someone started ends that choice (it won't restart by
          // itself later if motion is off).
          if (!player.inView && !motionAllowed()) player.userPlayed = false;
          update(player);
        });
      },
      { threshold: 0.25 }
    );

    // Phones get a smaller, taller copy of some clips (the home reel). Its first frame is framed
    // differently, so on a phone we also show its own still, or the picture would jump at play.
    // (767px matches the media="(max-width: 767px)" on the phone copy's sources in Video.astro.)
    const isPhone = window.matchMedia('(max-width: 767px)').matches;

    players.forEach((player) => {
      if (!player.video) return;
      if (isPhone && player.video.dataset.posterMobile) player.video.poster = player.video.dataset.posterMobile;
      // With JavaScript running we show our own button, so hide the browser's built-in controls.
      player.video.removeAttribute('controls');
      if (player.button) {
        player.button.hidden = false;
        player.button.addEventListener('click', (event) => {
          event.stopPropagation();
          toggle(player);
        });
      }
      // Clicking the footage itself toggles too.
      const frame = player.figure.querySelector('.video__frame');
      if (frame) frame.addEventListener('click', () => toggle(player));
      player.video.addEventListener('play', () => render(player));
      player.video.addEventListener('pause', () => render(player));
      render(player);
      observer.observe(player.figure);
    });

    // The footer's Motion switch changed: re-check every video.
    document.addEventListener('civic:motion', () => players.forEach(update));
    // The device's reduced-motion setting changed while the page was open.
    window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', () => players.forEach(update));
    // The tab was hidden: pause everything. Coming back: play what should play.
    document.addEventListener('visibilitychange', () => {
      players.forEach((player) => {
        if (document.hidden) player.video.pause();
        else update(player);
      });
    });

    return undefined;
  },
};
