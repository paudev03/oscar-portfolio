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
      menuToggle.textContent = isOpen ? "Close" : "Menu";
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "Menu";
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

  /* ---------- Cursor label: shows the project's own folio, not a
     generic "View project" tooltip — reads e.g. "03 —" ---------- */
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var workTargets = document.querySelectorAll(".work-item-trigger");
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
        cursorLabel.textContent = index ? index + " —" : "View project";
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
        var original = "Copy";
        copyBtn.textContent = "Copied";
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

  /* ---------- Project detail overlay (Selected Work) ----------
     Clicking a project's main image opens its detail in place, over
     Selected Work — no new page, no new tab. Closes via the Close
     button, a click outside the visual/text content, or Escape, and
     always returns focus to the image that opened it. */
  var openTriggers = document.querySelectorAll("[data-open]");
  if (openTriggers.length) {
    var activeDetail = null;
    var activeTrigger = null;

    var closeDetail = function () {
      if (!activeDetail) return;
      activeDetail.classList.remove("is-open");
      document.body.style.overflow = "";
      if (activeTrigger) activeTrigger.focus();
      activeDetail = null;
      activeTrigger = null;
    };

    var openDetail = function (id, trigger) {
      var detail = document.getElementById(id);
      if (!detail) return;
      activeDetail = detail;
      activeTrigger = trigger;
      detail.classList.add("is-open");
      document.body.style.overflow = "hidden";
      var closeBtn = detail.querySelector("[data-close]");
      if (closeBtn) closeBtn.focus();
    };

    openTriggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        openDetail(trigger.getAttribute("data-open"), trigger);
      });
    });

    document.querySelectorAll(".project-detail").forEach(function (detail) {
      detail.addEventListener("click", function (e) {
        var clickedOutside = e.target === detail || e.target.classList.contains("detail-frame");
        if (clickedOutside || e.target.hasAttribute("data-close")) {
          closeDetail();
        }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && activeDetail) closeDetail();
    });
  }
})();
