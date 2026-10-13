/* Fogday Studios — light/dark toggle, plus random header colors.
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

  /* ---- Random colors ----
     One random hue per pick. The logo and bento menu share it (their hover/tap color);
     the Works title gets the complementary hue (opposite side of the color wheel).
     A new pick happens on page load and on every hover or tap of the logo or bento.
     Saturation is fixed and lightness is adjusted until the color is easy to see
     on the page background (at least 3:1 contrast), so nothing comes out gray or faint. */
  var BG = { light: '#edf1f2', dark: '#16202a' }; /* must match --bg in fogday.css */
  var hue = 0;

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var a = s * Math.min(l, 1 - l);
    function f(n) {
      var k = (n + h / 30) % 12;
      var c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * c).toString(16).padStart(2, '0');
    }
    return '#' + f(0) + f(8) + f(4);
  }

  function luminance(hex) {
    var rgb = [1, 3, 5].map(function (i) {
      var c = parseInt(hex.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrast(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* Start at a vivid lightness, then darken (light mode) or lighten (dark mode)
     in small steps until the color stands out against the background. */
  function colorFor(h, tries) {
    tries = tries || 0;
    var dark = current() === 'dark';
    var bg = dark ? BG.dark : BG.light;
    var l = dark ? 65 : 45;
    var hex = hslToHex(h, 85, l);
    while (contrast(hex, bg) < 3 && l > 15 && l < 90) {
      l += dark ? 2 : -2;
      hex = hslToHex(h, 85, l);
    }
    /* Hard rule: never the dark-theme navy, or anything close to it, in either theme.
       (Today the nearest any hue gets is 1.61:1, bright blue #1111d4.) If a future
       tweak breaks that, shift the hue and try again. */
    if (contrast(hex, BG.dark) < 1.5 && tries < 12) return colorFor((h + 30) % 360, tries + 1);
    return hex;
  }

  function applyColors() {
    var main = colorFor(hue);
    var comp = colorFor((hue + 180) % 360);
    var logo = document.querySelector('.logo');
    var bento = document.querySelector('.bento');
    var title = document.querySelector('.works-title h2');
    if (logo) logo.style.setProperty('--accent', main); /* logo hover color */
    if (bento) bento.style.setProperty('--hot', main);  /* bento hover color */
    if (title) title.style.color = comp;
  }

  function newPick() {
    hue = Math.floor(Math.random() * 360);
    applyColors();
  }

  document.addEventListener('DOMContentLoaded', function () {
    newPick();
    ['.logo', '.bento'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      el.addEventListener('pointerenter', newPick); /* mouse hover */
      el.addEventListener('pointerdown', newPick);  /* tap or click */
    });

    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    sync(btn);
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (e) {}
      sync(btn);
      applyColors(); /* same hues, re-tuned for the new background */
    });
    media.addEventListener('change', function () { sync(btn); applyColors(); });
  });
})();
