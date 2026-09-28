// home-glance.js: the moving parts of "The club at a glance." strip
// (src/components/home/Glance.astro).
//
// Asked for with:  <section data-glance>  (plus data-glance-* parts inside it)
//
// What it does, with motion on:
//   1. The deal. When the strip first comes into view (its top 90% of the way down the window),
//      the cards arrive one after another like dealt cards: each rises from 60% of its height
//      lower and turns from a 3 degree tilt to straight, over 1.0s on expo.out, 0.08s apart.
//      The numbers on them rise out of their masks at the same time (motion M1). The numbers
//      never count up: they are printed as they are.
//   2. The drift (laptops with a mouse or trackpad only). The strip slowly moves left at 30
//      pixels a second and loops forever (a card that leaves on the left comes back on the
//      right). Pointing at the strip eases it to a stop over 1s; leaving starts it again over
//      0.8s. It can be dragged with the mouse, and keeps some momentum when let go. The Pause
//      button below it stops the drift until Play is pressed. When the strip has keyboard
//      focus, the left and right arrow keys move it by one card.
// On phones and touch screens the strip stays a normal row you swipe (no drift), and with motion
// off everything here is undone. The clips on the cards are handled by home-glance-clips.js.

import { gsap, ScrollTrigger, SplitText, EASE, PLAY_ONCE } from '../core.js';

// Drift speed in pixels per second (negative = toward the left).
const DRIFT = -30;

export default {
  name: 'home-glance',
  init() {
    const section = document.querySelector('[data-glance]');
    const viewport = section?.querySelector('[data-glance-viewport]');
    const track = section?.querySelector('[data-glance-track]');
    if (!section || !viewport || !track) return undefined;
    const cards = [...track.querySelectorAll('[data-glance-card]')];

    // ---- 1. The deal ----
    const splits = [];
    const deal = gsap.timeline({ scrollTrigger: { trigger: viewport, start: 'top 90%', toggleActions: PLAY_ONCE } });
    cards.forEach((card, i) => {
      const at = i * 0.08;
      deal.fromTo(
        card,
        { yPercent: 60, rotation: -3, transformOrigin: '0% 100%' },
        { yPercent: 0, rotation: 0, duration: 1.0, ease: EASE.out },
        at
      );
      // The big number (or the week) rises word by word inside its line windows.
      const value = card.querySelector('[data-gl-value]');
      if (value) {
        const split = SplitText.create(value, {
          type: 'lines,words',
          mask: 'lines',
          tag: 'span',
          aria: 'none',
          linesClass: 'split-line',
          wordsClass: 'split-word',
        });
        splits.push(split);
        deal.fromTo(split.words, { yPercent: 110 }, { yPercent: 0, duration: 1.4, ease: EASE.out, stagger: 0.012 }, at + 0.1);
      }
    });
    section.classList.add('is-ready');

    // ---- 2. The drift (mouse and trackpad only) ----
    const mm = gsap.matchMedia();
    mm.add('(hover: hover) and (pointer: fine)', () => setupDrift(section, viewport, track, cards));

    return () => {
      mm.revert();
      deal.kill();
      splits.forEach((split) => split.revert());
      gsap.set(cards, { clearProps: 'transform' });
      section.classList.remove('is-ready');
    };
  },
};

