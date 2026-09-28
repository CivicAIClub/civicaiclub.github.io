// case-playhead.js (helper): the shared parts of the case page's "How it works" recording.
//
// The recording on each case page (src/components/case/Playhead.astro) can be driven three ways:
//   - by scrolling, on laptops and desktops with motion on (modules/case-playhead.js),
//   - by playing on its own while on screen, on phones and tablets with motion on (the same
//     module),
//   - only when a visitor presses Play, when motion is off (modules/case-player.js).
// All three need the same small jobs done: find the pieces of the chapter on the page, turn a
// moment in the clip into a timecode like "00:04.2", work out which caption ("beat") belongs to
// that moment, and (for Pomfret Voices) which year the timeline has reached. Those jobs live here
// so the two modules can't drift apart.
// Not a module by itself (modules/ loads only files that set things up on the page).

import { makeSlot, rollThrough } from './letter-roll.js';

// Find every piece of one chapter. "track" is the element marked data-playhead.
// Gives back an object with the pieces, or null when the chapter has no video yet.
export function readChapter(track) {
  const video = track.querySelector('[data-playhead-video]');
  if (!video) return null;
  // The beats: the moments (in seconds) where a caption belongs, in time order. Each beat has a
  // caption line in the bar under the footage and a row in the written list.
  const beats = [...track.querySelectorAll('[data-beat]')].map((item) => ({
    t: parseFloat(item.getAttribute('data-t') || '0'),
    year: parseInt(item.getAttribute('data-year') || '', 10) || null,
    item,
  }));
  return {
    track,
    video,
    stage: track.querySelector('[data-playhead-stage]'),
    beats,
    captions: [...track.querySelectorAll('[data-playhead-caption]')],
    hint: track.querySelector('[data-playhead-hint]'),
    clock: track.querySelector('[data-playhead-clock]'),
    year: track.querySelector('[data-playhead-year]'),
    progress: track.querySelector('[data-playhead-progress]'),
    toggle: track.querySelector('[data-playhead-toggle]'),
    toggleLabel: track.querySelector('[data-playhead-toggle-label]'),
    // The clip's length in seconds, written into the page from src/data/media.json.
    duration: parseFloat(track.getAttribute('data-duration') || '0') || 1,
  };
}

// Turn a number of seconds into a timecode: 4.23 becomes "00:04.2" (minutes, seconds, tenths).
export function formatClock(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const whole = Math.floor(safe % 60);
  const tenths = Math.floor((safe * 10) % 10);
  return `${String(minutes).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${tenths}`;
}

// Which beat does this moment belong to? The last beat whose time has already been reached.
// Gives back its position in the list, or -1 before the first beat.
export function beatIndexAt(beats, time) {
  let index = -1;
  beats.forEach((beat, i) => {
    // A hundredth of a second of slack, so a beat at 0.0 counts as soon as the clip starts.
    if (time + 0.01 >= beat.t) index = i;
  });
  return index;
}

// For a timeline clip (Pomfret Voices), the year to show at this moment: the year of the
// caption that belongs to it (the first caption's year before the first beat). So the counter
// and the caption on screen always agree. Gives back null when the beats carry no years.
export function yearAt(beats, time) {
  if (!beats.length || beats.some((beat) => !beat.year)) return null;
  return beats[Math.max(0, beatIndexAt(beats, time))].year;
}

