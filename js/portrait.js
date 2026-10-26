/* ==========================================================================
   Cover — the portrait that hides ARCHIVE underneath

   The portrait is an ordinary <img>. Under it sits the real link, "ARCHIVE".
   While the pointer is over the HEAD zone, a soft hole is cut in the image
   with a CSS mask, centred on the pointer, and it grows more transparent the
   longer the pointer stays (a eased 0 -> 1). Leaving the zone eases it back
   to fully opaque. Outside the head zone the image is never touched.

   The mask has two layers, composited with "add" (source-over):
       A  = the area OUTSIDE the head zone (an SVG made from the zone polygon below)
       B  = everywhere outside a soft circle around the pointer, at opacity 1 - a
   so the final opacity is  1 - H * C * a,  where H is the head zone and C the
   circle: transparent only where the circle and the head overlap.

   Nothing is deformed or animated except that opacity. The face is never moved.
   The link underneath is only clickable once it is revealed (a > .5); it is
   also reachable with Tab, which opens the hole over it.

   Touch: tapping the head reveals the word (held a few seconds); tapping the
   revealed word follows the link. On touch screens the word also peeks once at
   the start so the gesture is discoverable.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector(".portrait");
  if (!root) return;
  var stage = root.querySelector(".stage");
  var img = root.querySelector(".face");
  var link = root.querySelector(".archive");
  if (!stage || !img || !link) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touchOnly = window.matchMedia("(hover: none)").matches;

  /* The head zone, in 2000 x 2000 image pixels: the hair dome and forehead. */
  var ZONE = [[470, 720], [480, 560], [520, 450], [580, 360], [680, 270], [800, 190], [930, 150], [1070, 150],
              [1200, 185], [1330, 240], [1420, 320], [1490, 430], [1530, 560], [1540, 720]]
    .map(function (p) { return [p[0] / 2000, p[1] / 2000]; });

  var HOLE_R = 0.2;        // circle radius as a fraction of the portrait width
  var HOLE_INNER = 0.5;    // fraction of that radius that is fully clear

  function inZone(x, y) {
    var inside = false;
    for (var i = 0, j = ZONE.length - 1; i < ZONE.length; j = i++) {
      var xi = ZONE[i][0], yi = ZONE[i][1], xj = ZONE[j][0], yj = ZONE[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* layer A: black everywhere except the head zone, with a soft edge */
  var zoneUrl = (function () {
    var pts = ZONE.map(function (p) { return (p[0] * 2000).toFixed(0) + " " + (p[1] * 2000).toFixed(0); }).join(" L");
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 2000'>" +
      "<defs><filter id='b' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='26'/></filter></defs>" +
      "<path fill='#000' fill-rule='evenodd' filter='url(#b)' d='M-600 -600H2600V2600H-600Z M" + pts + "Z'/></svg>";
    return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
  })();

  /* ---- state (positions are fractions of the portrait) ---- */
  var s = { x: 0.5, y: 0.14, tx: 0.5, ty: 0.14, a: 0, aT: 0 };
  var rect = null;
  var running = false;
  var holdTimer = null;
  var pointerIn = false;

  function measure() { rect = img.getBoundingClientRect(); }

  function wordCenter() {
    var l = link.getBoundingClientRect();
    if (!rect || !rect.width) return { x: 0.51, y: 0.14 };
    return { x: (l.left + l.width / 2 - rect.left) / rect.width, y: (l.top + l.height / 2 - rect.top) / rect.height };
  }

  function draw() {
    var m;
    if (s.a < 0.004) {
      m = "none";
    } else {
      var w = rect.width, R = HOLE_R * w, inner = R * HOLE_INNER;
      var k = (1 - s.a).toFixed(3);
      m = "radial-gradient(circle " + R.toFixed(1) + "px at " + (s.x * w).toFixed(1) + "px " + (s.y * rect.height).toFixed(1) + "px, " +
          "rgba(0,0,0," + k + ") 0, rgba(0,0,0," + k + ") " + inner.toFixed(1) + "px, #000 " + R.toFixed(1) + "px), " + zoneUrl;
    }
    if (m === "none") {
      img.style.webkitMaskImage = ""; img.style.maskImage = "";
      img.style.webkitMaskSize = ""; img.style.maskSize = "";
      img.style.webkitMaskRepeat = ""; img.style.maskRepeat = "";
    } else {
      img.style.webkitMaskImage = m; img.style.maskImage = m;
      img.style.webkitMaskSize = "100% 100%, 100% 100%"; img.style.maskSize = "100% 100%, 100% 100%";
      img.style.webkitMaskRepeat = "no-repeat"; img.style.maskRepeat = "no-repeat";
    }
    root.classList.toggle("is-open", s.a > 0.5);
  }

  function next(fn) {
    var done = false;
    var run = function () { if (done) return; done = true; fn(); };
    window.requestAnimationFrame(run);
    setTimeout(run, 50);                  // safety net if frames are paused
  }

  /* one loop, alive only while something is still easing */
  function pump() {
    if (running) return;
    running = true;
    var step = function () {
      var kp = reduce ? 1 : 0.22;
      s.x += (s.tx - s.x) * kp;
      s.y += (s.ty - s.y) * kp;
      var ka = reduce ? 1 : (s.aT > s.a ? 0.07 : 0.1);   // reveals progressively, closes a little faster
      s.a += (s.aT - s.a) * ka;
      if (Math.abs(s.aT - s.a) < 0.004) s.a = s.aT;
      if (Math.abs(s.tx - s.x) < 0.0004) s.x = s.tx;
      if (Math.abs(s.ty - s.y) < 0.0004) s.y = s.ty;
      draw();
      var settling = s.a !== s.aT || s.x !== s.tx || s.y !== s.ty;
      if (settling) next(step); else running = false;
    };
    next(step);
  }

  function reveal(x, y) { s.tx = x; s.ty = y; s.aT = 1; pump(); }
  function conceal() { s.aT = 0; pump(); }

  /* ---- mouse / pen: reveal while the pointer is over the head zone ---- */
  stage.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    if (!rect) measure();
    var nx = (e.clientX - rect.left) / rect.width, ny = (e.clientY - rect.top) / rect.height;
    pointerIn = true;
    if (inZone(nx, ny)) reveal(nx, ny); else conceal();
  }, { passive: true });
  stage.addEventListener("pointerleave", function (e) {
    pointerIn = false;
    if (e.pointerType !== "touch" && document.activeElement !== link) conceal();
  });

  /* ---- keyboard: Tab reaches the hidden link and opens the hole over it ---- */
  link.addEventListener("focus", function () {
    if (!rect) measure();
    var c = wordCenter();
    reveal(c.x, c.y);
  });
  link.addEventListener("blur", function () { if (!pointerIn) conceal(); });

  /* ---- touch: tap the head to reveal, tap the word to follow it ---- */
  stage.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "touch") return;
    if (!rect) measure();
    if (root.classList.contains("is-open") && e.target.closest(".archive")) return;   // let the tap reach the link
    var nx = (e.clientX - rect.left) / rect.width, ny = (e.clientY - rect.top) / rect.height;
    clearTimeout(holdTimer);
    if (inZone(nx, ny)) {
      var c = wordCenter();
      reveal(c.x, c.y);
      holdTimer = setTimeout(conceal, 6000);
    } else {
      conceal();
    }
  });

  window.addEventListener("resize", function () { measure(); draw(); }, { passive: true });
  window.addEventListener("load", measure);
  measure();

  /* On touch screens the word peeks once, so the gesture can be discovered. */
  if (touchOnly && !reduce) {
    setTimeout(function () {
      measure();
      var c = wordCenter();
      reveal(c.x, c.y);
      holdTimer = setTimeout(conceal, 1600);
    }, 900);
  }
})();
