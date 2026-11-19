/*
  deck.js: moving through the deck.

  What it does:
    - fits the 1920 x 1080 stage to the screen,
    - moves between slides and between the steps inside a slide,
    - keeps the slide (and step) in the address after the #, so a reload returns to it,
    - runs the status line: section, slide number and the elapsed-time clock,
    - shows the presenter notes (N), goes fullscreen (F) and opens the hub (H or a number key).

  Keys:
    Right, Space, Down, Page Down   forward (a step first, then the next slide)
    Left, Up, Page Up               back
    H or a number                   the hub (on the hub, 1 to 8 open a case, H goes back)
    N  notes     F  fullscreen     R  reset the clock     Home / End  first / last slide

  slides.js adds what each slide does on its steps, through Deck.on(number, { apply, leave }).
*/
(function () {
  'use strict';

  var viewport = document.getElementById('viewport');
  var stage = document.getElementById('stage');
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var notesPanel = document.getElementById('notes');
  var sectionEl = document.getElementById('status-section');
  var numEl = document.getElementById('status-num');
  var clockEl = document.getElementById('status-clock');
  var barEl = document.getElementById('progress-bar');

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hooks = {}; // slide number -> { apply(step, info), leave() }
  var current = -1; // index of the slide on screen
  var step = 0; // which step of that slide we are on
  var beforeHub = null; // where H came from, so H can go back
  var wipeTimer = 0;
  var scale = 1;

  var hubIndex = slides.findIndex(function (s) { return s.hasAttribute('data-hub'); });

  // sessionStorage can be switched off in a browser; the deck must still work then.
  function remember(key, value) { try { sessionStorage.setItem('showcase.' + key, value); } catch (e) { /* fine without it */ } }
  function recall(key) { try { return sessionStorage.getItem('showcase.' + key); } catch (e) { return null; } }
  function forget(key) { try { sessionStorage.removeItem('showcase.' + key); } catch (e) { /* fine without it */ } }

  // ---- Fit the stage to the screen ----------------------------------------------------------
  function fit() {
    scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.setProperty('--scale', String(scale));
  }

  // ---- Steps ----------------------------------------------------------------------------------
  function stepsOf(index) { return parseInt(slides[index].getAttribute('data-steps') || '0', 10) || 0; }

  // Shows everything up to the current step, then lets the slide's own code do its part.
  function applyStep(info) {
    var slide = slides[current];
    Array.prototype.forEach.call(slide.querySelectorAll('[data-step]'), function (el) {
      el.classList.toggle('is-on', step >= parseInt(el.getAttribute('data-step'), 10));
    });
    slide.setAttribute('data-at', String(step));
    var hook = hooks[current + 1];
    if (hook && hook.apply) {
      try { hook.apply(step, info || {}); } catch (e) { if (window.console) console.error(e); }
    }
  }

  // ---- Going to a slide ---------------------------------------------------------------------
  // options: instant (no animation inside the slide), back (wipe from the top), focus (for the
  // In progress slide: which case's row to underline).
  function go(index, toStep, options) {
    options = options || {};
    index = Math.max(0, Math.min(slides.length - 1, index));
    var steps = stepsOf(index);
    toStep = Math.max(0, Math.min(steps, toStep || 0));

    if (index === current) {
      if (toStep !== step) { var from = step; step = toStep; applyStep({ from: from, instant: !!options.instant }); }
      update();
      return;
    }

    var old = slides[current], next = slides[index];
    if (old) {
      var hook = hooks[current + 1];
      if (hook && hook.leave) { try { hook.leave(); } catch (e) { if (window.console) console.error(e); } }
      old.removeAttribute('data-focus');
    }
    // Only one slide may be leaving at a time, even when keys are pressed quickly.
    slides.forEach(function (s) { s.classList.remove('is-leaving', 'is-entering', 'is-back'); });
    if (old) { old.classList.remove('is-active'); if (!reduced) old.classList.add('is-leaving'); }
    next.classList.add('is-active');
    if (old && !reduced) { next.classList.add('is-entering'); if (options.back) next.classList.add('is-back'); }
    clearTimeout(wipeTimer);
    wipeTimer = setTimeout(function () {
      slides.forEach(function (s) { s.classList.remove('is-leaving', 'is-entering', 'is-back'); });
    }, 700);

    if (options.focus) next.setAttribute('data-focus', options.focus);
    current = index;
    step = toStep;
    // Arriving on a slide always shows its state without replaying the simulation.
    applyStep({ from: null, instant: true, entering: true });
    stage.classList.toggle('on-paper', next.classList.contains('slide--paper'));
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
    update();
  }

  function next() {
    startClock();
    if (step < stepsOf(current)) { step++; applyStep({ from: step - 1 }); update(); return; }
    if (current < slides.length - 1) go(current + 1, 0);
  }

  function prev() {
    if (step > 0) { step--; applyStep({ from: step + 1 }); update(); return; }
    if (current > 0) go(current - 1, stepsOf(current - 1), { back: true });
  }

  function openHub() {
    if (hubIndex < 0) return;
    if (current === hubIndex) { if (beforeHub !== null) go(beforeHub, 0, { back: true }); return; }
    beforeHub = current;
    go(hubIndex, 0);
  }

  // ---- Status line, address and notes ---------------------------------------------------------
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function clockText(seconds) { return Math.floor(seconds / 60) + ':' + two(Math.floor(seconds % 60)); }

  function update() {
    var slide = slides[current];
    sectionEl.textContent = slide.getAttribute('data-section') || '';
    numEl.textContent = two(current + 1) + ' / ' + two(slides.length);
    barEl.style.transform = 'scaleX(' + ((current + 1) / slides.length) + ')';
    document.title = two(current + 1) + ' ' + (slide.getAttribute('data-section') || '') + ' · One term of Civic AI';
    var hash = '#' + (current + 1) + (step ? '.' + step : '');
    if (location.hash !== hash) {
      try { history.replaceState(null, '', hash); } catch (e) { location.hash = hash; }
    }
    renderNotes();
  }

  function renderNotes() {
    if (notesPanel.hidden) return;
    var slide = slides[current], notes = slide.querySelector('.notes'), soFar = 0;
    for (var i = 0; i <= current; i++) soFar += parseInt(slides[i].getAttribute('data-time') || '0', 10);
    var steps = stepsOf(current);
    notesPanel.textContent = '';
    var meta = document.createElement('div');
    meta.className = 'notespanel__meta';
    var time = document.createElement('strong');
    time.textContent = clockText(parseInt(slide.getAttribute('data-time') || '0', 10));
    meta.appendChild(time);
    meta.appendChild(document.createTextNode('for this slide'));
    meta.appendChild(document.createElement('br'));
    meta.appendChild(document.createTextNode('Done by ' + clockText(soFar)));
    if (steps) { meta.appendChild(document.createElement('br')); meta.appendChild(document.createTextNode('Step ' + step + ' of ' + steps)); }
    notesPanel.appendChild(meta);
    var list = notes && notes.querySelector('ul');
    if (list) notesPanel.appendChild(list.cloneNode(true));
  }

  function toggleNotes() {
    notesPanel.hidden = !notesPanel.hidden;
    remember('notes', notesPanel.hidden ? '0' : '1');
    renderNotes();
  }

  // ---- The elapsed-time clock: starts on the first move forward -----------------------------
  var startedAt = parseInt(recall('t0') || '', 10) || 0;
  function startClock() { if (!startedAt) { startedAt = Date.now(); remember('t0', String(startedAt)); tick(); } }
  function resetClock() { startedAt = 0; forget('t0'); tick(); }
  function tick() { clockEl.textContent = startedAt ? clockText(Math.max(0, (Date.now() - startedAt) / 1000)) : '0:00'; }

  function toggleFullscreen() {
    var doc = document, root = doc.documentElement;
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    } catch (e) { /* a browser that can't go fullscreen: nothing to do */ }
  }

  // ---- Keys -----------------------------------------------------------------------------------
  function isTyping(el) { return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var key = e.key, target = e.target;
    if (isTyping(target)) {
      // Typing in a box: the keys belong to the box, with three exceptions. Escape leaves the box.
      // Page Down and Page Up (a clicker's buttons) always move. The arrows move when the box
      // is empty, so pressing Right without typing anything never gets stuck.
      var empty = target.value === '';
      if (key === 'Escape') { e.preventDefault(); target.blur(); }
      else if (key === 'PageDown' || (empty && (key === 'ArrowRight' || key === 'ArrowDown'))) { e.preventDefault(); target.blur(); next(); }
      else if (key === 'PageUp' || (empty && (key === 'ArrowLeft' || key === 'ArrowUp'))) { e.preventDefault(); target.blur(); prev(); }
      return;
    }
    var onButton = target && target.tagName === 'BUTTON';
    if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') { e.preventDefault(); next(); return; }
    if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
      if (onButton) return; // let the focused button do its own thing
      e.preventDefault();
      if (key !== 'Enter') next();
      return;
    }
    if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') { e.preventDefault(); prev(); return; }
    if (key === 'Home') { e.preventDefault(); go(0, 0, { back: true }); return; }
    if (key === 'End') { e.preventDefault(); go(slides.length - 1, 0); return; }
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      if (current === hubIndex) {
        var tile = slides[hubIndex].querySelector('[data-key="' + key + '"]');
        if (tile) openTile(tile);
      } else openHub();
      return;
    }
    var lower = key.length === 1 ? key.toLowerCase() : '';
    if (lower === 'h') { e.preventDefault(); openHub(); }
    else if (lower === 'n') { e.preventDefault(); toggleNotes(); }
    else if (lower === 'f') { e.preventDefault(); toggleFullscreen(); }
    else if (lower === 'r') { e.preventDefault(); resetClock(); }
  });

  function openTile(tile) {
    startClock();
    go(parseInt(tile.getAttribute('data-goto'), 10) - 1, 0, { focus: tile.getAttribute('data-focus') || '' });
  }

  // ---- Clicks: anywhere that isn't a control goes forward -----------------------------------
  viewport.addEventListener('click', function (e) {
    var tile = e.target.closest && e.target.closest('[data-goto]');
    if (tile) { openTile(tile); return; }
    if (e.target.closest && e.target.closest('button, a, input, textarea, label, select, [data-interactive], .notespanel')) return;
    next();
  });

  // ---- Start ----------------------------------------------------------------------------------
  function readHash() {
    var m = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash || '');
    return m ? { index: parseInt(m[1], 10) - 1, step: parseInt(m[2] || '0', 10) } : { index: 0, step: 0 };
  }

  window.Deck = {
    on: function (number, hook) { hooks[number] = hook; },
    go: go, next: next, prev: prev,
    reduced: reduced,
    current: function () { return current + 1; },
    step: function () { return step; },
    // slides.js calls this when a control on the slide did a step's work (the Sort button, say),
    // so the next press of Right doesn't repeat it.
    setStep: function (n) { step = Math.max(0, Math.min(stepsOf(current), n)); applyStep({ from: step, silent: true }); update(); }
  };

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', function () {
    var at = readHash();
    if (at.index !== current || at.step !== step) go(at.index, at.step, { instant: true });
  });
  setInterval(tick, 500);

  // slides.js is loaded after this file and calls Deck.start() once its hooks are in place.
  window.Deck.start = function () {
    fit();
    if (recall('notes') === '1') notesPanel.hidden = false;
    var at = readHash();
    go(at.index, at.step, { instant: true });
    tick();
  };
})();
