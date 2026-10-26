/* OTI concept B — preview helpers only: replay the drawing, switch paper/carbon. */
(function () {
  "use strict";
  var logo = document.querySelector(".logo");
  var replay = document.getElementById("replay");
  var bg = document.getElementById("bg");
  if (!logo) return;

  function restart() {
    logo.classList.add("is-static");
    void logo.getBoundingClientRect();         // flush, so the animations start over
    logo.classList.remove("is-static");
  }
  if (replay) replay.addEventListener("click", restart);
  document.addEventListener("keydown", function (e) { if (e.key === "r" || e.key === "R") restart(); });
  if (bg) bg.addEventListener("click", function () {
    var dark = document.body.classList.toggle("is-carbon");
    bg.setAttribute("aria-pressed", String(dark));
    bg.textContent = dark ? "Paper" : "Carbon";
  });
})();
