/* ==========================================================================
   ARCHIVO — lógica de presentación
   Lee window.ARCHIVO (js/archivo-data.js) y construye el tablero, el filtro
   por categorías, el buscador y la vista ampliada. No contiene ninguna pieza.
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
  var toTop = $("#to-top");

  var els = {};
  var clusters = [];

  function buildPiece(p, inCluster, order) {
    var b = el("button", "piece piece--" + p._type + " sz-" + (p.size || "m") + " al-" + (p.align || "l"));
    b.type = "button";
    b.setAttribute("aria-haspopup", "dialog");
    b.setAttribute("aria-label", p.title + ", " + p.year + ". " + p.category);
    b.dataset.id = p.id;
    b.style.setProperty("--rot", (p.rot || 0) + "deg");
    b.style.setProperty("--i", order);
    if (inCluster && p.valign) b.classList.add("va-" + p.valign);
    if (TAPE_TYPES[p._type] && p._i % 3 === 1) b.classList.add("has-tape");

    if (p.text) {
      b.classList.add("tone-" + (p.tone || "paper"));
      b.appendChild(el("span", "note-body", p.text));
    } else {
      var media = el("span", "piece-media");
      var img = document.createElement("img");
      img.src = src(p.thumb || p.image);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
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

  function buildCluster(g, order) {
    var kind = g.kind === "wide" ? "wide" : "col";
    var sec = el("section", "cluster cluster--" + kind);
    sec.style.setProperty("--i", order);
    sec.setAttribute("aria-label", "Serie: " + g.title);

    var head = el("header", "cluster-head");
    head.appendChild(el("h2", "cluster-title", g.title));
    if (g.note) head.appendChild(el("p", "cluster-note", g.note));
    var meta = el("span", "cluster-meta");
    head.appendChild(meta);
    sec.appendChild(head);

    var body = el("div", "cluster-body");
    var members = pieces.filter(function (p) { return p.groupId === g.id; });
    members.forEach(function (p, k) { body.appendChild(buildPiece(p, true, k)); });
    sec.appendChild(body);

    clusters.push({ el: sec, meta: meta, group: g, members: members });
    return sec;
  }

  function buildBoard() {
    var frag = document.createDocumentFragment();
    var seen = {};
    var order = 0;
    pieces.forEach(function (p) {
      if (p.groupId && groups[p.groupId]) {
        if (!seen[p.groupId]) {
          seen[p.groupId] = true;
          frag.appendChild(buildCluster(groups[p.groupId], order++));
        }
        return;
      }
      frag.appendChild(buildPiece(p, false, order++));
    });
    board.appendChild(frag);
  }

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

  /* ---------- filtrado ---------- */

  function matches(p) {
    if (state.cat !== null && p._catKeys.indexOf(state.cat) === -1) return false;
    if (!state.q) return true;
    var tokens = norm(state.q).split(/\s+/).filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
      if (p._hay.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  function apply() {
    var visible = 0;
    pieces.forEach(function (p) {
      var ok = matches(p);
      p._on = ok;
      els[p.id].hidden = !ok;
      if (ok) visible++;
    });

    clusters.forEach(function (c) {
      var n = c.members.filter(function (p) { return p._on; }).length;
      c.el.hidden = n === 0;
      c.meta.textContent = c.group.year + " · " + n + (n === 1 ? " pieza" : " piezas");
    });

    var filtered = state.cat !== null || state.q !== "";
    countEl.textContent = (filtered ? visible + " de " + pieces.length : String(visible)) +
      (visible === 1 && !filtered ? " pieza" : " piezas");
    resetEl.hidden = !filtered;

    board.hidden = visible === 0;
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
  }

  function setCat(c) {
    state.cat = c;
    apply();
  }

  function setQuery(q) {
    state.q = q.trim();
    if (searchEl.value !== q) searchEl.value = q;
    apply();
  }

  function clearAll() {
    state.cat = null;
    state.q = "";
    searchEl.value = "";
    apply();
    searchEl.focus({ preventScroll: true });
  }

  var tm;
  searchEl.addEventListener("input", function () {
    clearTimeout(tm);
    tm = setTimeout(function () { setQuery(searchEl.value); }, 120);
  });
  searchEl.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && searchEl.value) { e.preventDefault(); setQuery(""); }
  });
  resetEl.addEventListener("click", clearAll);
  emptyReset.addEventListener("click", clearAll);

  /* ---------- vista ampliada ---------- */

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
      var note = el("div", "arch-modal-note tone-" + (p.tone || "paper"), p.text);
      figEl.appendChild(note);
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
      lastTrigger.focus({ preventScroll: true });
    }
  }

  function step(dir) {
    if (!current) return;
    var group = members(current);
    if (group.length < 2) return;
    var k = (group.indexOf(current) + dir + group.length) % group.length;
    fill(group[k]);
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
      window.scrollTo(0, Math.max(0, board.getBoundingClientRect().top + window.scrollY - 220));
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

  /* ---------- volver al inicio + altura de cabecera ---------- */

  function onScroll() { toTop.hidden = window.scrollY < 800; }
  window.addEventListener("scroll", onScroll, { passive: true });
  toTop.addEventListener("click", function () {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  function setHeaderH() {
    var h = document.querySelector(".site-header");
    if (h) document.documentElement.style.setProperty("--header-h", h.offsetHeight + "px");
  }
  window.addEventListener("resize", setHeaderH);

  /* ---------- hash (#ropa) ---------- */

  function readHash() {
    var k = norm(decodeURIComponent(location.hash.replace("#", "")));
    return catCount[k] ? k : null;
  }
  window.addEventListener("hashchange", function () {
    var k = readHash();
    if (k !== state.cat) { state.cat = k; apply(); }
  });

  /* ---------- arranque ---------- */

  buildBoard();
  buildFilter();
  state.cat = readHash();
  setHeaderH();
  apply();
  onScroll();
})();
