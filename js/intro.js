/* ==========================================================================
   OTI intro — Phase 3 (v2): paint running down the letters (preview only)

   Feedback on v1: one detached drop looked staged. Real thick paint rarely
   lets go: it RUNS. So now the paint creeps down from several letters and
   stays attached, leaving a trail:

     - each run starts as a bead on a letter edge, then a bulb forms at the end
       of a trail that lengthens (slow start, quick middle, slow end as the
       paint thins out)
     - the trail is not a straight tube: its width wanders, it leans a little,
       and some runs leave a swelling where a bead slid past
     - runs come from different places and start at different moments:
       the T's bar (two), the T's stem, the O (underside, left, and from the
       top of its counter, hanging into the hole) and the I
     - each bulb gets a soft light/shade and the trail a thin highlight, so it
       reads as wet, thick paint (ivory, same as the letters; colours come in
       a later phase)

   Everything is a pure function of p in [0, 1], exactly as it will be when it
   is wired to the scroll, so it can be scrubbed both ways. The preview
   auto-plays once; the slider scrubs; R or Replay restarts. Nothing here
   touches the live site.
   ========================================================================== */
(function () {
  "use strict";

  var layer = document.getElementById("drops");
  if (!layer) return;
  var defs = layer.ownerSVGElement.querySelector("defs");

  var slider = document.getElementById("drop-scrub");
  var replay = document.getElementById("drop-replay");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  /* Attach points sit exactly on the ink edge of the approved lettering.
       x, y   where the run leaves the letter (y = the ink edge at that x)
       L      how far the head travels (viewBox units)
       a      neck half-width, r  bulb radius
       s, d   start and duration in progress (viscosity)
       lean   sideways wander, pinch  <1 thins mid-trail, >1 leaves a swelling
       elong  teardrop elongation of the bulb, ph  phase of the small wobbles,
       bead   (optional) where a small bead of paint sits on the trail         */
  var RUNS = [
    { x: 850, y: 210, L: 285, a: 20, r: 30, s: 0.08, d: 0.64, lean: 0.10, pinch: 0.62, elong: 1.45, ph: 0.4, bead: 0.42 },    // T bar, right
    { x: 336, y: 479, L: 205, a: 19, r: 28, s: 0.20, d: 0.58, lean: -0.07, pinch: 0.66, elong: 1.38, ph: 1.9, bead: 0.6 },   // O, underside
    { x: 748, y: 480, L: 185, a: 21, r: 30, s: 0.30, d: 0.54, lean: 0.05, pinch: 1.12, elong: 1.5, ph: 3.1 },    // T stem (leaves a swelling)
    { x: 588, y: 210, L: 140, a: 13, r: 19, s: 0.17, d: 0.60, lean: -0.08, pinch: 0.80, elong: 1.3, ph: 5.0 },   // T bar, left
    { x: 331, y: 213, L: 108, a: 15, r: 21, s: 0.36, d: 0.50, lean: 0.05, pinch: 0.84, elong: 1.3, ph: 2.4 },    // inside the O, from the top of the counter
    { x: 1018, y: 480, L: 150, a: 15, r: 22, s: 0.44, d: 0.50, lean: -0.06, pinch: 0.72, elong: 1.35, ph: 4.2, bead: 0.5 }, // I
    { x: 264, y: 477, L: 96, a: 11, r: 16, s: 0.52, d: 0.44, lean: 0.09, pinch: 0.9, elong: 1.25, ph: 0.9 }      // O, left of the underside
  ];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function f(n) { return n.toFixed(2); }
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---- DOM: per run a body, and a clipped group with shade, shine and gloss ---- */
  var items = RUNS.map(function (cfg, i) {
    var body = el("path", { "class": "drop-body" }, layer);
    var bead = cfg.bead ? el("ellipse", { "class": "drop-body" }, layer) : null;
    var clipPath = el("path", {}, el("clipPath", { id: "drop-clip-" + i }, defs));
    var g = el("g", { "clip-path": "url(#drop-clip-" + i + ")", visibility: "hidden" }, layer);
    var shade = el("ellipse", { fill: "url(#drop-grad)" }, g);
    var shine = el("ellipse", { fill: "#fff", opacity: "0.5" }, g);
    var gloss = el("path", { "class": "drop-gloss" }, g);
    return { cfg: cfg, bead: bead, body: body, clipPath: clipPath, g: g, shade: shade, shine: shine, gloss: gloss };
  });

  /* ---- one run at progress p ---- */
  function build(it, p) {
    var c = it.cfg;
    var t = clamp((p - c.s) / c.d, 0, 1);
    var g = smooth(0, 0.16, t);                              // a bead first
    if (g <= 0.003) {
      if (it.bead) it.bead.setAttribute("visibility", "hidden");
      it.body.removeAttribute("d");
      it.clipPath.removeAttribute("d");
      it.g.setAttribute("visibility", "hidden");
      return;
    }
    // speed: slow start, quick middle, slow end (the paint thins out), with a slight stutter
    var e = smooth(0, 1, t);
    e += 0.035 * Math.sin(t * 13 + c.ph) * Math.sin(Math.PI * t);
    e = clamp(e, 0, 1);

    var a = c.a * (1 - 0.3 * t) * g;                         // neck half-width, thins as it runs
    var r = c.r * (0.42 + 0.58 * smooth(0.1, 0.7, t)) * g;   // bulb radius
    var ry = r * (1 + (c.elong - 1) * smooth(0.12, 0.7, t)); // teardrop elongation
    var fil = a + 2;                                         // fillet into the letter
    var L = Math.max(0, c.L * e);

    var yb = c.y;                                            // ink edge
    var y0 = yb - 7;                                         // start hidden inside the ink
    var y1 = yb + fil;
    var cyb = y1 + L;                                        // bulb centre
    var y2 = Math.max(y1 + 1, cyb - ry * 0.95);              // where the trail meets the bulb
    var ym = lerp(y1, y2, 0.55);

    var x0 = c.x;
    var lean = c.lean * Math.min(1, L / 140) * 34;           // sideways drift at the head
    var xm = x0 + lean * 0.3 + Math.sin(ym * 0.045 + c.ph) * 1.6 * Math.min(1, L / 90);
    var x1 = x0 + lean;
    var wTop = a * 1.35;
    var wMid = a * c.pinch * (1 + 0.1 * Math.sin(c.ph * 3 + t * 6));
    var wEnd = a * 0.95;
    var dy1 = (ym - y1) * 0.55, dy2 = (y2 - ym) * 0.55;
    var k = 0.552;

    var d =
      "M" + f(x0 - wTop - fil) + "," + f(y0) +
      "C" + f(x0 - wTop - fil * 0.35) + "," + f(y0) + " " + f(x0 - wTop) + "," + f(yb - fil * 0.2) + " " + f(x0 - wTop) + "," + f(y1) +
      "C" + f(x0 - wTop) + "," + f(y1 + dy1) + " " + f(xm - wMid) + "," + f(ym - dy1) + " " + f(xm - wMid) + "," + f(ym) +
      "C" + f(xm - wMid) + "," + f(ym + dy2) + " " + f(x1 - wEnd) + "," + f(y2 - dy2) + " " + f(x1 - wEnd) + "," + f(y2) +
      "C" + f(x1 - wEnd) + "," + f(y2 + ry * 0.45) + " " + f(x1 - r) + "," + f(cyb - ry * 0.35) + " " + f(x1 - r) + "," + f(cyb) +
      "C" + f(x1 - r) + "," + f(cyb + ry * k) + " " + f(x1 - r * k) + "," + f(cyb + ry) + " " + f(x1) + "," + f(cyb + ry) +
      "C" + f(x1 + r * k) + "," + f(cyb + ry) + " " + f(x1 + r) + "," + f(cyb + ry * k) + " " + f(x1 + r) + "," + f(cyb) +
      "C" + f(x1 + r) + "," + f(cyb - ry * 0.35) + " " + f(x1 + wEnd) + "," + f(y2 + ry * 0.45) + " " + f(x1 + wEnd) + "," + f(y2) +
      "C" + f(x1 + wEnd) + "," + f(y2 - dy2) + " " + f(xm + wMid) + "," + f(ym + dy2) + " " + f(xm + wMid) + "," + f(ym) +
      "C" + f(xm + wMid) + "," + f(ym - dy1) + " " + f(x0 + wTop) + "," + f(y1 + dy1) + " " + f(x0 + wTop) + "," + f(y1) +
      "C" + f(x0 + wTop) + "," + f(yb - fil * 0.2) + " " + f(x0 + wTop + fil * 0.35) + "," + f(y0) + " " + f(x0 + wTop + fil) + "," + f(y0) +
      "Z";
    it.body.setAttribute("d", d);
    it.clipPath.setAttribute("d", d);
    it.g.setAttribute("visibility", "visible");

    // light and shade on the bulb, highlight along the trail
    it.shade.setAttribute("cx", f(x1)); it.shade.setAttribute("cy", f(cyb));
    it.shade.setAttribute("rx", f(r * 1.02)); it.shade.setAttribute("ry", f(ry * 1.02));
    var sx = x1 - r * 0.36, sy = cyb - ry * 0.24;
    it.shine.setAttribute("cx", f(sx)); it.shine.setAttribute("cy", f(sy));
    it.shine.setAttribute("rx", f(Math.max(0.1, r * 0.17))); it.shine.setAttribute("ry", f(Math.max(0.1, ry * 0.3)));
    it.shine.setAttribute("transform", "rotate(18 " + f(sx) + " " + f(sy) + ")");
    if (it.bead) {
      var bt = smooth(0.3, 0.5, t);
      if (bt > 0.01) {
        var fr = c.bead;
        var by = y1 + L * fr * 0.92;
        var bxp = x0 + lean * fr * 0.55 + Math.sin(by * 0.045 + c.ph) * 1.6;
        var br = wMid * (1.5 + 0.2 * Math.sin(c.ph)) * bt;
        it.bead.setAttribute("cx", f(bxp)); it.bead.setAttribute("cy", f(by));
        it.bead.setAttribute("rx", f(br)); it.bead.setAttribute("ry", f(br * 1.35));
        it.bead.setAttribute("visibility", "visible");
      } else {
        it.bead.setAttribute("visibility", "hidden");
      }
    }
    if (L > c.a * 2.5) {
      var gx0 = x0 - wTop * 0.42, gx1 = x1 - r * 0.4;
      it.gloss.setAttribute("d", "M" + f(gx0) + "," + f(y1 + fil) +
        "C" + f(gx0) + "," + f(ym) + " " + f(gx1) + "," + f(ym + dy2) + " " + f(gx1) + "," + f(cyb));
      it.gloss.setAttribute("stroke-width", f(Math.max(1.2, a * 0.4)));
    } else {
      it.gloss.removeAttribute("d");
    }
  }

  function draw(p) {
    for (var i = 0; i < items.length; i++) build(items[i], p);
  }

  /* ---- preview driver: auto-play once, slider for scrubbing both ways ---- */
  var raf = 0, start = 0;
  var DURATION = 13000;

  function set(v) {
    var p = clamp(v, 0, 1);
    draw(p);
    if (slider) slider.value = String(Math.round(p * 1000));
  }
  function next(fn) {
    var done = false;
    var run = function (t) { if (done) return; done = true; fn(typeof t === "number" ? t : performance.now()); };
    window.requestAnimationFrame(run);
    setTimeout(run, 60);
  }
  function stop() { raf++; }
  function play(fromP) {
    stop();
    var id = raf;
    start = 0;
    var step = function (now) {
      if (id !== raf) return;
      if (!start) start = now - (fromP || 0) * DURATION;
      var v = clamp((now - start) / DURATION, 0, 1);
      set(v);
      if (v < 1) next(step);
    };
    set(fromP || 0);
    next(step);
  }

  if (slider) slider.addEventListener("input", function () { stop(); set(Number(slider.value) / 1000); });
  if (replay) replay.addEventListener("click", function () { play(0); });
  document.addEventListener("keydown", function (e) { if (e.key === "r" || e.key === "R") play(0); });

  if (reduce) { set(0.7); }
  else { set(0); setTimeout(function () { play(0); }, 900); }
})();
