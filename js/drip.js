/* ==========================================================================
   OTI — LIQUID IDENTITY (hero)
   The wordmark is live SVG text (same font as the header). A hidden canvas
   renders the same text once to read the exact bottom contour of the letters
   (the ink edge per pixel column). Everything liquid is built from that
   contour, in its own SVG layer under the text:

     1. a "curtain": the bottom edge of the letters sags and stretches,
        unevenly per letter, as a continuous mass of paint
     2. drip bodies that grow out of that curtain: teardrop silhouettes with
        pinched necks and leaning, round-ended bulbs
     3. bridges: neighbouring drips join into one continuous form

   The layer is passed through an SVG "goo" filter (blur + alpha threshold),
   so curtain, drips and bridges fuse into one organic silhouette with soft
   connections. The logo itself is never filtered or deformed.

   Everything is a pure function of p in [0, 1] (scroll progress of the hero
   section): stop and it holds, scroll up and it rewinds, at the top the logo
   is perfectly clean.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("drip");
  if (!root) return;

  var svg = root.querySelector("svg");
  var logo = root.querySelector(".drip-logo");
  var paint = root.querySelector(".drip-paint");
  var gooBlur = root.querySelector("#drip-goo feGaussianBlur");
  var gooFilter = root.querySelector("#drip-goo");
  var stage = root.querySelector(".drip-stage");
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var TEXT = "@oti";

  /* Sag amplitude per letter (@, o, t, i): the contour does not melt evenly. */
  var LETTER_AMP = [1.0, 0.55, 0.9, 0.35];

  /* Drips — u is the position across the whole logo (0..1); the exact column is
     snapped to real ink, so every drip is attached to a letter edge.
       s, d   start and duration in progress (viscosity)
       L      share of the free space below the logo it reaches
       a      neck half-width (fraction of the type size)
       lean   sideways drift, pinch  mid-body thinning, elong  teardrop bulb   */
  var DRIPS = [
    { u: 0.10, s: 0.34, d: 0.60, L: 0.70, a: 0.034, lean: -0.16, pinch: 0.60, elong: 1.4 },
    { u: 0.235, s: 0.40, d: 0.50, L: 0.40, a: 0.022, lean: 0.14, pinch: 0.76, elong: 1.1 },
    { u: 0.34, s: 0.30, d: 0.64, L: 0.96, a: 0.040, lean: 0.06, pinch: 0.54, elong: 1.5 },
    { u: 0.49, s: 0.44, d: 0.48, L: 0.34, a: 0.020, lean: -0.18, pinch: 0.82, elong: 1.05 },
    { u: 0.575, s: 0.36, d: 0.58, L: 0.66, a: 0.032, lean: 0.10, pinch: 0.60, elong: 1.35 },
    { u: 0.665, s: 0.52, d: 0.40, L: 0.26, a: 0.018, lean: 0.18, pinch: 0.84, elong: 1.0 },
    { u: 0.775, s: 0.32, d: 0.62, L: 0.84, a: 0.036, lean: -0.08, pinch: 0.56, elong: 1.45 },
    { u: 0.845, s: 0.50, d: 0.42, L: 0.30, a: 0.018, lean: 0.12, pinch: 0.82, elong: 1.1 },
    { u: 0.965, s: 0.40, d: 0.54, L: 0.52, a: 0.028, lean: -0.10, pinch: 0.66, elong: 1.3 }
  ];
  var MOBILE_SKIP = { 1: 1, 5: 1, 7: 1 };           // fewer, bolder drips on small screens

  /* Pairs of drips that end up joined into one body late in the scroll. */
  var BRIDGES = [[2, 3], [6, 7]];

  var items = DRIPS.map(function (cfg) {
    var path = document.createElementNS(NS, "path");
    paint.appendChild(path);
    return { cfg: cfg, path: path, x: 0, yb: 0, skip: false };
  });
  var curtain = document.createElementNS(NS, "path");
  paint.insertBefore(curtain, paint.firstChild);

  var G = {                       // geometry, measured in layout()
    w: 0, h: 0, S: 0, baseline: 0, left: 0, width: 0, avail: 0,
    top: 0, range: 1, mobile: false,
    prof: null,                   // Float32Array: ink-bottom y per column (NaN = no ink)
    amp: null,                    // Float32Array: per-column letter amplitude
    step: 2
  };
  var lastP = -1;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, v) {
    var t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* ---- measure the real glyph contour with an offscreen canvas ---- */
  function sampleContour(S, left, width, baseline, w, h) {
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.font = "700 " + S + 'px "Archivo", sans-serif';
    try { ctx.fontStretch = "expanded"; } catch (e) { /* not supported */ }
    try { ctx.letterSpacing = (-0.02 * S) + "px"; } catch (e) { /* not supported */ }
    ctx.textBaseline = "alphabetic";
    var mw = ctx.measureText(TEXT).width || width;
    ctx.fillStyle = "#000";
    ctx.save();
    ctx.translate(left, baseline);
    ctx.scale(width / mw, 1);                 // lock canvas text to the SVG text width
    ctx.fillText(TEXT, 0, 0);
    ctx.restore();

    var data = ctx.getImageData(0, 0, w, h).data;
    var n = Math.ceil(w / G.step);
    var prof = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = Math.min(w - 1, i * G.step);
      var yb = NaN;
      for (var y = h - 1; y >= 0; y--) {
        if (data[(y * w + x) * 4 + 3] > 110) { yb = y + 1; break; }
      }
      prof[i] = yb;
    }
    G.prof = prof;
    return true;
  }

  function layout() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    G.w = w; G.h = h;
    G.mobile = w < 720;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);

    logo.setAttribute("font-size", "100");
    logo.setAttribute("x", "0");
    logo.setAttribute("y", "0");
    var len = logo.getComputedTextLength() || 260;
    var portrait = w / h < 0.8;
    var target = w * (portrait ? 0.84 : 0.64);
    var S = 100 * target / len;
    var baseline = h * 0.40 + S * 0.34;
    var left = (w - target) / 2;
    logo.setAttribute("font-size", String(S));
    logo.setAttribute("x", String(left));
    logo.setAttribute("y", String(baseline));

    G.S = S; G.baseline = baseline; G.left = left; G.width = target;
    G.avail = Math.max(60, h - baseline - h * 0.05);

    // keep the goo threshold proportional to the type, over the whole stage
    gooBlur.setAttribute("stdDeviation", String(Math.max(1.6, S * 0.011)));
    gooFilter.setAttribute("x", "0");
    gooFilter.setAttribute("y", "0");
    gooFilter.setAttribute("width", String(w));
    gooFilter.setAttribute("height", String(h));

    var ok = sampleContour(S, left, target, baseline, w, h);
    if (ok) {
      // letter index per column (for uneven sag) from the SVG glyph extents
      var n = G.prof.length;
      G.amp = new Float32Array(n);
      for (var c = 0; c < TEXT.length; c++) {
        var ext;
        try { ext = logo.getExtentOfChar(c); } catch (e) { ext = null; }
        var x0 = ext ? ext.x : left + target * c / 4;
        var x1 = ext ? ext.x + ext.width : left + target * (c + 1) / 4;
        for (var i = 0; i < n; i++) {
          var x = i * G.step;
          if (x >= x0 && x < x1) G.amp[i] = LETTER_AMP[c];
        }
      }
    }

    // snap every drip to the nearest column that really has ink
    items.forEach(function (it, i) {
      it.skip = !ok || (G.mobile && MOBILE_SKIP[i]);
      if (!ok) return;
      var xt = left + target * it.cfg.u;
      var best = -1, bd = 1e9;
      for (var k = 0; k < G.prof.length; k++) {
        if (isNaN(G.prof[k])) continue;
        var dd = Math.abs(k * G.step - xt);
        if (dd < bd) { bd = dd; best = k; }
      }
      if (best < 0) { it.skip = true; return; }
      it.x = best * G.step;
      // use the lowest ink in a small neighbourhood so the root is fully attached
      var yb = G.prof[best];
      for (var j = best - 2; j <= best + 2; j++) {
        if (j >= 0 && j < G.prof.length && !isNaN(G.prof[j])) yb = Math.min(yb, G.prof[j]);
      }
      it.yb = yb;
    });

    measureScroll();
    lastP = -1;
    render();
  }

  function measureScroll() {
    var r = root.getBoundingClientRect();
    G.top = r.top + window.pageYOffset;
    G.range = Math.max(1, root.offsetHeight - window.innerHeight);
  }

  /* ---- smooth lumpy noise in [0, 1], a function of position only ---- */
  function lumps(u) {
    var n = 0.5 * (0.5 + 0.5 * Math.sin(u * 17.0 + 1.3)) +
            0.3 * (0.5 + 0.5 * Math.sin(u * 41.0 + 0.4)) +
            0.2 * (0.5 + 0.5 * Math.sin(u * 9.0 + 4.1));
    return Math.pow(n, 1.8);
  }

  /* ---- per-drip state at progress p ---- */
  function dripState(it, p) {
    var c = it.cfg;
    var t = clamp((p - c.s) / c.d, 0, 1);
    var g = smooth(0, 0.18, t);
    if (it.skip || g <= 0.002) return null;
    var S = G.S;
    var a0 = Math.max(3.4, S * c.a);
    var e = 0.3 * t + 0.7 * smooth(0, 1, t);
    var a = a0 * (1 - 0.16 * t) * g;
    var r = a0 * (1.25 + 0.7 * smooth(0.1, 0.65, t)) * g;
    var ry = r * (1 + (c.elong - 1) * smooth(0.15, 0.7, t));
    var f = a + 1;
    var free = Math.max(0, G.avail * c.L - 3 * a0 - ry);
    return { t: t, g: g, a0: a0, a: a, r: r, ry: ry, f: f, L: free * e };
  }

  /* ---- the curtain: sagging bottom edge + webbing around drips ---- */
  function buildCurtain(p, states) {
    var S = G.S;
    var gSag = smooth(0.08, 0.6, p);
    var gWeb = smooth(0.3, 0.8, p);
    var gBridge = smooth(0.58, 0.92, p);
    if (gSag <= 0.002 && gWeb <= 0.002) { curtain.removeAttribute("d"); return; }

    var n = G.prof.length;
    var maxSag = S * 0.085 * gSag;
    var cap = G.avail * 0.55;
    var d = "";
    var open = false;
    var topPts = [];
    var botPts = [];
    var any = false;

    for (var i = 0; i < n; i++) {
      var yb = G.prof[i];
      if (isNaN(yb)) {
        if (open) { d += flush(topPts, botPts); topPts = []; botPts = []; open = false; }
        continue;
      }
      var x = i * G.step;
      var u = (x - G.left) / G.width;
      var len = maxSag * lumps(u) * (G.amp ? G.amp[i] : 1);

      // webbing: a wide skirt around every growing drip
      for (var k = 0; k < items.length; k++) {
        var st = states[k];
        if (!st) continue;
        var sig = st.a0 * 3.4;
        var dx = (x - items[k].x) / sig;
        if (dx > 3 || dx < -3) continue;
        var wl = st.L * 0.34 * gWeb * Math.exp(-dx * dx);
        if (wl > len) len = wl;
      }
      // bridges: two neighbouring drips become one body
      if (gBridge > 0.002) {
        for (var b = 0; b < BRIDGES.length; b++) {
          var A = items[BRIDGES[b][0]], B = items[BRIDGES[b][1]];
          var sa = states[BRIDGES[b][0]], sb = states[BRIDGES[b][1]];
          if (!sa || !sb) continue;
          if (x < A.x || x > B.x) continue;
          var tt = (x - A.x) / Math.max(1, B.x - A.x);
          var win = Math.sin(Math.PI * tt);
          var bl = Math.min(sa.L, sb.L) * 0.5 * gBridge * Math.pow(win, 0.7);
          if (bl > len) len = bl;
        }
      }
      len = Math.min(len, cap);
      if (len > 0.4) any = true;
      open = true;
      topPts.push(x, yb - 3);
      botPts.push(x, yb + len);
    }
    if (open) d += flush(topPts, botPts);
    if (any) curtain.setAttribute("d", d); else curtain.removeAttribute("d");
  }

  function flush(top, bot) {
    // outline of one contiguous run: bottom edge left→right, then back along the top
    var d = "M" + top[0] + "," + top[1];
    for (var i = 0; i < bot.length; i += 2) d += "L" + bot[i] + "," + bot[i + 1].toFixed(1);
    for (var j = top.length - 2; j >= 0; j -= 2) d += "L" + top[j] + "," + top[j + 1];
    return d + "Z";
  }

  /* ---- one drip body: pinched neck, leaning, elongated round bulb ---- */
  function buildDrip(it, st) {
    if (!st) { it.path.removeAttribute("d"); return; }
    var c = it.cfg, S = G.S;
    var a = st.a, r = st.r, ry = st.ry, f = st.f, L = st.L;

    var yb = it.yb;
    var y0 = yb - S * 0.06;
    var y1 = yb + f;
    var cyb = y1 + L;
    var y2 = Math.max(y1 + 1, cyb - ry * 0.95);
    var ym = (y1 + y2) / 2;

    var x0 = it.x;
    var lean = c.lean * Math.min(1, L / (S * 0.8)) * S * 0.12;
    var xm = x0 + lean * 0.35;
    var x1 = x0 + lean;
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
  }

  function render() {
    var p = reduce ? 0.78 : clamp((window.pageYOffset - G.top) / G.range, 0, 1);
    if (p === lastP || !G.prof) return;
    lastP = p;
    var states = items.map(function (it) { return dripState(it, p); });
    buildCurtain(p, states);
    for (var i = 0; i < items.length; i++) buildDrip(items[i], states[i]);
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
    if (reduce) root.classList.add("drip--static");
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
