/* ==========================================================================
   OTI intro — Phase 3: ONE drop of paint (preview page only)

   A single drop is born under the T's bar, near its slanted end, where there
   is free space beside the stem. Everything is a pure function of p in [0, 1],
   exactly as it will be when it is wired to the scroll in Phase 4:

     0.00 – 0.16  a bead of paint swells on the underside of the bar
     0.06 – 0.68  the mass sags: a bulb grows at the end of a stretching neck
                  (slow at first, heavy, then it speeds up)
     0.52 – 0.72  the neck thins into a thread
     0.72 – 0.86  the thread snaps: the upper part recoils into a small bead
                  that stays on the bar, the lower tail pulls into the bulb
     0.72 – 1.00  the free drop falls with gravity, stretching as it speeds up

   The preview auto-plays once (p goes 0 -> 1 over 9 s) and can be scrubbed
   with the slider, forwards and backwards. Nothing here touches the live site.
   ========================================================================== */
(function () {
  "use strict";

  var body = document.getElementById("drop-body");
  if (!body) return;
  var clipPath = document.getElementById("drop-clip-path");
  var shade = document.getElementById("drop-shade");
  var shine = document.getElementById("drop-shine");
  var slider = document.getElementById("drop-scrub");
  var replay = document.getElementById("drop-replay");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var X0 = 845;          // where the drop is born (under the T's bar, right of the stem)
  var Y0 = 210;          // underside of the bar

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function f(n) { return n.toFixed(2); }

  function draw(p) {
    if (p <= 0.002) {
      body.removeAttribute("d");
      clipPath.removeAttribute("d");
      shade.setAttribute("visibility", "hidden");
      shine.setAttribute("visibility", "hidden");
      return;
    }

    var s1 = smooth(0.0, 0.16, p);                     // bead swells
    var g = smooth(0.08, 0.68, p);                     // sagging mass
    var gE = Math.pow(g, 1.35);                        // heavy: slow start
    var br = smooth(0.52, 0.72, p);                    // neck thins
    var s = smooth(0.72, 0.86, p);                     // snap + recoil
    var u = clamp((p - 0.72) / 0.28, 0, 1);            // free fall

    // bulb
    var R = 9 * s1 + 31 * smooth(0.06, 0.6, p);
    var ryAtt = R * (1 + 0.36 * g);
    var ry = u > 0 ? R * (1 + 0.62 * Math.sin(Math.min(1, u * 1.15) * Math.PI / 2)) * (1 - 0.1 * u) : ryAtt;
    var rx = R * (1 - 0.1 * u);
    var cyBase = Y0 + 4 + R * 0.9 + 150 * gE;
    var fall = 640 * u * u;
    var cy = cyBase + fall;
    var leanA = 7 * smooth(0.15, 0.7, p);              // the mass leans a little as it sags
    var bx = X0 + leanA + 6 * u;

    // neck / thread
    var wNeck = (30 - 10 * g) * s1;
    var wThread = lerp(wNeck * 0.62, 1.4, br);              // the waist where it will snap
    var wRoot = lerp(wNeck, 15, s);
    var fil = wRoot * 1.0 + 2;                         // fillet into the bar
    var yPinch = Math.max(Y0 + fil + 6, lerp(Y0 + fil + 6, cyBase - ryAtt, 0.5));   // waist height: mid-neck

    // upper part: neck from the bar down to a tip that recoils after the snap
    var yU = lerp(yPinch, Y0 + 14, s);
    var wUt = lerp(wThread, 12, s);
    var fracU = clamp((yU - Y0) / Math.max(1, yPinch - Y0), 0, 1);
    var xU = X0 + leanA * fracU;

    var dU = Math.min(Y0 + fil, yU - 3);
    var d = "";
    if (wNeck > 0.3) {
      var dy = Math.max(1, (yU - dU)) * 0.5;
      d +=
        "M" + f(X0 - wRoot - fil) + "," + (Y0 - 6) +
        "C" + f(X0 - wRoot - fil * 0.3) + "," + (Y0 - 6) + " " + f(X0 - wRoot) + "," + f(Y0 - fil * 0.2) + " " + f(X0 - wRoot) + "," + f(dU) +
        "C" + f(X0 - wRoot) + "," + f(dU + dy) + " " + f(xU - wUt) + "," + f(yU - dy) + " " + f(xU - wUt) + "," + f(yU) +
        "A" + f(wUt) + " " + f(wUt) + " 0 0 0 " + f(xU + wUt) + " " + f(yU) +
        "C" + f(xU + wUt) + "," + f(yU - dy) + " " + f(X0 + wRoot) + "," + f(dU + dy) + " " + f(X0 + wRoot) + "," + f(dU) +
        "C" + f(X0 + wRoot) + "," + f(Y0 - fil * 0.2) + " " + f(X0 + wRoot + fil * 0.3) + "," + (Y0 - 6) + " " + f(X0 + wRoot + fil) + "," + (Y0 - 6) +
        "Z";
    }

    // lower part: bulb with a tail that pulls into it after the snap
    var yL = lerp(yPinch - 6 + fall, cy - ry * 0.97, s);
    var fracL = clamp((yL - Y0) / Math.max(1, yPinch - Y0), 0, 1);
    var tx = lerp(X0 + leanA * fracL, bx, s);
    var wL = lerp(wThread, 0.05 * R + 1.5, s);
    var t = Math.max(2, cy - yL);
    var c2 = lerp(Math.min(t, ry * 1.2) * 0.5, ry * 0.5, s);
    var c1x = lerp(wL, R * 0.5, s);                    // neck: straight down; free drop: convex teardrop
    if (R > 0.8) {
      d +=
        "M" + f(tx - wL) + "," + f(yL) +
        "C" + f(tx - c1x) + "," + f(yL + t * 0.5) + " " + f(bx - rx) + "," + f(cy - c2) + " " + f(bx - rx) + "," + f(cy) +
        "A" + f(rx) + " " + f(ry) + " 0 0 0 " + f(bx + rx) + " " + f(cy) +
        "C" + f(bx + rx) + "," + f(cy - c2) + " " + f(tx + c1x) + "," + f(yL + t * 0.5) + " " + f(tx + wL) + "," + f(yL) +
        "A" + f(wL) + " " + f(wL) + " 0 0 0 " + f(tx - wL) + " " + f(yL) +
        "Z";
    }

    body.setAttribute("d", d);
    clipPath.setAttribute("d", d);

    // volume: a soft light/shade on the bulb only, clipped to the paint shape
    if (R > 6) {
      shade.setAttribute("visibility", "visible");
      shade.setAttribute("cx", f(bx));
      shade.setAttribute("cy", f(cy));
      shade.setAttribute("rx", f(rx));
      shade.setAttribute("ry", f(ry));
      shine.setAttribute("visibility", "visible");
      shine.setAttribute("cx", f(bx - rx * 0.36));
      shine.setAttribute("cy", f(cy - ry * 0.24));
      shine.setAttribute("rx", f(rx * 0.17));
      shine.setAttribute("ry", f(ry * 0.3));
      shine.setAttribute("transform", "rotate(18 " + f(bx - rx * 0.36) + " " + f(cy - ry * 0.24) + ")");
    } else {
      shade.setAttribute("visibility", "hidden");
      shine.setAttribute("visibility", "hidden");
    }
  }

  /* ---- preview driver: auto-play once, slider for scrubbing both ways ---- */
  var p = 0, raf = 0, start = 0, from = 0;
  var DURATION = 9000;

  function set(v) {
    p = clamp(v, 0, 1);
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
    from = fromP || 0;
    start = 0;
    var step = function (now) {
      if (id !== raf) return;
      if (!start) start = now - from * DURATION;
      var v = clamp((now - start) / DURATION, 0, 1);
      set(v);
      if (v < 1) next(step);
    };
    set(from);
    next(step);
  }

  if (slider) {
    slider.addEventListener("input", function () { stop(); set(Number(slider.value) / 1000); });
  }
  if (replay) replay.addEventListener("click", function () { play(0); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "r" || e.key === "R") play(0);
  });

  if (reduce) { set(0.6); }
  else { set(0); setTimeout(function () { play(0); }, 900); }
})();
