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
      menuToggle.textContent = isOpen
        ? (menuToggle.getAttribute("data-label-open") || "Close")
        : (menuToggle.getAttribute("data-label-closed") || "Menu");
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = menuToggle.getAttribute("data-label-closed") || "Menu";
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
})();
