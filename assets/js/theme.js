/* Fogday Studios — light/dark toggle, random warming-stripes top bar, plus random header colors.
   No saved choice: the site follows the visitor's system setting.
   After a click: the choice is saved and wins on every page. */
(function () {
  var KEY = 'fogday-theme';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  /* ---- Random warming stripes ----
     Every page load picks one place at random and puts its class on <html>
     (e.g. class="stripes-paris"); fogday.css draws that place's stripes as the top bar.
     It never repeats the place from the previous page in this tab, so clicking around
     always changes the bar. Runs first, before anything else, so the default sky-blue
     bar shows as briefly as possible. Without JavaScript the sky-blue bar stays.
     To add a place: add its stripes block to fogday.css and its name here. */
  var STRIPES = ['hawaii', 'paris', 'naples', 'san-diego', 'seattle', 'vancouver', 'san-francisco'];
  (function pickStripes() {
    var last = null;
    try { last = sessionStorage.getItem('fogday-stripes'); } catch (e) {}
    var choices = STRIPES.filter(function (s) { return s !== last; });
    var place = choices[Math.floor(Math.random() * choices.length)];
    root.classList.add('stripes-' + place);
    root.dataset.stripes = place; /* handy for checking which one is showing */
    try { sessionStorage.setItem('fogday-stripes', place); } catch (e) {}
  })();

  function current() {
    return root.dataset.theme || (media.matches ? 'dark' : 'light');
  }

  function sync(btn) {
    var dark = current() === 'dark';
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = btn.getAttribute('aria-label');
  }

  /* ---- Random colors (logo and bento menu only) ----
     The Works title and top bar use one fixed sky-blue gradient, set in fogday.css.
     Two palettes for the logo/bento. A page picks one with <body data-palette="...">;
     no attribute = the default.

     Default (greens and blues): the logo and bento share a two-color gradient,
     a random 60° slice of the band HUE_LO (green) to HUE_HI (blue), like green → teal.

     data-palette="blue-yellow" (e.g. /okay/): a short gradient from either the blue or the
     gold-yellow family (coin flip on every pick). Each gradient stays inside one family,
     because a single blue → yellow gradient goes muddy gray in the middle.

     A new pick happens on page load and on every hover or tap of the logo, bento or Works title.
     The fade-in itself is CSS (fogday.css, "Random gradient").
     Saturation is fixed and lightness is adjusted until the color is easy to see
     on the page background (at least 3:1 contrast), so nothing comes out gray or faint.
     (On the light background that turns yellow into a deeper gold; dark mode keeps it bright.) */
  var HUE_LO = 100;  /* green */
  var HUE_HI = 230;  /* blue */
  var SPAN = 60;     /* width of the gradient, in degrees */
  var FAMILIES = {   /* blue-yellow palette: [lowest hue, highest hue] of each family, per theme */
    blue:   { light: [200, 232], dark: [200, 232] },
    /* Yellow needs a narrower band in light mode: darkened enough to read on the pale background,
       hues past ~46 turn olive (54 → #92850c), while 34–46 stay gold (38 → #b87a0f). */
    yellow: { light: [34, 46],   dark: [38, 54] }  /* 34 = amber-gold, 54 = yellow */
  };
  var FAMILY_SPAN = 10; /* width of each gradient inside a family; must fit the narrowest band */
  var BG = { light: '#edf1f2', dark: '#16202a' }; /* must match --bg in fogday.css */
  var hue = HUE_LO;
  var pick = null;   /* blue-yellow palette: which family the logo gets, and where its slice sits (0–1) */

  function palette() {
    return (document.body && document.body.dataset.palette) || 'default';
  }

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
       (No hue in either palette comes near it today.) If a future tweak breaks that,
       shift the hue 30° away from deep blue, toward cyan, and try again. */
    if (contrast(hex, BG.dark) < 1.5 && tries < 12) return colorFor((h + 330) % 360, tries + 1);
    return hex;
  }

  function applyColors() {
    var g1, g2;
    if (pick) {                                                  /* blue-yellow palette */
      var logo = slice(pick.family, pick.pos);
      g1 = logo[0]; g2 = logo[1];
    } else {                                                     /* default: greens and blues */
      g1 = hue; g2 = hue + SPAN;
    }
    root.style.setProperty('--g1', colorFor(g1));  /* logo/bento gradient start */
    root.style.setProperty('--g2', colorFor(g2));  /* logo/bento gradient end */
  }

  /* The slice of a family at position pos (0 = low end, 1 = high end) of this theme's band:
     [start, end], FAMILY_SPAN wide. Kept as a position so a theme switch re-tunes the same pick. */
  function slice(family, pos) {
    var band = FAMILIES[family][current()];
    var start = band[0] + pos * (band[1] - band[0] - FAMILY_SPAN);
    return [start, start + FAMILY_SPAN];
  }

  function newPick() {
    if (palette() === 'blue-yellow') {
      pick = {
        family: Math.random() < 0.5 ? 'yellow' : 'blue', /* coin flip: which family the logo gets */
        pos: Math.random()
      };
    } else {
      /* Gradient start: anywhere the full 60° slice fits in the band */
      pick = null;
      hue = HUE_LO + Math.random() * (HUE_HI - SPAN - HUE_LO);
    }
    applyColors();
  }

  /* Swap the bento's solid fill for a gradient the CSS can fade in */
  function addBentoGradient(bento) {
    var svg = bento.querySelector('svg');
    var g = svg && svg.querySelector('g');
    if (!g) return;
    var NS = 'http://www.w3.org/2000/svg';
    var defs = document.createElementNS(NS, 'defs');
    var grad = document.createElementNS(NS, 'linearGradient');
    grad.id = 'bento-grad';
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', '2'); grad.setAttribute('y1', '2');
    grad.setAttribute('x2', '22'); grad.setAttribute('y2', '22'); /* top-left → bottom-right */
    ['g1', 'g2'].forEach(function (cls, i) {
      var stop = document.createElementNS(NS, 'stop');
      stop.setAttribute('offset', i ? '1' : '0');
      stop.setAttribute('class', cls);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
    svg.insertBefore(defs, svg.firstChild);
    g.setAttribute('fill', 'url(#bento-grad)');
  }

  /* Sun icon (shown in dark mode): drifts on its own through sun colors, yellow to orange.
     Hue 25–55°, kept bright. Every 10 seconds a new shade, blended over 1.5s by the CSS
     transition in fogday.css. Visitors who turn on "reduce motion" get one shade per page, no drifting. */
  function sunColor() {
    var h = 25 + Math.random() * 30;  /* 25 = orange, 55 = yellow */
    var s = 90 + Math.random() * 10;
    var l = 55 + Math.random() * 12;
    var hex = hslToHex(h, s, l);
    while (contrast(hex, BG.dark) < 4.5 && l < 85) { l += 2; hex = hslToHex(h, s, l); }
    return hex;
  }

  function startSun() {
    var sun = document.querySelector('.theme-toggle .icon-sun');
    if (!sun) return;
    function tick() { sun.style.color = sunColor(); }
    tick();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(tick, 10000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    newPick();
    startSun();
    var logo = document.querySelector('.logo');
    var bento = document.querySelector('.bento');
    if (bento) addBentoGradient(bento);

    [logo, bento].forEach(function (el) {
      if (!el) return;
      el.addEventListener('pointerenter', newPick); /* mouse hover */
      el.addEventListener('pointerdown', newPick);  /* tap or click */
    });

    /* Works title: hovering it picks new colors and fades the gradient into the logo and bento;
       moving off fades them back to normal */
    var title = document.querySelector('.works-title h2');
    function lit(on) {
      if (logo) logo.classList.toggle('lit', on);
      if (bento) bento.classList.toggle('lit', on);
    }
    if (title) {
      title.addEventListener('pointerenter', function () { newPick(); lit(true); });
      title.addEventListener('pointerleave', function () { lit(false); });
    }

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
