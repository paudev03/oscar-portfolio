/* ==========================================================================
   OTI dripping logo — scroll-driven
   The wordmark is live SVG text (same font as the header). Paint drips are
   separate SVG paths in their own layer, rebuilt from a normalised progress
   value p in [0, 1] that is derived from the scroll position of the section.
   Same p => same picture, so scrolling back up rewinds the paint exactly.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("drip");
  if (!root) return;

  var svg = root.querySelector("svg");
  var logo = root.querySelector(".drip-logo");
  var paint = root.querySelector(".drip-paint");
  var cue = root.querySelector(".drip-cue");
  var stage = root.querySelector(".drip-stage");
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* One entry per drip. ch = glyph of "@oti", fx = position across that glyph,
     s = progress at which it starts, d = how long it takes (viscosity),
     L = fraction of the free space below the logo it will reach, a = neck width
     (fraction of the type size). Deliberately irregular. */
  var DRIPS = [
    { ch: 0, fx: 0.50, dy: 0.115, s: 0.05, d: 0.52, L: 0.80, a: 0.036 },
    { ch: 0, fx: 0.70, dy: 0.085, s: 0.24, d: 0.36, L: 0.36, a: 0.022 },
    { ch: 1, fx: 0.48, dy: 0.010, s: 0.10, d: 0.58, L: 0.62, a: 0.040 },
    { ch: 1, fx: 0.80, dy: -0.055, s: 0.36, d: 0.32, L: 0.26, a: 0.018 },
    { ch: 2, fx: 0.60, dy: 0.010, s: 0.16, d: 0.62, L: 0.95, a: 0.034 },
    { ch: 2, fx: 0.80, dy: -0.010, s: 0.44, d: 0.38, L: 0.30, a: 0.020 },
    { ch: 3, fx: 0.50, dy: 0.010, s: 0.28, d: 0.46, L: 0.50, a: 0.030 },
    { ch: 1, fx: 0.24, dy: -0.040, s: 0.52, d: 0.34, L: 0.20, a: 0.016 }
  ];
  var MOBILE_SKIP = { 5: 1, 7: 1 };       // fewer drips on small screens

  var items = [];
  DRIPS.forEach(function (cfg) {
    var path = document.createElementNS(NS, "path");
    var gloss = document.createElementNS(NS, "path");
    gloss.setAttribute("class", "drip-gloss");
    paint.appendChild(path);
    paint.appendChild(gloss);
    items.push({ cfg: cfg, path: path, gloss: gloss });
  });

  var state = { w: 0, h: 0, S: 0, baseline: 0, avail: 0, top: 0, range: 1, p: -1, mobile: false };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, v) {
    var t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* ---- geometry: measured from the real rendered glyphs ---- */
  function layout() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    state.w = w; state.h = h;
    state.mobile = w < 720;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);

    logo.setAttribute("font-size", "100");
    logo.setAttribute("x", "0");
    logo.setAttribute("y", "0");
    var len = logo.getComputedTextLength() || 260;
    var target = w * (w / h < 0.8 ? 0.8 : 0.5);
    var S = 100 * target / len;
    var baseline = h * 0.44 + S * 0.34;
    logo.setAttribute("font-size", String(S));
    logo.setAttribute("x", String((w - target) / 2));
    logo.setAttribute("y", String(baseline));

    state.S = S;
    state.baseline = baseline;
    state.avail = Math.max(60, h - baseline - h * 0.07);

    items.forEach(function (it, i) {
      var ext;
      try { ext = logo.getExtentOfChar(it.cfg.ch); } catch (e) { ext = null; }
      if (!ext) ext = { x: (w - target) / 2 + target * (it.cfg.ch + 0.5) / 4, width: target / 4 };
      it.cx = ext.x + ext.width * it.cfg.fx;
      it.skip = state.mobile && MOBILE_SKIP[i];
    });
    measureScroll();
    state.p = -1;
    render();
  }

  function measureScroll() {
    var r = root.getBoundingClientRect();
    state.top = r.top + window.pageYOffset;
    state.range = Math.max(1, root.offsetHeight - window.innerHeight);
  }

  /* ---- one drip: a neck with fillets into the letter and a round bulb ---- */
  function build(it, p) {
    var c = it.cfg;
    var t = clamp((p - c.s) / c.d, 0, 1);
    var g = smooth(0, 0.14, t);
    if (it.skip || g <= 0.002) {
      it.path.removeAttribute("d");
      it.gloss.removeAttribute("d");
      return;
    }
    var S = state.S;
    var a0 = Math.max(3.4, S * c.a);
    var a = a0 * (1 - 0.18 * t) * g;                       // neck thins as it stretches
    var r = a0 * (1.25 + 0.7 * smooth(0.1, 0.65, t)) * g; // bulb swells at the tip
    var aTop = a * 1.35;                                  // wider where it leaves the letter
    var f = a * 1.0 + 1;                                  // fillet into the letter
    var e = 0.35 * t + 0.65 * smooth(0, 1, t);            // slow start, quick middle
    var free = Math.max(0, state.avail * c.L - 3 * a0);
    var L = free * e;

    var cx = it.cx;
    var yb = state.baseline + S * c.dy;                   // ink bottom of the glyph at this x
    var y0 = yb - S * 0.065;                              // start hidden inside the stroke
    var cyb = yb + f + L;                                 // bulb centre
    var k = 0.552 * r;

    var d =
      "M" + (cx - aTop - f) + "," + y0 +
      "C" + (cx - aTop - f * 0.35) + "," + y0 + " " + (cx - aTop) + "," + (yb - f * 0.2) + " " + (cx - aTop) + "," + (yb + f) +
      "L" + (cx - a) + "," + (cyb - r * 1.15) +
      "C" + (cx - a) + "," + (cyb - r * 0.45) + " " + (cx - r) + "," + (cyb - r * 0.75) + " " + (cx - r) + "," + cyb +
      "C" + (cx - r) + "," + (cyb + k) + " " + (cx - k) + "," + (cyb + r) + " " + cx + "," + (cyb + r) +
      "C" + (cx + k) + "," + (cyb + r) + " " + (cx + r) + "," + (cyb + k) + " " + (cx + r) + "," + cyb +
      "C" + (cx + r) + "," + (cyb - r * 0.75) + " " + (cx + a) + "," + (cyb - r * 0.45) + " " + (cx + a) + "," + (cyb - r * 1.15) +
      "L" + (cx + aTop) + "," + (yb + f) +
      "C" + (cx + aTop) + "," + (yb - f * 0.2) + " " + (cx + aTop + f * 0.35) + "," + y0 + " " + (cx + aTop + f) + "," + y0 +
      "Z";
    it.path.setAttribute("d", d);

    // soft highlight along the neck + bulb: reads as a wet, smooth surface
    if (L > a0 * 3) {
      var gx = cx - r * 0.38;
      it.gloss.setAttribute("d", "M" + gx + "," + (yb + f * 2) + "L" + gx + "," + (cyb + r * 0.15));
      it.gloss.setAttribute("stroke-width", String(Math.max(1.5, a * 0.45)));
    } else {
      it.gloss.removeAttribute("d");
    }
  }

  function render() {
    var p = reduce ? 0.72 : clamp((window.pageYOffset - state.top) / state.range, 0, 1);
    if (p === state.p) return;
    state.p = p;
    for (var i = 0; i < items.length; i++) build(items[i], p);
    if (cue) cue.style.opacity = String(1 - smooth(0.02, 0.1, p));
  }

  /* ---- scroll: one rAF-coalesced update, no layout reads inside it ---- */
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    var run = function () { if (!queued) return; queued = false; render(); };
    window.requestAnimationFrame(run);
    setTimeout(run, 60);                 // safety net if frames are paused
  }

  function start() {
    if (reduce) { root.classList.add("drip--static"); }
    layout();
    if (reduce) return;
    window.addEventListener("scroll", onScroll, { passive: true });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(layout, 80);
    });
    window.addEventListener("load", layout);
  }

  var ready = document.fonts && document.fonts.load
    ? document.fonts.load('700 100px "Archivo"').catch(function () {})
    : Promise.resolve();
  ready.then(function () {
    if (document.fonts && document.fonts.ready) return document.fonts.ready;
  }).then(start, start);
})();
