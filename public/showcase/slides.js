/*
  slides.js: what each slide does when you step through it.

  deck.js calls apply(step, info) for the slide on screen every time its step changes:
    step           the step the slide is on now (0 is how the slide starts)
    info.instant   show the result straight away, with no animation (arriving on a slide, or
                   reduced motion)
    info.from      the step it was on before
    info.silent    a control on the slide already did the work; only the step count changed
  Each apply() can be called with any step at any time and always shows the right state for it.

  Slides with their own code: 5 (Case A planner), 6 (Case B portal), 7 (Case F sorter),
  9 (Apps Script), 10 (Case G guest question). The other slides only use data-step in the HTML.
*/
(function () {
  'use strict';

  var Deck = window.Deck, Sims = window.ShowcaseSims;
  function $(id) { return document.getElementById(id); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  // A list of timers that can all be cancelled at once (when a slide is left or stepped back).
  function makeTimers() {
    var ids = [];
    return {
      after: function (ms, fn) { ids.push(setTimeout(fn, ms)); },
      clear: function () { ids.forEach(clearTimeout); ids = []; }
    };
  }

  // ---- 5. Case A: the planner that updates itself at 7 pm -----------------------------------
  (function () {
    var clock = $('a-clock'), stamp = $('a-stamp'), rows = document.querySelectorAll('#a-rows .a-new'), timers = makeTimers();
    if (!clock) return;

    function before() {
      clock.textContent = '6:57 PM';
      clock.classList.remove('is-seven');
      stamp.textContent = 'Last updated 12:00 AM';
      stamp.classList.remove('is-fresh');
      each(rows, function (row) { row.classList.remove('is-filled'); });
    }
    function after() {
      clock.textContent = '7:00 PM';
      clock.classList.add('is-seven');
      stamp.textContent = 'Updated 7:00 PM';
      stamp.classList.add('is-fresh');
      each(rows, function (row) { row.classList.add('is-filled'); });
    }
    function run() {
      before();
      ['6:58 PM', '6:59 PM'].forEach(function (time, i) {
        timers.after(500 * (i + 1), function () { clock.textContent = time; });
      });
      timers.after(1500, function () {
        clock.textContent = '7:00 PM';
        clock.classList.add('is-seven');
      });
      each(rows, function (row, i) {
        timers.after(1900 + 280 * i, function () { row.classList.add('is-filled'); });
      });
      timers.after(1900 + 280 * rows.length, function () {
        stamp.textContent = 'Updated 7:00 PM';
        stamp.classList.add('is-fresh');
      });
    }

    Deck.on(5, {
      apply: function (step, info) {
        if (info.silent) return;
        timers.clear();
        if (step === 0) before();
        else if (step === 1 && info.from === 0 && !info.instant && !Deck.reduced) run();
        else after();
      },
      leave: function () { timers.clear(); }
    });
  })();

  // ---- 6. Case B: the sign-in sheet lifts off the portal --------------------------------------
  (function () {
    var portal = $('b-portal'), button = $('b-signin');
    if (!portal) return;
    Deck.on(6, { apply: function (step) { portal.classList.toggle('is-open', step >= 1); } });
    button.addEventListener('click', function () { if (Deck.current() === 6 && Deck.step() === 0) Deck.next(); });
  })();

  // ---- 7. Case F: the mini sorter -----------------------------------------------------------------
  (function () {
    var field = $('f-field'), heads = $('f-heads'), summary = $('f-summary'), button = $('f-sort');
    if (!field) return;
    var sorter = field.parentNode, timers = makeTimers();
    var COLUMN = 297 + 14, ROW = 105 + 8; // a chip's width and height, plus the gap
    var SHORT = Sims.PROJECTS.map(function (name) { return name === 'Short Film' ? 'Film' : name.split(' ')[0]; });
    var START = '24 made-up students. 4 projects, 6 seats each. Each student ranked three.';
    var seed = 1, students = [], chips = [], sorted = false;

    // The column headings: one per project.
    Sims.PROJECTS.forEach(function (name) {
      var head = document.createElement('div'), count = document.createElement('span');
      head.className = 'sorter__head';
      head.textContent = name;
      count.textContent = Sims.SEATS_EACH + ' seats';
      head.appendChild(count);
      heads.appendChild(head);
    });
    // One chip per student, made once and then moved around.
    Sims.STUDENTS.forEach(function () {
      var chip = document.createElement('div'), name = document.createElement('p'), sub = document.createElement('p');
      chip.className = 'chip';
      name.className = 'chip__name';
      sub.className = 'chip__sub';
      chip.appendChild(name);
      chip.appendChild(sub);
      field.appendChild(chip);
      chips.push({ el: chip, name: name, sub: sub });
    });

    function place(chip, column, row, order) {
      chip.el.style.transitionDelay = (Deck.reduced ? 0 : order * 22) + 'ms';
      chip.el.style.transform = 'translate(' + column * COLUMN + 'px,' + row * ROW + 'px)';
    }
    // Moves chips with no animation (arriving on the slide), then lets animation back on.
    function instantly(fn) {
      chips.forEach(function (chip) { chip.el.style.transition = 'none'; });
      fn();
      void field.offsetWidth; // makes the browser apply the positions before animation returns
      chips.forEach(function (chip) { chip.el.style.transition = ''; });
    }

    function showUnsorted() {
      sorted = false;
      sorter.classList.remove('is-sorted');
      students.forEach(function (s, i) {
        var chip = chips[s.id];
        chip.name.textContent = s.name;
        chip.sub.textContent = s.choices.map(function (c) { return SHORT[c]; }).join(' > ');
        chip.el.classList.remove('is-second');
        place(chip, i % 4, Math.floor(i / 4), i);
      });
      summary.textContent = START;
      button.textContent = 'Sort 24 students';
    }

    function showSorted() {
      var result = Sims.sortStudents(students, seed), order = 0;
      sorted = true;
      sorter.classList.add('is-sorted');
      result.groups.forEach(function (group, column) {
        group.forEach(function (placement, row) {
          var chip = chips[placement.student.id];
          chip.sub.textContent = placement.reason;
          chip.el.classList.toggle('is-second', placement.rank !== 1);
          place(chip, column, row, order++);
        });
      });
      var c = result.counts, parts = [c[1] + ' got their 1st choice'];
      if (c[2]) parts.push(c[2] + ' their 2nd');
      if (c[3]) parts.push(c[3] + ' their 3rd');
      if (c[0]) parts.push(c[0] + ' placed where there was room');
      summary.textContent = 'Four groups of 6. ' + parts.join(', ') + '.';
      button.textContent = 'New draw, sort again';
    }

    function newDraw(nextSeed) {
      seed = nextSeed;
      students = Sims.makeStudents(seed);
    }

    newDraw(1);
    instantly(showUnsorted);

    Deck.on(7, {
      apply: function (step, info) {
        if (info.silent) return;
        timers.clear();
        var quick = info.instant || Deck.reduced;
        if (step === 0) { if (quick) instantly(showUnsorted); else showUnsorted(); }
        else if (quick) instantly(showSorted);
        else showSorted();
      },
      leave: function () { timers.clear(); }
    });

    button.addEventListener('click', function () {
      if (Deck.current() !== 7) return;
      if (!sorted) { Deck.next(); return; }
      // Already sorted: deal new choices, show them, then sort again.
      timers.clear();
      newDraw(seed + 1);
      if (Deck.reduced) { instantly(showUnsorted); instantly(showSorted); return; }
      showUnsorted();
      button.textContent = 'Sorting…';
      timers.after(1500, showSorted);
    });
  })();

  // ---- 9. Apps Script: the custom menu runs the function on the slide ---------------------------
  (function () {
    var list = $('s-code'), menu = $('s-menu'), drop = $('s-drop'), runButton = $('s-run'), ext = $('s-ext');
    if (!list) return;
    var code = list.parentNode, timers = makeTimers();
    var cells = document.querySelectorAll('#s-rows td.out');
    var tags = {};
    each(code.querySelectorAll('[data-tag]'), function (tag) { tags[tag.getAttribute('data-tag')] = tag; });
    function line(name) { return list.querySelector('[data-line="' + name + '"]'); }

    function hot(names) { Object.keys(tags).forEach(function (key) { tags[key].classList.toggle('is-hot', names.indexOf(key) >= 0); }); }
    function light(el) { each(list.children, function (li) { li.classList.toggle('is-run', li === el); }); }
    // The same sum as line 11 of the code on the slide.
    function tableFor(row) { return 'Table ' + (row % 3 + 1); }
    function fill(upTo) {
      each(cells, function (cell, i) {
        cell.textContent = i < upTo ? tableFor(i + 2) : '';
        cell.classList.remove('is-new');
      });
    }
    function openMenu(open) {
      drop.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      runButton.classList.remove('is-pressed');
    }

    function run() {
      var t = 0;
      fill(0);
      runButton.classList.add('is-pressed');
      timers.after(t += 260, function () { openMenu(false); hot(['fn']); light(line('sheet')); });
      t += 380;
      each(cells, function (cell, i) {
        timers.after(t, function () { light(line('for')); });
        timers.after(t + 90, function () { light(line('table')); });
        timers.after(t + 180, function () {
          light(line('set'));
          hot(['fn', 'sheet']);
          cell.textContent = tableFor(i + 2);
          cell.classList.add('is-new');
        });
        timers.after(t + 520, function () { cell.classList.remove('is-new'); });
        t += 340;
      });
      timers.after(t + 100, function () { light(null); });
    }

    Deck.on(9, {
      apply: function (step, info) {
        if (info.silent) return;
        timers.clear();
        light(null);
        ext.classList.toggle('is-hot', step >= 3);
        code.setAttribute('data-focus', step === 1 ? 'menu' : step === 2 ? 'fn' : '');
        if (step === 0) { openMenu(false); fill(0); hot([]); }
        else if (step === 1) { openMenu(true); fill(0); hot(['menu']); }
        else if (step === 2 && info.from === 1 && !info.instant && !Deck.reduced) run();
        else { openMenu(false); fill(cells.length); hot(step === 2 ? ['fn', 'sheet'] : ['menu', 'fn', 'sheet']); }
      },
      leave: function () { timers.clear(); }
    });

    menu.addEventListener('click', function () {
      if (Deck.current() !== 9) return;
      if (Deck.step() === 0) Deck.next();
      else if (Deck.step() >= 2) Deck.go(8, 1); // run it again: back to the open menu
    });
    runButton.addEventListener('click', function () { if (Deck.current() === 9 && Deck.step() === 1) Deck.next(); });
  })();

  // ---- 10. Case G: one answer, read by the first version and by the fixed one -----------------
  (function () {
    var input = $('g-input'), samples = $('g-samples'), first = $('g-first'), fixed = $('g-fixed');
    if (!input) return;
    var shown = null; // the answer the two columns are showing now

    function seatsText(n) { return n === 0 ? 'No seat held' : n === 1 ? '1 seat held' : n + ' seats held'; }
    function draw(column, seats, note) {
      var list = column.querySelector('[data-seats]');
      column.querySelector('[data-count]').textContent = seats ? seatsText(seats.length) : 'No answer yet';
      list.textContent = '';
      (seats || []).forEach(function (seat) {
        var li = document.createElement('li');
        var words = document.createElement('span');
        if (seat.name) {
          var quote = document.createElement('q');
          quote.textContent = seat.name; // textContent: whatever is typed is shown as plain text
          words.appendChild(document.createTextNode('For a guest named '));
          words.appendChild(quote);
        } else words.textContent = 'For a guest, no name given';
        li.appendChild(words);
        list.appendChild(li);
      });
      if (note) {
        var extra = document.createElement('li');
        extra.className = 'is-note';
        extra.textContent = note;
        list.appendChild(extra);
      }
    }

    function show(answer) {
      shown = answer;
      first.classList.remove('is-wrong');
      if (answer.trim() === '') { draw(first, null, ''); draw(fixed, null, ''); return; }
      var a = Sims.firstVersion(answer), b = Sims.fixedVersion(answer);
      var same = JSON.stringify(a.seats) === JSON.stringify(b.seats);
      draw(first, a.seats, same ? '' : 'Every word was taken as a name.');
      draw(fixed, b.seats, b.nobody ? 'Read as: nobody is joining.' : same ? 'Nothing to clean.' : 'Cleaned first, then seated.');
      first.classList.toggle('is-wrong', !same);
    }

    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      // Enter shows the result. Enter again on the same answer leaves the box, so Right moves on.
      if (shown === input.value) { input.blur(); return; }
      show(input.value);
      input.select();
    });
    input.addEventListener('focus', function () { if (Deck.current() === 10 && Deck.step() === 0) Deck.setStep(1); });
    samples.addEventListener('click', function (e) {
      if (e.target.tagName !== 'BUTTON') return;
      input.value = e.target.textContent;
      show(input.value);
      e.target.blur();
    });

    Deck.on(10, {
      apply: function (step, info) {
        if (info.silent) return;
        if (step === 1 && info.from === 0 && !info.entering) input.focus();
        if (step === 0 && document.activeElement === input) input.blur();
      },
      leave: function () { input.blur(); }
    });
  })();

  Deck.start();
})();
