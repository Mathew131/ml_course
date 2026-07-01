/* Tiny shared helpers for the canvas demos. Exposed as window.MLDemo. */
(function () {
  "use strict";

  function css(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  // Common theme palette pulled from CSS variables.
  function palette() {
    return {
      base: css("--base"),
      contrast: css("--contrast"),
      primary: css("--primary"),
      accent: css("--accent"),
      midtone: css("--midtone"),
    };
  }

  // HiDPI-aware sizing. Keeps the canvas square-ish to its CSS box width
  // (capped) and returns the logical (CSS-pixel) size to draw against.
  function fitCanvas(canvas, opts) {
    opts = opts || {};
    var maxSize = opts.maxSize || 460;
    var aspect = opts.aspect || 1; // height / width
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.min(rect.width || maxSize, maxSize);
    var h = w * aspect;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  // Standard normal sample (Box-Muller).
  function randn() {
    var u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  // Re-run draw() on resize.
  function onRedraw(draw) {
    window.addEventListener("resize", draw);
  }

  window.MLDemo = {
    css: css,
    palette: palette,
    fitCanvas: fitCanvas,
    randn: randn,
    clamp: clamp,
    onRedraw: onRedraw,
  };
})();