// The year counter as a row of little windows, one per digit, so that when the year changes
// only the digits that differ roll to their new value (1894 to 1949: the 8 rolls to 9, the 9
// down to 4, the 4 up to 9; the 1 stays still). Each digit rolls through the ones in between,
// like a mechanical counter (rollThrough from letter-roll.js, 0.6s on expo.out).
// Gives back a function that shows a year.
function makeYearRoller(el) {
  let shown = '';
  let slots = [];
  // Lay the digits out as windows (done again if the number of digits ever changes).
  const build = (text) => {
    el.textContent = '';
    slots = [...text].map((digit) => {
      const slot = document.createElement('span');
      slot.textContent = digit;
      el.appendChild(slot);
      return makeSlot(slot);
    });
    shown = text;
  };
  return (year) => {
    const text = String(year);
    if (text === shown) return;
    if (!shown || text.length !== shown.length) {
      build(text);
      return;
    }
    [...text].forEach((digit, i) => {
      if (digit !== shown[i]) rollThrough(slots[i], shown[i], digit, { duration: 0.6 });
    });
    shown = text;
  };
}

// Show one moment of the clip in the chapter's readouts: the timecode (or the year), the thin
// crimson progress line, and which row of the written beat list is current.
// Remembers what it last wrote, so it only touches the page when something actually changed.
// With { roll: true } (motion on), a new year rolls its changed digits into place; otherwise
// (motion off) the new year simply replaces the old one.
export function makeReadout(chapter, { roll = false } = {}) {
  let lastClock = '';
  let lastYear = null;
  let lastRow = -2;
  let lastShare = -1;
  const showYear = chapter.year && roll ? makeYearRoller(chapter.year) : null;
  return function render(time) {
    const clock = formatClock(time);
    if (chapter.clock && clock !== lastClock) {
      chapter.clock.textContent = clock;
      lastClock = clock;
    }
    const year = yearAt(chapter.beats, time);
    if (chapter.year && year !== null && year !== lastYear) {
      if (showYear) showYear(year);
      else chapter.year.textContent = String(year);
      // The year as plain data too, for anything that reads the counter while digits roll.
      chapter.year.setAttribute('data-value', String(year));
      lastYear = year;
    }
    // The progress line is a 1px bar stretched from the left; 0.5 means halfway through.
    const share = Math.min(1, Math.max(0, time / chapter.duration));
    if (chapter.progress && Math.abs(share - lastShare) > 0.0005) {
      chapter.progress.style.transform = `scaleX(${share})`;
      lastShare = share;
    }
    const row = beatIndexAt(chapter.beats, time);
    if (row !== lastRow) {
      chapter.beats.forEach((beat, i) => beat.item.classList.toggle('is-current', i === row));
      lastRow = row;
    }
    return row;
  };
}

// Put the readouts back to the start (used when a mode is switched off).
export function resetReadout(chapter) {
  if (chapter.clock) chapter.clock.textContent = formatClock(0);
  if (chapter.year && chapter.beats[0]?.year) {
    chapter.year.textContent = String(chapter.beats[0].year);
    chapter.year.removeAttribute('data-value');
  }
  if (chapter.progress) chapter.progress.style.transform = '';
  chapter.beats.forEach((beat) => beat.item.classList.remove('is-current'));
}

// The scroll-driven mode needs the whole clip on the visitor's computer, so that jumping to any
// moment is instant instead of waiting for the network. This downloads the clip once, keeps it
// in memory as a "blob" (the file's bytes, held by the browser) and points the video at it.
// Later calls reuse the same download. Gives back a promise that settles when the video can
// show frames. If the download fails, the video simply loads its normal file instead.
const loaded = new WeakMap();

export function loadWholeClip(video) {
  if (loaded.has(video)) return loaded.get(video);
  const source = video.querySelector('source');
  const url = source ? source.src : video.currentSrc;
  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      video.preload = 'auto';
      video.src = URL.createObjectURL(blob);
    })
    .catch(() => {
      // Fall back to the browser's normal loading of the <source> file.
      video.preload = 'auto';
      video.load();
    })
    .then(() => whenFramesReady(video));
  loaded.set(video, promise);
  return promise;
}

// Settle once the video has its first frame ready to draw ("readyState 2" in browser terms).
export function whenFramesReady(video) {
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('loadeddata', done);
      resolve();
    };
    video.addEventListener('loadeddata', done);
  });
}
