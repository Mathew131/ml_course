(function () {
  "use strict";
  var dataCv = document.getElementById("sgd-data");
  var lossCv = document.getElementById("sgd-loss");
  if (!dataCv || !lossCv || !window.MLDemo) return;
  var U = window.MLDemo;

  var lrEl = document.getElementById("sgd-lr");
  var batchEl = document.getElementById("sgd-batch");
  var lamEl = document.getElementById("sgd-lambda");
  var lrV = document.getElementById("sgd-lr-v");
  var batchV = document.getElementById("sgd-batch-v");
  var lamV = document.getElementById("sgd-lambda-v");
  var stepN = document.getElementById("sgd-step-n");
  var wEl = document.getElementById("sgd-w");
  var bEl = document.getElementById("sgd-b");
  var lossEl = document.getElementById("sgd-loss-v");
  var statusEl = document.getElementById("sgd-status");

  // param-space window
  var WMIN = -1, WMAX = 3, BMIN = -2, BMAX = 3;
  var XMIN = -2.2, XMAX = 2.2, YMIN = -3.5, YMAX = 4.5;

  var data = [];
  var w, b, step, trail, timer = null;
  var lossGrid = null, lossMin = 0, lossMax = 1;
  var GRID = 64;

  function regen() {
    data = [];
    var aT = 1.3, bT = 0.7;
    for (var i = 0; i < 40; i++) {
      var x = U.clamp(U.randn() * 1.0, XMIN, XMAX);
      var y = aT * x + bT + U.randn() * 0.9;
      data.push({ x: x, y: y });
    }
    buildLossGrid();
    reset();
  }

  function lossAt(W, B) {
    var lam = parseFloat(lamEl.value);
    var s = 0;
    for (var i = 0; i < data.length; i++) {
      var e = W * data[i].x + B - data[i].y;
      s += e * e;
    }
    return s / data.length + lam * W * W;
  }

  function buildLossGrid() {
    lossGrid = new Float32Array(GRID * GRID);
    lossMin = Infinity; lossMax = -Infinity;
    for (var j = 0; j < GRID; j++) {
      var B = BMIN + ((BMAX - BMIN) * j) / (GRID - 1);
      for (var i = 0; i < GRID; i++) {
        var W = WMIN + ((WMAX - WMIN) * i) / (GRID - 1);
        var L = lossAt(W, B);
        lossGrid[j * GRID + i] = L;
        if (L < lossMin) lossMin = L;
        if (L > lossMax) lossMax = L;
      }
    }
  }

  function reset() {
    stop();
    w = -0.6; b = -1.6;
    step = 0;
    trail = [{ w: w, b: b }];
    statusEl.textContent = "";
    draw();
  }

  function doStep() {
    var lr = parseFloat(lrEl.value);
    var bs = parseInt(batchEl.value, 10);
    var lam = parseFloat(lamEl.value);
    var dw = 0, db = 0;
    for (var k = 0; k < bs; k++) {
      var p = data[(Math.random() * data.length) | 0];
      var e = w * p.x + b - p.y;
      dw += 2 * e * p.x;
      db += 2 * e;
    }
    dw = dw / bs + 2 * lam * w;
    db = db / bs;
    w -= lr * dw;
    b -= lr * db;
    step++;
    if (!isFinite(w) || Math.abs(w) > 12 || Math.abs(b) > 12) {
      w = U.clamp(w, -12, 12); b = U.clamp(b, -12, 12);
      statusEl.textContent = "⚠ расходится — слишком большой learning rate";
      stop();
    } else {
      var g = Math.hypot(dw, db);
      statusEl.textContent = g < 0.05 ? "✓ почти в минимуме (градиент ≈ 0)" :
        (bs === 1 ? "чистый SGD: шаги дрожат по одному объекту" : "");
    }
    trail.push({ w: w, b: b });
    if (trail.length > 400) trail.shift();
    draw();
  }

  // ---- drawing ----
  function drawData() {
    var f = U.fitCanvas(dataCv, { maxSize: 360, aspect: 300 / 360 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);
    function px(x, y) { return { x: ((x - XMIN) / (XMAX - XMIN)) * W, y: H - ((y - YMIN) / (YMAX - YMIN)) * H }; }

    ctx.strokeStyle = col.midtone; ctx.globalAlpha = 0.3; ctx.lineWidth = 1;
    var zx = px(0, 0);
    ctx.beginPath(); ctx.moveTo(zx.x, 0); ctx.lineTo(zx.x, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, zx.y); ctx.lineTo(W, zx.y); ctx.stroke();
    ctx.globalAlpha = 1;

    // line
    var a = px(XMIN, w * XMIN + b), bb = px(XMAX, w * XMAX + b);
    ctx.strokeStyle = col.primary; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();

    for (var i = 0; i < data.length; i++) {
      var c = px(data[i].x, data[i].y);
      ctx.beginPath(); ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = col.accent; ctx.fill();
    }
  }

  function drawLoss() {
    var f = U.fitCanvas(lossCv, { maxSize: 360, aspect: 300 / 360 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);
    var cw = W / GRID, ch = H / GRID;
    var range = lossMax - lossMin || 1;
    for (var j = 0; j < GRID; j++) {
      for (var i = 0; i < GRID; i++) {
        var t = (lossGrid[j * GRID + i] - lossMin) / range; // 0 = min
        ctx.fillStyle = col.primary;
        ctx.globalAlpha = Math.pow(1 - t, 1.6) * 0.6;
        // y axis: B increases upward
        ctx.fillRect(i * cw, H - (j + 1) * ch, cw + 1, ch + 1);
      }
    }
    ctx.globalAlpha = 1;

    function px(W_, B_) {
      return { x: ((W_ - WMIN) / (WMAX - WMIN)) * W, y: H - ((B_ - BMIN) / (BMAX - BMIN)) * H };
    }

    // trail
    ctx.strokeStyle = col.contrast; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (var k = 0; k < trail.length; k++) {
      var p = px(trail[k].w, trail[k].b);
      if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // current point
    var cur = px(w, b);
    ctx.beginPath(); ctx.arc(cur.x, cur.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = col.contrast; ctx.fill();
    ctx.beginPath(); ctx.arc(cur.x, cur.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = col.accent; ctx.fill();

    // axes labels
    ctx.fillStyle = col.contrast; ctx.font = "11px Menlo, monospace";
    ctx.fillText("w →", W - 28, H - 6);
    ctx.fillText("b ↑", 6, 14);
  }

  function draw() {
    drawData();
    drawLoss();
    stepN.textContent = String(step);
    wEl.textContent = w.toFixed(3);
    bEl.textContent = b.toFixed(3);
    lossEl.textContent = lossAt(w, b).toFixed(3);
    lrV.textContent = parseFloat(lrEl.value).toFixed(3);
    batchV.textContent = batchEl.value;
    lamV.textContent = parseFloat(lamEl.value).toFixed(2);
  }

  function run() {
    if (timer) { stop(); return; }
    document.getElementById("sgd-run").textContent = "⏸ Пауза";
    timer = setInterval(function () { doStep(); doStep(); }, 60);
  }
  function stop() {
    clearInterval(timer); timer = null;
    document.getElementById("sgd-run").textContent = "▶ Запустить";
  }

  document.getElementById("sgd-run").addEventListener("click", run);
  document.getElementById("sgd-step").addEventListener("click", function () { stop(); doStep(); });
  document.getElementById("sgd-reset").addEventListener("click", reset);
  document.getElementById("sgd-regen").addEventListener("click", regen);
  lrEl.addEventListener("input", draw);
  batchEl.addEventListener("input", draw);
  lamEl.addEventListener("input", function () { buildLossGrid(); draw(); });
  U.onRedraw(draw);

  regen();
})();
