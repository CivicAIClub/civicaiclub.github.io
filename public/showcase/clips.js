/*
  clips.js: the recordings of the real tools.

  A clip in index.html looks like this:

    <figure class="clip" data-clip="case-a" data-play="1">
      <div class="clip__frame">
        <video class="clip__video" muted playsinline preload="none" poster="media/case-a.webp" controls>
          <source src="media/case-a.av1.mp4" type='video/mp4; codecs="av01.0.08M.08"'>
          <source src="media/case-a.h264.mp4" type='video/mp4; codecs="avc1.640029"'>
        </video>
        ...
      </div>
    </figure>

  data-play   the step of its slide on which the clip plays (once, muted; it holds on its last frame)
  data-from   the first step on which the clip is on screen (left out: from the start)
  data-until  the last step on which the clip is on screen (left out: to the end)

  What this file does:
    - deck.js calls Clips.sync() every time a slide's step changes, and Clips.leave() when a slide
      is left. Arriving on a clip's step plays it. There is no autoplay attribute anywhere.
    - K or a click on the clip pauses and resumes. R plays it again from the start.
    - With reduced motion nothing plays by itself: the poster and a Play button are shown.
    - After the deck has loaded, every clip is downloaded in the background and kept in memory, so
      later slides play even if the wifi drops. The status line counts them ("Clips 3/7").
    - The "controls" attribute in the HTML is only for JavaScript being off; it is removed here.
*/
(function () {
  'use strict';

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var countEl = document.getElementById('status-clips');
  var clips = [];

  function int(el, name, fallback) {
    var value = el.getAttribute(name);
    return value === null || value === '' ? fallback : parseInt(value, 10);
  }

  // The first <source> this browser says it can play (AV1 where it can, H.264 everywhere else).
  function pickSource(video) {
    var sources = video.querySelectorAll('source'), chosen = null;
    Array.prototype.forEach.call(sources, function (source) {
      if (!chosen && video.canPlayType(source.getAttribute('type') || 'video/mp4')) chosen = source;
    });
    return (chosen || sources[sources.length - 1]).getAttribute('src');
  }

  Array.prototype.forEach.call(document.querySelectorAll('.clip'), function (el) {
    var video = el.querySelector('video');
    var clip = {
      el: el,
      video: video,
      slide: el.closest('.slide'),
      button: el.querySelector('.clip__play'),
      keys: el.querySelector('.clip__keys'),
      bar: el.querySelector('.clip__bar'),
      playAt: int(el, 'data-play', 0),
      from: int(el, 'data-from', 0),
      until: int(el, 'data-until', 99),
      url: pickSource(video),
      saved: '', // an address for the copy kept in memory, once it has been downloaded
      started: false,
      visible: false
    };
    video.removeAttribute('controls');
    video.muted = true;
    clips.push(clip);

    function state() {
      var playing = !video.paused && !video.ended;
      el.classList.toggle('is-playing', playing);
      el.classList.toggle('is-ended', video.ended);
      el.classList.toggle('is-started', clip.started);
      if (clip.keys) {
        clip.keys.textContent = !clip.started ? (reduced ? 'Press Play' : 'Right plays it')
          : playing ? 'K pause · R replay' : video.ended ? 'R replay' : 'K resume · R replay';
      }
    }
    clip.state = state;
    ['play', 'pause', 'ended', 'playing'].forEach(function (name) { video.addEventListener(name, state); });
    video.addEventListener('timeupdate', function () {
      if (clip.bar && video.duration) clip.bar.style.transform = 'scaleX(' + Math.min(1, video.currentTime / video.duration) + ')';
    });
    // A click on the recording pauses or resumes it (deck.js knows not to move on for these clicks).
    el.querySelector('.clip__frame').addEventListener('click', function () {
      // Before the clip's step: the click is the same as pressing Right.
      if (!clip.started && window.Deck && window.Deck.step() < clip.playAt) {
        window.Deck.next();
        if (reduced) play(clip);
      } else if (!clip.started) play(clip);
      else toggle(clip);
    });
    state();
  });

  // Use the copy in memory when there is one. Only swapped in while the clip shows its poster or
  // is about to start again, so the picture never jumps in the middle of a clip.
  function useSaved(clip) {
    if (clip.saved && clip.video.getAttribute('src') !== clip.saved) {
      clip.video.setAttribute('src', clip.saved);
      clip.video.load();
    }
  }

  function play(clip) {
    useSaved(clip);
    clip.started = true;
    clip.el.classList.remove('is-manual');
    try { if (clip.video.readyState > 0) clip.video.currentTime = 0; } catch (e) { /* not loaded yet: it starts at 0 anyway */ }
    if (clip.bar) clip.bar.style.transform = 'scaleX(0)';
    var started = clip.video.play();
    // A browser that refuses to start a video by itself: show the Play button instead.
    if (started && started.catch) started.catch(function () { clip.started = false; clip.el.classList.add('is-manual'); clip.state(); });
    clip.state();
  }

  function toggle(clip) {
    if (clip.video.ended) { play(clip); return; }
    if (clip.video.paused) clip.video.play(); else clip.video.pause();
  }

  // Back to the poster, as if the clip had never played.
  function reset(clip) {
    clip.video.pause();
    if (clip.started || clip.video.currentTime > 0) {
      clip.started = false;
      if (clip.saved) clip.video.setAttribute('src', clip.saved);
      clip.video.load(); // shows the poster again
    }
    if (clip.bar) clip.bar.style.transform = 'scaleX(0)';
    clip.el.classList.toggle('is-manual', reduced);
    clip.state();
  }

  function onSlide(slide) { return clips.filter(function (clip) { return clip.slide === slide; }); }
  function showing(slide) { return onSlide(slide).filter(function (clip) { return clip.visible; })[0] || null; }

  window.Clips = {
    // Called by deck.js whenever the slide on screen changes step.
    sync: function (slide, step, info) {
      onSlide(slide).forEach(function (clip) {
        clip.visible = step >= clip.from && step <= clip.until;
        clip.el.classList.toggle('is-on', clip.visible);
        if (info.silent) return;
        if (!clip.visible || step < clip.playAt) { reset(clip); return; }
        if (step === clip.playAt && info.from !== step) {
          if (reduced) reset(clip); else play(clip);
        }
        // On a later step the clip stays as it is: still playing, or held on its last frame.
      });
    },
    leave: function (slide) { onSlide(slide).forEach(function (clip) { clip.visible = false; clip.video.pause(); }); },
    // K and R. They return true when there was a clip to act on.
    toggle: function (slide) {
      var clip = showing(slide);
      if (!clip) return false;
      if (!clip.started) play(clip); else toggle(clip);
      return true;
    },
    replay: function (slide) { var clip = showing(slide); if (clip) play(clip); return !!clip; },
    // For the checks: how many clips are saved in memory, out of how many.
    saved: function () { return clips.filter(function (clip) { return !!clip.saved; }).length; },
    total: function () { return clips.length; }
  };

  // ---- Download every clip in the background, one after another ------------------------------
  function count() {
    if (!countEl) return;
    var done = window.Clips.saved();
    countEl.textContent = done === clips.length ? 'Clips ready' : 'Clips ' + done + '/' + clips.length;
    countEl.classList.toggle('is-ready', done === clips.length);
  }
  function download(i) {
    if (i >= clips.length) return;
    var clip = clips[i];
    fetch(clip.url).then(function (response) {
      if (!response.ok) throw new Error('not found');
      return response.blob();
    }).then(function (blob) {
      clip.saved = URL.createObjectURL(blob);
      if (!clip.started) useSaved(clip);
      count();
    }).catch(function () {
      // No wifi, or the file is missing: the clip still plays straight from the site if it can.
      if (countEl) countEl.classList.add('is-missing');
    }).then(function () { download(i + 1); });
  }
  count();
  if (clips.length && window.fetch && window.URL && URL.createObjectURL) {
    if (document.readyState === 'complete') setTimeout(function () { download(0); }, 300);
    else window.addEventListener('load', function () { setTimeout(function () { download(0); }, 300); });
  }
})();
