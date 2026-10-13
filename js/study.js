/* ==========================================================================
   OTI — A STUDY IN MOTION (hero)

   A sculpture made of seven folded planes, built with CSS 3D (no WebGL).
   Scroll progress p in [0, 1] drives one shared pose table; every plane is
   interpolated through the same keyframes with a cubic Hermite spline, so the
   whole object moves as one system. Faces are lit by a fixed light from their
   real orientation, so depth comes from geometry, not from effects.

     0.00 – 0.20  THE OBJECT   the assembled, asymmetric sculpture
     0.20 – 0.48  THE SHIFT    planes separate, fold open, interiors appear
     0.48 – 0.72  deep transformation: the pieces turn their vermilion backs
     0.72 – 0.88  THE REVEAL   planes align into a portal; OTI is uncovered
     0.88 – 1.00  THE RELEASE  planes withdraw, the ground turns to paper

   The logo is the real wordmark (live text, Archivo Expanded as in the header).
   It sits behind the object and is uncovered by the planes parting, never
   faded or typed in.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("study");
  if (!root) return;

  var stage = root.querySelector(".study-stage");
  var scene = root.querySelector(".study-scene");
  var logo = root.querySelector(".study-logo");
  var wipe = root.querySelector(".study-wipe");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var INK = [20, 19, 17], IVORY = [245, 244, 241], VERM = [228, 71, 43];
  var STONE = [212, 207, 196], DARK = [58, 56, 52];

  /* Planes: size in u (u = stage unit), colour of the front and of the back. */
  var PLANES = [
    { w: 24, h: 58, front: IVORY, back: DARK },      // 0 monolith
    { w: 26, h: 40, front: IVORY, back: VERM },      // 1 left fold
    { w: 20, h: 50, front: IVORY, back: VERM },      // 2 right fold
    { w: 50, h: 18, front: IVORY, back: VERM },      // 3 slab
    { w: 40, h: 9, front: STONE, back: VERM },       // 4 lintel
    { w: 30, h: 44, front: [120, 116, 108], back: DARK },      // 5 veil
    { w: 9, h: 9, front: VERM, back: VERM }          // 6 shard
  ];

  /* Keyframes at progress t. Pose per plane: [x, y, z, rx, ry, rz, s] (u, deg).
     scene: [rx, ry]; bg: 0 = carbon, 1 = paper (the release). */
  var KEYS = [
    { t: 0.00, g: [10, -22], bg: 0, P: [
      [-2, 0, 0, 0, -8, 0, 1],
      [-17, 5, -2, 0, 52, 0, 1],
      [14, -3, 3, 0, -38, 0, 1],
      [3, 24, 8, 68, 0, -4, 1],
      [-3, -27, 12, 0, 10, -7, 1],
      [24, 10, -12, 0, -60, 0, 1],
      [-13, -4, 16, 0, 0, 15, 1] ] },
    { t: 0.20, g: [8, -30], bg: 0, P: [
      [-2, 0, 2, 0, -14, 0, 1],
      [-20, 5, -2, 0, 60, 0, 1],
      [16, -3, 5, 0, -46, 0, 1],
      [3, 25, 10, 62, 0, -6, 1],
      [-4, -30, 14, 0, 16, -10, 1],
      [28, 10, -14, 0, -66, 0, 1],
      [-15, -6, 20, 0, 0, 22, 1] ] },
    { t: 0.48, g: [4, -14], bg: 0, P: [
      [-6, 0, 6, 0, -34, 0, 1],
      [-27, 2, 0, 0, 118, 0, 1],
      [23, 0, 8, 0, -124, 0, 1],
      [0, 31, 12, 38, 0, 0, 1.05],
      [-2, -33, 18, 0, 0, -24, 1],
      [39, 8, -18, 0, -104, 0, 1],
      [-23, -12, 26, 0, 0, 45, 1] ] },
    { t: 0.72, g: [0, 0], bg: 0, P: [
      [-42, 0, 0, 0, 0, 0, 1],
      [-27, 0, 6, 0, 180, 0, 0.55],
      [30, 0, 6, 0, -180, 0, 0.7],
      [0, 27, 4, 0, 0, 0, 1],
      [0, -27, 4, 0, 0, 0, 1],
      [46, 6, -6, 0, 0, 0, 0.8],
      [35, -24, 10, 0, 0, 0, 1] ] },
    { t: 0.88, g: [0, 0], bg: 0.25, P: [
      [-47, 0, 0, 0, 0, 0, 0.9],
      [-31, 0, 6, 0, 180, 0, 0.5],
      [34, 0, 6, 0, -180, 0, 0.6],
      [0, 30, 4, 0, 0, 0, 0.9],
      [0, -30, 4, 0, 0, 0, 0.9],
      [51, 6, -6, 0, 0, 0, 0.7],
      [39, -26, 10, 0, 0, 0, 0.9] ] },
    { t: 1.00, g: [0, 0], bg: 1, P: [
      [-60, 0, 0, 0, 0, 0, 0.7],
      [-40, 0, 6, 0, 180, 0, 0.4],
      [44, 0, 6, 0, -180, 0, 0.45],
      [0, 36, 4, 0, 0, 0, 0.6],
      [0, -36, 4, 0, 0, 0, 0.6],
      [60, 6, -6, 0, 0, 0, 0.55],
      [48, -30, 10, 0, 0, 0, 0.7] ] }
  ];

  var LIGHT = (function () {
    var v = [-0.35, -0.55, 0.75], m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / m, v[1] / m, v[2] / m];
  })();

  /* ---- DOM: planes with a front and a back face ---- */
  var els = PLANES.map(function (pl) {
    var el = document.createElement("div");
    el.className = "pl";
    var f = document.createElement("i"); f.className = "f";
    var b = document.createElement("i"); b.className = "b";
    el.appendChild(f); el.appendChild(b);
    scene.appendChild(el);
    return { el: el, f: f, b: b, def: pl };
  });

  var u = 10, vw = 0, vh = 0, top = 0, range = 1;
  var target = 0, cur = -1, running = false;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mix(a, b, t) { return a + (b - a) * t; }

  /* Cubic Hermite through the keyframes: continuous velocity, no corners. */
  function sample(p) {
    var n = KEYS.length, i = 0;
    while (i < n - 2 && p > KEYS[i + 1].t) i++;
    var k0 = KEYS[i], k1 = KEYS[i + 1];
    var h = k1.t - k0.t;
    var s = clamp((p - k0.t) / h, 0, 1);
    var kp = KEYS[Math.max(0, i - 1)], kn = KEYS[Math.min(n - 1, i + 2)];
    var s2 = s * s, s3 = s2 * s;
    var h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    function herm(a, b, ap, bn) {
      var m0 = (b - ap) / (k1.t - kp.t) * h * (i === 0 ? 0 : 1);
      var m1 = (bn - a) / (kn.t - k0.t) * h * (i + 1 === n - 1 ? 0 : 1);
      return h00 * a + h10 * m0 + h01 * b + h11 * m1;
    }
    var out = { P: [], g: [0, 0], bg: 0 };
    for (var j = 0; j < PLANES.length; j++) {
      var pose = [];
      for (var c = 0; c < 7; c++) {
        pose.push(herm(k0.P[j][c], k1.P[j][c], kp.P[j][c], kn.P[j][c]));
      }
      out.P.push(pose);
    }
    for (var q = 0; q < 2; q++) out.g[q] = herm(k0.g[q], k1.g[q], kp.g[q], kn.g[q]);
    out.bg = clamp(herm(k0.bg, k1.bg, kp.bg, kn.bg), 0, 1);
    return out;
  }

  /* world normal of a plane's front face, then Lambert against LIGHT */
  function shade(rx, ry, g) {
    var d = Math.PI / 180;
    // plane rotation: v -> Rx(Ry(Rz v)); normal starts at (0,0,1)
    var sy = Math.sin(ry * d), cy = Math.cos(ry * d);
    var x = sy, y = 0, z = cy;
    var sx = Math.sin(rx * d), cx = Math.cos(rx * d);
    var y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    // scene rotation (rx then ry as in CSS: rotateX(g0) rotateY(g1))
    var sgy = Math.sin(g[1] * d), cgy = Math.cos(g[1] * d);
    var x2 = x * cgy + z1 * sgy, z2 = -x * sgy + z1 * cgy, y2 = y1;
    var sgx = Math.sin(g[0] * d), cgx = Math.cos(g[0] * d);
    var y3 = y2 * cgx - z2 * sgx, z3 = y2 * sgx + z2 * cgx;
    return x2 * LIGHT[0] + y3 * LIGHT[1] + z3 * LIGHT[2];
  }

  function rgb(c, k) {
    // k in [0,1]: 0.5 base shade .. 1 full light
    return "rgb(" + Math.round(c[0] * k) + "," + Math.round(c[1] * k) + "," + Math.round(c[2] * k) + ")";
  }

  function paintFrame(p) {
    var S = sample(p);
    scene.style.transform = "rotateX(" + S.g[0] + "deg) rotateY(" + S.g[1] + "deg)";
    for (var i = 0; i < els.length; i++) {
      var o = els[i], q = S.P[i];
      o.el.style.transform =
        "translate3d(" + (q[0] * u) + "px," + (q[1] * u) + "px," + (q[2] * u) + "px)" +
        " rotateX(" + q[3] + "deg) rotateY(" + q[4] + "deg) rotateZ(" + q[5] + "deg) scale(" + q[6] + ")";
      var nl = shade(q[3], q[4], S.g);
      var kf = 0.30 + 0.70 * clamp(nl * 1.15, 0, 1);       // lit front
      var kb = 0.30 + 0.70 * clamp(-nl * 1.15, 0, 1);      // lit back (opposite normal)
      o.f.style.backgroundColor = rgb(o.def.front, kf);
      o.b.style.backgroundColor = rgb(o.def.back, kb);
    }
    // release: a paper ground rises from the bottom edge (no grey cross-fade);
    // the wordmark uses a difference blend, so it inverts exactly along that edge
    wipe.style.height = (S.bg * 100).toFixed(2) + "%";
  }

  /* ---- layout + scroll ---- */
  function measure() {
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    u = Math.max(3.5, Math.min(vw / (vw < vh ? 84 : 118), vh / 96));
    root.style.setProperty("--u", u + "px");
    var r = root.getBoundingClientRect();
    top = r.top + window.pageYOffset;
    range = Math.max(1, root.offsetHeight - window.innerHeight);
    els.forEach(function (o) {
      o.el.style.width = o.def.w * u + "px";
      o.el.style.height = o.def.h * u + "px";
      o.el.style.marginLeft = (-o.def.w * u / 2) + "px";
      o.el.style.marginTop = (-o.def.h * u / 2) + "px";
    });
    cur = -1;
    pump();
  }

  function readTarget() {
    return reduce ? 0.8 : clamp((window.pageYOffset - top) / range, 0, 1);
  }

  /* One rAF loop that exists only while the picture is still catching up
     with the scroll position (a short ease, not a timer-driven animation). */
  function pump() {
    target = readTarget();
    if (running) return;
    running = true;
    var step = function () {
      target = readTarget();
      if (cur < 0 || reduce) cur = target;
      else cur += (target - cur) * 0.2;
      if (Math.abs(target - cur) < 0.0004) cur = target;
      paintFrame(cur);
      if (cur !== target) { next(step); } else { running = false; }
    };
    next(step);
  }

  function next(fn) {
    var done = false;
    var run = function () { if (done) return; done = true; fn(); };
    window.requestAnimationFrame(run);
    setTimeout(run, 50);                      // safety net if frames are paused
  }

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: "100px" }).observe(root);
  }

  function onScroll() { if (visible) pump(); }

  root.classList.add("is-live");
  if (reduce) root.classList.add("study--static");
  measure();
  if (!reduce) {
    window.addEventListener("scroll", onScroll, { passive: true });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(measure, 80);
    });
    window.addEventListener("load", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }
})();
