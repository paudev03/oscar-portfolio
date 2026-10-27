/* ==========================================================================
   Contact — the mouth speaks

   The mouth is the portrait's own mouth, drawn on a canvas in thin vertical
   strips. Opening it moves the upper strips up and the lower strips down by an
   amount that is largest in the middle and zero at the corners, so the lips
   part into a lens and the dark inside shows between them. Nothing else in the
   photo moves or is deformed.

   While the mouth is open it says words: real <li> elements (.w) that leave
   the mouth one by one, drift to a free spot around it and, if they are not
   marked data-keep, fade away. The mail link is an ordinary mailto: link.

   Cursor: entering the mouth opens it; leaving it (and not going on to a word)
   closes it after a short grace period, and every word goes back in.
   Touch: tap the mouth to open it, tap it again or tap elsewhere to close it.
   Keyboard: focusing the mail link opens the mouth.
   Reduced motion: the lips part and the words appear, without travelling.
   ========================================================================== */
(function () {
  "use strict";

  var page = document.querySelector(".mouth-page");
  if (!page) return;
  var mouth = page.querySelector(".mouth");
  var cv = page.querySelector(".mouth-canvas");
  var list = page.querySelector(".words");
  if (!mouth || !cv || !list || !cv.getContext) return;
  var ctx = cv.getContext("2d");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touchOnly = window.matchMedia("(hover: none)").matches;

  /* ---- the photo: 850 x 290, the lips meet along y = SEAM ---- */
  var IMG_W = 850, IMG_H = 290, SEAM = 120;
  var CX = 425, HALF = 372;            // the lips run from CX - HALF to CX + HALF
  var G = 56;                          // the widest opening, in photo pixels
  var STRIP = 2;
  var img = new Image();
  var ready = false;
  var k = 1, dpr = 1;                  // css px per photo px, device pixel ratio

  function size() {
    var w = mouth.clientWidth;
    if (!w) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    k = w / IMG_W;
    var h = (IMG_H + G) * k;
    cv.style.height = h + "px";
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }

  function profile(x) {                // 0 at the corners, 1 in the middle
    var u = (x - CX) / HALF;
    return u > -1 && u < 1 ? Math.pow(1 - u * u, 1.25) : 0;
  }

  function draw(g) {
    if (!ready) return;
    var s = cv.width / IMG_W;          // canvas px per photo px
    var oy = (G / 2) * s;              // room above the photo for the upper lip to rise
    var gap = G * g;
    var ySeam = oy + SEAM * s;
    ctx.clearRect(0, 0, cv.width, cv.height);

    if (gap > 0.6) {
      // the inside of the mouth, between the two lips
      var gr = ctx.createLinearGradient(0, ySeam - (G / 2) * s, 0, ySeam + (G / 2) * s);
      gr.addColorStop(0, "#0a0606");
      gr.addColorStop(0.5, "#150a0c");
      gr.addColorStop(0.82, "#3a0e15");
      gr.addColorStop(1, "#5e1822");
      ctx.fillStyle = gr;
      ctx.beginPath();
      var x, p, h, e = Math.min(1.5, gap * s / 2);   // the overlap with the lips fades with the opening
      ctx.moveTo(0, ySeam);
      for (x = 0; x <= IMG_W; x += STRIP) {
        p = profile(x + STRIP / 2);
        h = gap * p * s / 2;
        ctx.lineTo(x * s, ySeam - (p > 0 ? h + e : 0));
      }
      for (x = IMG_W; x >= 0; x -= STRIP) {
        p = profile(x - STRIP / 2);
        h = gap * p * s / 2;
        ctx.lineTo(x * s, ySeam + (p > 0 ? h + e : 0));
      }
      ctx.closePath();
      ctx.fill();
    }

    // the lips, in strips: upper part up, lower part down (whole canvas pixels, so strips never overlap or leave gaps)
    for (var sx = 0; sx < IMG_W; sx += STRIP) {
      var half = gap * profile(sx + STRIP / 2) * s / 2;
      var x0 = Math.round(sx * s), x1 = Math.round((sx + STRIP) * s);
      ctx.drawImage(img, sx, 0, STRIP, SEAM, x0, oy - half, x1 - x0, SEAM * s);
      ctx.drawImage(img, sx, SEAM, STRIP, IMG_H - SEAM, x0, ySeam + half, x1 - x0, (IMG_H - SEAM) * s);
    }
  }

  /* ---- the opening, eased in time; while it speaks it moves a little, like syllables ---- */
  var open = false, peek = false;
  var g = 0, bump = 0, last = 0, running = false;

  function aim(now) {
    if (!(open || peek)) return 0;
    if (reduce) return 0.7;
    var t = now / 1000;
    var n = Math.sin(t * 5.1) * 0.5 + Math.sin(t * 8.7 + 1.3) * 0.3 + Math.sin(t * 2.3 + 0.4) * 0.2;
    return Math.max(0.35, Math.min(1, (peek && !open ? 0.5 : 0.6) + n * 0.15 + bump));
  }

  function next(fn) {
    var done = false;
    var run = function () { if (done) return; done = true; fn(); };
    window.requestAnimationFrame(run);
    setTimeout(run, 50);               // safety net if frames are paused
  }

  function loop() {
    if (running) return;
    running = true;
    last = performance.now();
    var step = function () {
      var now = performance.now();
      var dt = Math.min(64, Math.max(1, now - last));
      last = now;
      bump *= Math.exp(-dt / 170);
      var to = aim(now);
      var tau = reduce ? 1 : (to > g ? 90 : 140);
      g += (to - g) * (1 - Math.exp(-dt / tau));
      if (Math.abs(to - g) < 0.002 && to === 0) g = 0;
      draw(g);
      if (open || peek || g > 0) next(step); else running = false;
    };
    next(step);
  }

  /* ---- the words ---- */
  var words = [].slice.call(list.children).map(function (li, i) {
    var inner = document.createElement("span");
    inner.className = "w-in";
    while (li.firstChild) inner.appendChild(li.firstChild);
    li.appendChild(inner);
    inner.style.setProperty("--dx", (Math.random() * 8 - 4).toFixed(1) + "px");
    inner.style.setProperty("--dy", (Math.random() * 8 - 4).toFixed(1) + "px");
    inner.style.setProperty("--dr", (Math.random() * 1.6 - 0.8).toFixed(2) + "deg");
    inner.style.setProperty("--dur", (6 + Math.random() * 4).toFixed(1) + "s");
    inner.style.setProperty("--delay", (-Math.random() * 6).toFixed(1) + "s");
    return {
      el: li, link: li.querySelector("a"), keep: li.hasAttribute("data-keep"),
      burst: li.hasAttribute("data-burst"), hold: +li.getAttribute("data-hold") || 0,
      shown: false, rect: null, main: null, fade: null, timer: null
    };
  });
  var bursts = words.filter(function (w) { return w.burst; });
  var pool = words.filter(function (w) { return !w.burst; });
  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

  function bounds() {
    var pr = page.getBoundingClientRect();
    var hd = document.querySelector(".site-header");
    var top = (hd ? hd.getBoundingClientRect().bottom : 0) - pr.top + 14;
    return { l: 16, t: Math.max(top, 16), r: pr.width - 16, b: pr.height - 16 };
  }
  function mouthBox() {
    var r = cv.getBoundingClientRect(), pr = page.getBoundingClientRect();
    var pad = (G / 2) * k;
    return { x: r.left - pr.left, y: r.top - pr.top + pad, w: r.width, h: IMG_H * k };
  }
  function overlap(a, b, pad) {
    return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
  }

  /* find a free spot for a word around the mouth; returns its centre and angle, or null */
  function place(w) {
    var B = bounds(), M = mouthBox();
    var ox = M.x + M.w / 2, oy = M.y + (SEAM / IMG_H) * M.h;
    var el = w.el;
    var cw = el.offsetWidth, ch = el.offsetHeight;
    var maxRot = w.link ? 3 : (el.className.indexOf("w--xl") > -1 ? 8 : 16);
    var best = null, bestScore = Infinity;
    var taken = words.filter(function (o) { return o !== w && o.shown && o.rect; });
    for (var pass = 0; pass < 2 && !best; pass++) {
      var gap = pass ? 4 : 16;
      for (var i = 0; i < 140; i++) {
        var rot = (Math.random() * 2 - 1) * maxRot;
        var a = rot * Math.PI / 180;
        var bw = Math.abs(cw * Math.cos(a)) + Math.abs(ch * Math.sin(a));
        var bh = Math.abs(cw * Math.sin(a)) + Math.abs(ch * Math.cos(a));
        var cx = B.l + bw / 2 + Math.random() * Math.max(0, B.r - B.l - bw);
        var cy = B.t + bh / 2 + Math.random() * Math.max(0, B.b - B.t - bh);
        var box = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
        if (overlap(box, M, 22)) continue;
        var bad = false;
        for (var j = 0; j < taken.length; j++) if (overlap(box, taken[j].rect, gap)) { bad = true; break; }
        if (bad) continue;
        var d = Math.hypot(cx - ox, (cy - oy) * 1.35);
        var score = d + Math.random() * 120;
        if (score < bestScore) { bestScore = score; best = { x: cx, y: cy, rot: rot, box: box, ox: ox, oy: oy }; }
      }
    }
    return best;
  }

  var T = "translate(-50%,-50%)";
  function emit(w) {
    if (w.shown || !open) return;
    var p = place(w);
    if (!p) return;
    w.shown = true;
    w.rect = p.box;
    clearTimeout(w.timer);
    var el = w.el;
    el.style.left = p.x.toFixed(1) + "px";
    el.style.top = p.y.toFixed(1) + "px";
    bump = Math.max(bump, 0.28);

    if (reduce) {
      el.style.transform = T + " rotate(" + p.rot.toFixed(1) + "deg)";
      el.classList.add("is-on");
      if (w.link) el.classList.add("is-live");
      return;
    }

    // leaves the mouth, curves a little off the straight line, slows down as it arrives
    var dx = p.ox - p.x, dy = p.oy - p.y;
    var len = Math.hypot(dx, dy) || 1;
    var side = (Math.random() < 0.5 ? -1 : 1) * len * (0.04 + Math.random() * 0.07);
    var mx = dx * 0.4 - (dy / len) * side, my = dy * 0.4 + (dx / len) * side;
    var dur = 1150 + Math.random() * 500 + len * 0.35;
    var ease = "cubic-bezier(.2,.65,.3,1)";
    w.main = el.animate([
      { transform: T + " translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(.18) rotate(" + (p.rot * 0.2).toFixed(1) + "deg)", opacity: 0, filter: "blur(6px)", offset: 0, easing: ease },
      { transform: T + " translate(" + mx.toFixed(1) + "px," + my.toFixed(1) + "px) scale(.7) rotate(" + (p.rot * 0.6).toFixed(1) + "deg)", opacity: 0.9, filter: "blur(1px)", offset: 0.4, easing: ease },
      { transform: T + " rotate(" + p.rot.toFixed(1) + "deg)", opacity: 1, filter: "blur(0px)", offset: 1 }
    ], { duration: dur, fill: "forwards" });
    if (w.link) later(function () { if (w.shown) w.el.classList.add("is-live"); }, dur * 0.7);

    // the ones that are not meant to stay fade away on their own
    if (!w.keep) {
      var hold = w.hold || (2000 + Math.random() * 1600);
      w.timer = setTimeout(function () { fadeOut(w); }, dur + hold);
    }
  }

  function fadeOut(w) {
    if (!w.shown || !w.main) return;
    w.fade = w.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1500 + Math.random() * 700, fill: "forwards", easing: "ease-in" });
    w.fade.onfinish = function () { release(w); };
  }

  function release(w) {
    clearTimeout(w.timer);
    if (w.fade) { w.fade.cancel(); w.fade = null; }
    if (w.main) { w.main.cancel(); w.main = null; }
    w.el.classList.remove("is-live", "is-on");
    w.el.style.transform = "";
    w.shown = false;
    w.rect = null;
  }

  /* ---- speaking: a first burst, then a word now and then ---- */
  var talkTimer = null;
  function talk() {
    if (!open) return;
    var free = pool.filter(function (w) { return !w.shown; });
    if (free.length) emit(free[Math.floor(Math.random() * free.length)]);
    talkTimer = later(talk, 1300 + Math.random() * 1300);
  }

  function openMouth() {
    if (open) return;
    open = true; peek = false;
    page.classList.add("is-open");
    loop();
    if (reduce) {
      bursts.forEach(function (w) { emit(w); });
      return;
    }
    var t = 150;
    bursts.forEach(function (w, i) {
      later(function () { emit(w); }, t);
      t += 230 + Math.random() * 300;
    });
    talkTimer = later(talk, t + 700);
  }

  function closeMouth() {
    if (!open) return;
    open = false;
    page.classList.remove("is-open");
    timers.forEach(clearTimeout); timers = [];
    clearTimeout(talkTimer);
    var i = 0;
    words.forEach(function (w) {
      if (!w.shown) return;
      var delay = i++ * 45;
      w.el.classList.remove("is-live");
      clearTimeout(w.timer);
      if (reduce) { release(w); return; }
      if (w.fade || !w.main) { release(w); return; }
      // back into the mouth: the arrival played backwards
      w.main.playbackRate = -1.5;
      w.main.onfinish = null;
      setTimeout(function () {
        w.main.play();
        w.main.onfinish = function () { release(w); };
      }, delay);
    });
    loop();
  }

  function hardClose() {
    open = false; peek = false;
    page.classList.remove("is-open");
    timers.forEach(clearTimeout); timers = [];
    words.forEach(release);
    g = 0;
    draw(0);
  }

  /* ---- who is "inside": the mouth, or a word that is a link, or keyboard focus ---- */
  var overMouth = false, overWord = false, focusIn = false, closeTimer = null;
  function settle() {
    clearTimeout(closeTimer);
    if (overMouth || overWord || focusIn) return;
    if (touchOnly) return;
    closeTimer = setTimeout(closeMouth, 1100);   // time to move from the mouth to a word
  }

  mouth.addEventListener("pointerenter", function (e) {
    if (e.pointerType === "touch") return;
    overMouth = true; clearTimeout(closeTimer); openMouth();
  });
  mouth.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "touch") return;
    overMouth = false; settle();
  });
  words.forEach(function (w) {
    if (!w.link) return;
    w.el.addEventListener("pointerenter", function () { overWord = true; clearTimeout(closeTimer); });
    w.el.addEventListener("pointerleave", function () { overWord = false; settle(); });
    w.link.addEventListener("focus", function () { focusIn = true; clearTimeout(closeTimer); openMouth(); });
    w.link.addEventListener("blur", function () { focusIn = false; settle(); });
  });

  /* touch: tap the mouth to open it, tap it again (or anywhere else) to close it */
  mouth.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "touch") return;
    e.preventDefault();
    if (open) closeMouth(); else openMouth();
  });
  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "touch" || !open) return;
    if (mouth.contains(e.target) || list.contains(e.target)) return;
    closeMouth();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { focusIn = false; overMouth = false; overWord = false; closeMouth(); } });

  /* ---- start ---- */
  var resizeT = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { hardClose(); size(); draw(0); }, 120);
  }, { passive: true });

  img.onload = function () {
    ready = true;
    size();
    draw(0);
    // on touch screens the lips part once, so the gesture can be discovered
    if (touchOnly && !reduce) {
      setTimeout(function () {
        if (open) return;
        peek = true; loop();
        setTimeout(function () { peek = false; }, 1400);
      }, 1000);
    }
  };
  img.src = "assets/contact/mouth.webp?v=2";
})();