function setupDrift(section, viewport, track, cards) {
  const pause = section.querySelector('[data-glance-pause]');
  const pauseLabel = section.querySelector('[data-glance-pause-label]');
  const hint = section.querySelector('[data-glance-hint]');
  const hintBefore = hint ? hint.textContent : '';

  section.classList.add('is-drifting');
  viewport.scrollLeft = 0;
  viewport.setAttribute('data-cursor', 'Drag');
  if (hint) hint.textContent = 'Drag';
  if (pause) pause.hidden = false;

  // Where each card sits in the strip when nothing has moved, its width, and the length of one
  // full loop (every card plus the gaps between them).
  let lefts = [];
  let widths = [];
  let loop = 1;
  let margin = 0;
  function measure() {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    margin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--margin')) || 0;
    lefts = cards.map((card) => card.offsetLeft);
    widths = cards.map((card) => card.offsetWidth);
    const last = cards.length - 1;
    loop = lefts[last] + widths[last] + gap - lefts[0];
  }
  measure();

  // "offset" is how far the whole strip has moved; "v" is its current speed.
  const state = { offset: 0, v: DRIFT };
  const setters = cards.map((card) => gsap.quickSetter(card, 'x', 'px'));
  let paused = false;
  let hovering = false;
  let focused = false;
  let dragging = false;

  // Place every card. Each one is shifted by the offset and wrapped around the loop, so a card
  // that leaves on the left comes back in on the right.
  function place() {
    cards.forEach((card, i) => {
      const min = -widths[i] - 40;
      const span = loop;
      let x = lefts[i] + margin + state.offset;
      x = ((((x - min) % span) + span) % span) + min;
      setters[i](x - lefts[i]);
    });
  }

  // The speed the strip should settle at right now.
  const restingSpeed = () => (paused || hovering || focused || dragging ? 0 : DRIFT);
  function easeSpeed(duration) {
    gsap.to(state, { v: restingSpeed(), duration, ease: EASE.out, overwrite: true });
  }

  // Every frame (only while the strip is on screen): move by speed × time.
  let running = false;
  const tick = (time, deltaMs) => {
    if (!dragging) state.offset += (state.v * Math.min(deltaMs, 64)) / 1000;
    place();
  };
  const onScreen = ScrollTrigger.create({
    trigger: viewport,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      if (self.isActive && !running) gsap.ticker.add(tick);
      if (!self.isActive && running) gsap.ticker.remove(tick);
      running = self.isActive;
    },
  });
  place();

  // ---- Hover: ease to a stop, and start again on leave ----
  const onEnter = () => {
    hovering = true;
    easeSpeed(1);
  };
  const onLeave = () => {
    hovering = false;
    if (!dragging) easeSpeed(0.8);
  };
  viewport.addEventListener('pointerenter', onEnter);
  viewport.addEventListener('pointerleave', onLeave);

  // ---- Dragging with the mouse, with momentum ----
  let startX = 0;
  let lastX = 0;
  let lastT = 0;
  let moved = 0;
  let velocity = 0;
  const onDown = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragging = true;
    moved = 0;
    startX = lastX = event.clientX;
    lastT = performance.now();
    velocity = 0;
    gsap.killTweensOf(state);
    state.v = 0;
    section.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  };
  const onMove = (event) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = event.clientX - lastX;
    state.offset += dx;
    moved = Math.max(moved, Math.abs(event.clientX - startX));
    // Remember how fast the pointer was moving (smoothed), to throw the strip on release.
    const dt = Math.max(1, now - lastT) / 1000;
    velocity = velocity * 0.6 + (dx / dt) * 0.4;
    lastX = event.clientX;
    lastT = now;
  };
  const onUp = (event) => {
    if (!dragging) return;
    dragging = false;
    section.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    // A pointer that stood still before letting go (no movement in the last 60ms) throws nothing:
    // the strip stays where it was dropped.
    if (performance.now() - lastT > 60) velocity = 0;
    // Let go: carry on at the pointer's speed, then slow down to the resting speed.
    state.v = gsap.utils.clamp(-2500, 2500, velocity);
    gsap.to(state, { v: restingSpeed(), duration: 1.6, ease: EASE.out, overwrite: true });
  };
  // A drag must not also count as a click on whatever was under the pointer.
  const onClickCapture = (event) => {
    if (moved > 5) {
      event.preventDefault();
      event.stopPropagation();
      moved = 0;
    }
  };
  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
  viewport.addEventListener('click', onClickCapture, true);

  // ---- Keyboard: focus stops the drift, and the arrow keys move one card ----
  const onFocus = () => {
    focused = true;
    easeSpeed(1);
  };
  const onBlur = () => {
    focused = false;
    easeSpeed(0.8);
  };
  const onKey = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = (widths[0] || 300) + 20;
    gsap.to(state, { offset: state.offset + (event.key === 'ArrowLeft' ? step : -step), duration: 0.8, ease: EASE.out });
  };
  viewport.addEventListener('focus', onFocus);
  viewport.addEventListener('blur', onBlur);
  viewport.addEventListener('keydown', onKey);

  // ---- Pause / Play ----
  const onPause = () => {
    paused = !paused;
    if (pauseLabel) pauseLabel.textContent = paused ? 'Play' : 'Pause';
    easeSpeed(paused ? 1 : 0.8);
  };
  if (pause) pause.addEventListener('click', onPause);

  // The cards change size with the window; measure again when that happens.
  const resize = new ResizeObserver(() => {
    measure();
    place();
  });
  resize.observe(viewport);

  // ---- Undo (motion off, or the device no longer has a mouse) ----
  return () => {
    onScreen.kill();
    gsap.ticker.remove(tick);
    gsap.killTweensOf(state);
    resize.disconnect();
    viewport.removeEventListener('pointerenter', onEnter);
    viewport.removeEventListener('pointerleave', onLeave);
    viewport.removeEventListener('pointerdown', onDown);
    viewport.removeEventListener('pointermove', onMove);
    viewport.removeEventListener('pointerup', onUp);
    viewport.removeEventListener('pointercancel', onUp);
    viewport.removeEventListener('click', onClickCapture, true);
    viewport.removeEventListener('focus', onFocus);
    viewport.removeEventListener('blur', onBlur);
    viewport.removeEventListener('keydown', onKey);
    if (pause) {
      pause.removeEventListener('click', onPause);
      pause.hidden = true;
      if (pauseLabel) pauseLabel.textContent = 'Pause';
    }
    if (hint) hint.textContent = hintBefore;
    viewport.removeAttribute('data-cursor');
    gsap.set(cards, { clearProps: 'x' });
    section.classList.remove('is-drifting', 'is-dragging');
  };
}
