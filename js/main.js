(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  var menuToggle = document.querySelector(".menu-toggle");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", function () {
      var isOpen = mobileMenu.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.textContent = isOpen ? "Cerrar" : "Menú";
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "Menú";
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Cross-fade between pages ---------- */
  if (!prefersReducedMotion) {
    document.querySelectorAll('a[href]:not([target="_blank"])').forEach(function (link) {
      var url = link.getAttribute("href");
      if (!url || url.charAt(0) === "#" || url.indexOf("mailto:") === 0 || url.indexOf("tel:") === 0) return;
      if (link.hostname && link.hostname !== window.location.hostname) return;

      link.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        document.body.classList.add("is-leaving");
        setTimeout(function () {
          window.location.href = url;
        }, 180);
      });
    });
  }

  /* ---------- Scroll cue (Home) ---------- */
  var scrollCue = document.querySelector(".scroll-cue");
  if (scrollCue) {
    window.addEventListener(
      "scroll",
      function () {
        if (window.scrollY > 40) {
          scrollCue.classList.add("is-hidden");
        }
      },
      { passive: true }
    );
  }

  /* ---------- Cursor label: shows the project's own folio, not a
     generic "Ver proyecto" tooltip — reads e.g. "03 —" ---------- */
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var workTargets = document.querySelectorAll(".work-card, .work-entry");
  if (canHover && workTargets.length) {
    var cursorLabel = document.createElement("div");
    cursorLabel.className = "cursor-label";
    cursorLabel.setAttribute("aria-hidden", "true");
    document.body.appendChild(cursorLabel);

    var moveLabel = function (e) {
      cursorLabel.style.left = e.clientX + "px";
      cursorLabel.style.top = e.clientY + "px";
    };

    workTargets.forEach(function (target) {
      var index = target.getAttribute("data-index") || "";
      target.addEventListener("mouseenter", function () {
        cursorLabel.textContent = index ? index + " —" : "Ver proyecto";
        document.body.classList.add("has-cursor-label");
        cursorLabel.classList.add("is-visible");
      });
      target.addEventListener("mousemove", moveLabel);
      target.addEventListener("mouseleave", function () {
        document.body.classList.remove("has-cursor-label");
        cursorLabel.classList.remove("is-visible");
      });
    });
  }

  /* ---------- Copy email (Contact) ---------- */
  var copyBtn = document.querySelector(".copy-email");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-email") || "";
      var done = function () {
        var original = "Copiar";
        copyBtn.textContent = "Copiado";
        copyBtn.classList.add("is-copied");
        setTimeout(function () {
          copyBtn.textContent = original;
          copyBtn.classList.remove("is-copied");
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, done);
      } else {
        done();
      }
    });
  }

  /* ---------- Figure tracker (Project Detail) ----------
     A quiet running folio that echoes which figure is currently in
     view — the index system carried through the scroll, not just
     shown once at the top. */
  var figures = document.querySelectorAll("[data-figure]");
  if (figures.length > 1 && "IntersectionObserver" in window) {
    var tracker = document.createElement("div");
    tracker.className = "figure-tracker";
    tracker.setAttribute("aria-hidden", "true");
    tracker.innerHTML =
      '<span class="current">01</span><span class="divider">/</span><span class="total">' +
      String(figures.length).padStart(2, "0") +
      "</span>";
    document.body.appendChild(tracker);

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var n = entry.target.getAttribute("data-figure");
            tracker.querySelector(".current").textContent = String(n).padStart(2, "0");
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    figures.forEach(function (fig) { observer.observe(fig); });

    var toggleTracker = function () {
      var body = document.querySelector(".project-body");
      if (!body) return;
      var rect = body.getBoundingClientRect();
      var inRange = rect.top < window.innerHeight * 0.8 && rect.bottom > window.innerHeight * 0.2;
      tracker.classList.toggle("is-visible", inRange);
    };
    toggleTracker();
    window.addEventListener("scroll", toggleTracker, { passive: true });
  }
})();
