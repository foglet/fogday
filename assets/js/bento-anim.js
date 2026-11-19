/* Fogday Studios — bento (Projects) icon: a new color and a new animation on every page load.
   Load after theme.js, with defer (see _includes/head.html). theme.js turns the bento's solid fill
   into a gradient on DOMContentLoaded; this script then adds a midpoint stop, sets its own random
   colors (these win over theme.js's shared logo/bento --g1/--g2) and animates the 9 tiles.
   Color: dark mode mostly in the site's green-blue range (WILD = share of any-hue loads);
   light mode a mixed two-hue gradient. Animates on load, hover and tap.
   Visitors with "reduce motion" on get the colors but no animation.                              */
(function () {
  var MODE = "mix";          // "shuffle" = a random preset | "generate" = brand-new params | "mix" = either, 50/50
  var PLAY_ON_LOAD = true;   // play once when the page opens
  var WILD = 0.2;            // dark mode: share of loads that leave the site's green-blue range

  // A preset is just a fixed set of generator params.
  var PRESETS = {
    ripple:    { move: "pulse",   origin: [1, 1],   metric: "square", step: 80, dur: 500,  amp: 0.4 },
    gather:    { move: "pull",    origin: [1, 1],   metric: "square", step: 0,  dur: 600,  amp: 2.5 },
    heartbeat: { move: "pulse",   origin: [1, 1],   metric: "square", step: 40, dur: 800,  amp: 0.55, beats: 2 },
    breathe:   { move: "breathe", origin: [1, 1],   metric: "circle", step: 35, dur: 1100, amp: 1.35 },
    ping:      { move: "blink",   origin: [1, 1],   metric: "circle", step: 90, dur: 450,  amp: 0.15 },
    bloom:     { move: "push",    origin: [1, 1],   metric: "square", step: 0,  dur: 650,  amp: 2 },
    magnet:    { move: "pull",    origin: "random", metric: "circle", step: 45, dur: 600,  amp: 2.5 }
  };

  var R = Math.random;
  function pick(a) { return a[(R() * a.length) | 0]; }
  function between(a, b) { return +(a + R() * (b - a)).toFixed(2); }
  function randomOrigin() { return [between(0, 2), between(0, 2)]; }

  // Brand-new params, like the random gradients.
  function generate() {
    var move = pick(["pulse", "pulse", "pull", "pull", "push", "breathe", "blink", "twist"]);
    var p = {
      move: move,
      origin: R() < 0.4 ? [1, 1] : randomOrigin(),
      metric: pick(["circle", "square", "diamond"]),
      step: (between(35, 95)) | 0,
      dur: (between(420, 650)) | 0
    };
    if (move === "pulse")   { p.amp = between(0.35, 0.7); if (R() < 0.25) { p.beats = 2; p.dur += 250; } }
    if (move === "pull")    p.amp = between(1.6, 3);
    if (move === "push")    p.amp = between(1.2, 2.2);
    if (move === "breathe") { p.amp = between(1.15, 1.4); p.dur = (between(850, 1150)) | 0; p.step = (p.step / 2) | 0; }
    if (move === "blink")   p.amp = between(0.1, 0.35);
    if (move === "twist")   p.amp = pick([90, -90, 180]);
    return p;
  }

  function keyframes(p) {
    var a = p.amp;
    switch (p.move) {
      case "pulse":
        return p.beats === 2
          ? "0%,100%{transform:scale(1)}18%{transform:scale(" + a + ")}34%{transform:scale(1.1)}48%{transform:scale(1)}" +
            "62%{transform:scale(" + (1 - (1 - a) * 0.5).toFixed(2) + ")}80%{transform:scale(1.06)}"
          : "0%,100%{transform:scale(1)}35%{transform:scale(" + a + ")}70%{transform:scale(1.12)}";
      case "pull":
      case "push":
        return "0%,100%{transform:translate(0,0)}" +
          "45%{transform:translate(var(--dx),var(--dy))" + (p.move === "push" ? " scale(.85)" : "") + "}" +
          "75%{transform:translate(calc(var(--dx)*-.35),calc(var(--dy)*-.35))}";
      case "breathe":
        return "0%,100%{transform:scale(1)}50%{transform:scale(" + a + ")}";
      case "blink":
        return "0%,100%{opacity:1;transform:scale(1)}40%{opacity:" + a + ";transform:scale(.8)}";
      case "twist":
        return "0%{transform:rotate(0) scale(1)}50%{transform:rotate(" + a / 2 + "deg) scale(.7)}100%{transform:rotate(" + a + "deg) scale(1)}";
    }
  }

  var EASE = { breathe: "ease-in-out", twist: "ease-in-out", blink: "ease-out" };

  // Turn params into CSS for one selector. Returns { css, total } (total = ms incl. stagger).
  function build(p, sel, name) {
    var o = p.origin === "random" ? randomOrigin() : p.origin;
    var dist = {
      circle:  function (x, y) { return Math.sqrt(x * x + y * y); },
      square:  function (x, y) { return Math.max(Math.abs(x), Math.abs(y)); },
      diamond: function (x, y) { return Math.abs(x) + Math.abs(y); }
    }[p.metric];
    var tiles = [], reach = 0, maxDelay = 0, i;
    for (i = 0; i < 9; i++) {
      var dx = (i % 3) - o[0], dy = ((i / 3) | 0) - o[1];
      tiles.push([dx, dy]);
      reach = Math.max(reach, Math.abs(dx), Math.abs(dy));
    }
    var on = sel + ":hover rect," + sel + ".go rect";
    var css = sel + " rect{transform-box:fill-box;transform-origin:center}\n" +
      "@keyframes " + name + "{" + keyframes(p) + "}\n" +
      on + "{animation:" + name + " " + p.dur + "ms " + (EASE[p.move] || "cubic-bezier(.3,0,.3,1)") + " both}\n";
    for (i = 0; i < 9; i++) {
      var t = tiles[i], d = Math.round(dist(t[0], t[1]) * p.step);
      maxDelay = Math.max(maxDelay, d);
      // pull = toward origin, push = away; scaled so the farthest tile moves `amp` px
      var k = (p.move === "pull" ? -1 : 1) * (p.amp || 0) / (reach || 1);
      var n = ":nth-child(" + (i + 1) + ")";
      css += sel + ":hover rect" + n + "," + sel + ".go rect" + n +
        "{animation-delay:" + d + "ms;--dx:" + (t[0] * k).toFixed(2) + "px;--dy:" + (t[1] * k).toFixed(2) + "px}\n";
    }
    css += "@media (prefers-reduced-motion:reduce){" + sel + " rect{animation:none!important}}\n";
    return { css: css, total: p.dur + maxDelay, origin: o };
  }


  // ---- color ----
  // OKLCH -> sRGB hex, lowering chroma until it fits the screen gamut (no clipped, off-hue colors)
  function hex(L, C, H) {
    for (var c = C; c >= 0; c -= 0.005) {
      var h = H * Math.PI / 180, a = c * Math.cos(h), b = c * Math.sin(h);
      var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3),
          m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3),
          s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
      var rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
      if (rgb.every(function (v) { return v >= -0.0005 && v <= 1.0005; }))
        return "#" + rgb.map(function (v) {
          v = Math.min(1, Math.max(0, v));
          v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
          return ("0" + Math.round(v * 255).toString(16)).slice(-2);
        }).join("");
    }
  }
  // Dark: mostly the site's range (hue 155-260: the green #5af2ae to the blue #5a9ef2), bright.
  // Light: a mixed gradient, two hues far apart, deep enough to read on the light background.
  // Each gradient gets a midpoint mixed in OKLCH, so distant hues don't turn gray in the middle.
  var OLIVE = [70, 140];     // yellow-greens go muddy at light-mode depth: skip them there
  function olive(h) { h = norm(h); return h > OLIVE[0] && h < OLIVE[1]; }
  function ramp(h1, h2, L1, L2, C, avoid) {
    var d = ((norm(h2) - norm(h1) + 540) % 360) - 180, mid = h1 + d / 2;   // shortest way round
    if (avoid && olive(mid)) mid += 180;                                    // ...unless it passes through olive
    return [hex(L1, C, h1), hex((L1 + L2) / 2, C + 0.02, mid), hex(L2, C, h2)];
  }
  function colors() {
    var wild = R() < WILD, h1, h2, l1, l2;
    if (wild) { h1 = between(0, 360); h2 = h1 + (R() < 0.5 ? -1 : 1) * between(40, 110); }
    else { h1 = between(155, 260); do { h2 = between(150, 265); } while (Math.abs(h2 - h1) < 45); }
    do { l1 = between(0, 360); } while (olive(l1));
    do { l2 = l1 + (R() < 0.5 ? -1 : 1) * between(90, 170); } while (olive(l2));
    return {
      dark:  ramp(h1, h2, between(0.78, 0.88), between(0.68, 0.8), between(0.12, 0.16), false),
      light: ramp(l1, l2, between(0.55, 0.63), between(0.5, 0.58), between(0.16, 0.2), true),
      wild: wild, hues: { dark: [h1, h2].map(norm), light: [l1, l2].map(norm) }
    };
  }
  function norm(h) { return Math.round(((h % 360) + 360) % 360); }

  // CSS that colors the icon for one theme (beats the site's hover / .lit rules)
  function colorCSS(scope, sel, pair) {
    var s = ["", ":hover", ".lit"];
    return ["g1", "g3", "g2"].map(function (g, i) {
      return s.map(function (x) { return scope + " " + sel + x + " ." + g; }).join(",") + "{stop-color:" + pair[i] + "}";
    }).join("\n") + "\n";
  }
  // add the midpoint stop (class g3) to each bento gradient, once
  function addMidStop(root) {
    root.querySelectorAll("linearGradient").forEach(function (g) {
      if (g.querySelector(".g3")) return;
      var st = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      st.setAttribute("offset", ".5"); st.setAttribute("class", "g3");
      g.insertBefore(st, g.querySelector(".g2"));
    });
  }

  function play(el, total) {
    el.classList.remove("go");
    void el.getBoundingClientRect();     // restart
    el.classList.add("go");
    clearTimeout(el._bento);
    el._bento = setTimeout(function () { el.classList.remove("go"); }, total + 60);
  }

  function choose() {
    var shuffle = MODE === "shuffle" || (MODE === "mix" && R() < 0.5);
    if (shuffle) { var key = pick(Object.keys(PRESETS)); return { name: key, params: PRESETS[key] }; }
    return { name: "generated", params: generate() };
  }

  window.BentoAnim = { PRESETS: PRESETS, generate: generate, build: build, play: play, choose: choose, colors: colors, colorCSS: colorCSS, addMidStop: addMidStop };
  if (window.BENTO_DEMO) return;

  // ---- site wiring ----
  document.addEventListener("DOMContentLoaded", function () {   // after theme.js has added the gradient
    var icons = document.querySelectorAll(".bento");
    if (!icons.length) return;
    var choice = choose();
    var out = build(choice.params, ".bento", "bento-" + ((R() * 1e6) | 0));
    var col = colors();
    var style = document.createElement("style");
    style.textContent = out.css +
      colorCSS(":root", ".bento", col.light) +
      colorCSS(':root[data-theme="dark"]', ".bento", col.dark) +
      "@media (prefers-color-scheme:dark){" + colorCSS(':root:not([data-theme="light"])', ".bento", col.dark) + "}\n";
    document.head.appendChild(style);
    icons.forEach(function (el) {
      addMidStop(el);
      el.addEventListener("touchstart", function () { play(el, out.total); }, { passive: true });
      if (PLAY_ON_LOAD) setTimeout(function () { play(el, out.total); }, 400);
    });
  });
})();
