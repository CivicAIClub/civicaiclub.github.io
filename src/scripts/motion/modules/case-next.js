// case-next.js: moving from one case page to the next, "through the letter".
//
// Works with src/components/case/NextCase.astro (the "Next: Case B" band, marked data-next-case)
// and CaseHero.astro (the hero frame at the top, marked data-case-hero-media).
// Runs only while motion is on. It does three things:
//
// 1. Zoom through the letter. With a mouse or trackpad, in a browser that can animate between
//    pages ("view transitions": Chrome, Edge, Safari 18.2+), clicking the band doesn't open the
//    next case straight away. First:
//      - the band's words fade out (0.3s) and the cursor label hides,
//      - the ink sheet with the letter-shaped hole moves into a layer that covers the whole browser
//        window (data-next-zoom), with the hole exactly where the letter was, and the footage
//        moves into that layer too, under the sheet,
//      - the sheet grows around a point inside one of the letter's strokes until that stroke
//        covers every corner of the window (0.7s on the civic curve), while the footage grows
//        from the letter's window to fill the screen (0.7s on expo.out, so it always reaches
//        further than the hole).
//    The math is the same as the home page docket's zoom (modules/home-docket.js). Then the next
//    case opens. Ctrl/Cmd-click (new tab) and every other device keep the plain link.
// 2. Hand the footage over. Just before the browser swaps pages (the "pageswap" moment), the
//    full-screen zoom layer is given the name "case-media-<next slug>". The next case's hero
//    frame has the same name, so the browser settles the full-screen footage into that frame
//    instead of the usual new-sheet page change (the look of that is in src/styles/case.css).
//    Without a zoom (a tap on a touch screen), the band's letter window gets the name instead,
//    when it is on screen. The header is named too, and the next case is left a note
//    ("civic:handoff", read by Base.astro) so it lifts its title and header above the growing
//    footage. This page's own hero gives up its name at the same moment, so it never flies
//    across the screen towards whatever page comes next.
// 3. Tidy up after "Back". Browsers keep recently left pages ready in memory; when the visitor
//    comes back, the footage goes back into its letter, the layer is hidden and the names are
//    restored.

import { gsap, EASE, hasFinePointer, later, emit } from '../core.js';

// True when at least a fifth of the element is inside the window.
function onScreen(el) {
  const box = el.getBoundingClientRect();
  const visible = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
  return box.height > 0 && visible / box.height >= 0.2;
}

