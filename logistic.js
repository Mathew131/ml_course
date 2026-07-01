(function () {
  "use strict";
  var canvas = document.getElementById("lg-canvas");
  if (!canvas || !window.MLDemo) return;
  var U = window.MLDemo;

  var wEl = document.getElementById("lg-w");
  var bEl = document.getElementById("lg-b");
  var wV = document.getElementById("lg-w-v");
  var bV = document.getElementById("lg-b-v");
  var lossEl = document.getElementById("lg-loss");
  var accEl = document.getElementById("lg-acc");
  var thrEl = document.getElementById("lg-thr");

  var XMIN = -6, XMAX = 6;
  var points = [];
  var timer = null;

  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  function regen() {
    points = [];
    for (var i = 0; i < 16; i++) {
      points.push({ x: U.clamp(-2 + U.randn() * 1.6, XMIN, XMAX), t: 0 });
      points.push({ x: U.clamp(2 + U.randn() * 1.6, XMIN, XMAX), t: 1 });
    }
    draw();
  }

  function metrics(w, b) {
    var loss = 0, correct = 0, eps = 1e-7;
    for (var i = 0; i < points.length; i++) {
      var p = sigmoid(w * points[i].x + b);
      var t = points[i].t;
      loss += -(t * Math.log(p + eps) + (1 - t) * Math.log(1 - p + eps));
      if ((p >= 0.5 ? 1 : 0) === t) correct++;
    }
    return { loss: loss / points.length, acc: correct / points.length };
  }

  function toPx(x, prob, W, H) {
    return { x: ((x - XMIN) / (XMAX - XMIN)) * W, y: H - prob * (H - 30) - 15 };
  }

  function draw() {
    var f = U.fitCanvas(canvas, { maxSize: 460, aspect: 320 / 460 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    var w = parseFloat(wEl.value), b = parseFloat(bEl.value);
    ctx.clearRect(0, 0, W, H);

    // 0 / 0.5 / 1 guide lines
    ctx.strokeStyle = col.midtone; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach(function (lvl) {
      ctx.globalAlpha = lvl === 0.5 ? 0.5 : 0.25;
      ctx.setLineDash(lvl === 0.5 ? [4, 4] : []);
      var y = toPx(XMIN, lvl, W, H).y;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // threshold vertical x0 = -b/w
    if (Math.abs(w) > 1e-3) {
      var x0 = -b / w;
      if (x0 > XMIN && x0 < XMAX) {
        var tx = toPx(x0, 0, W, H).x;
        ctx.strokeStyle = col.accent; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, H); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // sigmoid curve
    ctx.strokeStyle = col.primary; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var i = 0; i <= 200; i++) {
      var x = XMIN + ((XMAX - XMIN) * i) / 200;
      var p = toPx(x, sigmoid(w * x + b), W, H);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // points at their class level
    for (var k = 0; k < points.length; k++) {
      var pt = points[k];
      var prob = sigmoid(w * pt.x + b);
      var pred = prob >= 0.5 ? 1 : 0;
      var c = toPx(pt.x, pt.t, W, H);
      ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = pt.t === 1 ? col.primary : col.accent; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = col.base; ctx.stroke();
      if (pred !== pt.t) {
        ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = col.contrast; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    // axis labels
    ctx.fillStyle = col.contrast; ctx.font = "11px Menlo, monospace";
    ctx.fillText("p=1", 4, toPx(0, 1, W, H).y - 4);
    ctx.fillText("p=0", 4, toPx(0, 0, W, H).y + 14);
    ctx.fillText("x →", W - 26, H - 4);

    var m = metrics(w, b);
    lossEl.textContent = m.loss.toFixed(3);
    accEl.textContent = (m.acc * 100).toFixed(0) + "%";
    thrEl.textContent = Math.abs(w) > 1e-3 ? (-b / w).toFixed(2) : "—";
    wV.textContent = w.toFixed(1);
    bV.textContent = b.toFixed(1);
  }

  function fit() {
    if (timer) { stop(); return; }
    document.getElementById("lg-fit").textContent = "⏸ Пауза";
    var w = parseFloat(wEl.value), b = parseFloat(bEl.value), lr = 0.3, n = points.length;
    timer = setInterval(function () {
      for (var iter = 0; iter < 6; iter++) {
        var gw = 0, gb = 0;
        for (var i = 0; i < n; i++) {
          var err = sigmoid(w * points[i].x + b) - points[i].t;
          gw += err * points[i].x; gb += err;
        }
        w -= (lr * gw) / n; b -= (lr * gb) / n;
      }
      wEl.value = U.clamp(w, -2, 14);
      bEl.value = U.clamp(b, -10, 10);
      draw();
    }, 40);
    setTimeout(stop, 4000);
  }
  function stop() {
    clearInterval(timer); timer = null;
    document.getElementById("lg-fit").textContent = "▶ Обучить (GD по log-loss)";
  }

  wEl.addEventListener("input", draw);
  bEl.addEventListener("input", draw);
  document.getElementById("lg-fit").addEventListener("click", fit);
  document.getElementById("lg-regen").addEventListener("click", regen);
  U.onRedraw(draw);

  regen();
})();
