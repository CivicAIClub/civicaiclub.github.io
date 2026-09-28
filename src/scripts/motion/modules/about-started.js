// about-started.js: "How it started" on the About page (src/components/about/Started.astro).
//
// Asked for with:
//   <div data-about-open>                     a picture's window (the club photo)
//     <div data-about-open-inner>             the picture inside it
//   <div data-about-strip>                    the strip of timeline cards
//     <button data-about-strip-toggle>        its Pause/Play button (hidden until motion runs)
//       <span data-about-strip-toggle-label>
//     <div data-about-strip-viewport>         the visible part of the strip
//       <ol data-about-strip-track>           the row of cards that moves
//         <li data-about-strip-card> ...      one card per moment
//
// 1. The photo opens downward: its visible area grows from the top edge to the whole frame over
//    1.8 seconds on expo.out, while the picture inside slides down from half its height above,
//    so the club seems to be lowered into place. Once, when the photo is 15% into view.
// 2. The strip:
//    - Entrance: the cards flip up into place one after another (0.1 seconds apart), each
//      rising from 40% lower while turning from a tilt (45 degrees back and 12 degrees sideways)
//      to flat, over 1.0 second on the site's "civic" curve.
//    - Then it drifts slowly to the left (30 pixels a second), round and round: a copy of the
//      cards follows the originals, so the row never runs out. Copies are hidden from screen
//      readers and keyboards.
//    - Pointing at it eases the drift to a stop over 1 second; leaving eases it back over 0.8.
//    - It can be dragged sideways (mouse or finger) and keeps a little momentum when flung (not
//      when the pointer stood still before letting go).
//      Vertical swipes still scroll the page. A sideways trackpad swipe moves it too, and with
//      keyboard focus, so do the arrow keys.
//    - The Pause button stops the drift (dragging still works) and Play restarts it.
//    - Off screen, it stops moving entirely, to save battery.
// Runs only when motion is on. Without motion the strip is a plain row that scrolls sideways.

import { gsap, ScrollTrigger, EASE, PLAY_ONCE, later } from '../core.js';

// The drift speed in pixels per second, and how quickly a thrown strip slows down.
const DRIFT = 30;
const FRICTION = 4;

// Set up the photo's downward opening.
function setUpPhoto(win) {
  const inner = win.querySelector('[data-about-open-inner]');
  const tl = gsap.timeline({ scrollTrigger: { trigger: win, start: 'top 85%', toggleActions: PLAY_ONCE } });
  tl.fromTo(win, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: EASE.out }, 0);
  if (inner) tl.fromTo(inner, { yPercent: -50 }, { yPercent: 0, duration: 1.8, ease: EASE.out }, 0);
  // GSAP now holds the window closed itself, so the CSS starting rule can step aside.
  win.classList.add('is-open');
}