export default {
  name: 'case-next',
  init() {
    const band = document.querySelector('[data-next-case]');
    const hero = document.querySelector('[data-case-hero-media]');
    if (!band && !hero) return undefined;
    const cleanups = [];

    // ---- 2 and 3 for the hero: remember its name so it can be given back after "Back". ----
    const heroName = hero ? hero.style.getPropertyValue('view-transition-name') : '';

    // The site header's bar (Header.astro), named for the page change along with the footage.
    const headerBar = document.querySelector('[data-header]');
    // The band's parts (see NextCase.astro).
    const win = band?.querySelector('[data-next-window]');
    const link = band?.querySelector('[data-next-link]');
    const ink = win?.querySelector('[data-next-ink]');
    const media = win?.querySelector('.video');
    const layer = band?.querySelector('[data-next-zoom]');
    const layerMedia = layer?.querySelector('[data-next-zoom-media]');
    const sheet = layer?.querySelector('[data-next-zoom-sheet]');
    const grow = layer?.querySelector('[data-next-zoom-grow]');
    const paper = layer?.querySelector('[data-next-zoom-paper]');
    const inkRect = layer?.querySelector('[data-next-zoom-ink]');
    const letter = layer?.querySelector('[data-next-zoom-letter]');
    const words = band ? [...band.querySelectorAll('[data-next-fade]')] : [];
    const slug = win?.getAttribute('data-next-slug');
    const cursorLabel = band?.getAttribute('data-cursor');
    let zoom = null;
    let zoomed = false;

    // Put the band back to how it looked before a zoom.
    const resetBand = () => {
      if (zoom) zoom.kill();
      zoom = null;
      if (zoomed) emit('civic:scroll-lock', { locked: false });
      zoomed = false;
      // The footage goes back into its letter window, underneath the letter.
      if (media && win && media.parentElement !== win) win.insertBefore(media, win.firstChild);
      if (layer) {
        layer.hidden = true;
        layer.style.removeProperty('view-transition-name');
        layer.style.removeProperty('view-transition-class');
      }
      if (layerMedia) gsap.set(layerMedia, { clearProps: 'all' });
      if (grow) grow.removeAttribute('transform');
      if (words.length) gsap.set(words, { clearProps: 'opacity,visibility' });
      if (win) {
        win.style.removeProperty('view-transition-name');
        win.style.removeProperty('view-transition-class');
      }
      if (band && cursorLabel) band.setAttribute('data-cursor', cursorLabel);
      if (headerBar) headerBar.style.removeProperty('view-transition-name');
      band?.querySelectorAll('.video__toggle').forEach((button) => gsap.set(button, { clearProps: 'opacity' }));
    };

    // ---- 1. Zoom through the letter ----
    // The window carries the point to grow from, worked out ahead of time with the letter's
    // outline (scripts/build-docket-letters.mjs): data-zoom-x and data-zoom-y say where it is, as
    // shares of the window's width and height, and data-zoom-r how thick the stroke is there, as
    // a share of the window's height. Without them (the typed-letter fallback, which has no zoom
    // layer either) the band is a plain link.
    const zoomPoint = () => {
      const x = parseFloat(win?.getAttribute('data-zoom-x') || '');
      const y = parseFloat(win?.getAttribute('data-zoom-y') || '');
      const r = parseFloat(win?.getAttribute('data-zoom-r') || '');
      return [x, y, r].every(Number.isFinite) && r > 0 ? { x, y, r } : null;
    };
    const canZoom = () =>
      Boolean(win && link && ink && media && layer && grow && zoomPoint()) &&
      hasFinePointer() &&
      'onpageswap' in window;

    const startZoom = (href) => {
      const point = zoomPoint();
      // Measure everything before moving anything: the browser window (W × H), the letter's
      // window on screen (R), and the band's visible part (B).
      const W = document.documentElement.clientWidth;
      const H = window.innerHeight;
      const R = win.getBoundingClientRect();
      const bandBox = band.getBoundingClientRect();
      const B = { x: 0, y: Math.max(0, bandBox.top), w: W, h: Math.min(H, bandBox.bottom) - Math.max(0, bandBox.top) };
      // The letter's box in its own units. The window's letter is drawn in that box, scaled to
      // fit inside the window and centered in it (k is that scale, ox/oy its top left corner).
      const box = ink.viewBox.baseVal;
      const k = Math.min(R.width / box.width, R.height / box.height);
      const ox = R.left + (R.width - box.width * k) / 2;
      const oy = R.top + (R.height - box.height * k) / 2;

      // Lay out the sheet in screen pixels: an ink rectangle over the band, with the letter's
      // hole placed exactly over the letter in the band.
      sheet.setAttribute('viewBox', `0 0 ${W} ${H}`);
      [paper, inkRect].forEach((rect) => {
        rect.setAttribute('x', String(B.x));
        rect.setAttribute('y', String(B.y));
        rect.setAttribute('width', String(B.w));
        rect.setAttribute('height', String(Math.max(0, B.h)));
      });
      letter.setAttribute('transform', `translate(${ox - box.x * k} ${oy - box.y * k}) scale(${k})`);

      // The footage: a square as big as the window's longer side (S), placed and shrunk so it
      // first shows exactly what the letter showed (a square as tall as the letter, centered on
      // it), then grown back to full size in the middle of the screen.
      const S = Math.max(W, H);
      const m = Math.max(R.width, R.height);
      gsap.set(layerMedia, {
        width: S,
        height: S,
        x: R.left + R.width / 2 - m / 2,
        y: R.top + R.height / 2 - m / 2,
        scale: m / S,
      });
      layerMedia.appendChild(media);
      layer.hidden = false;

      // The point inside a stroke to zoom around (on screen), and the stroke's radius there.
      const px = ox + point.x * box.width * k;
      const py = oy + point.y * box.height * k;
      const r = point.r * box.height * k;
      // Zoom far enough that the stroke around that point covers every corner of the screen.
      const corners = [[0, 0], [W, 0], [0, H], [W, H]];
      const Z = (Math.max(...corners.map(([x, y]) => Math.hypot(x - px, y - py))) / r) * 1.08;
      // "p" runs from 0 to 1 on the civic curve. The size grows exponentially with it (Z to the
      // power p), so the zoom feels steady instead of leaping in its first moments.
      const z = { p: 0 };

      zoom = gsap.timeline({ onComplete: () => window.location.assign(href) });
      // The band's words (name, office, summary, "Open case", the label and "All cases") and the
      // clip's Pause button fade out.
      zoom.to(words, { autoAlpha: 0, duration: 0.3, ease: EASE.civic }, 0);
      zoom.to(media.querySelectorAll('.video__toggle'), { opacity: 0, duration: 0.3, ease: 'none' }, 0);
      zoom.to(
        z,
        {
          p: 1,
          duration: 0.7,
          ease: EASE.civic,
          onUpdate: () => {
            // Scale the sheet around (px, py): every point moves away from it by the same factor.
            const s = Math.pow(Z, z.p);
            grow.setAttribute('transform', `translate(${px * (1 - s)} ${py * (1 - s)}) scale(${s})`);
          },
        },
        0
      );
      zoom.to(layerMedia, { x: (W - S) / 2, y: (H - S) / 2, scale: 1, duration: 0.7, ease: EASE.out }, 0);
    };

    const onClick = (event) => {
      // Leave new-tab clicks, right clicks and modified clicks to the browser.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!canZoom() || zoomed) return;
      event.preventDefault();
      zoomed = true;
      // Hold the page still during the zoom, and hide the cursor label.
      emit('civic:scroll-lock', { locked: true });
      band.removeAttribute('data-cursor');
      emit('civic:cursor-refresh');
      const href = link.href;
      later(() => startZoom(href));
    };
    // Clicks anywhere on the band land on the link (its see-through layer covers the band).
    if (link) {
      link.addEventListener('click', onClick);
      cleanups.push(() => link.removeEventListener('click', onClick));
    }

    // ---- 2. Hand the footage over at the page swap ----
    const onSwap = (event) => {
      if (!event.viewTransition) return;
      if (hero) hero.style.setProperty('view-transition-name', 'none');
      const destination = event.activation?.entry?.url;
      if (!win || !link || !slug || !destination) return;
      const goingNext = new URL(destination).pathname === new URL(link.href).pathname;
      if (!goingNext) return;
      // After a zoom, the full-screen layer hands over; otherwise the letter window, if it can
      // be seen.
      const source = zoomed && layer && !layer.hidden ? layer : onScreen(win) ? win : null;
      if (!source) return;
      source.style.setProperty('view-transition-name', `case-media-${slug}`);
      source.style.setProperty('view-transition-class', 'case-media');
      // Name the header too, and leave the next case a note (read by Base.astro), so it keeps
      // its header and its title above the growing footage during the change.
      if (headerBar) headerBar.style.setProperty('view-transition-name', 'site-header');
      try {
        sessionStorage.setItem('civic:handoff', new URL(link.href).pathname);
      } catch (error) {
        // Private browsing can refuse storage; the hand-off then skips those two layers.
      }
    };
    window.addEventListener('pageswap', onSwap);
    cleanups.push(() => window.removeEventListener('pageswap', onSwap));

    // ---- 3. Coming back with "Back" ----
    const onShow = (event) => {
      if (!event.persisted) return;
      resetBand();
      if (hero && heroName) hero.style.setProperty('view-transition-name', heroName);
    };
    window.addEventListener('pageshow', onShow);
    cleanups.push(() => window.removeEventListener('pageshow', onShow));

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      resetBand();
      if (hero && heroName) hero.style.setProperty('view-transition-name', heroName);
    };
  },
};
