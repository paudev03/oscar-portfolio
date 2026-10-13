/* ==========================================================================
   OTI — PAINT IN MOTION (hero)

   A painted canvas rendered with WebGL, because the cursor has to push the
   paint itself (a localised displacement of texture layers), which CSS/SVG
   cannot do per-pixel. Three paint layers painted for this piece:

     A  the top composition: carbon masses with ivory and vermilion gestures
     B  the composition underneath: vermilion fields on ivory
     C  edge strokes that reorganise the piece late in the scroll

   Three inputs, kept separate:
     - scroll progress p (0..1)    -> which layers are present (dissolve, slide,
                                       reorganise, release). Nothing else.
     - cursor field (pos, velocity)-> a local, decaying push on the layers, with
                                       different strength per layer, and a
                                       temporary window to the layer below.
                                       It cannot change the scroll state.
     - the wordmark, a live-text mask -> a window into B at the start, solid
                                       ink at the end; never displaced.

   Without WebGL a flattened image of the resting state is shown instead.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("paint");
  if (!root) return;

  var stage = root.querySelector(".paint-stage");
  var canvas = root.querySelector(".paint-canvas");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BASE = "assets/paint/";

  var gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return;                       // the fallback image stays

  /* ---------------- shaders ---------------- */
  var VS = "attribute vec2 a; varying vec2 v; void main(){ v = vec2(a.x*.5+.5, .5-a.y*.5); gl_Position = vec4(a,0.,1.); }";
  var FS = [
    "precision mediump float;",
    "varying vec2 v;",
    "uniform sampler2D uA, uB, uC, uN, uL;",
    "uniform vec2 uRes, uTex, uMouse, uVel;",
    "uniform float uAct, uP, uRel;",
    "float sm(float a, float b, float x){ float t = clamp((x-a)/(b-a),0.,1.); return t*t*(3.-2.*t); }",
    "vec2 cover(vec2 uv){",
    "  float sa = uRes.x/uRes.y, ta = uTex.x/uTex.y;",
    "  vec2 s = sa > ta ? vec2(1., ta/sa) : vec2(sa/ta, 1.);",
    "  return (uv-.5)*s+.5;",
    "}",
    "void main(){",
    "  vec2 uv = v;",
    "  vec2 asp = vec2(uRes.x/uRes.y, 1.);",
    "  vec2 dd = (uv - uMouse)*asp;",
    "  float r = length(dd);",
    "  float fall = exp(-r*r/0.058) * uAct;",                     // local, decaying influence
    "  vec2 dir = normalize(dd + 1e-5)/asp;",
    "  vec2 c0 = cover(uv);",
    "  float nLo = texture2D(uN, c0*1.2).r;",
    "  float nMd = texture2D(uN, c0*2.1 + .37).g;",
    "  float nHi = texture2D(uN, c0*3.4 + .11).b;",
    // paint is pushed like a flexible material: shove + drag with velocity + a little noise
    "  vec2 dA = dir*fall*0.055 + uVel*fall*1.8 + (vec2(nMd, nLo)-.5)*fall*0.05;",
    "  vec2 dB = dA*0.35;",
    // scroll-driven transforms (independent of the cursor)
    "  float ps1 = sm(.14, .60, uP);",                           // A dissolves
    "  float psS = sm(.40, .92, uP);",                           // A slides away
    "  float ps3 = sm(.46, .86, uP);",                           // C reorganises
    "  float psL = sm(.20, .50, uP);",                           // wordmark: window -> ink
    "  vec2 uvA = (uv - dA - .5)/(1. + .07*psS) + .5 + vec2(0., .22*psS);",
    "  vec2 uvB = (uv - dB - .5)/(1. + .10*sm(.2,.9,uP)) + .5;",
    "  vec2 uvC = uv - dB*.6 + vec2(0., -.02*ps3);",
    "  vec4 A = texture2D(uA, cover(uvA));",
    "  vec3 B = texture2D(uB, cover(uvB)).rgb;",
    "  vec4 C = texture2D(uC, cover(uvC));",
    // A erodes along organic noise edges, with a darker rim of paint thickness
    "  float nd = nLo*.66 + nMd*.34;",
    "  float thr = mix(-.10, 1.10, ps1);",
    "  float keepA = smoothstep(thr, thr + .05, nd);",
    "  float rim = 1. - smoothstep(.0, .04, abs(nd - (thr + .025)));",
    // the cursor opens a temporary window onto B
    "  float hole = fall*1.25 + (nHi - .5)*.55*fall;",
    "  keepA *= 1. - smoothstep(.32, .72, hole);",
    // C builds in along its own noise
    "  float nC = texture2D(uN, cover(uvC)*1.0 + .6).g;",
    "  float keepC = 1. - smoothstep(ps3*1.16 - .06, ps3*1.16, nC);",
    "  vec3 col = B;",
    "  col = mix(col, C.rgb, C.a*keepC);",
    "  float aA = A.a*keepA;",
    "  col = mix(col, A.rgb, aA);",
    "  col = mix(col, vec3(.06,.055,.05), rim*step(.5, A.a)*.5*(1.-ps1*.0));",
    // the wordmark (never displaced)
    "  float px = 1.7/uRes.x, py = 1.7/uRes.y;",
    "  float L = texture2D(uL, uv).r;",
    "  float Ld = max(max(texture2D(uL, uv+vec2(px,0.)).r, texture2D(uL, uv-vec2(px,0.)).r),",
    "                 max(texture2D(uL, uv+vec2(0.,py)).r, texture2D(uL, uv-vec2(0.,py)).r));",
    "  float ring = clamp(Ld - L, 0., 1.);",
    "  vec3 INK = vec3(.078,.075,.067), IVORY = vec3(.94,.92,.87);",
    "  vec3 win = mix(B, IVORY, .6);",
    "  vec3 letter = mix(win, INK, psL);",
    "  vec3 ringc = mix(INK, IVORY, psL);",
    "  col = mix(col, ringc, ring*.95);",
    "  col = mix(col, letter, L);",
    // release: a paper ground rises from the bottom with a torn, painted edge
    "  float tear = sm(.0, .06, uRel);",
    "  float edgeY = 1.04 - uRel*1.34 + ((nLo - .5)*.24 + (nHi - .5)*.05)*tear;",
    "  float paper = smoothstep(edgeY - .008, edgeY + .008, uv.y)*step(.0005, uRel);",
    "  col = mix(col, vec3(.961,.957,.945), paper);",
    "  gl_FragColor = vec4(col, 1.);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch (e) {
    if (window.console) console.warn("paint: WebGL unavailable, using the still image", e);
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["uA", "uB", "uC", "uN", "uL", "uRes", "uTex", "uMouse", "uVel", "uAct", "uP", "uRel"].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  /* ---------------- textures ---------------- */
  function makeTex(unit, repeat) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    var wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  function upload(unit, source) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }
  makeTex(0, false); makeTex(1, false); makeTex(2, false); makeTex(3, true); makeTex(4, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1); gl.uniform1i(U.uC, 2); gl.uniform1i(U.uN, 3); gl.uniform1i(U.uL, 4);

  var texSize = [1440, 900];
  var sources = { a: "a.webp", b: "b.webp", c: "c.webp", n: "noise.png" };
  var loaded = 0, need = 4, failed = false;
  function loadImg(key, unit) {
    var im = new Image();
    im.onload = function () {
      upload(unit, im);
      if (key === "a") texSize = [im.naturalWidth, im.naturalHeight];
      if (++loaded === need && !failed) go();
    };
    im.onerror = function () { failed = true; };
    im.src = BASE + sources[key];
  }

  /* ---------------- the wordmark mask (live text, same font as the header) ---------------- */
  var logoCv = document.createElement("canvas");
  function drawLogo() {
    var w = canvas.width, h = canvas.height;
    logoCv.width = w; logoCv.height = h;
    var c = logoCv.getContext("2d");
    c.fillStyle = "#000";
    c.fillRect(0, 0, w, h);
    var portrait = w / h < 0.85;
    var size = 100;
    c.font = "700 " + size + 'px "Archivo", sans-serif';
    try { c.fontStretch = "expanded"; } catch (e) { /* unsupported */ }
    try { c.letterSpacing = (-0.02 * size) + "px"; } catch (e) { /* unsupported */ }
    var m = c.measureText("@oti").width || 260;
    var target = w * (portrait ? 0.84 : 0.56);
    size = size * target / m;
    c.font = "700 " + size + 'px "Archivo", sans-serif';
    try { c.fontStretch = "expanded"; } catch (e) { /* unsupported */ }
    try { c.letterSpacing = (-0.02 * size) + "px"; } catch (e) { /* unsupported */ }
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillText("@oti", w / 2, h / 2 + size * 0.27);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    upload(4, logoCv);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  }

  /* ---------------- state ---------------- */
  var top = 0, range = 1;
  var target = 0, cur = -1;                   // scroll progress (eased)
  var m = { x: 0.5, y: 0.5 }, mt = { x: 0.5, y: 0.5 }, vel = { x: 0, y: 0 };
  var act = 0, actTarget = 0;                 // cursor influence (decays on leave)
  var running = false, visible = true;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(2, Math.round(stage.clientWidth * dpr));
    var h = Math.max(2, Math.round(stage.clientHeight * dpr));
    if (w > 1920) { h = Math.round(h * 1920 / w); w = 1920; }
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
    gl.uniform2f(U.uTex, texSize[0], texSize[1]);
    drawLogo();
    var r = root.getBoundingClientRect();
    top = r.top + window.pageYOffset;
    range = Math.max(1, root.offsetHeight - window.innerHeight);
    cur = -1;
    pump();
  }

  function readP() {
    return reduce ? 0.72 : Math.max(0, Math.min(1, (window.pageYOffset - top) / range));
  }

  function draw() {
    var p = cur;
    var rel = Math.max(0, Math.min(1, (p - 0.9) / 0.1));
    rel = rel * rel * (3 - 2 * rel);
    gl.uniform1f(U.uP, p);
    gl.uniform1f(U.uRel, rel);
    gl.uniform1f(U.uAct, act);
    gl.uniform2f(U.uMouse, m.x, m.y);
    gl.uniform2f(U.uVel, vel.x, vel.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function next(fn) {
    var done = false;
    var run = function () { if (done) return; done = true; fn(); };
    window.requestAnimationFrame(run);
    setTimeout(run, 50);                      // safety net if frames are paused
  }

  /* One loop that exists only while something is still settling. */
  function pump() {
    if (running) return;
    running = true;
    var step = function () {
      target = readP();
      if (cur < 0 || reduce) cur = target;
      else cur += (target - cur) * 0.2;
      if (Math.abs(target - cur) < 0.0004) cur = target;

      var px = m.x, py = m.y;
      m.x += (mt.x - m.x) * 0.2;
      m.y += (mt.y - m.y) * 0.2;
      vel.x = vel.x * 0.8 + (m.x - px) * 0.2;
      vel.y = vel.y * 0.8 + (m.y - py) * 0.2;
      act += (actTarget - act) * (actTarget > act ? 0.18 : 0.045);   // grabs fast, recovers slowly

      draw();

      var settling = cur !== target || Math.abs(mt.x - m.x) > 0.0005 || Math.abs(mt.y - m.y) > 0.0005 ||
                     act > 0.002 || Math.abs(vel.x) + Math.abs(vel.y) > 0.00005;
      if (!settling && act <= 0.002) act = 0;
      if (settling && visible) next(step); else running = false;
    };
    next(step);
  }

  function go() {
    root.classList.add("is-live");
    if (reduce) root.classList.add("paint--static");
    resize();
    if (reduce) return;
    window.addEventListener("scroll", function () { if (visible) pump(); }, { passive: true });
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      mt.x = (e.clientX - r.left) / r.width;
      mt.y = (e.clientY - r.top) / r.height;
      actTarget = 1;
      pump();
    }, { passive: true });
    stage.addEventListener("pointerleave", function () { actTarget = 0; pump(); });
    stage.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") { actTarget = 0; pump(); } });
    stage.addEventListener("pointercancel", function () { actTarget = 0; pump(); });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 90);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawLogo(); pump(); });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) pump();
    }, { rootMargin: "100px" }).observe(root);
  }

  loadImg("a", 0); loadImg("b", 1); loadImg("c", 2); loadImg("n", 3);
})();