// Set up one strip. Gives back a function that undoes everything it did.
function setUpStrip(strip) {
  const viewport = strip.querySelector('[data-about-strip-viewport]');
  const track = strip.querySelector('[data-about-strip-track]');
  const button = strip.querySelector('[data-about-strip-toggle]');
  const buttonLabel = strip.querySelector('[data-about-strip-toggle-label]');
  const originals = [...strip.querySelectorAll('[data-about-strip-card]')];
  if (!viewport || !track || !originals.length) return () => {};

  strip.classList.add('is-live');

  // Copy the cards once, so the row can loop without a gap. The copies are for the eye only.
  const copies = originals.map((card) => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('data-about-strip-copy', '');
    track.appendChild(copy);
    return copy;
  });
  const cards = [...originals, ...copies];

  // How far the row moves before it repeats: the distance from the first card to its copy.
  let loop = 0;
  const measure = () => {
    loop = copies[0].offsetLeft - originals[0].offsetLeft;
  };
  measure();

  // The row's position (in pixels, always negative or zero) and its motion.
  let offset = 0;
  let velocity = 0; // extra speed after a throw, in pixels per second
  const drift = { factor: 1 }; // 1 = full drift speed, 0 = stopped (eased on hover)
  let paused = false;
  let hovering = false;
  let dragging = false;
  const setX = gsap.quickSetter(track, 'x', 'px');

  // Keep the offset inside one loop's length, so the copies take over from the originals
  // without a jump.
  const wrap = (value) => (loop > 0 ? gsap.utils.wrap(-loop, 0, value) : value);

  // Every frame (only while the strip is on screen): move by the drift plus any throw.
  const tick = (time, deltaMs) => {
    const dt = Math.min(deltaMs, 64) / 1000;
    if (!dragging) {
      offset -= DRIFT * drift.factor * dt;
      offset += velocity * dt;
      velocity *= Math.exp(-FRICTION * dt);
      if (Math.abs(velocity) < 1) velocity = 0;
    }
    offset = wrap(offset);
    setX(offset);
  };
  let ticking = false;
  const setTicking = (on) => {
    if (on === ticking) return;
    ticking = on;
    if (on) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  };

  // Ease the drift toward full speed or a stop, depending on hover and the Pause button.
  function steer() {
    const target = paused || hovering ? 0 : 1;
    gsap.to(drift, { factor: target, duration: target ? 0.8 : 1, ease: EASE.out, overwrite: true });
  }

  // ---- Entrance: the cards flip up one after another ----
  gsap.set(cards, { yPercent: 40, rotationX: 45, rotationY: 12, transformOrigin: '50% 100%' });
  strip.classList.add('is-ready');
  const entrance = gsap.to(cards, {
    yPercent: 0,
    rotationX: 0,
    rotationY: 0,
    duration: 1.0,
    ease: EASE.civic,
    stagger: 0.1,
    scrollTrigger: { trigger: viewport, start: 'top 90%', toggleActions: PLAY_ONCE },
  });

  // Run the frame loop only while the strip is on screen.
  const watcher = ScrollTrigger.create({
    trigger: viewport,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => setTicking(self.isActive),
  });

  // ---- Hover ----
  const onEnter = (event) => {
    if (event.pointerType !== 'mouse') return;
    hovering = true;
    steer();
  };
  const onLeave = (event) => {
    if (event.pointerType !== 'mouse') return;
    hovering = false;
    steer();
  };

  // ---- Dragging ----
  let startX = 0;
  let startOffset = 0;
  let lastX = 0;
  let lastTime = 0;
  const onDown = (event) => {
    if (event.button !== 0) return;
    dragging = true;
    velocity = 0;
    startX = lastX = event.clientX;
    startOffset = offset;
    lastTime = performance.now();
    strip.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  };
  const onDrag = (event) => {
    if (!dragging) return;
    const now = performance.now();
    offset = startOffset + (event.clientX - startX);
    // Remember how fast the pointer was moving, for the throw when it lets go.
    const dt = Math.max(1, now - lastTime) / 1000;
    velocity = 0.8 * velocity + 0.2 * ((event.clientX - lastX) / dt);
    lastX = event.clientX;
    lastTime = now;
    if (!ticking) setX(wrap(offset));
  };
  const onUp = (event) => {
    if (!dragging) return;
    dragging = false;
    strip.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    // Only a fling keeps moving; a slow release just stops where it is. If the pointer stood
    // still for a moment before letting go (more than 60 milliseconds since it last moved), the
    // speed remembered from earlier is out of date, so the strip stays put too.
    if (performance.now() - lastTime > 60) velocity = 0;
    if (Math.abs(velocity) < 40) velocity = 0;
    velocity = gsap.utils.clamp(-2400, 2400, velocity);
  };
  // A drag should never also select text or start the browser's own image dragging.
  const onDragStart = (event) => event.preventDefault();

  // ---- Keyboard: arrow keys nudge the strip by about one card ----
  const onKey = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = originals[0].offsetWidth + 20;
    const to = offset + (event.key === 'ArrowLeft' ? step : -step);
    const move = { value: offset };
    later(() =>
      gsap.to(move, {
        value: to,
        duration: 0.8,
        ease: EASE.out,
        onUpdate: () => {
          offset = move.value;
        },
      })
    );
  };

  // ---- Trackpad: a mostly sideways swipe moves the strip (an up/down one scrolls the page) ----
  const onWheel = (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    offset -= event.deltaX;
    if (!ticking) setX(wrap(offset));
  };

  // ---- Pause / Play ----
  const renderButton = () => {
    if (buttonLabel) buttonLabel.textContent = paused ? 'Play' : 'Pause';
    if (button) button.setAttribute('aria-pressed', paused ? 'true' : 'false');
  };
  const onToggle = () => {
    paused = !paused;
    renderButton();
    steer();
  };
  if (button) {
    button.hidden = false;
    renderButton();
    button.addEventListener('click', onToggle);
  }

  viewport.addEventListener('pointerenter', onEnter);
  viewport.addEventListener('pointerleave', onLeave);
  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onDrag);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
  viewport.addEventListener('dragstart', onDragStart);
  viewport.addEventListener('keydown', onKey);
  viewport.addEventListener('wheel', onWheel, { passive: false });
  ScrollTrigger.addEventListener('refresh', measure);

  // Undo everything: stop the loop, remove the copies and listeners, show the plain row again.
  return () => {
    setTicking(false);
    entrance.kill();
    watcher.kill();
    ScrollTrigger.removeEventListener('refresh', measure);
    viewport.removeEventListener('pointerenter', onEnter);
    viewport.removeEventListener('pointerleave', onLeave);
    viewport.removeEventListener('pointerdown', onDown);
    viewport.removeEventListener('pointermove', onDrag);
    viewport.removeEventListener('pointerup', onUp);
    viewport.removeEventListener('pointercancel', onUp);
    viewport.removeEventListener('dragstart', onDragStart);
    viewport.removeEventListener('keydown', onKey);
    viewport.removeEventListener('wheel', onWheel);
    if (button) {
      button.removeEventListener('click', onToggle);
      button.hidden = true;
      button.removeAttribute('aria-pressed');
    }
    copies.forEach((copy) => copy.remove());
    gsap.set([track, ...originals], { clearProps: 'transform' });
    strip.classList.remove('is-live', 'is-ready', 'is-dragging');
  };
}

export default {
  name: 'about-started',
  init() {
    const windows = document.querySelectorAll('[data-about-open]');
    const strips = document.querySelectorAll('[data-about-strip]');
    if (!windows.length && !strips.length) return undefined;

    windows.forEach(setUpPhoto);
    const undo = [...strips].map(setUpStrip);

    // Switching Motion off: undo the strips, and let the photo windows be plain again.
    return () => {
      undo.forEach((fn) => fn());
      windows.forEach((win) => win.classList.remove('is-open'));
    };
  },
};
