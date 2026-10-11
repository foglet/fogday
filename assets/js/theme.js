/* Fogday Studios — light/dark toggle.
   No saved choice: the site follows the visitor's system setting.
   After a click: the choice is saved and wins on every page. */
(function () {
  var KEY = 'fogday-theme';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function current() {
    return root.dataset.theme || (media.matches ? 'dark' : 'light');
  }

  function sync(btn) {
    var dark = current() === 'dark';
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = btn.getAttribute('aria-label');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    sync(btn);
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (e) {}
      sync(btn);
    });
    media.addEventListener('change', function () { sync(btn); });
  });
})();
