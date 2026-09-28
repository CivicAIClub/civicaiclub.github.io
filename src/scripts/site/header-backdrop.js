// header-backdrop.js: keeps the header readable while full-screen footage passes under it.
//
// The header (Header.astro) uses a "difference" blend: its light letters turn dark over paper
// and stay light over ink, with no code. Over footage that is neither (a dimmed, mid-grey
// screen recording) the blend gives grey on grey, which nobody can read.
// So, while a piece of edge-to-edge footage marked data-header-solid is under the header, a
// strip of plain ink (the data-header-backdrop element in Header.astro) is shown behind the
// header, cut to exactly the part of the header's height that the footage covers. The header's
// blend then works on ink as usual (light letters). Where the footage ends, the strip ends too,
// so the paper or ink section after it shows through untouched, with no visible seam.
// One exception: when the footage's top edge is inside the header's band (the footage is just
// arriving under the header), the strip reaches all the way up to the top of the header. The
// header's words then sit on plain ink in one piece, instead of half on the footage and half on
// whatever is above it (on the home page, the big CIVIC letters).
// The strip moves with the header when the header slides out of sight on scroll
// (modules/header.js), so it never shows on its own.
//
// Marked today: the home page reel (HomeReel.astro) and each case page's hero footage
// (CaseHero.astro). Only mark footage that runs the full width of the window; the strip always
// runs the full width.
// It works with or without motion (it isn't an animation, it only follows the scroll), so it
// lives here in src/scripts/site/ and uses no animation library. Base.astro loads it.

const strip = document.querySelector('[data-header-backdrop]');
const bar = document.querySelector('[data-header]');

if (strip && bar) {
  let queued = false;

  // Work out how much of the header's height is covered by marked footage right now, and cut
  // the ink strip to match (as a "clip-path": an invisible frame that hides what is outside it).
  const place = () => {
    queued = false;
    const height = bar.offsetHeight;
    let top = height;
    let bottom = 0;
    document.querySelectorAll('[data-header-solid]').forEach((el) => {
      const box = el.getBoundingClientRect();
      // Skip footage that is hidden, or entirely above or below the header.
      if (!box.height || box.bottom <= 0 || box.top >= height) return;
      // The strip always starts at the header's top: footage that covers the top of the band
      // needs it there anyway, and footage whose top edge is still inside the band gets the
      // header's whole top part covered too (see the note at the top of this file).
      top = 0;
      bottom = Math.max(bottom, Math.min(height, box.bottom));
    });
    if (bottom > top) {
      strip.style.clipPath = `inset(${top}px 0 ${height - bottom}px 0)`;
      strip.hidden = false;
    } else {
      strip.hidden = true;
    }
  };

  // Check again on the next frame after anything that can move the footage: scrolling (the
  // smooth scroller scrolls the page too, so this covers it), resizing, and the page's intro.
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(place);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  // Coming back with the Back button can restore a page mid-scroll.
  window.addEventListener('pageshow', queue);
  place();
}
