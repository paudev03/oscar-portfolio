/* ==========================================================================
   OTI dripping logo — scroll-driven hero
   The wordmark is live SVG text (same font as the header). Paint drips are
   separate SVG paths in their own layer, rebuilt from a normalised progress
   value p in [0, 1] derived from the scroll position of the section.
   Same p => same picture: stop scrolling and it holds, scroll up and the
   paint rewinds, back at the top the logo is perfectly clean again.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("drip");
  if (!root) return;

  var svg = root.querySelector("svg");
  var logo = root.querySelector(".drip-logo");
  var paint = root.querySelector(".drip-paint");
  var stage = root.querySelector(".drip-stage");
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* One entry per drip — deliberately irregular.
     ch/fx/dy  glyph of "@oti", position across it, and where its ink edge sits
     s, d      progress at which it starts and how long it takes (viscosity)
     L         fraction of the free space below the logo it will reach
     a         neck half-width (fraction of the type size)
     lean      sideways drift of the bulb, pinch  how much the neck thins mid-way
     elong     how teardrop-shaped the bulb is                                  */
  var DRIPS = [
    { ch: 0, fx: 0.50, dy: 0.115, s: 0.14, d: 0.62, L: 0.82, a: 0.036, lean: -0.10, pinch: 0.62, elong: 1.35 },
    { ch: 0, fx: 0.70, dy: 0.085, s: 0.30, d: 0.46, L: 0.36, a: 0.022, lean: 0.14, pinch: 0.78, elong: 1.10 },
    { ch: 1, fx: 0.48, dy: 0.010, s: 0.20, d: 0.66, L: 0.64, a: 0.040, lean: 0.06, pinch: 0.58, elong: 1.45 },
    { ch: 1, fx: 0.80, dy: -0.055, s: 0.42, d: 0.40, L: 0.26, a: 0.018, lean: -0.16, pinch: 0.84, elong: 1.05 },
    { ch: 2, fx: 0.60, dy: 0.010, s: 0.24, d: 0.70, L: 0.96, a: 0.034, lean: 0.08, pinch: 0.55, elong: 1.5 },
    { ch: 2, fx: 0.80, dy: -0.010, s: 0.50, d: 0.44, L: 0.30, a: 0.020, lean: 0.18, pinch: 0.80, elong: 1.12 },
    { ch: 3, fx: 0.50, dy: 0.010, s: 0.34, d: 0.56, L: 0.52, a: 0.030, lean: -0.08, pinch: 0.66, elong: 1.3 },
    { ch: 1, fx: 0.24, dy: -0.040, s: 0.58, d: 0.38, L: 0.20, a: 0.016, lean: 0.12, pinch: 0.85, elong: 1.0 }
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

  /* ---- one drip ------------------------------------------------------
     A centre line leans slightly sideways; the body narrows from a wide
     root (blended into the letter by fillets) to a pinched middle and
     swells again into an elongated, round-ended bulb. */
  function build(it, p) {
    var c = it.cfg;
    var t = clamp((p - c.s) / c.d, 0, 1);
    var g = smooth(0, 0.16, t);                          // a bead first, then it grows
    if (it.skip || g <= 0.002) {
      it.path.removeAttribute("d");
      it.gloss.removeAttribute("d");
      return;
    }
    var S = state.S;
    var a0 = Math.max(3.4, S * c.a);
    var a = a0 * (1 - 0.16 * t) * g;                       // neck half-width
    var r = a0 * (1.25 + 0.7 * smooth(0.1, 0.65, t)) * g;  // bulb radius
    var ry = r * (1 + (c.elong - 1) * smooth(0.15, 0.7, t)); // teardrop elongation
    var f = a * 1.0 + 1;                                   // fillet into the letter
    var e = 0.3 * t + 0.7 * smooth(0, 1, t);               // slow start, quick middle
    var free = Math.max(0, state.avail * c.L - 3 * a0 - ry);
    var L = free * e;

    var yb = state.baseline + S * c.dy;                    // ink bottom of the glyph at this x
    var y0 = yb - S * 0.065;                               // start hidden inside the stroke
    var y1 = yb + f;
    var cyb = y1 + L;                                      // bulb centre (y)
    var y2 = Math.max(y1 + 1, cyb - ry * 0.95);            // where the neck meets the bulb
    var ym = (y1 + y2) / 2;

    var x0 = it.cx;
    var lean = c.lean * Math.min(1, L / (S * 0.8)) * S * 0.12;   // total sideways drift at the tip
    var xm = x0 + lean * 0.35;
    var x1 = x0 + lean;                                    // bulb centre (x)
    var wTop = a * 1.35, wMid = a * c.pinch, wEnd = a;
    var dy1 = (ym - y1) * 0.55, dy2 = (y2 - ym) * 0.55;
    var k = 0.552;

    var d =
      "M" + (x0 - wTop - f) + "," + y0 +
      "C" + (x0 - wTop - f * 0.35) + "," + y0 + " " + (x0 - wTop) + "," + (yb - f * 0.2) + " " + (x0 - wTop) + "," + y1 +
      "C" + (x0 - wTop) + "," + (y1 + dy1) + " " + (xm - wMid) + "," + (ym - dy1) + " " + (xm - wMid) + "," + ym +
      "C" + (xm - wMid) + "," + (ym + dy2) + " " + (x1 - wEnd) + "," + (y2 - dy2) + " " + (x1 - wEnd) + "," + y2 +
      "C" + (x1 - wEnd) + "," + (y2 + ry * 0.45) + " " + (x1 - r) + "," + (cyb - ry * 0.35) + " " + (x1 - r) + "," + cyb +
      "C" + (x1 - r) + "," + (cyb + ry * k) + " " + (x1 - r * k) + "," + (cyb + ry) + " " + x1 + "," + (cyb + ry) +
      "C" + (x1 + r * k) + "," + (cyb + ry) + " " + (x1 + r) + "," + (cyb + ry * k) + " " + (x1 + r) + "," + cyb +
      "C" + (x1 + r) + "," + (cyb - ry * 0.35) + " " + (x1 + wEnd) + "," + (y2 + ry * 0.45) + " " + (x1 + wEnd) + "," + y2 +
      "C" + (x1 + wEnd) + "," + (y2 - dy2) + " " + (xm + wMid) + "," + (ym + dy2) + " " + (xm + wMid) + "," + ym +
      "C" + (xm + wMid) + "," + (ym - dy1) + " " + (x0 + wTop) + "," + (y1 + dy1) + " " + (x0 + wTop) + "," + y1 +
      "C" + (x0 + wTop) + "," + (yb - f * 0.2) + " " + (x0 + wTop + f * 0.35) + "," + y0 + " " + (x0 + wTop + f) + "," + y0 +
      "Z";
    it.path.setAttribute("d", d);

    // soft highlight along the body and bulb: reads as a wet, smooth surface
    if (L > a0 * 3) {
      var gx0 = x0 - wTop * 0.45, gx1 = x1 - r * 0.38;
      it.gloss.setAttribute("d",
        "M" + gx0 + "," + (y1 + f) +
        "C" + gx0 + "," + ym + " " + gx1 + "," + (ym + dy2) + " " + gx1 + "," + (cyb + ry * 0.1));
      it.gloss.setAttribute("stroke-width", String(Math.max(1.5, a * 0.42)));
    } else {
      it.gloss.removeAttribute("d");
    }
  }

  function render() {
    var p = reduce ? 0.72 : clamp((window.pageYOffset - state.top) / state.range, 0, 1);
    if (p === state.p) return;
    state.p = p;
    for (var i = 0; i < items.length; i++) build(items[i], p);
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
