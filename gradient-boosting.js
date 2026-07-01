(function () {
  "use strict";
  var canvas = document.getElementById("gb-canvas");
  if (!canvas || !window.MLDemo) return;
  var U = window.MLDemo;

  var mEl = document.getElementById("gb-m");
  var lrEl = document.getElementById("gb-lr");
  var mV = document.getElementById("gb-m-v");
  var lrV = document.getElementById("gb-lr-v");
  var m2 = document.getElementById("gb-m2");
  var lr2 = document.getElementById("gb-lr2");
  var mseEl = document.getElementById("gb-mse");

  var MAX = 80, YMIN = -1.8, YMAX = 1.8;
  var data = [];
  var base = 0;
  var stages = [];   // each: regression tree on residuals
  var timer = null;

  function trueF(x) { return Math.sin(x * 2 * Math.PI) * 0.9 + (x - 0.5) * 0.6; }

  function regen() {
    data = [];
    for (var i = 0; i < 40; i++) {
      var x = Math.random();
      data.push({ x: x, y: trueF(x) + U.randn() * 0.18 });
    }
    rebuild();
  }

  // --- tiny 1D regression tree (depth-limited, SSE splits) ---
  function buildReg(samples, depth, maxDepth) {
    var mean = 0;
    for (var i = 0; i < samples.length; i++) mean += samples[i].r;
    mean /= samples.length || 1;
    var node = { leaf: true, value: mean };
    if (depth >= maxDepth || samples.length < 4) return node;

    var sorted = samples.slice().sort(function (a, b) { return a.x - b.x; });
    var best = null, n = sorted.length;
    // prefix sums of r
    var pre = [0], pre2 = [0];
    for (var k = 0; k < n; k++) { pre.push(pre[k] + sorted[k].r); pre2.push(pre2[k] + sorted[k].r * sorted[k].r); }
    function sse(lo, hi) { // [lo,hi)
      var cnt = hi - lo; if (cnt <= 0) return 0;
      var s = pre[hi] - pre[lo], s2 = pre2[hi] - pre2[lo];
      return s2 - s * s / cnt;
    }
    for (var i2 = 1; i2 < n; i2++) {
      if (sorted[i2].x === sorted[i2 - 1].x) continue;
      var cost = sse(0, i2) + sse(i2, n);
      if (!best || cost < best.cost) best = { cost: cost, idx: i2, thr: (sorted[i2].x + sorted[i2 - 1].x) / 2 };
    }
    if (!best) return node;
    var left = [], right = [];
    for (var j = 0; j < samples.length; j++) (samples[j].x <= best.thr ? left : right).push(samples[j]);
    if (!left.length || !right.length) return node;
    node.leaf = false; node.thr = best.thr;
    node.left = buildReg(left, depth + 1, maxDepth);
    node.right = buildReg(right, depth + 1, maxDepth);
    return node;
  }
  function predReg(node, x) { while (!node.leaf) node = x <= node.thr ? node.left : node.right; return node.value; }

  function rebuild() {
    var lr = parseFloat(lrEl.value);
    base = 0;
    for (var i = 0; i < data.length; i++) base += data[i].y;
    base /= data.length;
    var F = data.map(function () { return base; });
    stages = [];
    for (var m = 0; m < MAX; m++) {
      var samples = data.map(function (d, idx) { return { x: d.x, r: d.y - F[idx] }; });
      var tree = buildReg(samples, 0, 3);
      stages.push(tree);
      for (var k = 0; k < data.length; k++) F[k] += lr * predReg(tree, data[k].x);
    }
    draw();
  }

  function predict(x, M, lr) {
    var v = base;
    for (var m = 0; m < M; m++) v += lr * predReg(stages[m], x);
    return v;
  }

  function draw() {
    var f = U.fitCanvas(canvas, { maxSize: 460, aspect: 320 / 460 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    var M = parseInt(mEl.value, 10), lr = parseFloat(lrEl.value);
    ctx.clearRect(0, 0, W, H);
    function px(x, y) { return { x: x * W, y: H - ((y - YMIN) / (YMAX - YMIN)) * H }; }

    // zero line
    ctx.strokeStyle = col.midtone; ctx.globalAlpha = 0.3;
    var z = px(0, 0); ctx.beginPath(); ctx.moveTo(0, z.y); ctx.lineTo(W, z.y); ctx.stroke();
    ctx.globalAlpha = 1;

    // true function
    ctx.strokeStyle = col.midtone; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i <= 120; i++) { var x = i / 120; var p = px(x, trueF(x)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    ctx.stroke(); ctx.setLineDash([]);

    // ensemble prediction (staircase)
    ctx.strokeStyle = col.primary; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var j = 0; j <= 300; j++) {
      var xx = j / 300, yy = U.clamp(predict(xx, M, lr), YMIN, YMAX), pp = px(xx, yy);
      j ? ctx.lineTo(pp.x, pp.y) : ctx.moveTo(pp.x, pp.y);
    }
    ctx.stroke();

    // points
    var mse = 0;
    for (var k = 0; k < data.length; k++) {
      var d = data[k], c = px(d.x, U.clamp(d.y, YMIN, YMAX));
      ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = col.accent; ctx.fill();
      var e = d.y - predict(d.x, M, lr); mse += e * e;
    }
    mse /= data.length;

    m2.textContent = String(M); lr2.textContent = lr.toFixed(2);
    mseEl.textContent = mse.toFixed(4);
    mV.textContent = String(M); lrV.textContent = lr.toFixed(2);
  }

  function play() {
    if (timer) { clearInterval(timer); timer = null; document.getElementById("gb-play").textContent = "▶ Добавлять деревья"; return; }
    document.getElementById("gb-play").textContent = "⏸ Пауза";
    mEl.value = 0; draw();
    timer = setInterval(function () {
      var v = parseInt(mEl.value, 10) + 1;
      mEl.value = v; draw();
      if (v >= MAX) { clearInterval(timer); timer = null; document.getElementById("gb-play").textContent = "▶ Добавлять деревья"; }
    }, 90);
  }

  mEl.addEventListener("input", draw);
  lrEl.addEventListener("input", rebuild);
  document.getElementById("gb-play").addEventListener("click", play);
  document.getElementById("gb-regen").addEventListener("click", regen);
  U.onRedraw(draw);

  regen();
})();
