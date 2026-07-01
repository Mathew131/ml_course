(function () {
  "use strict";
  var canvas = document.getElementById("pc-canvas");
  if (!canvas || !window.MLDemo) return;
  var U = window.MLDemo;

  var lrEl = document.getElementById("pc-lr");
  var lrV = document.getElementById("pc-lr-v");
  var epochEl = document.getElementById("pc-epoch");
  var errEl = document.getElementById("pc-err");
  var wEl = document.getElementById("pc-w");
  var bEl = document.getElementById("pc-b");
  var statusEl = document.getElementById("pc-status");
  var btnA = document.getElementById("pc-ca");
  var btnB = document.getElementById("pc-cb");

  var DOM = 3;
  var points = [];
  var w1, w2, b, epoch, cursor, timer = null, brush = 1, lastMis = -1;

  function regen() {
    points = [];
    for (var i = 0; i < 18; i++) {
      points.push({ x: U.clamp(1.1 + U.randn() * 0.6, -DOM, DOM), y: U.clamp(0.9 + U.randn() * 0.6, -DOM, DOM), t: 1 });
      points.push({ x: U.clamp(-1.1 + U.randn() * 0.6, -DOM, DOM), y: U.clamp(-0.9 + U.randn() * 0.6, -DOM, DOM), t: -1 });
    }
    reset();
  }

  function reset() {
    stop();
    w1 = U.randn() * 0.3; w2 = U.randn() * 0.3; b = 0;
    epoch = 0; cursor = 0; lastMis = -1;
    statusEl.textContent = "";
    draw();
  }

  function pred(p) { return w1 * p.x + w2 * p.y + b >= 0 ? 1 : -1; }
  function errorCount() {
    var e = 0;
    for (var i = 0; i < points.length; i++) if (pred(points[i]) !== points[i].t) e++;
    return e;
  }

  function step() {
    var lr = parseFloat(lrEl.value);
    var n = points.length;
    // scan from cursor for next misclassified point
    for (var k = 0; k < n; k++) {
      var idx = (cursor + k) % n;
      var p = points[idx];
      if (pred(p) !== p.t) {
        w1 += lr * p.t * p.x;
        w2 += lr * p.t * p.y;
        b += lr * p.t;
        cursor = (idx + 1) % n;
        if (idx < cursor - 1 || k > 0) {} // noop
        lastMis = idx;
        if (cursor === 0) epoch++;
        draw();
        return true;
      }
    }
    // no misclassified point found
    epoch++;
    lastMis = -1;
    statusEl.textContent = "✓ данные разделены — ошибок нет";
    stop();
    draw();
    return false;
  }

  function toPx(x, y, W, H) { return { x: ((x + DOM) / (2 * DOM)) * W, y: H - ((y + DOM) / (2 * DOM)) * H }; }

  function draw() {
    var f = U.fitCanvas(canvas, { maxSize: 420 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);

    // half-plane shading
    var cells = 40, cw = W / cells, ch = H / cells;
    for (var i = 0; i < cells; i++) {
      for (var j = 0; j < cells; j++) {
        var x = ((i + 0.5) / cells) * 2 * DOM - DOM;
        var y = DOM - ((j + 0.5) / cells) * 2 * DOM;
        var s = w1 * x + w2 * y + b;
        ctx.fillStyle = s >= 0 ? col.primary : col.accent;
        ctx.globalAlpha = U.clamp(Math.abs(s) * 0.12, 0, 0.28);
        ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
      }
    }
    ctx.globalAlpha = 1;

    // boundary line w1 x + w2 y + b = 0
    ctx.strokeStyle = col.contrast; ctx.lineWidth = 2;
    ctx.beginPath();
    if (Math.abs(w2) > 1e-6) {
      var xa = -DOM, xb = DOM;
      var pa = toPx(xa, -(w1 * xa + b) / w2, W, H);
      var pb = toPx(xb, -(w1 * xb + b) / w2, W, H);
      ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
    } else if (Math.abs(w1) > 1e-6) {
      var xv = -b / w1;
      var p1 = toPx(xv, -DOM, W, H), p2 = toPx(xv, DOM, W, H);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // points
    for (var m = 0; m < points.length; m++) {
      var p = points[m], c = toPx(p.x, p.y, W, H);
      var mis = pred(p) !== p.t;
      ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.t === 1 ? col.primary : col.accent; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = col.base; ctx.stroke();
      if (mis) {
        ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = col.contrast; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    epochEl.textContent = String(epoch);
    errEl.textContent = String(errorCount());
    wEl.textContent = "(" + w1.toFixed(2) + ", " + w2.toFixed(2) + ")";
    bEl.textContent = b.toFixed(2);
    lrV.textContent = parseFloat(lrEl.value).toFixed(2);
  }

  function run() {
    if (timer) { stop(); return; }
    document.getElementById("pc-run").textContent = "⏸ Пауза";
    timer = setInterval(step, 180);
  }
  function stop() {
    clearInterval(timer); timer = null;
    document.getElementById("pc-run").textContent = "▶ Запустить";
  }
  function setBrush(v) {
    brush = v;
    btnA.classList.toggle("active", v === 1);
    btnB.classList.toggle("active", v === -1);
  }

  canvas.addEventListener("click", function (e) {
    var r = canvas.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width) * 2 * DOM - DOM;
    var y = (1 - (e.clientY - r.top) / r.height) * 2 * DOM - DOM;
    points.push({ x: x, y: y, t: brush });
    statusEl.textContent = "";
    draw();
  });
  document.getElementById("pc-run").addEventListener("click", run);
  document.getElementById("pc-step").addEventListener("click", function () { stop(); step(); });
  document.getElementById("pc-reset").addEventListener("click", reset);
  document.getElementById("pc-regen").addEventListener("click", regen);
  btnA.addEventListener("click", function () { setBrush(1); });
  btnB.addEventListener("click", function () { setBrush(-1); });
  lrEl.addEventListener("input", draw);
  U.onRedraw(draw);

  regen();
})();
