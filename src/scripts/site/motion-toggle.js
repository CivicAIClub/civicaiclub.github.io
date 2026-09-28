// motion-toggle.js: the "Motion: On / Off" switch in the footer.
//
// Some people find moving pages uncomfortable. Their device may already ask websites for less
// motion (a system setting); if so, the site already stays still and this switch says so and
// can't turn motion back on. Anyone else can switch motion off here. The choice is saved on
// their device (in "localStorage", the browser's small per-site notebook) and read again by the
// first script in Base.astro on every page.
// When the switch changes, this script tells the motion system (src/scripts/motion/index.js)
// and the video player (modules/video.js) by sending a "civic:motion" message on the page.
// It also switches the page-change animation (src/styles/transitions.css) off or back on, so the
// next click on a link follows the choice without a reload.

const KEY = 'civic:motion';
const root = document.documentElement;
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

// Save the visitor's choice. Some browsers block storage (private windows, strict settings);
// then the choice simply lasts until the page is closed.
function save(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch (error) {
    // Nothing to do: the switch still works for this page.
  }
}

// Show the current state on every Motion switch on the page.
function render() {
  const systemOff = reduceQuery.matches;
  const userOff = root.getAttribute('data-motion') === 'off';
  document.querySelectorAll('[data-motion-toggle]').forEach((button) => {
    const state = button.querySelector('[data-motion-state]');
    const note = button.parentElement?.querySelector('[data-motion-note]');
    if (systemOff) {
      // The device setting wins; the switch explains itself instead of doing nothing silently.
      if (state) state.textContent = 'Off (device setting)';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-disabled', 'true');
      if (note) note.textContent = 'Motion is off because your device asks websites for reduced motion.';
    } else {
      if (state) state.textContent = userOff ? 'Off' : 'On';
      button.setAttribute('aria-pressed', userOff ? 'false' : 'true');
      button.removeAttribute('aria-disabled');
      if (note) note.textContent = '';
    }
  });
}

// Switch the page-change animation off or back on. Base.astro writes the on switch into every
// page; a small style tag with the id "vt-off", placed after it, turns it off again. (Base.astro
// adds the same tag when a page opens with Motion already off.)
function setPageChangeAnimation(enabled) {
  const existing = document.getElementById('vt-off');
  if (enabled) {
    if (existing) existing.remove();
  } else if (!existing) {
    const style = document.createElement('style');
    style.id = 'vt-off';
    style.textContent = '@view-transition{navigation:none}';
    document.head.appendChild(style);
  }
}

// Flip motion on or off, remember it, and tell the rest of the site.
function setMotion(enabled) {
  if (enabled) root.removeAttribute('data-motion');
  else root.setAttribute('data-motion', 'off');
  setPageChangeAnimation(enabled);
  save(enabled ? 'on' : 'off');
  render();
  document.dispatchEvent(new CustomEvent('civic:motion', { detail: { enabled } }));
}

document.querySelectorAll('[data-motion-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    if (reduceQuery.matches) return;
    setMotion(root.getAttribute('data-motion') === 'off');
  });
});

// If the device setting changes while the page is open, update the switch's words.
reduceQuery.addEventListener('change', render);
render();
