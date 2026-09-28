// menu.js: opens and closes the phone menu (the full-screen ink panel in Header.astro).
//
// This works with or without the motion system, and uses no animation library: the slide-down
// and the rising links are CSS transitions that start when the page gets the "menu-open" class.
// What this script does, step by step:
//   1. Clicking "Menu" shows the panel, adds "menu-open" (which starts the slide), stops the
//      page underneath from scrolling (both the smooth-scroll code and the page itself), and
//      moves focus into the menu: to the first link when it was opened from the keyboard, or to
//      the menu as a whole when it was opened with a finger or mouse (so no focus ring appears
//      on a link nobody chose yet, but a screen reader still starts inside the menu).
//   2. While open, everything outside the panel and the Close button is made "inert": it can't be
//      clicked, tabbed to or read by screen readers. That keeps the keyboard inside the menu.
//   3. Esc, the Close button, choosing a link, or widening the window closes it again, and focus
//      goes back to the Menu button.

const toggle = document.querySelector('[data-menu-toggle]');
const panel = toggle ? document.getElementById(toggle.getAttribute('aria-controls') || '') : null;
const root = document.documentElement;

if (toggle && panel) {
  // The parts of the page that should be switched off while the menu is open.
  const outside = () => document.querySelectorAll('[data-menu-inert]');
  // The list of links inside the panel. It can take focus from the script (tabindex -1), but
  // it is not a stop when tabbing.
  const menuNav = panel.querySelector('nav');
  if (menuNav) menuNav.setAttribute('tabindex', '-1');
  let open = false;
  let closeTimer = 0;

  // How long the CSS slide takes, read from the page's styles (0 when motion is off), so we
  // hide the panel only after it has finished sliding away.
  const slideTime = () => {
    const seconds = parseFloat(getComputedStyle(panel).transitionDuration) || 0;
    return seconds * 1000;
  };

  // Ask the smooth-scroll code (src/scripts/motion/index.js) to pause or resume scrolling.
  const lockScroll = (locked) =>
    document.dispatchEvent(new CustomEvent('civic:scroll-lock', { detail: { locked } }));

  // Open the menu. "fromKeyboard" is true when Enter or Space pressed the Menu button.
  function openMenu(fromKeyboard = true) {
    if (open) return;
    open = true;
    window.clearTimeout(closeTimer);
    panel.hidden = false;
    // Read the panel's size once so the browser registers its starting position before the
    // class is added; otherwise the slide would not animate.
    void panel.offsetHeight;
    root.classList.add('menu-open');
    // The page itself must not scroll behind the menu either (phones can scroll it even when
    // the smooth-scroll code is paused).
    root.style.overflow = 'hidden';
    toggle.setAttribute('aria-expanded', 'true');
    outside().forEach((el) => el.setAttribute('inert', ''));
    lockScroll(true);
    const first = panel.querySelector('a, button');
    const target = fromKeyboard ? first : menuNav || first;
    if (target) target.focus({ preventScroll: true });
    document.addEventListener('keydown', onKey);
  }

  // Close the menu. "returnFocus" puts the keyboard back on the Menu button.
  function closeMenu(returnFocus = true) {
    if (!open) return;
    open = false;
    root.classList.remove('menu-open');
    root.style.overflow = '';
    toggle.setAttribute('aria-expanded', 'false');
    outside().forEach((el) => el.removeAttribute('inert'));
    lockScroll(false);
    document.removeEventListener('keydown', onKey);
    closeTimer = window.setTimeout(() => {
      if (!open) panel.hidden = true;
    }, slideTime());
    if (returnFocus) toggle.focus({ preventScroll: true });
  }

  // Esc closes the menu, as people expect from any pop-up.
  function onKey(event) {
    if (event.key === 'Escape') closeMenu();
  }

  // A click made with the keyboard (Enter or Space) reports no pointer presses (detail 0).
  toggle.addEventListener('click', (event) => (open ? closeMenu() : openMenu(event.detail === 0)));

  // Choosing a link closes the menu (important for "Cases", which scrolls within the home page).
  panel.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) closeMenu(false);
  });

  // If the window becomes wide enough for the normal header links, close the menu.
  window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu(false);
  });
}
