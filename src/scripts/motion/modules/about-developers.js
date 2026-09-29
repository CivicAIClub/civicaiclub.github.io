// about-developers.js: the hover card on the About page's list of developers
// (src/components/about/Developers.astro).
//
// Asked for with:
//   <section data-about-people>                     the section the card lives in
//     <a data-about-person="autoplanner"            one entry; the value is the case's slug
//        data-about-person-label="Case A · AutoPlanner">...</a>
//     <div data-about-card>                         the card (hidden until switched on here)
//       <p data-about-card-label>                   the small label above it, holding
//         <span data-about-card-label-text>         the words, which roll when they change
//       <div data-about-card-frame>                 the card's window
//         <div data-about-card-media>               holds one <video data-about-card-video="slug">
//                                                   per case
//
// What happens, on screens at least 1280px wide with a mouse or trackpad and with motion on:
//   - Pointing at a name opens an upright 3:4 card from its center outward (its visible area
//     grows from the middle 20% to the whole card, 1.2 seconds on expo.out) while the footage
//     inside settles from 120% to 100% size. It plays that person's case loop, with the case's
//     name in small capitals under it.
//   - The card lives beside the list, never on it: in columns 1 and 2, left of the names (it is
//     exactly two columns and a gap wide). Up and down, it lines up with the middle of the name
//     being pointed at, but stays below the top of the list and above the section's sticky
//     "Who built the tools" label (at least 24px clear of it). It glides there with a smooth delay
//     (each frame it covers a share of the gap: 1 − e^(−8 × seconds since the last frame), so it
//     feels the same on fast and slow screens).
//   - Moving to a name from another case swaps the footage (a quick cross-fade) and rolls the
//     label to the new case. Leaving the list closes the card back into its center.
//   - The card's footage and pictures only start loading the first time the pointer comes over
//     the list, so phones and tablets never download them.
// On touch screens, narrower screens, with a keyboard, or with motion off, there is no card: the
// names are plain links to their case pages.

import { gsap, EASE, hasFinePointer, later } from '../core.js';
import { rollText } from '../helpers/letter-roll.js';

// How quickly the card catches up, and how far (in pixels) it keeps above the sticky label.
const DAMPING = 8;
const LABEL_CLEARANCE = 24;
// The card only appears on screens at least this wide (below it, columns 1 and 2 are too narrow).
const WIDE = '(min-width: 1280px)';

