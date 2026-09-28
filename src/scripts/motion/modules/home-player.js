// home-player.js: the home page's reel player (the <dialog> in src/components/home/HomeReel.astro).
//
// Asked for with:  <button data-reel-open>  (the reel)  and  <dialog data-reel-player>  (the player)
//
// What happens, step by step:
//   1. Clicking the reel (or pressing Enter or Space on it) opens the player as a "modal" dialog:
//      the browser keeps the keyboard inside it and hides the rest of the page from screen
//      readers while it is open. The page behind stops scrolling.
//   2. The first time, the 35-second showreel is fetched (it is not downloaded before, to keep
//      the home page light).
//   3. With motion on, the answer to the click starts in the very next screen frame: the page
//      behind darkens (0.2 seconds) and the cursor label rolls to "Close". At the same time an
//      ink sheet rises from the bottom of the screen (1.1 seconds, expo.out: fast, then a long
//      soft stop) while the video and its controls stay put and the video settles from 110% of
//      its size to 100%. The sheet rises by moving, not by being re-cut every frame, which keeps
//      every frame cheap for the browser. The video starts playing 0.3 seconds in, once the
//      busiest moment has passed. With motion off (the device setting or the footer switch),
//      the player simply appears, and the video waits for the Play button.
//   4. Controls: the mono Pause/Play button, the thin progress line (drag it, or use the arrow
//      keys on it, to move through the video), Full screen, Space anywhere to pause or play,
//      clicking the video to pause or play, and Close, Esc or clicking outside the video to close.
//   5. Closing plays the opening in reverse, then puts the keyboard focus back on the reel.
// The video is sized to fit the screen together with its control bar, whose height is measured
// here (--player-bar), so a phone turned sideways still gets the biggest possible picture.
// It runs whether motion is on or off ("always: true"), because the player must work either way.

import { gsap, EASE, motionAllowed, emit } from '../core.js';

