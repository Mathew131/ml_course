(function () {
  "use strict";
  var canvas = document.getElementById("svm-canvas");
  if (!canvas || !window.MLDemo) return;
  var U = window.MLDemo;

  var cEl = document.getElementById("svm-c");
  var cV = document.getElementById("svm-c-v");
  var c2 = document.getElementById("svm-c2");
  var marginEl = document.getElementById("svm-margin");
  var svEl = document.getElementById("svm-sv");
  var accEl = document.getElementById("svm-acc");

  var DOM = 3;
  var points = [];
  var w1, w2, b, timer = null;

  function Cval() { return Math.pow(10, parseFloat(cEl.value)); }

  function regen() {
    points = [];
    for (var i = 0; i < 22; i++) {
      points.push({ x: U.clamp(1.0 + U.randn() * 0.85, -DOM, DOM), y: U.clamp(0.9 + U.randn() * 0.85, -DOM, DOM), t: 1 });
      points.push({ x: U.clamp(-1.0 + U.randn() * 0.85, -DOM, DOM), y: U.clamp(-0.9 + U.randn() * 0.85, -DOM, DOM), t: -1 });
    }
    w1 = 1; w2 = 1; b = 0;
    train(600);
    draw();
  }

  // full-batch subgradient descent on hinge + L2
  function train(iters) {
    var C = Cval(), n = points.length, lr0 = 0.02;
    for (var it = 0; it < iters; it++) {
      var lr = lr0 / (1 + it * 0.002);
      var gw1 = w1, gw2 = w2, gb = 0; // gradient of 0.5||w||^2
      for (var i = 0; i < n; i++) {
        var p = points[i];
        var margin = p.t * (w1 * p.x + w2 * p.y + b);
        if (margin < 1) {
          gw1 -= C * p.t * p.x;
          gw2 -= C * p.t * p.y;
          gb -= C * p.t;
        }
      }
      w1 -= lr * gw1 / n;
      w2 -= lr * gw2 / n;
      b -= lr * gb / n;
    }
  }

  function toPx(x, y, W, H) { return { x: ((x + DOM) / (2 * DOM)) * W, y: H - ((y + DOM) / (2 * DOM)) * H }; }

  function lineForLevel(level, W, H) {
    // w1 x + w2 y + b = level  -> y = (level - b - w1 x)/w2
    if (Math.abs(w2) < 1e-6) return null;
    var xa = -DOM, xb = DOM;
    return [toPx(xa, (level - b - w1 * xa) / w2, W, H), toPx(xb, (level - b - w1 * xb) / w2, W, H)];
  }

  function draw() {
    var f = U.fitCanvas(canvas, { maxSize: 420 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);

    // half-plane shading
    var cells = 40, cw = W / cells, ch = H / cells;
    for (var i = 0; i < cells; i++) for (var j = 0; j < cells; j++) {
      var x = ((i + 0.5) / cells) * 2 * DOM - DOM;
      var y = DOM - ((j + 0.5) / cells) * 2 * DOM;
      var s = w1 * x + w2 * y + b;
      ctx.fillStyle = s >= 0 ? col.primary : col.accent;
      ctx.globalAlpha = U.clamp(Math.abs(s) * 0.1, 0, 0.22);
      ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
    }
    ctx.globalAlpha = 1;

    // margin lines
    var mp = lineForLevel(1, W, H), mn = lineForLevel(-1, W, H), m0 = lineForLevel(0, W, H);
    ctx.strokeStyle = col.midtone; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    [mp, mn].forEach(function (l) { if (l) { ctx.beginPath(); ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); ctx.stroke(); } });
    ctx.setLineDash([]);
    if (m0) { ctx.strokeStyle = col.contrast; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(m0[0].x, m0[0].y); ctx.lineTo(m0[1].x, m0[1].y); ctx.stroke(); }

    // points, support vectors highlighted
    var nsv = 0, correct = 0;
    for (var k = 0; k < points.length; k++) {
      var p = points[k], cc = toPx(p.x, p.y, W, H);
      var score = w1 * p.x + w2 * p.y + b;
      if ((score >= 0 ? 1 : -1) === p.t) correct++;
      var isSV = p.t * score <= 1 + 1e-2;
      if (isSV) nsv++;
      ctx.beginPath(); ctx.arc(cc.x, cc.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.t === 1 ? col.primary : col.accent; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = col.base; ctx.stroke();
      if (isSV) { ctx.beginPath(); ctx.arc(cc.x, cc.y, 9, 0, Math.PI * 2); ctx.strokeStyle = col.contrast; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    var normW = Math.hypot(w1, w2) || 1e-6;
    marginEl.textContent = (2 / normW).toFixed(2);
    svEl.textContent = String(nsv);
    accEl.textContent = (100 * correct / points.length).toFixed(0) + "%";
    c2.textContent = Cval().toFixed(1);
    cV.textContent = Cval().toFixed(1);
  }

  function fit() {
    if (timer) { clearInterval(timer); timer = null; document.getElementById("svm-fit").textContent = "▶ Обучить"; return; }
    document.getElementById("svm-fit").textContent = "⏸ идёт обучение…";
    w1 = U.randn() * 0.5; w2 = U.randn() * 0.5; b = 0;
    var rounds = 0;
    timer = setInterval(function () {
      train(60); draw(); rounds++;
      if (rounds > 18) { clearInterval(timer); timer = null; document.getElementById("svm-fit").textContent = "▶ Обучить"; }
    }, 50);
  }

  cEl.addEventListener("input", function () { train(400); draw(); });
  document.getElementById("svm-fit").addEventListener("click", fit);
  document.getElementById("svm-regen").addEventListener("click", regen);
  U.onRedraw(draw);

  regen();
})();