export default {
  name: 'about-developers',
  init() {
    const section = document.querySelector('[data-about-people]');
    if (!section || !hasFinePointer()) return undefined;
    const card = section.querySelector('[data-about-card]');
    const frame = section.querySelector('[data-about-card-frame]');
    const media = section.querySelector('[data-about-card-media]');
    const label = section.querySelector('[data-about-card-label]');
    const labelText = section.querySelector('[data-about-card-label-text]');
    const entries = [...section.querySelectorAll('[data-about-person]')];
    const list = entries[0]?.closest('ul');
    // The section's sticky label ("Who built the tools"), which the card must stay above.
    const sticky = section.querySelector('.people__label');
    if (!card || !frame || !media || !label || !labelText || !list) return undefined;
    const wide = window.matchMedia(WIDE);

    // Each case's video, found by its slug.
    const videos = new Map(
      [...media.querySelectorAll('[data-about-card-video]')].map((video) => [
        video.getAttribute('data-about-card-video'),
        video,
      ])
    );

    // Switch the card on (Developers.astro keeps it switched off otherwise).
    section.classList.add('has-card');
    const setX = gsap.quickSetter(card, 'x', 'px');
    const setY = gsap.quickSetter(card, 'y', 'px');

    // Where the card is headed and where it is drawn now (both measured from the section's
    // top-left corner, as the center of the card's picture), and the name it lines up with.
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let open = false;
    let slug = '';
    let ticking = false;
    let active = null;

    // Work out where the card should be.
    //   Across: fixed, in columns 1 and 2: its right edge one gap to the left of the list.
    //   Up and down: level with the middle of the name being pointed at, kept below the top of
    //   the list and, with its label underneath, at least 24px above the sticky label.
    function aim() {
      const box = section.getBoundingClientRect();
      const area = list.getBoundingClientRect();
      const gutter = parseFloat(getComputedStyle(list).columnGap) || 20;
      const width = card.offsetWidth;
      const tall = frame.offsetHeight;
      target.x = area.left - box.left - gutter - width / 2;
      const entry = (active || entries[0]).getBoundingClientRect();
      // The card's label hangs under the picture: count it in the card's height.
      const under = label.offsetTop + label.offsetHeight - tall;
      let y = entry.top + entry.height / 2;
      const highest = area.top + tall / 2;
      y = Math.max(highest, y);
      if (sticky) {
        const lowest = sticky.getBoundingClientRect().top - LABEL_CLEARANCE - under - tall / 2;
        y = Math.min(lowest, y);
      }
      target.y = y - box.top;
    }

    // Draw the card at its current spot (the transform places its top-left corner).
    function place() {
      setX(current.x - card.offsetWidth / 2);
      setY(current.y - frame.offsetHeight / 2);
    }

    // Every frame while the card is open: glide toward the target.
    const tick = (time, deltaMs) => {
      aim();
      const k = 1 - Math.exp((-DAMPING * deltaMs) / 1000);
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      place();
    };
    function startTicking() {
      if (ticking) return;
      ticking = true;
      gsap.ticker.add(tick);
    }
    function stopTicking() {
      if (!ticking) return;
      ticking = false;
      gsap.ticker.remove(tick);
    }

    // Show one case's footage: fade it in, play it from where it was, and pause the others.
    // Browsers may refuse to play (for example in Low Power Mode); then its poster stays.
    function showVideo(nextSlug, fade) {
      videos.forEach((video, key) => {
        const on = key === nextSlug;
        gsap.to(video, { opacity: on ? 1 : 0, duration: fade, ease: 'none', overwrite: true });
        if (on) {
          video.preload = 'auto';
          const attempt = video.play();
          if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }

    // Put new words in the label straight away (no roll), ready for the next roll to start from.
    function setLabel(text) {
      delete labelText.dataset.rollSlot;
      labelText.removeAttribute('style');
      labelText.textContent = text;
    }

    // The pointer arrived on a name.
    function enter(entry) {
      const nextSlug = entry.getAttribute('data-about-person');
      const nextLabel = entry.getAttribute('data-about-person-label') || '';
      if (!nextSlug || !wide.matches) return;
      active = entry;
      later(() => {
        if (!open) {
          // Opening: start right under the pointer's aim (no flying in from a corner).
          open = true;
          aim();
          current.x = target.x;
          current.y = target.y;
          place();
          startTicking();
          setLabel(nextLabel);
          gsap.fromTo(
            frame,
            { clipPath: 'inset(40% 40% 40% 40%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: EASE.out, overwrite: true }
          );
          gsap.fromTo(media, { scale: 1.2 }, { scale: 1, duration: 1.2, ease: EASE.out, overwrite: true });
          gsap.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.35, ease: EASE.out, overwrite: true });
          showVideo(nextSlug, 0);
        } else if (nextSlug !== slug) {
          // Already open, different case: swap the footage and roll the label.
          showVideo(nextSlug, 0.4);
          gsap.fromTo(media, { scale: 1.08 }, { scale: 1, duration: 1.2, ease: EASE.out, overwrite: true });
          rollText(labelText, nextLabel, { duration: 0.9 });
        }
        slug = nextSlug;
      });
    }

    // The pointer left the list: close the card into its center, then stop its footage.
    function close() {
      if (!open) return;
      open = false;
      slug = '';
      later(() => {
        gsap.to(label, { opacity: 0, duration: 0.25, ease: 'none', overwrite: true });
        gsap.to(frame, {
          clipPath: 'inset(50% 50% 50% 50%)',
          duration: 0.7,
          ease: EASE.out,
          overwrite: true,
          onComplete: () => {
            if (open) return;
            stopTicking();
            videos.forEach((video) => video.pause());
          },
        });
      });
    }

    // Listen to the pointer. Only real mouse/trackpad movement counts (not touch or pen taps).
    const onEnterEntry = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      enter(event.currentTarget);
    };
    const onLeaveList = () => close();
    // The first time the pointer comes over the list (on a wide enough screen), give each video
    // its poster picture (kept in data-poster until now, so nobody else downloads it) and start
    // loading every case loop, so the footage is ready by the time the card opens.
    let warmed = false;
    const onWarm = (event) => {
      if (warmed || !wide.matches || (event.pointerType && event.pointerType !== 'mouse')) return;
      warmed = true;
      videos.forEach((video) => {
        const poster = video.getAttribute('data-poster');
        if (poster && !video.getAttribute('poster')) video.setAttribute('poster', poster);
        video.preload = 'auto';
        if (video.readyState === 0) video.load();
      });
    };
    // The window became too narrow for the card: close it.
    const onWidth = () => {
      if (!wide.matches) close();
    };

    list.addEventListener('pointerenter', onWarm);
    list.addEventListener('pointerleave', onLeaveList);
    entries.forEach((entry) => entry.addEventListener('pointerenter', onEnterEntry));
    wide.addEventListener('change', onWidth);

    // Switching Motion off: remove the listeners, stop the footage and switch the card off.
    return () => {
      list.removeEventListener('pointerenter', onWarm);
      list.removeEventListener('pointerleave', onLeaveList);
      entries.forEach((entry) => entry.removeEventListener('pointerenter', onEnterEntry));
      wide.removeEventListener('change', onWidth);
      stopTicking();
      videos.forEach((video) => video.pause());
      section.classList.remove('has-card');
      setLabel('');
    };
  },
};
