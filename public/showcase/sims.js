/*
  sims.js: the working parts of the deck's two simulations. No page code lives here, so the same
  file can be run in Node to test it (see PRESENTER.md).

  1. The Case G guest question, read two ways: the first version of the tool and the fixed one.
  2. The Case F mini sorter: 24 made-up students, 4 made-up projects, 6 seats each.

  Every name in this file is invented. Nothing here reads or sends any data.
*/
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------------------------
  // Case G: "Will a spouse, partner or child join you? If so, who?"
  //
  // The helpers below are copied from core/read.js in CivicAIClub/case-g-seated-meals (main,
  // commit af64acf, Nov 18, 2026): text, norm, splitNames, answerKey, meansNobody, isRelationWord,
  // cleanGuest, splitPieces, guestAnswer, nameWords and nameKey, with their word lists. Only the
  // wrapping changed, so the slide gives the answer the real tool gives.
  // ---------------------------------------------------------------------------------------------

  // Every cell becomes trimmed text.
  function text(v) { return v == null ? '' : String(v).trim(); }
  // For comparing words people type: lowercase, one space between words, straight apostrophes.
  function norm(v) { return text(v).replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').toLowerCase(); }
  // Splits a list of names typed into one answer: commas, semicolons, "and", "&", "+" and line breaks.
  function splitNames(v) {
    return text(v).split(/\s*(?:,|;|&|\+|\r?\n|\band\b)\s*/i).map(text).filter(function (s) { return s !== ''; });
  }

  // Answers that mean nobody is joining, compared as lowercase words without punctuation.
  var NOBODY = ['no', 'none', 'n/a', 'na', 'n a', 'nope', 'not', 'nobody', 'no one', 'noone', 'just me', 'only me', 'just myself', 'myself', 'me'];
  // Words people add to a "no" that don't change it ("None this time", "No, thank you").
  var NOBODY_EXTRAS = ['thanks', 'thank', 'you', 'this', 'time', 'at', 'for', 'now', 'guest', 'guests', 'sorry', 'coming', 'joining'];
  // Words that say who someone is rather than their name ("my wife", "our two kids").
  var RELATION_WORDS = ['my', 'our', 'both', 'one', 'two', 'three', 'four', 'husband', 'wife', 'spouse', 'partner', 'son', 'sons',
    'daughter', 'daughters', 'child', 'children', 'kid', 'kids', 'boyfriend', 'girlfriend', 'fiance', 'fiancee'];
  // Words that, left on their own, name nobody ("also faculty", "too").
  var FILLER_WORDS = ['also', 'too', 'faculty', 'staff', 'teacher', 'colleague', 'here', 'works', 'at', 'school', 'as', 'well', 'with', 'me'];

  // A short answer as lowercase words without punctuation, to compare with the lists above.
  function answerKey(v) { return norm(v).replace(/'/g, '').replace(/[^a-z0-9\/\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  // True when a whole answer means nobody: blank, "No", "None.", "N/A", "-", "No, just me".
  function meansNobody(v, more) {
    var parts = text(v).split(/[,;]/).map(answerKey).filter(function (s) { return s !== ''; });
    return parts.every(function (part) {
      var core = part.split(' ').filter(function (w) { return NOBODY_EXTRAS.indexOf(w) < 0; }).join(' ');
      return core === '' || NOBODY.indexOf(core) >= 0 || (more || []).indexOf(core) >= 0;
    });
  }
  // A name as lowercase words, with accents, anything in parentheses and punctuation dropped.
  function nameWords(v) {
    var s = text(v);
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    return s ? s.split(' ') : [];
  }
  function nameKey(v) { return nameWords(v).join(' '); }
  function isRelationWord(w) { var k = nameKey(w); return RELATION_WORDS.indexOf(k) >= 0 || /^\d+$/.test(k); }
  // One typed guest made into a name: anything in parentheses dropped, and the words at the start
  // that only say who they are ("my wife Sarah" leaves "Sarah").
  function cleanGuest(piece) {
    var words = text(piece).replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(function (w) { return w !== ''; }), relation = false;
    while (words.length && isRelationWord(words[0])) { words.shift(); relation = true; }
    var onlyFiller = words.every(function (w) { return FILLER_WORDS.indexOf(nameKey(w)) >= 0; });
    var name = words.join(' ').replace(/^[\s,.:;!-]+|[\s,.:;!-]+$/g, '');
    return { name: onlyFiller ? '' : name, relation: relation };
  }
  // Splits an answer like splitNames, and notes which pieces came right after a bare comma: in
  // "My husband, John" the comma joins a label to a name rather than adding a person.
  function splitPieces(v) {
    var parts = text(v).split(/(\s*(?:,|;|&|\+|\r?\n|\band\b)\s*)/i), pieces = [], sep = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) { sep += parts[i]; continue; } // the separators are at the odd places
      if (text(parts[i]) === '') continue;
      pieces.push({ text: text(parts[i]), afterComma: pieces.length > 0 && /^\s*,\s*$/.test(sep) });
      sep = '';
    }
    return pieces;
  }
  // The question, cleaned. names: the typed names left after cleaning. mentioned: the answer said
  // someone is coming, even with no name ("Yes", "My wife"). unnamed: how many people it mentions
  // only by who they are ("and my son"); each needs a seat like a named guest.
  function guestAnswer(v) {
    if (meansNobody(v)) return { names: [], mentioned: false, unnamed: 0 };
    var rest = text(v).replace(/^\s*yes\b[\s,.:;!-]*/i, '');
    var pieces = splitPieces(rest).map(function (p) { var c = cleanGuest(p.text); c.afterComma = p.afterComma; return c; });
    var names = [], unnamed = 0, labeled = {};
    // A name piece can take one label when it has no relation words of its own.
    function canLabel(k) { var p = pieces[k]; return !!(p && p.name && !p.relation && !labeled[k]); }
    pieces.forEach(function (p, k) {
      if (p.name) { names.push(p.name); return; }
      if (!p.relation) return;
      if (p.afterComma && canLabel(k - 1)) labeled[k - 1] = true;
      else if (pieces[k + 1] && pieces[k + 1].afterComma && canLabel(k + 1)) labeled[k + 1] = true;
      else unnamed++;
    });
    return { names: names, mentioned: true, unnamed: unnamed };
  }

  // The first version (merged in pull request 4): every piece of the answer was taken as a guest's
  // name and held a seat. The seat-count question is left blank here, as on the slide.
  function firstVersion(answer) {
    var names = splitNames(answer);
    return { seats: names.map(function (n) { return { name: n }; }) };
  }

  // The fixed version (pull request 5): the answer is cleaned first. With the seat-count question
  // blank, the tool holds a seat for each guest named or mentioned, and at least one when the
  // answer says someone is coming.
  function fixedVersion(answer) {
    var q = guestAnswer(answer);
    var held = Math.max(q.names.length + q.unnamed, q.mentioned ? 1 : 0);
    var seats = q.names.map(function (n) { return { name: n }; });
    while (seats.length < held) seats.push({ name: '' }); // a guest with no name given
    return { seats: seats, nobody: !q.mentioned };
  }

  // ---------------------------------------------------------------------------------------------
  // Case F: the mini sorter. This is a small teaching model, not the real sorter's code.
  // ---------------------------------------------------------------------------------------------

  var PROJECTS = ['Trail Crew', 'Short Film', 'Bread Lab', 'Boat Build'];
  // How often each project is picked first, so some fill up and the sorter has work to do.
  var WEIGHTS = [4, 3, 2, 1.5];
  var SEATS_EACH = 6;

  // 24 invented students. None of these is a real person.
  var STUDENTS = [
    'Juno Marsh', 'Tobin Hale', 'Priya Vance', 'Leo Castell', 'Imani Brook', 'Rafe Okoro',
    'Wren Sato', 'Dara Flynn', 'Milo Arden', 'Sana Whit', 'Cole Ibarra', 'Nell Ostrow',
    'Theo Banks', 'Zuri Lane', 'Finn Calder', 'Maya Stroud', 'Owen Pike', 'Lila Moreau',
    'Bram Renner', 'Tess Abbot', 'Ravi Dunne', 'Elsa Thorn', 'Jude Mercer', 'Noor Halim'
  ];

  // A small random number maker that gives the same numbers for the same seed, so a run can be
  // repeated exactly (mulberry32).
  function makeRandom(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Gives every student three ranked choices out of the four projects.
  function makeStudents(seed) {
    var random = makeRandom(seed);
    return STUDENTS.map(function (name, id) {
      var left = PROJECTS.map(function (_, i) { return i; }), choices = [];
      while (choices.length < 3) {
        var total = left.reduce(function (sum, i) { return sum + WEIGHTS[i]; }, 0), pick = random() * total, k = 0;
        while (k < left.length - 1 && pick >= WEIGHTS[left[k]]) { pick -= WEIGHTS[left[k]]; k++; }
        choices.push(left.splice(k, 1)[0]);
      }
      return { id: id, name: name, choices: choices };
    });
  }

  function listNames(indexes) {
    var names = indexes.map(function (i) { return PROJECTS[i]; });
    if (names.length === 1) return names[0] + ' was full.';
    if (names.length === 2) return names[0] + ' and ' + names[1] + ' were full.';
    return 'All three choices were full.';
  }

  // Sorts the students into equal groups.
  // 1. Draw an order (so no one is favored by the alphabet).
  // 2. Give out first choices in that order while seats last, then second choices, then third.
  // 3. Anyone still without a group goes where the most seats are left.
  // Every placement comes back with a one-line reason.
  function sortStudents(students, seed) {
    var random = makeRandom(seed + 7919), order = students.slice(), groups = PROJECTS.map(function () { return []; }), placed = {};
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1)), swap = order[i];
      order[i] = order[j];
      order[j] = swap;
    }
    var ORDINAL = ['1st', '2nd', '3rd'];
    for (var rank = 0; rank < 3; rank++) {
      order.forEach(function (s) {
        var project = s.choices[rank];
        if (placed[s.id] || groups[project].length >= SEATS_EACH) return;
        var reason = ORDINAL[rank] + ' choice.' + (rank ? ' ' + listNames(s.choices.slice(0, rank)) : '');
        placed[s.id] = { student: s, project: project, rank: rank + 1, reason: reason };
        groups[project].push(placed[s.id]);
      });
    }
    order.forEach(function (s) {
      if (placed[s.id]) return;
      var project = 0;
      groups.forEach(function (g, k) { if (g.length < groups[project].length) project = k; });
      placed[s.id] = { student: s, project: project, rank: 0, reason: 'Placed where there was room. ' + listNames(s.choices) };
      groups[project].push(placed[s.id]);
    });
    var counts = [0, 0, 0, 0]; // no ranked choice, 1st, 2nd, 3rd
    students.forEach(function (s) { counts[placed[s.id].rank]++; });
    return { groups: groups, placed: placed, counts: counts };
  }

  var api = {
    guestAnswer: guestAnswer, meansNobody: meansNobody, cleanGuest: cleanGuest, splitNames: splitNames,
    firstVersion: firstVersion, fixedVersion: fixedVersion,
    PROJECTS: PROJECTS, STUDENTS: STUDENTS, SEATS_EACH: SEATS_EACH,
    makeStudents: makeStudents, sortStudents: sortStudents
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ShowcaseSims = api;
})(typeof window !== 'undefined' ? window : globalThis);
