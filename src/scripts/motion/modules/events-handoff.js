// events-handoff.js: the photo hand-off between pages. A frame showing an event's cover photo (on
// /events/, and the home page's "Latest event" teaser) grows into that event page's cover when it
// is clicked.
//
// Asked for with:
//   data-event-handoff="<slug>"    on a frame that shows an event's cover photo (the source)
//   data-events-cover-media        on the event page's cover frame (the destination), which is
//                                  always named "event-media-<slug>" in its HTML
//
// How it works (browsers that animate between pages: Chrome, Edge, Safari 18.2+):
//   1. Leaving a page. Just before the browser swaps pages (the "pageswap" moment), if the visitor
//      is going to /events/<slug>/ and a frame marked data-event-handoff="<slug>" is at least a
//      fifth on screen, that frame is given the same name as the cover it is going to
//      ("event-media-<slug>"). The browser then moves and resizes the picture into the cover
//      instead of playing the usual new-sheet page change (the look is in src/styles/events.css:
//      only the photo flies; the two pages fade under it). The event page is left a note
//      ("civic:handoff" in the browser's session storage). Base.astro reads the note when the
//      page arrives and marks it "vt-handoff" and data-arrived="handoff", so the cover's ink
//      bands don't play over a photo that arrived already open (events-cover.js).
//      Where the visitor is going comes from the browser's own record of the page change. Safari
//      doesn't give that record yet, so a plain click on an event link also notes its address,
//      and that note is used when the record is missing.
//   2. Leaving an event page. The cover gives up its name at the same moment, so it never flies
//      across the screen towards the next page.
//   3. Coming back with "Back". Browsers keep recently left pages ready in memory; when the
//      visitor returns, the names given above are taken off again and the cover's name is restored.
// Firefox today: a plain page change. With Motion off there are no page-change animations at
// all (Base.astro), and this module doesn't run.

import { onScreen } from '../helpers/events-shared.js';

export default {
  name: 'events-handoff',
  init() {
    const sources = [...document.querySelectorAll('[data-event-handoff]')];
    const cover = document.querySelector('[data-events-cover-media]');
    if (!sources.length && !cover) return undefined; // nothing to hand over on this page

    // The cover's own name, remembered so it can be given back after "Back".
    const coverName = cover ? cover.style.getPropertyValue('view-transition-name') : '';
    const coverClass = cover ? cover.style.getPropertyValue('view-transition-class') : '';

    // Everything this module named for a page change, so it can be taken off again.
    let named = [];
    const clearNames = () => {
      named.forEach((el) => {
        el.style.removeProperty('view-transition-name');
        el.style.removeProperty('view-transition-class');
      });
      named = [];
    };
    const restoreCover = () => {
      if (!cover || !coverName) return;
      cover.style.setProperty('view-transition-name', coverName);
      if (coverClass) cover.style.setProperty('view-transition-class', coverClass);
    };

    // The address of the event link the visitor last clicked (a plain click only: a click with
    // Cmd, Ctrl, Shift or the middle button opens another tab and this page stays). Used when the
    // browser doesn't say where the page change is going (Safari).
    let clicked = '';
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[data-event-link]') : null;
      if (!link || link.target) return;
      clicked = new URL(link.href, window.location.href).pathname;
    };
    document.addEventListener('click', onClick);

    // ---- 1 and 2. Just before the page swap ----
    const onSwap = (event) => {
      if (!event.viewTransition) return;
      // An event page's cover never flies towards the next page.
      if (cover) cover.style.setProperty('view-transition-name', 'none');
      const url = event.activation?.entry?.url;
      const destination = url ? new URL(url).pathname : clicked;
      clicked = '';
      if (!destination) return;
      // The first source for the destination's event that can be seen gets the cover's name.
      const source = sources.find((el) => {
        const slug = el.getAttribute('data-event-handoff');
        return slug && destination === `/events/${slug}/` && onScreen(el, 0.2);
      });
      if (!source) return;
      const slug = source.getAttribute('data-event-handoff');
      source.style.setProperty('view-transition-name', `event-media-${slug}`);
      source.style.setProperty('view-transition-class', 'event-media');
      named.push(source);
      // Leave the event page its note (Base.astro reads it as the page arrives).
      try {
        sessionStorage.setItem('civic:handoff', destination);
      } catch (error) {
        // Private browsing can refuse storage; the cover's bands then play over the photo.
      }
    };
    window.addEventListener('pageswap', onSwap);

    // ---- 3. Coming back with "Back" ----
    const onShow = (event) => {
      if (!event.persisted) return;
      clicked = '';
      clearNames();
      restoreCover();
    };
    window.addEventListener('pageshow', onShow);

    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('pageswap', onSwap);
      window.removeEventListener('pageshow', onShow);
      clearNames();
      restoreCover();
    };
  },
};
