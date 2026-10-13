/* ==========================================================================
   ARCHIVO — lienzo
   Lee window.ARCHIVO (contenido, js/archivo-data.js) y window.ARCHIVO_LAYOUT
   (coordenadas, js/archivo-layout.js) y construye un lienzo navegable.

   Una única cámara {x, y, z} es la fuente de verdad:
     - el mundo se transforma con translate(x, y) scale(z)
     - el minimapa y el porcentaje de zoom se derivan de ella
   Filtro por categorías, buscador y vista ampliada comparten el mismo estado.
   ========================================================================== */
(function () {
  "use strict";

  var DATA = window.ARCHIVO;
  var board = document.getElementById("board");
  if (!DATA || !board) return;

  var BASE = DATA.basePath || "";
  var TYPE_CLASS = {
    "fotografía": "photo", "proyecto": "project", "boceto": "sketch", "cartel": "poster",
    "editorial": "editorial", "fragmento": "fragment", "color": "color", "nota": "note"
  };
  var TAPE_TYPES = { photo: 1, sketch: 1, note: 1, fragment: 1 };

  /* ---------- utilidades ---------- */

  function $(sel) { return document.querySelector(sel); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function norm(s) {
    return String(s == null ? "" : s)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function src(file) { return BASE + file; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* requestAnimationFrame con red de seguridad: si el navegador pausa los
     fotogramas (pestaña sin foco, vista incrustada) el lienzo sigue respondiendo */
  function raf(fn) {
    var done = false;
    function run(t) {
      if (done) return;
      done = true;
      fn(typeof t === "number" ? t : performance.now());
    }
    window.requestAnimationFrame(run);
    setTimeout(run, 50);
  }

  /* ---------- datos ---------- */

  var groups = {};
  (DATA.groups || []).forEach(function (g) { groups[g.id] = g; });

  var byId = {};
  var pieces = (DATA.pieces || []).map(function (p, i) {
    p._i = i;
    p._type = TYPE_CLASS[p.type] || "other";
    var g = p.groupId && groups[p.groupId];
    p._hay = norm([
      p.title, p.description, p.text, p.category, p.type, p.year,
      (p.categories || []).join(" "), (p.tags || []).join(" "), g ? g.title : ""
    ].join(" "));
    byId[p.id] = p;
    return p;
  });

  /* categorías: las que traen las piezas; DATA.categories solo fija el orden */
  var catOrder = (DATA.categories || []).slice();
  var catCount = {};
  pieces.forEach(function (p) {
    p._cats = (p.categories && p.categories.length ? p.categories : (p.category ? [p.category] : []))
      .map(function (c) { return String(c); });
    p._catKeys = p._cats.map(norm);
    p._cats.forEach(function (c) {
      var k = norm(c);
      if (!(k in catCount)) {
        catCount[k] = { name: c, n: 0 };
        if (!catOrder.some(function (o) { return norm(o) === k; })) catOrder.push(c);
      }
      catCount[k].n++;
    });
  });
  var categories = catOrder
    .map(function (c) { var k = norm(c); return catCount[k] ? { key: k, name: catCount[k].name, n: catCount[k].n } : null; })
    .filter(Boolean);

  var state = { cat: null, q: "" };

  /* ---------- DOM ---------- */

  var LAYOUT = window.ARCHIVO_LAYOUT || { world: { w: 4000, h: 3000 }, pieces: {}, zones: [] };
  var stage = $("#stage");
  var filterEl = $("#filter");
  var filterBtn = $("#filter-btn");
  var filterLabel = $("#filter-label");
  var filterMenu = $("#filter-menu");
  var searchEl = $("#search");
  var countEl = $("#count");
  var resetEl = $("#reset");
  var emptyEl = $("#empty");
  var emptyQ = $("#empty-q");
  var emptyReset = $("#empty-reset");
  var zoomVal = $("#zoom-val");
  var minimap = $("#minimap");
  var mmMap = $("#mm-map");
  var mmView = $("#mm-view");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = {};
  var groupLabels = [];
  var zoneLabels = [];
  var mmDots = {};

  var world = board;                       // #board = el mundo (se transforma con la cámara)
  var W = LAYOUT.world.w, H = LAYOUT.world.h;

  /* ==================================================================
     1. CONSTRUCCIÓN DEL LIENZO (contenido + coordenadas)
     ================================================================== */

  function buildPiece(p, order) {
    var b = el("button", "piece piece--" + p._type);
    b.type = "button";
    b.setAttribute("aria-haspopup", "dialog");
    b.setAttribute("aria-label", p.title + ", " + p.year + ". " + p.category);
    b.dataset.id = p.id;
    b.style.setProperty("--rot", (p.rot || 0) + "deg");
    b.style.setProperty("--i", order);
    if (TAPE_TYPES[p._type] && p._i % 3 === 1) b.classList.add("has-tape");

    if (p.text) {
      b.classList.add("tone-" + (p.tone || "paper"));
      b.appendChild(el("span", "note-body", p.text));
    } else {
      var media = el("span", "piece-media");
      var img = document.createElement("img");
      img.src = src(p.thumb || p.image);
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      if (p.ratio) {
        img.width = 800;
        img.height = Math.round(800 / p.ratio);
        img.style.aspectRatio = String(p.ratio);
      }
      media.appendChild(img);
      b.appendChild(media);
    }

    var capEl = el("span", "piece-cap");
    capEl.appendChild(el("b", null, p.title));
    capEl.appendChild(el("time", null, String(p.year)));
    b.appendChild(capEl);

    els[p.id] = b;
    return b;
  }

  /* Posición: del layout. Una pieza sin coordenadas se coloca a la derecha. */
  var spill = 0;
  function place(p) {
    var l = LAYOUT.pieces[p.id];
    if (!l) {
      l = { x: LAYOUT.world.w + 160, y: 260 + spill * 360, w: 260 };
      spill++;
    }
    p._x = l.x; p._y = l.y; p._w = l.w;
    var b = els[p.id];
    b.style.left = l.x + "px";
    b.style.top = l.y + "px";
    b.style.width = l.w + "px";
  }

  function buildWorld() {
    var frag = document.createDocumentFragment();
    pieces.forEach(function (p, i) { frag.appendChild(buildPiece(p, i)); });

    // zonas: rótulos tenues, sin paneles
    (LAYOUT.zones || []).forEach(function (z) {
      var t = el("div", "zone-label", z.title);
      t.style.left = z.x + "px";
      t.style.top = z.y + "px";
      t.setAttribute("aria-hidden", "true");
      frag.appendChild(t);
      zoneLabels.push({ el: t, ids: z.ids });
    });

    // series: título pequeño sobre el grupo (se coloca tras medir)
    (DATA.groups || []).forEach(function (g) {
      var wrap = el("div", "group-label");
      wrap.setAttribute("aria-hidden", "true");
      wrap.appendChild(el("b", null, g.title));
      if (g.note) wrap.appendChild(el("i", null, g.note));
      frag.appendChild(wrap);
      groupLabels.push({
        el: wrap, group: g,
        ids: pieces.filter(function (p) { return p.groupId === g.id; }).map(function (p) { return p.id; })
      });
    });
    world.appendChild(frag);
    pieces.forEach(place);
  }

  /* medidas reales (alto de notas y pies) -> tamaño del mundo y minimapa */
  function measure() {
    var maxX = 0, maxY = 0;
    pieces.forEach(function (p) {
      p._h = els[p.id].offsetHeight;
      maxX = Math.max(maxX, p._x + p._w);
      maxY = Math.max(maxY, p._y + p._h);
    });
    // el mundo abarca exactamente las piezas, con el mismo margen en los cuatro lados
    var minX = Math.min.apply(null, pieces.map(function (p) { return p._x; }));
    var minY = Math.min.apply(null, pieces.map(function (p) { return p._y; }));
    var m = Math.max(120, Math.min(minX, minY));
    W = maxX + m;
    H = maxY + m;

    groupLabels.forEach(function (g) {
      var m = g.ids.map(function (id) { return byId[id]; });
      g.el.style.left = Math.min.apply(null, m.map(function (p) { return p._x; })) + "px";
      g.el.style.top = (Math.min.apply(null, m.map(function (p) { return p._y; })) - 70) + "px";
    });

    mmMap.style.aspectRatio = W + " / " + H;
    pieces.forEach(function (p) {
      var d = mmDots[p.id];
      if (!d) {
        d = el("i", "mm-dot mm-dot--" + p._type);
        mmMap.insertBefore(d, mmView);
        mmDots[p.id] = d;
        d.classList.toggle("is-off", !p._on);
      }
      d.style.left = (p._x / W * 100) + "%";
      d.style.top = (p._y / H * 100) + "%";
      d.style.width = (p._w / W * 100) + "%";
      d.style.height = (p._h / H * 100) + "%";
    });
    if (typeof sizeMinimap === "function") sizeMinimap();
  }

  /* ==================================================================
     2. CÁMARA: estado único + transformaciones
     ================================================================== */

  var PAD = 90;                     // holgura fuera del mural, en unidades del mundo
  var MAX_Z = 2.4;
  var cam = { x: 0, y: 0, z: 1 };
  var vw = 1, vh = 1;

  function measureStage() {
    var r = stage.getBoundingClientRect();
    vw = Math.max(1, r.width);
    vh = Math.max(1, r.height);
  }

  function fitZoom() {
    return Math.min(vw / (W + 2 * PAD), vh / (H + 2 * PAD));
  }
  function minZoom() { return fitZoom(); }

  function clampCam(c) {
    c.z = clamp(c.z, minZoom(), MAX_Z);
    var sw = (W + 2 * PAD) * c.z, sh = (H + 2 * PAD) * c.z;
    if (sw <= vw) c.x = (vw - W * c.z) / 2;
    else c.x = clamp(c.x, vw - (W + PAD) * c.z, PAD * c.z);
    if (sh <= vh) c.y = (vh - H * c.z) / 2;
    else c.y = clamp(c.y, vh - (H + PAD) * c.z, PAD * c.z);
    return c;
  }

  var frameQueued = false;
  function applyCam() {
    clampCam(cam);
    if (!frameQueued) {
      frameQueued = true;
      raf(render);
    }
    scheduleUpgrade();
  }

  /* conversión escala interna -> porcentaje visible */
  function zoomPercent() {
    var lo = minZoom();
    if (!(MAX_Z > lo) || !(cam.z > lo)) return 0;
    var pct = 200 * Math.log(cam.z / lo) / Math.log(MAX_Z / lo);
    return Math.round(clamp(pct, 0, 200));
  }

  /* pintado: lo único que ocurre en cada movimiento */
  function render() {
    frameQueued = false;
    world.style.transform = "translate3d(" + cam.x + "px," + cam.y + "px,0) scale(" + cam.z + ")";
    zoomVal.textContent = zoomPercent() + " %";
    stage.classList.toggle("is-far", cam.z < 0.34);

    var step = 56 * cam.z;
    stage.style.backgroundSize = step + "px " + step + "px";
    stage.style.backgroundPosition = cam.x + "px " + cam.y + "px";

    // minimapa derivado de la cámara
    var x = -cam.x / cam.z, y = -cam.y / cam.z, w = vw / cam.z, h = vh / cam.z;
    var l = clamp(x, 0, W), t = clamp(y, 0, H);
    var r = clamp(x + w, 0, W), b = clamp(y + h, 0, H);
    mmView.style.left = (l / W * 100) + "%";
    mmView.style.top = (t / H * 100) + "%";
    mmView.style.width = Math.max(0, (r - l) / W * 100) + "%";
    mmView.style.height = Math.max(0, (b - t) / H * 100) + "%";
  }

  /* zoom manteniendo fijo el punto (sx, sy) en pantalla */
  function zoomAt(sx, sy, nz) {
    nz = clamp(nz, minZoom(), MAX_Z);
    var k = nz / cam.z;
    cam.x = sx - (sx - cam.x) * k;
    cam.y = sy - (sy - cam.y) * k;
    cam.z = nz;
    applyCam();
  }

  /* transiciones suaves de cámara */
  var anim = null;
  function stopAnim() { anim = null; }

  function animateTo(target, ms) {
    var to = clampCam({ x: target.x, y: target.y, z: target.z });
    if (reduceMotion || !ms) {
      cam.x = to.x; cam.y = to.y; cam.z = to.z;
      applyCam();
      return;
    }
    stopInertia();
    var from = { x: cam.x, y: cam.y, z: cam.z };
    var t0 = performance.now();
    var mine = anim = {};
    // interpolamos el centro en el espacio del mundo y el zoom en escala logarítmica
    var c0 = { x: (vw / 2 - from.x) / from.z, y: (vh / 2 - from.y) / from.z };
    var c1 = { x: (vw / 2 - to.x) / to.z, y: (vh / 2 - to.y) / to.z };
    (function tick(now) {
      if (anim !== mine) return;
      var t = clamp((now - t0) / ms, 0, 1);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var z = from.z * Math.pow(to.z / from.z, e);
      var cx = c0.x + (c1.x - c0.x) * e, cy = c0.y + (c1.y - c0.y) * e;
      cam.z = z;
      cam.x = vw / 2 - cx * z;
      cam.y = vh / 2 - cy * z;
      applyCam();
      if (t < 1) raf(tick); else anim = null;
    })(t0);
  }

  function camFor(rect, pad, maxZ) {
    var z = Math.min((vw - 2 * pad) / rect.w, (vh - 2 * pad) / rect.h, maxZ);
    z = clamp(z, minZoom(), MAX_Z);
    var cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    return { x: vw / 2 - cx * z, y: vh / 2 - cy * z, z: z };
  }

  function boundsOf(list) {
    if (!list.length) return null;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    list.forEach(function (p) {
      x0 = Math.min(x0, p._x); y0 = Math.min(y0, p._y - 12);
      x1 = Math.max(x1, p._x + p._w); y1 = Math.max(y1, p._y + (p._h || 200));
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* encuadra lo que se está mostrando (todo, o los resultados del filtro) */
  function fitWorld(animate) {
    var z = minZoom();
    animateTo({ x: (vw - W * z) / 2, y: (vh - H * z) / 2, z: z }, animate ? 650 : 0);
  }

  function fitVisible(animate) {
    var on = pieces.filter(function (p) { return p._on; });
    if (on.length === pieces.length) { fitWorld(animate); return; }
    var r = boundsOf(on);
    if (!r) return;
    var pad = Math.max(48, Math.min(vw, vh) * 0.09);
    animateTo(camFor(r, pad, 1.05), animate ? 650 : 0);
  }

  /* ---------- inercia ---------- */

  var inertia = null;
  function stopInertia() { inertia = null; }

  function startInertia(vx, vy) {
    if (reduceMotion) return;
    if (Math.hypot(vx, vy) < 0.15) return;
    var mine = inertia = { vx: vx, vy: vy };
    var last = performance.now();
    (function tick(now) {
      if (inertia !== mine) return;
      var dt = Math.min(48, now - last);
      last = now;
      var px = cam.x, py = cam.y;
      cam.x += mine.vx * dt;
      cam.y += mine.vy * dt;
      applyCam();
      if (cam.x === px) mine.vx = 0;     // chocó con un límite
      if (cam.y === py) mine.vy = 0;
      var f = Math.pow(0.94, dt / 16);
      mine.vx *= f; mine.vy *= f;
      if (Math.hypot(mine.vx, mine.vy) < 0.02) { inertia = null; return; }
      raf(tick);
    })(last);
  }

  /* ==================================================================
     3. ENTRADA: arrastre, pellizco, rueda y teclado
     ================================================================== */

  var ptrs = {};            // pointerId -> {x, y}
  var drag = null;
  var pinch = null;
  var suppressClick = false;
  var MOVE_THRESHOLD = 6;

  function stagePoint(e) {
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function beginPan(id) {
    var p = ptrs[id];
    drag = { id: id, x0: p.x, y0: p.y, cx: cam.x, cy: cam.y, moved: false, vx: 0, vy: 0, t: performance.now(), lx: p.x, ly: p.y };
  }

  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".arch-ui")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopAnim();
    stopInertia();
    ptrs[e.pointerId] = stagePoint(e);
    var ids = Object.keys(ptrs);
    if (ids.length === 1) {
      beginPan(e.pointerId);
      suppressClick = false;
    } else if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      pinch = {
        d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        wx: (mx - cam.x) / cam.z, wy: (my - cam.y) / cam.z, z0: cam.z
      };
      drag = null;
      suppressClick = true;
      stage.classList.add("is-dragging");
    }
  });

  stage.addEventListener("pointermove", function (e) {
    if (!(e.pointerId in ptrs)) return;
    var pt = stagePoint(e);
    ptrs[e.pointerId] = pt;

    if (pinch) {
      var ids = Object.keys(ptrs);
      if (ids.length < 2) return;
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      var d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var nz = clamp(pinch.z0 * d / pinch.d0, minZoom(), MAX_Z);
      cam.z = nz;
      cam.x = mx - pinch.wx * nz;
      cam.y = my - pinch.wy * nz;
      applyCam();
      return;
    }

    if (!drag || drag.id !== e.pointerId) return;
    var dx = pt.x - drag.x0, dy = pt.y - drag.y0;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < MOVE_THRESHOLD) return;
      drag.moved = true;
      suppressClick = true;
      stage.classList.add("is-dragging");
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ya soltado */ }
    }
    var now = performance.now();
    var dt = Math.max(1, now - drag.t);
    drag.vx = 0.75 * drag.vx + 0.25 * ((pt.x - drag.lx) / dt);
    drag.vy = 0.75 * drag.vy + 0.25 * ((pt.y - drag.ly) / dt);
    drag.t = now; drag.lx = pt.x; drag.ly = pt.y;
    cam.x = drag.cx + dx;
    cam.y = drag.cy + dy;
    applyCam();
  });

  function endPointer(e) {
    if (!(e.pointerId in ptrs)) return;
    delete ptrs[e.pointerId];
    if (pinch) {
      if (Object.keys(ptrs).length < 2) {
        pinch = null;
        var rest = Object.keys(ptrs)[0];
        if (rest !== undefined) { beginPan(Number(rest)); drag.moved = true; }
        else stage.classList.remove("is-dragging");
      }
      return;
    }
    if (drag && drag.id === e.pointerId) {
      var wasMoved = drag.moved;
      var idle = performance.now() - drag.t;
      var vx = drag.vx, vy = drag.vy;
      drag = null;
      stage.classList.remove("is-dragging");
      if (wasMoved && e.type === "pointerup" && idle < 90) startInertia(vx, vy);
      setTimeout(function () { suppressClick = false; }, 0);
    }
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  // un arrastre nunca debe abrir la pieza sobre la que se suelta
  stage.addEventListener("click", function (e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
  }, true);

  stage.addEventListener("dragstart", function (e) { e.preventDefault(); });

  stage.addEventListener("wheel", function (e) {
    e.preventDefault();
    if (e.target.closest(".arch-ui")) return;
    stopAnim(); stopInertia();
    var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    var k = Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0016));
    var pt = stagePoint(e);
    zoomAt(pt.x, pt.y, cam.z * k);
  }, { passive: false });

  stage.addEventListener("keydown", function (e) {
    if (e.target !== stage) return;
    var s = e.shiftKey ? 260 : 90;
    stopAnim(); stopInertia();
    switch (e.key) {
      case "ArrowLeft": cam.x += s; break;
      case "ArrowRight": cam.x -= s; break;
      case "ArrowUp": cam.y += s; break;
      case "ArrowDown": cam.y -= s; break;
      case "+": case "=": e.preventDefault(); zoomAt(vw / 2, vh / 2, cam.z * 1.25); return;
      case "-": case "_": e.preventDefault(); zoomAt(vw / 2, vh / 2, cam.z / 1.25); return;
      case "0": e.preventDefault(); fitVisible(true); return;
      default: return;
    }
    e.preventDefault();
    applyCam();
  });

  /* el foco por teclado sobre una pieza fuera de vista mueve la cámara, no el scroll */
  world.addEventListener("focusin", function (e) {
    var b = e.target.closest(".piece");
    if (!b) return;
    stage.scrollLeft = 0; stage.scrollTop = 0;
    var p = byId[b.dataset.id];
    if (!p) return;
    var m = 40;
    var l = cam.x + p._x * cam.z, t = cam.y + p._y * cam.z;
    var r = l + p._w * cam.z, bt = t + (p._h || 200) * cam.z;
    if (l < m || t < m || r > vw - m || bt > vh - m) {
      stopAnim(); stopInertia();
      cam.x = vw / 2 - (p._x + p._w / 2) * cam.z;
      cam.y = vh / 2 - (p._y + (p._h || 200) / 2) * cam.z;
      applyCam();
    }
  });
  stage.addEventListener("scroll", function () { stage.scrollLeft = 0; stage.scrollTop = 0; });

  /* ---------- botones de zoom / ver todo / mapa ---------- */

  function stepZoom(f) {
    var nz = clamp(cam.z * f, minZoom(), MAX_Z);
    var k = nz / cam.z;
    animateTo({ x: vw / 2 - (vw / 2 - cam.x) * k, y: vh / 2 - (vh / 2 - cam.y) * k, z: nz }, 220);
  }
  $("#zoom-in").addEventListener("click", function () { stepZoom(1.3); });
  $("#zoom-out").addEventListener("click", function () { stepZoom(1 / 1.3); });
  $("#fit").addEventListener("click", function () { fitVisible(true); });

  /* Minimapa: un único contenedor con dos estados. Abierto = mapa; cerrado = el
     propio contenedor se contrae hasta el botón «Mapa», en la misma esquina. */
  var mmToggle = $("#mm-toggle");
  var mmBody = $("#mm-body");
  function sizeMinimap() {
    var open = !minimap.classList.contains("is-folded");
    var el_ = open ? mmBody : mmToggle;
    minimap.style.width = (el_.offsetWidth + 2) + "px";    // +2: borde
    minimap.style.height = (el_.offsetHeight + 2) + "px";
  }
  function showMap(open, remember) {
    minimap.classList.toggle("is-folded", !open);
    mmToggle.setAttribute("aria-expanded", String(open));
    mmBody.inert = !open;
    mmToggle.tabIndex = open ? -1 : 0;
    sizeMinimap();
    if (!remember) return;
    try { sessionStorage.setItem("archivo-map", open ? "1" : "0"); } catch (e) { /* sin storage */ }
  }
  mmToggle.addEventListener("click", function () {
    showMap(true, true);
    $("#mm-fold").focus({ preventScroll: true });
  });
  $("#mm-fold").addEventListener("click", function () {
    showMap(false, true);
    mmToggle.focus({ preventScroll: true });
  });
  window.addEventListener("resize", sizeMinimap);

  /* ---------- interacción del minimapa ---------- */

  var mmDrag = null;
  function mmWorldPoint(e) {
    var r = mmMap.getBoundingClientRect();
    return {
      x: clamp((e.clientX - r.left) / r.width, 0, 1) * W,
      y: clamp((e.clientY - r.top) / r.height, 0, 1) * H
    };
  }
  function centerOn(wx, wy) {
    cam.x = vw / 2 - wx * cam.z;
    cam.y = vh / 2 - wy * cam.z;
    applyCam();
  }

  mmMap.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    stopAnim(); stopInertia();
    var p = mmWorldPoint(e);
    // si se agarra el propio rectángulo, se conserva el desplazamiento relativo
    var cx = (vw / 2 - cam.x) / cam.z, cy = (vh / 2 - cam.y) / cam.z;
    var onRect = e.target === mmView;
    mmDrag = { dx: onRect ? cx - p.x : 0, dy: onRect ? cy - p.y : 0 };
    if (!onRect) centerOn(p.x, p.y);
    mmMap.classList.add("is-dragging");
    try { mmMap.setPointerCapture(e.pointerId); } catch (err) { /* puntero ya liberado */ }
  });
  mmMap.addEventListener("pointermove", function (e) {
    if (!mmDrag) return;
    var p = mmWorldPoint(e);
    centerOn(p.x + mmDrag.dx, p.y + mmDrag.dy);
  });
  function mmEnd(e) {
    if (!mmDrag) return;
    mmDrag = null;
    mmMap.classList.remove("is-dragging");
    try { mmMap.releasePointerCapture(e.pointerId); } catch (err) { /* nada */ }
  }
  mmMap.addEventListener("pointerup", mmEnd);
  mmMap.addEventListener("pointercancel", mmEnd);

  /* ---------- calidad: imagen grande al acercarse ---------- */

  var upTimer = null;
  function scheduleUpgrade() {
    clearTimeout(upTimer);
    upTimer = setTimeout(upgradeVisible, 220);
  }
  function upgradeVisible() {
    if (cam.z < 0.85) return;
    pieces.forEach(function (p) {
      if (p._big || !p._on || !p.image || !p.thumb || p.thumb === p.image) return;
      var l = cam.x + p._x * cam.z, t = cam.y + p._y * cam.z;
      if (l > vw || t > vh || l + p._w * cam.z < 0 || t + (p._h || 200) * cam.z < 0) return;
      p._big = true;
      var img = els[p.id].querySelector("img");
      var big = new Image();
      big.onload = function () { if (img) img.src = big.src; };
      big.src = src(p.image);
    });
  }

  /* ==================================================================
     4. FILTRO Y BÚSQUEDA
     ================================================================== */

  function buildFilter() {
    function item(key, name, n, all) {
      var b = el("button", "arch-cat" + (all ? " arch-cat--all" : ""));
      b.type = "button";
      b.dataset.cat = key;
      b.appendChild(el("span", null, name));
      b.appendChild(el("span", null, String(n)));
      filterMenu.appendChild(b);
    }
    item("", "Todo", pieces.length, true);
    categories.forEach(function (c) { item(c.key, c.name, c.n, false); });

    filterBtn.addEventListener("click", function () { toggleMenu(); });
    filterMenu.addEventListener("click", function (e) {
      var b = e.target.closest(".arch-cat");
      if (!b) return;
      setCat(b.dataset.cat === "" ? null : b.dataset.cat);
      setTimeout(function () { toggleMenu(false); filterBtn.focus({ preventScroll: true }); }, 120);
    });
    document.addEventListener("click", function (e) {
      if (isOpen() && !filterEl.contains(e.target)) toggleMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen() && modal.hidden) {
        toggleMenu(false);
        filterBtn.focus({ preventScroll: true });
      }
    });
    document.addEventListener("focusin", function (e) {
      if (isOpen() && !filterEl.contains(e.target)) toggleMenu(false);
    });
    // tocar el lienzo también cierra el menú (el lienzo captura el puntero)
    stage.addEventListener("pointerdown", function () { if (isOpen()) toggleMenu(false); });
  }

  function isOpen() { return filterMenu.classList.contains("is-open"); }

  function toggleMenu(force) {
    var open = typeof force === "boolean" ? force : !isOpen();
    filterMenu.classList.toggle("is-open", open);
    filterBtn.setAttribute("aria-expanded", String(open));
  }

  function catName(key) {
    return catCount[key] ? catCount[key].name : "";
  }

  function matches(p) {
    if (state.cat !== null && p._catKeys.indexOf(state.cat) === -1) return false;
    if (!state.q) return true;
    var tokens = norm(state.q).split(/\s+/).filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
      if (p._hay.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  var needFrame = false;

  function apply() {
    var visible = 0;
    pieces.forEach(function (p) {
      var ok = matches(p);
      p._on = ok;
      els[p.id].hidden = !ok;
      if (mmDots[p.id]) mmDots[p.id].classList.toggle("is-off", !ok);
      if (ok) visible++;
    });

    function sync(item) {
      item.el.hidden = !item.ids.some(function (id) { return byId[id] && byId[id]._on; });
    }
    groupLabels.forEach(sync);
    zoneLabels.forEach(sync);

    var filtered = state.cat !== null || state.q !== "";
    countEl.textContent = (filtered ? visible + " de " + pieces.length : String(visible)) +
      (visible === 1 && !filtered ? " pieza" : " piezas");
    resetEl.hidden = !filtered;

    emptyEl.hidden = visible !== 0;
    if (visible === 0) {
      var parts = [];
      if (state.q) parts.push("«" + state.q + "»");
      if (state.cat !== null) parts.push(catName(state.cat));
      emptyQ.textContent = parts.join(" en ");
    }

    Array.prototype.forEach.call(filterMenu.children, function (b) {
      var key = b.dataset.cat === "" ? null : b.dataset.cat;
      b.setAttribute("aria-pressed", key === state.cat ? "true" : "false");
    });
    filterEl.classList.toggle("is-active", state.cat !== null);
    filterLabel.textContent = state.cat !== null ? "Filtrar · " + catName(state.cat) : "Filtrar";

    var hash = state.cat !== null ? "#" + encodeURIComponent(catName(state.cat).toLowerCase()) : "";
    if (location.hash !== hash) {
      try { history.replaceState(null, "", location.pathname + location.search + hash); } catch (e) { /* file:// */ }
    }

    if (needFrame) {
      needFrame = false;
      if (visible > 0) fitVisible(true);
    }
    scheduleUpgrade();
  }

  function setCat(c) {
    state.cat = c;
    needFrame = true;
    apply();
  }

  function setQuery(q) {
    state.q = q.trim();
    if (searchEl.value !== q) searchEl.value = q;
    needFrame = true;
    apply();
  }

  function clearAll() {
    state.cat = null;
    state.q = "";
    searchEl.value = "";
    needFrame = true;
    apply();
    searchEl.focus({ preventScroll: true });
  }

  var tm;
  searchEl.addEventListener("input", function () {
    clearTimeout(tm);
    tm = setTimeout(function () { setQuery(searchEl.value); }, 180);
  });
  searchEl.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && searchEl.value) { e.preventDefault(); setQuery(""); }
  });
  resetEl.addEventListener("click", clearAll);
  emptyReset.addEventListener("click", clearAll);

  /* ==================================================================
     5. VISTA AMPLIADA
     ================================================================== */

  var modal = $("#modal");
  var figEl = $("#modal-fig");
  var kickerEl = $("#modal-kicker");
  var titleEl = $("#modal-title");
  var descEl = $("#modal-desc");
  var tagsEl = $("#modal-tags");
  var seriesEl = $("#modal-series");
  var seriesLabel = $("#modal-series-label");
  var thumbsEl = $("#modal-thumbs");
  var relatedEl = $("#modal-related");
  var relatedList = $("#modal-related-list");
  var prevBtn = $("#modal-prev");
  var nextBtn = $("#modal-next");
  var closeBtn = modal.querySelector(".arch-modal-close");

  var current = null;
  var lastTrigger = null;

  function members(p) {
    return p.groupId ? pieces.filter(function (q) { return q.groupId === p.groupId; }) : [p];
  }

  function related(p) {
    var mine = (p.tags || []).map(norm);
    return pieces
      .filter(function (q) { return q !== p && (!p.groupId || q.groupId !== p.groupId); })
      .map(function (q) {
        var shared = (q.tags || []).map(norm).filter(function (t) { return mine.indexOf(t) !== -1; }).length;
        var score = shared * 3 + (q.category === p.category ? 1 : 0);
        return { p: q, score: score };
      })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.p._i - b.p._i; })
      .slice(0, 4)
      .map(function (x) { return x.p; });
  }

  function thumbButton(p, label, withCaption, isCurrent) {
    var b = el("button", "arch-thumb");
    b.type = "button";
    b.dataset.id = p.id;
    b.setAttribute("aria-label", label);
    if (isCurrent) b.setAttribute("aria-current", "true");
    if (p.text) {
      b.appendChild(el("span", "arch-thumb-note", p.text));
    } else {
      var im = document.createElement("img");
      im.src = src(p.thumb || p.image);
      im.alt = "";
      im.loading = "lazy";
      b.appendChild(im);
    }
    if (withCaption) b.appendChild(el("span", "arch-thumb-cap", p.title));
    return b;
  }

  function fill(p) {
    current = p;
    figEl.textContent = "";

    if (p.text) {
      figEl.appendChild(el("div", "arch-modal-note tone-" + (p.tone || "paper"), p.text));
    } else {
      var img = document.createElement("img");
      img.alt = p.title + (p.description ? ". " + p.description : "");
      img.src = src(p.thumb || p.image);
      figEl.appendChild(img);
      if (p.thumb && p.thumb !== p.image) {
        var big = new Image();
        big.onload = function () { if (current === p) img.src = big.src; };
        big.src = src(p.image);
      }
    }

    var kicker = [p.year, p.category];
    if (norm(p.category).indexOf(norm(p.type)) === -1) kicker.push(cap(p.type));
    kickerEl.textContent = kicker.filter(Boolean).join(" · ");
    titleEl.textContent = p.title;
    descEl.textContent = p.text ? "" : (p.description || "");
    descEl.hidden = !!p.text || !p.description;

    tagsEl.textContent = "";
    (p.tags || []).forEach(function (t) {
      var li = el("li");
      var b = el("button", null, "#" + t);
      b.type = "button";
      b.dataset.tag = t;
      b.setAttribute("aria-label", "Buscar la etiqueta " + t);
      li.appendChild(b);
      tagsEl.appendChild(li);
    });

    var group = members(p);
    var multi = group.length > 1;
    seriesEl.hidden = !multi;
    prevBtn.hidden = nextBtn.hidden = !multi;
    if (multi) {
      var idx = group.indexOf(p);
      seriesLabel.textContent = "Serie · " + groups[p.groupId].title + " — " + (idx + 1) + " / " + group.length;
      thumbsEl.textContent = "";
      group.forEach(function (q, k) {
        thumbsEl.appendChild(thumbButton(q, "Pieza " + (k + 1) + " de " + group.length + ": " + q.title, false, q === p));
      });
    }

    var rel = related(p);
    relatedEl.hidden = rel.length === 0;
    relatedList.textContent = "";
    rel.forEach(function (q) {
      relatedList.appendChild(thumbButton(q, "Ver " + q.title + ", " + q.year, true, false));
    });
  }

  function openPiece(id, trigger) {
    var p = byId[id];
    if (!p) return;
    if (trigger) lastTrigger = trigger;
    fill(p);
    if (modal.hidden) {
      modal.hidden = false;
      document.documentElement.classList.add("is-locked");
    }
    closeBtn.focus({ preventScroll: true });
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove("is-locked");
    current = null;
    if (lastTrigger && document.body.contains(lastTrigger) && !lastTrigger.hidden) {
      lastTrigger.focus({ preventScroll: true });   // el foco vuelve sin mover la cámara
    }
    stage.scrollLeft = 0; stage.scrollTop = 0;
  }

  function step(dir) {
    if (!current) return;
    var group = members(current);
    if (group.length < 2) return;
    fill(group[(group.indexOf(current) + dir + group.length) % group.length]);
  }

  board.addEventListener("click", function (e) {
    var b = e.target.closest(".piece");
    if (b) openPiece(b.dataset.id, b);
  });

  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) { closeModal(); return; }
    var tag = e.target.closest("[data-tag]");
    if (tag) {
      var t = tag.dataset.tag;
      closeModal();
      state.cat = null;
      setQuery(t);
      return;
    }
    var th = e.target.closest(".arch-thumb");
    if (th) { fill(byId[th.dataset.id]); closeBtn.focus({ preventScroll: true }); }
  });
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });

  document.addEventListener("keydown", function (e) {
    if (modal.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
    if (e.key === "ArrowRight") { step(1); return; }
    if (e.key === "ArrowLeft") { step(-1); return; }
    if (e.key === "Tab") {
      var f = Array.prototype.filter.call(
        modal.querySelectorAll("button:not([hidden]), [href], input, [tabindex]:not([tabindex='-1'])"),
        function (n) { return !n.disabled && n.offsetParent !== null; }
      );
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* deslizar para pasar de pieza en pantallas táctiles */
  var tx = null;
  var mediaEl = $("#modal-media");
  mediaEl.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  mediaEl.addEventListener("touchend", function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    tx = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ==================================================================
     6. ARRANQUE, REDIMENSIONADO, HASH
     ================================================================== */

  function setHeaderH() {
    var h = document.querySelector(".site-header");
    if (h) document.documentElement.style.setProperty("--header-h", h.offsetHeight + "px");
  }

  function readHash() {
    var k;
    try { k = norm(decodeURIComponent(location.hash.replace("#", ""))); } catch (e) { return null; }
    return catCount[k] ? k : null;
  }
  window.addEventListener("hashchange", function () {
    var k = readHash();
    if (k !== state.cat) { state.cat = k; needFrame = true; apply(); }
  });

  var resizeTimer = null;
  var camReady = false;

  /* encuadre inicial: la zona «home» del layout, o los resultados si hay filtro en la URL */
  function initCamera() {
    camReady = true;
    if (state.cat !== null) {
      fitVisible(false);
    } else {
      fitWorld(false);
    }
    render();
  }

  function onResize() {
    var oldW = vw, oldH = vh;
    setHeaderH();
    measureStage();
    if (!camReady) {
      if (vw >= 100 && vh >= 100) initCamera();
      return;
    }
    // conserva el punto del mundo que estaba en el centro de la vista
    var cx = (oldW / 2 - cam.x) / cam.z, cy = (oldH / 2 - cam.y) / cam.z;
    cam.x = vw / 2 - cx * cam.z;
    cam.y = vh / 2 - cy * cam.z;
    applyCam();
  }
  function queueResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 40);
  }
  window.addEventListener("resize", queueResize);
  window.addEventListener("orientationchange", function () { setTimeout(onResize, 200); });
  if (window.ResizeObserver) new ResizeObserver(queueResize).observe(stage);

  buildWorld();
  buildFilter();
  state.cat = readHash();
  setHeaderH();
  measureStage();
  measure();
  apply();

  // mapa plegado por defecto en pantallas muy estrechas
  var storedMap = null;
  try { storedMap = sessionStorage.getItem("archivo-map"); } catch (e) { /* nada */ }
  showMap(storedMap !== null ? storedMap === "1" : window.innerWidth > 620);

  if (vw >= 100 && vh >= 100) initCamera();

  // las notas y los pies pueden cambiar de alto al cargar las fuentes
  function remeasure() { measure(); applyCam(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  window.addEventListener("load", remeasure);
})();
