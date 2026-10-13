/* ==========================================================================
   OTI — URBAN CANVAS (hero)

   A concrete wall that is worked over as you scroll. Every layer is an
   aerosol sprite drawn for this piece (assets/hero/*.png) or the real @oti
   wordmark (live text, Archivo Expanded as in the header), built up as a
   lettering piece: extruded shadow, outline, face.

   Scroll progress p in [0, 1] drives a fixed score of interventions. Each
   layer appears with a soft-edged wipe in the direction of the gesture, never
   a fade, and the letters are "sprayed in" by a zig-zag pass over the piece.

     0.00 – 0.15  the wall
     0.15 – 0.35  first marks (loop, bar, ring, cross)
     0.35 – 0.60  main layer: the red field
     0.60 – 0.82  the OTI piece is sprayed in
     0.82 – 1.00  details, final piece

   Same p => same picture: stop and it holds, scroll up and it is undone.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("wall");
  if (!root) return;

  var stage = root.querySelector(".wall-stage");
  var svg = root.querySelector("svg");
  var NS = "http://www.w3.org/2000/svg";
  var XL = "http://www.w3.org/1999/xlink";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BASE = "assets/hero/";

  /* The score. p = progress window; positions per layout (viewBox units). */
  var LAYOUTS = {
    land: { vb: [1600, 900], text: { x: 800, y: 585, fs: 340 } },
    port: { vb: [900, 1300], text: { x: 450, y: 800, fs: 292 } }
  };
  var ITEMS = [
    { id: "loop",    p: [0.15, 0.30], land: [70, 60, 380, 312, -4],     port: [40, 150, 300, 246, -4] },
    { id: "bar",     p: [0.19, 0.34], land: [250, 745, 760, 152, -1.5], port: [120, 960, 600, 120, -1.5] },
    { id: "ring",    p: [0.25, 0.37], land: [1320, 62, 240, 240, 0],    port: [610, 110, 200, 200, 0] },
    { id: "cross",   p: [0.28, 0.40], land: [96, 770, 118, 118, 8],    port: [60, 1150, 120, 120, 8] },
    { id: "block",   p: [0.36, 0.60], land: [130, 190, 1340, 590, 0],   port: [24, 540, 852, 375, 0] },
    { id: "swoosh",  p: [0.76, 0.88], land: [240, 214, 600, 114, -3],   port: [120, 520, 420, 80, -3] },
    { id: "crown",   p: [0.80, 0.90], land: [372, 130, 300, 214, -8],   port: [150, 380, 250, 178, -8] },
    { id: "arrow",   p: [0.84, 0.94], land: [1190, 690, 330, 215, 0],   port: [560, 1000, 260, 170, 0] },
    { id: "slashes", p: [0.88, 0.98], land: [1400, 470, 150, 162, 6],   port: [700, 1110, 120, 130, 6] }
  ];
  var TEXT_P = [0.60, 0.82];

  var layer = {};            // id -> { img, stops: [a, b] }
  var textGroup = null, zig = null;
  var mode = "";
  var cur = -1, target = 0, running = false;
  var top = 0, range = 1;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (k === "href") n.setAttributeNS(XL, "href", attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, v) {
    var t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* ---- build the SVG once ---- */
  var defs = el("defs", {}, svg);
  var gItems = el("g", { "class": "wall-items" }, svg);

  ITEMS.forEach(function (it) {
    var maskId = "wm-" + it.id;
    var grad = el("linearGradient", { id: "wg-" + it.id, x1: "0", y1: "0", x2: "1", y2: "0" }, defs);
    var s1 = el("stop", { offset: "1", "stop-color": "#fff", "stop-opacity": "1" }, grad);
    var s2 = el("stop", { offset: "1", "stop-color": "#fff", "stop-opacity": "0" }, grad);
    var mask = el("mask", { id: maskId, maskUnits: "objectBoundingBox", maskContentUnits: "objectBoundingBox", x: "0", y: "0", width: "1", height: "1" }, defs);
    el("rect", { x: "0", y: "0", width: "1", height: "1", fill: "url(#wg-" + it.id + ")" }, mask);
    var g = el("g", { mask: "url(#" + maskId + ")" }, gItems);
    var img = el("image", { href: BASE + it.id + ".png", preserveAspectRatio: "none" }, g);
    layer[it.id] = { img: img, g: g, s1: s1, s2: s2, cfg: it };
  });

  /* lettering: extruded shadow + outline + face, revealed by a zig-zag spray pass */
  var textDefs = el("text", { id: "wall-t", "text-anchor": "middle" }, defs);
  textDefs.textContent = "@oti";
  var maskT = el("mask", { id: "wm-text", maskUnits: "userSpaceOnUse", x: "0", y: "0", width: "2000", height: "1600" }, defs);
  zig = el("path", { fill: "none", stroke: "#fff", "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: "1" }, maskT);
  textGroup = el("g", { "class": "wall-piece", mask: "url(#wm-text)" }, svg);
  var shadow = el("g", { "class": "wall-shadow" }, textGroup);
  for (var k = 22; k >= 1; k -= 1) {
    el("use", { href: "#wall-t", x: String(k * 0.9), y: String(k * 0.9) }, shadow);
  }
  var outline = el("use", { href: "#wall-t", "class": "wall-outline" }, textGroup);
  el("use", { href: "#wall-t", "class": "wall-face" }, textGroup);

  /* ---- layout (landscape / portrait) ---- */
  function applyLayout() {
    var w = stage.clientWidth, h = stage.clientHeight;
    var m = w / h < 0.85 ? "port" : "land";
    if (m === mode) return;
    mode = m;
    var L = LAYOUTS[m];
    svg.setAttribute("viewBox", "0 0 " + L.vb[0] + " " + L.vb[1]);
    ITEMS.forEach(function (it) {
      var c = it[m], o = layer[it.id];
      o.img.setAttribute("x", c[0]);
      o.img.setAttribute("y", c[1]);
      o.img.setAttribute("width", c[2]);
      o.img.setAttribute("height", c[3]);
      o.g.setAttribute("transform", "rotate(" + c[4] + " " + (c[0] + c[2] / 2) + " " + (c[1] + c[3] / 2) + ")");
    });
    // text
    var T = L.text;
    textDefs.setAttribute("x", T.x);
    textDefs.setAttribute("y", T.y);
    textDefs.setAttribute("font-size", T.fs);
    outline.setAttribute("stroke-width", String(T.fs * 0.075));
    var shadowUses = shadow.querySelectorAll("use");
    for (var i = 0; i < shadowUses.length; i++) {
      var kk = 22 - i;
      shadowUses[i].setAttribute("x", String(kk * T.fs / 380));
      shadowUses[i].setAttribute("y", String(kk * T.fs / 380));
    }
    // zig-zag pass over the piece
    var x0 = T.x - T.fs * 1.5, x1 = T.x + T.fs * 1.55;
    var yTop = T.y - T.fs * 0.85, yBot = T.y + T.fs * 0.35;
    var rows = 5, d = "";
    for (var r = 0; r < rows; r++) {
      var y = yTop + (yBot - yTop) * r / (rows - 1);
      d += (r === 0 ? "M" : "L") + (r % 2 ? x1 : x0) + "," + y + "L" + (r % 2 ? x0 : x1) + "," + y;
    }
    zig.setAttribute("d", d);
    zig.setAttribute("stroke-width", String((yBot - yTop) / (rows - 1) * 1.55));
    zig.setAttribute("stroke-dasharray", "1 1");
    cur = -1;
  }

  /* ---- paint one frame ---- */
  function paint(p) {
    ITEMS.forEach(function (it) {
      var q = smooth(it.p[0], it.p[1], p);        // 0..1 along the gesture
      var o = layer[it.id];
      if (q <= 0.001) { o.g.style.visibility = "hidden"; return; }
      o.g.style.visibility = "visible";
      var edge = q * 1.16 - 0.08;                  // soft front travelling past the end
      o.s1.setAttribute("offset", clamp(edge - 0.1, 0, 1).toFixed(3));
      o.s2.setAttribute("offset", clamp(edge, 0.001, 1.001).toFixed(3));
    });
    var tq = smooth(TEXT_P[0], TEXT_P[1], p);
    textGroup.style.visibility = tq <= 0.001 ? "hidden" : "visible";
    zig.setAttribute("stroke-dashoffset", (1 - tq).toFixed(4));
  }

  /* ---- scroll: a short ease toward the scroll position, no timers ---- */
  function measure() {
    var r = root.getBoundingClientRect();
    top = r.top + window.pageYOffset;
    range = Math.max(1, root.offsetHeight - window.innerHeight);
    applyLayout();
    cur = -1;
    pump();
  }
  function readTarget() {
    return reduce ? 1 : clamp((window.pageYOffset - top) / range, 0, 1);
  }
  function next(fn) {
    var done = false;
    var run = function () { if (done) return; done = true; fn(); };
    window.requestAnimationFrame(run);
    setTimeout(run, 50);                          // safety net if frames are paused
  }
  function pump() {
    target = readTarget();
    if (running) return;
    running = true;
    var step = function () {
      target = readTarget();
      if (cur < 0 || reduce) cur = target;
      else cur += (target - cur) * 0.2;
      if (Math.abs(target - cur) < 0.0004) cur = target;
      paint(cur);
      if (cur !== target) next(step); else running = false;
    };
    next(step);
  }

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: "100px" }).observe(root);
  }

  root.classList.add("is-live");
  if (reduce) root.classList.add("wall--static");
  measure();
  if (!reduce) {
    window.addEventListener("scroll", function () { if (visible) pump(); }, { passive: true });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(measure, 80);
    });
    window.addEventListener("load", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }
})();
