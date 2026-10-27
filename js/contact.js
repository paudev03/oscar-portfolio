/* ==========================================================================
   Contact — a flat creature breaks through the page

   No 3D and no WebGL: a vector drawing (SVG) and a few transforms, so it is light.

   The creature is built here, from a few irregular shapes: a dark mass, two rolls of lip,
   a ring of uneven teeth, and a throat made of layers that get darker and smaller. It sits
   above the words in the stacking order, so whatever is drawn in towards its mouth goes
   behind it for real. Depth is suggested the old way: the throat layers shift by different
   amounts when the cursor moves (parallax), and the mouth swells when the cursor is near.

   The words are real text split into letters. Near the creature each letter is pulled
   towards the mouth, stretched along the pull and curled, with a falloff by distance.
   Hovering or focusing a link calms the pull over that word and brings it in front.

   Everything eases with inertia and stops by itself when nothing moves.
   Reduced motion: one still frame. Touch: a finger drag is the cursor.
   ========================================================================== */
(function () {
  "use strict";

  var page = document.querySelector(".ct-page");
  var svg = page && page.querySelector(".ct-creature");
  if (!page || !svg) return;
  var wordEls = [].slice.call(page.querySelectorAll(".ct-word"));
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touchOnly = window.matchMedia("(hover: none)").matches;
  var NS = "http://www.w3.org/2000/svg";

  /* ================================================================ drawing */
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function f(n) { return n.toFixed(3); }

  /* the unit-radius opening: lobes, a pinched side. Shared by the lips, the throat and the teeth. */
  function rim(th) {
    return 1 + 0.22 * Math.sin(3 * th + 1.3) + 0.14 * Math.sin(5 * th + 2.1) + 0.09 * Math.sin(2 * th + 0.4) + 0.05 * Math.sin(7 * th + 0.5);
  }

  function closedPath(pts) {                         // a smooth closed curve through the points
    var n = pts.length, d = "M" + f(pts[0][0]) + " " + f(pts[0][1]);
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += " C" + f(p1[0] + (p2[0] - p0[0]) / 6) + " " + f(p1[1] + (p2[1] - p0[1]) / 6) + " " +
           f(p2[0] - (p3[0] - p1[0]) / 6) + " " + f(p2[1] - (p3[1] - p1[1]) / 6) + " " + f(p2[0]) + " " + f(p2[1]);
    }
    return d + "Z";
  }
  function polar(fn, n, scale, ox, oy, sx, sy) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var th = i / n * Math.PI * 2, r = fn(th) * scale;
      pts.push([ox + Math.cos(th) * r * sx, oy + Math.sin(th) * r * sy]);
    }
    return pts;
  }

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var parts = null;      // the groups the animation moves

  function buildCreature() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var R = rnd(7);

    var root = el("g", { "class": "ct-root" }, svg);                  // placed and scaled to the page: units are mouth radii
    var shadow = el("g", { "class": "ct-shadow" }, root);
    var breathe = el("g", { "class": "ct-breathe" }, root);
    var body = el("g", {}, breathe);

    /* the dark mass, uneven, tilted */
    var blobFn = function (th) { return 2.15 * (1 + 0.16 * Math.sin(3 * th + 0.7) + 0.11 * Math.sin(5 * th + 2.0) + 0.07 * Math.sin(7 * th + 1.1) + 0.04 * Math.sin(11 * th)); };
    var blob = closedPath(polar(blobFn, 30, 1, 0, 0, 1.08, 0.92));
    el("path", { d: blob, fill: "rgba(20,18,16,0.04)", transform: "translate(0.22 0.34)" }, shadow);
    el("path", { d: blob, fill: "rgba(20,18,16,0.045)", transform: "translate(0.15 0.24)" }, shadow);
    el("path", { d: blob, fill: "rgba(20,18,16,0.06)", transform: "translate(0.08 0.13)" }, shadow);
    el("path", { d: blob, fill: "#0d0c0b" }, body);
    var defs = el("defs", {}, svg);
    var clip = el("clipPath", { id: "ct-blob" }, defs);
    el("path", { d: blob }, clip);

    /* folds in the skin, radiating from the opening */
    var folds = el("g", { fill: "none", stroke: "#26221f", "stroke-linecap": "round", "clip-path": "url(#ct-blob)" }, body);
    for (var i = 0; i < 26; i++) {
      var a = i / 26 * Math.PI * 2 + (R() - 0.5) * 0.18;
      var r0 = 1.55 + R() * 0.12, r1 = r0 + 0.25 + R() * 0.40, bow = (R() - 0.5) * 0.5;
      var am = a + bow * 0.18;
      el("path", {
        d: "M" + f(Math.cos(a) * r0 * 1.08) + " " + f(Math.sin(a) * r0 * 0.92) +
           " Q" + f(Math.cos(am) * (r0 + r1) / 2 * 1.08) + " " + f(Math.sin(am) * (r0 + r1) / 2 * 0.92) +
           " " + f(Math.cos(a + bow * 0.3) * r1 * 1.08) + " " + f(Math.sin(a + bow * 0.3) * r1 * 0.92),
        "stroke-width": (0.012 + R() * 0.018).toFixed(3)
      }, folds);
    }

    /* the mouth: lips, throat, teeth. This group swells when the cursor is near */
    var mouth = el("g", {}, body);

    var lipFn = function (k, jit) { return function (th) { return rim(th) * k * (1 + jit * Math.sin(4 * th + 0.5) + jit * 0.6 * Math.sin(7 * th)); }; };
    el("path", { d: closedPath(polar(lipFn(1.52, 0.07), 36, 1, 0, 0, 1.06, 0.94)), fill: "#2a0a0c" }, mouth);   // outer roll
    el("path", { d: closedPath(polar(lipFn(1.28, 0.05), 36, 1, 0, 0, 1.04, 0.96)), fill: "#5b0f15" }, mouth);   // main lip
    el("path", { d: closedPath(polar(lipFn(1.14, 0.03), 36, 1, 0, 0, 1.02, 0.98)), fill: "#7a1820" }, mouth);   // the wet edge

    /* wet glints along the lip, on the lit (upper-left) side */
    var glints = el("g", { fill: "none", stroke: "#e2a6a0", "stroke-linecap": "round", opacity: "0.5" }, mouth);
    for (var g = 0; g < 9; g++) {
      var ga = 3.4 + g * 0.30 + (R() - 0.5) * 0.12, gr = 1.21 * rim(ga);
      el("path", {
        d: "M" + f(Math.cos(ga) * gr) + " " + f(Math.sin(ga) * gr * 0.98) +
           " A" + f(gr) + " " + f(gr) + " 0 0 1 " + f(Math.cos(ga + 0.10 + R() * 0.07) * gr) + " " + f(Math.sin(ga + 0.10) * gr * 0.98),
        "stroke-width": (0.014 + R() * 0.014).toFixed(3)
      }, glints);
    }

    el("path", { d: closedPath(polar(rim, 36, 1, 0, 0, 1, 1)), fill: "#220608" }, mouth);                       // the inner wall

    /* the throat: layers that shrink, darken and drift away; they move apart with the cursor */
    var layers = [];
    var shades = ["#1a0507", "#120405", "#0b0304", "#060202", "#020101"];
    for (var L = 0; L < shades.length; L++) {
      var sc = 0.90 - L * 0.15, off = L * 0.07;
      var layer = el("g", {}, mouth);
      var path = el("path", { d: closedPath(polar(rim, 36, sc, off * 0.9, -off * 1.1, 1, 1)), fill: shades[L] }, layer);
      if (L === 1) {                                                   // a ring of small dim teeth deep in the throat
        var back = el("g", { fill: "#6b6150" }, layer);
        for (var b = 0; b < 15; b++) {
          var bt = (b + R() * 0.7) / 15 * Math.PI * 2, br = rim(bt) * sc * 0.93;
          var bl = 0.10 + R() * 0.14, bw = 0.045 + R() * 0.03;
          var bx = off * 0.9 + Math.cos(bt) * br, by = -off * 1.1 + Math.sin(bt) * br;
          var nx = -Math.cos(bt), ny = -Math.sin(bt), tx = -ny, ty = nx;
          el("path", { d: "M" + f(bx + tx * bw) + " " + f(by + ty * bw) + " L" + f(bx + nx * bl) + " " + f(by + ny * bl) + " L" + f(bx - tx * bw) + " " + f(by - ty * bw) + "Z" }, back);
        }
      }
      layers.push({ g: layer, depth: 0.020 + L * 0.040 });
    }

    /* the front teeth: few, uneven, mostly short, a couple long, one broken */
    var teeth = el("g", {}, mouth);
    var N = 11;
    for (var t = 0; t < N; t++) {
      var th = (t + (R() - 0.5) * 0.7) / N * Math.PI * 2 + 0.2;
      var rr = rim(th) * 1.02;
      var len = 0.20 + 0.56 * Math.pow(R(), 2.2);
      if (t === 4) len *= 0.25;
      var w = 0.085 + R() * 0.07, lean = (R() - 0.5) * 0.28;
      var dx = Math.cos(th), dy = Math.sin(th), tx2 = -dy, ty2 = dx;
      var px = dx * rr, py = dy * rr * 0.98;
      var tipx = px - dx * len + tx2 * lean, tipy = py - dy * len + ty2 * lean;
      var blx = px + tx2 * w, bly = py + ty2 * w, brx = px - tx2 * w, bry = py - ty2 * w;
      var cx1 = (blx + tipx) / 2 + dx * 0.02 + tx2 * 0.03, cy1 = (bly + tipy) / 2 + dy * 0.02 + ty2 * 0.03;
      var cx2 = (brx + tipx) / 2 - tx2 * 0.03, cy2 = (bry + tipy) / 2 - ty2 * 0.03;
      var d = "M" + f(blx) + " " + f(bly) + " Q" + f(cx1) + " " + f(cy1) + " " + f(tipx) + " " + f(tipy) +
              " Q" + f(cx2) + " " + f(cy2) + " " + f(brx) + " " + f(bry) + "Z";
      el("path", { d: d, fill: "#d8ccb0" }, teeth);
      el("path", { d: "M" + f(tipx) + " " + f(tipy) + " L" + f(brx) + " " + f(bry) + " L" + f(px) + " " + f(py) + "Z", fill: "#a89b7e" }, teeth);   // the shaded side
      el("path", { d: "M" + f(blx) + " " + f(bly) + " L" + f(px) + " " + f(py) + " L" + f(brx) + " " + f(bry) + "Z", fill: "#3a0d10", opacity: "0.55" }, teeth);   // where it meets the gum
    }

    parts = { root: root, body: body, mouth: mouth, layers: layers, teeth: teeth };
  }

  /* ================================================================ layout */
  var W = 0, H = 0;
  var spec = null, mouthP = null, words = [];
  var SANS = '700 {s}px Archivo, "Arial Black", sans-serif';

  function layout() {
    W = page.clientWidth; H = page.clientHeight;
    var portrait = W < H * 0.9;
    if (portrait) {
      mouthP = { x: 0.68 * W, y: 0.80 * H, R: 0.25 * W };
      spec = {
        mail:   { cx: 0.40 * W, cy: 0.185 * H, size: 0.165 * W, rot: -3, track: -0.04 },
        insta:  { cx: 0.31 * W, cy: 0.285 * H, size: 0.078 * W, rot: 0, track: -0.04 },
        phrase: { cx: 0.21 * W, cy: 0.355 * H, size: 0.070 * W, rot: 0, track: -0.01 }
      };
    } else {
      var Rp = Math.min(0.215 * H, 0.17 * W);
      mouthP = { x: 0.76 * W, y: 0.665 * H, R: Rp };
      spec = {
        mail:   { cx: 0.20 * W, cy: 0.27 * H, size: Math.min(0.082 * W, 0.16 * H), rot: -2, track: -0.04 },
        insta:  { cx: 0.165 * W, cy: 0.82 * H, size: Math.min(0.040 * W, 0.078 * H), rot: 0, track: -0.04 },
        phrase: { cx: 0.135 * W, cy: 0.405 * H, size: Math.min(0.034 * W, 0.066 * H), rot: 0, track: -0.01 }
      };
    }
    mouthP.unit = mouthP.R;

    words.forEach(function (w) {
      var sp = spec[w.key], s = w.el.style;
      s.fontSize = sp.size.toFixed(1) + "px";
      s.letterSpacing = sp.track + "em";
      var bw = Math.ceil(sp.size * (w.text.length * 0.78) + sp.size * 0.3), bh = Math.ceil(sp.size * 1.15);
      s.width = bw + "px"; s.height = bh + "px"; s.lineHeight = bh + "px";
      s.left = (sp.cx - bw / 2).toFixed(1) + "px";
      s.top = (sp.cy - bh / 2).toFixed(1) + "px";
      s.transform = "rotate(" + sp.rot + "deg)";
      w.letters.forEach(function (l) { l.el.style.transform = ""; });
    });
    // rest centres of every letter, with no pull applied
    var pr = page.getBoundingClientRect();
    words.forEach(function (w) {
      w.letters.forEach(function (l) {
        var r = l.el.getBoundingClientRect();
        l.x = r.left + r.width / 2 - pr.left;
        l.y = r.top + r.height / 2 - pr.top;
      });
    });
    placeCreature(0, 0, 0, 0);
  }

  function placeCreature(tx, ty, rot, prox) {
    var u = mouthP.unit;
    parts.root.setAttribute("transform", "translate(" + (mouthP.x + tx).toFixed(1) + " " + (mouthP.y + ty).toFixed(1) + ") rotate(" + rot.toFixed(2) + ") scale(" + u.toFixed(2) + ") rotate(-14)");
  }

  /* ================================================================ words */
  function buildWords() {
    words = wordEls.map(function (e) {
      var text = e.textContent.trim();
      var sr = document.createElement("span");
      sr.className = "visually-hidden";
      sr.textContent = text;
      var box = document.createElement("span");
      box.className = "ct-letters";
      box.setAttribute("aria-hidden", "true");
      var letters = [];
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var l = document.createElement("span");
        l.className = "ct-l";
        l.textContent = ch === " " ? " " : ch;
        box.appendChild(l);
        letters.push({ el: l, x: 0, y: 0 });
      }
      e.textContent = "";
      e.appendChild(sr);
      e.appendChild(box);
      return { el: e, key: e.getAttribute("data-kind"), text: text, letters: letters, link: e.classList.contains("ct-link"), calm: 0, calmT: 0 };
    });
  }

  /* ================================================================ state */
  var T = { cx: 0, cy: 0, in: false, touching: false, demo: 0, focus: false };
  var S = { cx: 0, cy: 0, prox: 0, pull: 0, force: 0, offx: 0, offy: 0 };
  var lastMove = 0, last = 0, raf = 0, running = false;

  function easeTo(cur, tgt, dt, tau) { return cur + (tgt - cur) * (1 - Math.exp(-dt / tau)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function apply() {
    var M = mouthP, u = M.unit, portrait = W < H * 0.9;
    var ox = clamp((S.cx - M.x) / (3 * M.R), -1, 1) * S.force, oy = clamp((S.cy - M.y) / (3 * M.R), -1, 1) * S.force;
    S.offx = ox; S.offy = oy;

    /* the creature perceives the cursor: the mass leans a little, the mouth swells, the throat shifts in depth */
    placeCreature(ox * 10, oy * 8, ox * 1.4, S.prox);
    parts.mouth.setAttribute("transform", "scale(" + (1 + 0.075 * S.prox).toFixed(4) + ")");
    parts.layers.forEach(function (L) {
      L.g.setAttribute("transform", "translate(" + (-ox * L.depth * 3.2).toFixed(4) + " " + (-oy * L.depth * 3.2).toFixed(4) + ")");
    });
    parts.teeth.setAttribute("transform", "translate(" + (-ox * 0.025).toFixed(4) + " " + (-oy * 0.025).toFixed(4) + ") scale(" + (1 + 0.045 * S.prox).toFixed(4) + ")");

    /* each letter is drawn in towards the mouth: stretched along the pull, curled, smaller as it sinks */
    var Rg = M.R * 3.4;
    words.forEach(function (w) {
      var calm = w.calm;
      w.letters.forEach(function (l) {
        var dx = M.x - l.x, dy = M.y - l.y, r = Math.sqrt(dx * dx + dy * dy) || 1;
        var fall = Math.exp(-(r * r) / (Rg * Rg));
        var fp = S.pull * fall * (1 - calm);
        var cdx = l.x - S.cx, cdy = l.y - S.cy, cr2 = cdx * cdx + cdy * cdy;
        var dent = S.force * Math.exp(-cr2 / (M.R * M.R * 0.9)) * (1 - calm);
        if (fp < 0.002 && dent < 0.002) { l.el.style.transform = ""; return; }
        var ang = Math.atan2(dy, dx);
        var c = Math.cos(ang), s = Math.sin(ang);
        var sx = 1 + fp * 1.15, sy = 1 - fp * 0.42, k = 1 - dent * 0.22;
        var a = (sx * c * c + sy * s * s) * k, b = (sx - sy) * s * c * k, d = (sx * s * s + sy * c * c) * k;
        var curl = fp * 0.55, cc = Math.cos(curl), cs = Math.sin(curl);
        var m11 = cc * a - cs * b, m12 = cs * a + cc * b, m21 = cc * b - cs * d, m22 = cs * b + cc * d;
        var tx = dx * fp * 0.62, ty = dy * fp * 0.62;
        l.el.style.transform = "matrix(" + m11.toFixed(4) + "," + m12.toFixed(4) + "," + m21.toFixed(4) + "," + m22.toFixed(4) + "," + tx.toFixed(2) + "," + ty.toFixed(2) + ")";
      });
    });
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    var dt = Math.min(64, Math.max(1, now - (last || now - 16)));
    last = now;
    var M = mouthP;

    if (T.demo) {                                    // touch: the presence drifts to the mouth once
      var k = Math.min(1, (now - T.demo) / 3000);
      if (k >= 1) { T.demo = 0; T.in = false; }
      else {
        var e = Math.sin(k * Math.PI);
        T.cx = W * 0.12 * (1 - e) + (M.x - M.R * 1.4) * e;
        T.cy = H * 0.30 * (1 - e) + (M.y - M.R * 0.4) * e;
        T.in = true;
      }
    }
    S.cx = easeTo(S.cx, T.cx, dt, 150);
    S.cy = easeTo(S.cy, T.cy, dt, 150);
    var active = (T.in || T.touching) ? 1 : 0;
    var dist = Math.hypot(S.cx - M.x, S.cy - M.y);
    var prox = Math.exp(-Math.pow(dist / (3.2 * M.R), 2)) * active;
    var pullMax = W < H * 0.9 ? 0.42 : 0.80;
    S.prox = easeTo(S.prox, prox, dt, 420);
    S.pull = easeTo(S.pull, pullMax * prox, dt, 380);
    S.force = easeTo(S.force, active, dt, active ? 220 : 520);
    var anyCalm = false;
    words.forEach(function (w) {
      w.calm = easeTo(w.calm, w.calmT, dt, 200);
      if (Math.abs(w.calm - w.calmT) > 0.003) anyCalm = true;
    });

    apply();

    var settled = !active && S.pull < 0.002 && S.force < 0.002 && S.prox < 0.002 && !T.demo && !anyCalm;
    if (settled) { S.pull = S.force = S.prox = 0; apply(); running = false; return; }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduce || running) return;
    running = true; last = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ================================================================ input */
  function setCursor(e) {
    var r = page.getBoundingClientRect();
    T.cx = e.clientX - r.left; T.cy = e.clientY - r.top;
    lastMove = performance.now();
  }
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    T.demo = 0; T.in = true; setCursor(e); start();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch") { T.in = false; start(); } });
  window.addEventListener("blur", function () { T.in = false; start(); });

  page.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "touch") return;
    if (e.target.closest && e.target.closest(".ct-link")) return;      // let the tap reach the link
    T.demo = 0; T.touching = true; T.in = true; setCursor(e); start();
  }, { passive: true });
  page.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "touch" || !T.touching) return;
    setCursor(e);
  }, { passive: true });
  function releaseTouch(e) {
    if (e.pointerType !== "touch") return;
    setTimeout(function () { T.touching = false; T.in = false; start(); }, 1600);
  }
  page.addEventListener("pointerup", releaseTouch);
  page.addEventListener("pointercancel", releaseTouch);

  function hot(w, on) {
    w.calmT = on ? 1 : 0;
    w.el.classList.toggle("is-hot", on);
    if (reduce) { w.calm = w.calmT; apply(); } else start();
  }

  /* ================================================================ boot */
  function boot() {
    buildCreature();
    buildWords();
    layout();
    words.forEach(function (w) {
      if (!w.link) return;
      w.el.addEventListener("pointerenter", function () { hot(w, true); });
      w.el.addEventListener("pointerleave", function () { hot(w, false); });
      w.el.addEventListener("focus", function () { hot(w, true); });
      w.el.addEventListener("blur", function () { hot(w, false); });
    });
    S.cx = T.cx = mouthP.x - mouthP.R * 3;
    S.cy = T.cy = mouthP.y - mouthP.R * 1.5;
    apply();
    if (!reduce && touchOnly) setTimeout(function () { if (!T.touching) { T.demo = performance.now(); start(); } }, 1000);
  }

  var resizeT = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { layout(); apply(); }, 140);
  }, { passive: true });

  var fontsReady = (document.fonts && document.fonts.load)
    ? Promise.all([document.fonts.load("700 100px Archivo"), document.fonts.load('italic 400 40px "EB Garamond"')]).catch(function () {})
    : Promise.resolve();
  var guard = new Promise(function (res) { setTimeout(res, 2500); });
  Promise.race([fontsReady, guard]).then(boot);
})();