// Seconds as "0:07".
function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default {
  name: 'home-player',
  always: true,
  init() {
    const dialog = document.querySelector('[data-reel-player]');
    const opener = document.querySelector('[data-reel-open]');
    // Older browsers without <dialog> support keep the reel as a plain loop.
    if (!dialog || !opener || typeof dialog.showModal !== 'function') return undefined;

    const root = document.documentElement;
    const shade = dialog.querySelector('[data-player-shade]');
    const sheet = dialog.querySelector('[data-player-sheet]');
    const body = dialog.querySelector('[data-player-body]');
    const bar = dialog.querySelector('.player__bar');
    const frame = dialog.querySelector('[data-player-frame]');
    const video = dialog.querySelector('[data-player-video]');
    const toggle = dialog.querySelector('[data-player-toggle]');
    const toggleLabel = dialog.querySelector('[data-player-toggle-label]');
    const closeButton = dialog.querySelector('[data-player-close]');
    const fullButton = dialog.querySelector('[data-player-full]');
    const seek = dialog.querySelector('[data-player-seek]');
    const played = dialog.querySelector('[data-player-played]');
    const time = dialog.querySelector('[data-player-time]');
    const cursor = document.querySelector('[data-cursor-el]');
    const cursorHome = cursor ? cursor.parentElement : null;

    let loaded = false;
    let isOpen = false;
    let closing = false;
    let timeline = null;
    let frameId = 0;
    let lastSecond = -1;

    // Fetch the showreel the first time the player opens: copy each file address from
    // data-src into src, and the poster (the still shown before it plays) from data-poster.
    function load() {
      if (loaded) return;
      loaded = true;
      if (video.dataset.poster) video.poster = video.dataset.poster;
      video.querySelectorAll('source[data-src]').forEach((source) => {
        source.src = source.dataset.src;
      });
      video.load();
    }

    // Make the button, the cursor label over the video and the progress line match the video.
    function render() {
      const playing = !video.paused && !video.ended;
      toggleLabel.textContent = playing ? 'Pause' : 'Play';
      // (While closing, the label already says what it will say on the page: see close().)
      if (!closing) frame.setAttribute('data-cursor', playing ? 'Pause' : 'Play');
      emit('civic:cursor-refresh');
    }

    // Ask the browser to play. Some phones refuse (Low Power Mode); then the poster stays.
    function play() {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(render);
    }
    function togglePlay() {
      if (video.paused || video.ended) play();
      else video.pause();
    }

    // Every screen frame while the player is open: move the progress line and the time.
    function tick() {
      const duration = video.duration || Number(seek.max) || 1;
      const now = video.currentTime || 0;
      played.style.transform = `scaleX(${Math.min(1, now / duration)})`;
      if (document.activeElement !== seek) seek.value = String(now);
      const second = Math.floor(now);
      if (second !== lastSecond) {
        lastSecond = second;
        time.textContent = clock(now);
        seek.setAttribute('aria-valuetext', `${second} of ${Math.round(duration)} seconds`);
      }
      frameId = requestAnimationFrame(tick);
    }

    // Measure the control bar (with the gap above it), so the CSS can size the video to leave
    // room for it: see .player__body in HomeReel.astro.
    function measureBar() {
      if (!bar) return;
      const gap = parseFloat(getComputedStyle(bar).marginTop) || 0;
      dialog.style.setProperty('--player-bar', `${Math.ceil(bar.offsetHeight + gap)}px`);
    }

    // Full screen: iPhones only allow a video itself to go full screen (their own player, with
    // its own controls); every other browser can show our video full screen with the standard
    // request. The browser's own controls are shown while it is full screen, and removed after.
    const canFull =
      Boolean(document.fullscreenEnabled && video.requestFullscreen) ||
      typeof video.webkitEnterFullscreen === 'function';
    function fullscreen() {
      if (document.fullscreenEnabled && video.requestFullscreen) {
        video.controls = true;
        const attempt = video.requestFullscreen();
        if (attempt && attempt.catch) attempt.catch(() => (video.controls = false));
      } else if (typeof video.webkitEnterFullscreen === 'function') {
        video.webkitEnterFullscreen();
      }
    }
    function afterFullscreen() {
      if (!document.fullscreenElement) video.controls = false;
    }

    // While the player is open, the page's other clips (the reel underneath) are paused: they
    // can't be seen, and two videos decoding at once made the opening stutter. The ones that
    // were playing start again when the player closes.
    let pausedBehind = [];
    function pauseBehind() {
      pausedBehind = [...document.querySelectorAll('video')].filter((v) => v !== video && !v.paused);
      pausedBehind.forEach((v) => v.pause());
    }
    function resumeBehind() {
      pausedBehind.forEach((v) => {
        const attempt = v.play();
        if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
      });
      pausedBehind = [];
    }

    // Stop the page behind from scrolling (smooth scrolling and the browser's own).
    function lockPage(locked) {
      root.classList.toggle('player-open', locked);
      emit('civic:scroll-lock', { locked });
    }

    // The cursor label normally lives at the end of the page, underneath the dialog (an open
    // modal dialog is drawn above everything else). Move it into the dialog while it is open so
    // mouse users still see "Pause" and "Close", and move it back afterwards.
    function moveCursor(intoDialog) {
      if (!cursor || !cursorHome) return;
      if (intoDialog) dialog.appendChild(cursor);
      else cursorHome.appendChild(cursor);
    }

    // ---- Open ----
    function open() {
      if (isOpen) return;
      isOpen = true;
      closing = false;
      const animate = motionAllowed();
      if (timeline) timeline.kill();
      // Put the opening positions in place before the dialog is drawn for the first time, so
      // the first frame after the click already shows the page starting to darken.
      if (animate) {
        gsap.set(shade, { opacity: 0 });
        gsap.set(sheet, { yPercent: 100 });
        gsap.set(body, { yPercent: -100 });
        gsap.set(frame, { scale: 1.1 });
      } else {
        gsap.set([shade, sheet, body, frame], { clearProps: 'opacity,transform' });
      }
      dialog.showModal();
      lockPage(true);
      pauseBehind();
      moveCursor(true);
      measureBar();
      toggle.focus({ preventScroll: true });
      // The cursor label now sits over the darkening page, which reads "Close".
      emit('civic:cursor-refresh');

      if (animate) {
        // The page behind darkens at once (0.2s). The sheet rises from the bottom edge while
        // everything inside it moves down by the same amount, so the video and its bar stay
        // still and are uncovered from the bottom up. The video settles from 110% to its size.
        timeline = gsap.timeline();
        timeline.to(shade, { opacity: 0.95, duration: 0.2, ease: 'none' }, 0);
        timeline.to([sheet, body], { yPercent: 0, duration: 1.1, ease: EASE.out }, 0);
        timeline.to(frame, { scale: 1, duration: 1.1, ease: EASE.out }, 0);
        // Fetch and start the video a moment later, once the first, busiest frames have gone.
        timeline.call(load, [], 0.05);
        timeline.call(play, [], 0.3);
      } else {
        // Motion off: no animation, and the video waits for Play (the poster shows meanwhile).
        load();
      }
      frameId = requestAnimationFrame(tick);
      render();
      // With motion on the video starts 0.3s from now, so the button already says "Pause"
      // (if the browser then refuses to play, render() puts "Play" back).
      if (animate) toggleLabel.textContent = 'Pause';
    }

    // Tidy up once the dialog has really closed (after our animation, or straight away if the
    // browser closed it by itself).
    function afterClose() {
      isOpen = false;
      closing = false;
      // Put back the labels close() borrowed.
      shade.setAttribute('data-cursor', 'Close');
      sheet.setAttribute('data-cursor', 'Close');
      cancelAnimationFrame(frameId);
      video.pause();
      lockPage(false);
      resumeBehind();
      moveCursor(false);
      emit('civic:cursor-refresh');
      opener.focus({ preventScroll: true });
    }

    // ---- Close ----
    function close() {
      if (!isOpen || closing) return;
      closing = true;
      if (timeline) timeline.kill();
      // The cursor label goes straight to what it will read on the page ("Watch the reel"),
      // instead of rolling through Pause, Play and Close while the sheet sinks.
      const pageLabel = opener.getAttribute('data-cursor') || '';
      [shade, sheet, frame].forEach((el) => el.setAttribute('data-cursor', pageLabel));
      emit('civic:cursor-refresh');
      if (!motionAllowed()) {
        dialog.close();
        return;
      }
      // The opening in reverse: the sheet sinks back down (its contents staying put), the video
      // grows to 110%, and the page behind lightens again at the end.
      timeline = gsap.timeline({ onComplete: () => dialog.close() });
      timeline.to(sheet, { yPercent: 100, duration: 0.9, ease: EASE.civic }, 0);
      timeline.to(body, { yPercent: -100, duration: 0.9, ease: EASE.civic }, 0);
      timeline.to(frame, { scale: 1.1, duration: 0.9, ease: EASE.civic }, 0);
      timeline.to(shade, { opacity: 0, duration: 0.3, ease: 'none' }, 0.6);
      timeline.call(() => video.pause(), [], 0.4);
    }

    // ---- Wiring ----
    opener.addEventListener('click', open);
    closeButton.addEventListener('click', close);
    if (fullButton && canFull) {
      fullButton.hidden = false;
      fullButton.addEventListener('click', fullscreen);
      document.addEventListener('fullscreenchange', afterFullscreen);
    }
    // The bar can change height when the window is resized or a phone is turned.
    window.addEventListener('resize', () => isOpen && measureBar());
    toggle.addEventListener('click', togglePlay);
    video.addEventListener('play', render);
    video.addEventListener('pause', render);
    video.addEventListener('ended', render);

    // Clicking the video pauses or plays it; clicking the dark area around it closes the player.
    frame.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePlay();
    });
    sheet.addEventListener('click', (event) => {
      if (event.target === sheet || event.target === body) close();
    });
    shade.addEventListener('click', close);

    // Dragging the progress line (or using the arrow keys on it) moves through the video.
    seek.addEventListener('input', () => {
      video.currentTime = Number(seek.value) || 0;
    });

    // Esc asks the dialog to "cancel". We stop the browser from closing it at once, so the
    // closing animation can play first. (If the browser doesn't allow that, it closes anyway
    // and afterClose() tidies up.)
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener('close', afterClose);

    // Space pauses or plays, wherever the focus is in the player (except on the two buttons,
    // where Space already presses the button).
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.code !== 'Space') return;
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      togglePlay();
    });

    // The player stays on the page for the page's whole life, so nothing needs undoing.
    return undefined;
  },
};
