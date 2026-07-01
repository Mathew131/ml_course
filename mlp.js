(function () {
  "use strict";
  var cv = document.getElementById("nn-canvas");
  var netCv = document.getElementById("nn-net");
  var lossCv = document.getElementById("nn-loss");
  if (!cv || !window.MLDemo) return;
  var U = window.MLDemo;

  var hEl = document.getElementById("nn-h");
  var lrEl = document.getElementById("nn-lr");
  var hV = document.getElementById("nn-h-v");
  var lrV = document.getElementById("nn-lr-v");
  var epochEl = document.getElementById("nn-epoch");
  var lossEl = document.getElementById("nn-loss-v");
  var accEl = document.getElementById("nn-acc");

  var DOM = 1.2; // data lives in roughly [-1.2, 1.2]
  var dataset = "moons", activation = "tanh";
  var data = [];
  var W1, b1, W2, b2, H;
  var epoch = 0, lossHist = [], timer = null;

  // ---- data generators (normalized to ~[-1,1]) ----
  function genData() {
    data = [];
    var i, t;
    if (dataset === "moons") {
      for (i = 0; i < 80; i++) {
        t = Math.PI * (i / 80);
        data.push({ x: Math.cos(t) - 0.5 + U.randn() * 0.07, y: Math.sin(t) - 0.25 + U.randn() * 0.07, t: 0 });
        data.push({ x: 0.5 - Math.cos(t) + U.randn() * 0.07, y: 0.25 - Math.sin(t) + U.randn() * 0.07, t: 1 });
      }
    } else if (dataset === "circles") {
      for (i = 0; i < 90; i++) {
        t = 2 * Math.PI * Math.random();
        var rIn = 0.35 + U.randn() * 0.05, rOut = 0.85 + U.randn() * 0.05;
        data.push({ x: rIn * Math.cos(t), y: rIn * Math.sin(t), t: 0 });
        data.push({ x: rOut * Math.cos(t), y: rOut * Math.sin(t), t: 1 });
      }
    } else if (dataset === "xor") {
      for (i = 0; i < 160; i++) {
        var x = (Math.random() * 2 - 1) * 0.95, y = (Math.random() * 2 - 1) * 0.95;
        data.push({ x: x, y: y, t: (x > 0) === (y > 0) ? 0 : 1 });
      }
    } else { // spiral
      for (i = 0; i < 100; i++) {
        var r = i / 100 * 0.95;
        var a = i / 100 * 3.2 + U.randn() * 0.04;
        data.push({ x: r * Math.cos(a), y: r * Math.sin(a), t: 0 });
        data.push({ x: r * Math.cos(a + Math.PI), y: r * Math.sin(a + Math.PI), t: 1 });
      }
    }
  }

  function act(z) { return activation === "tanh" ? Math.tanh(z) : Math.max(0, z); }
  function actD(z) { return activation === "tanh" ? 1 - Math.tanh(z) * Math.tanh(z) : (z > 0 ? 1 : 0); }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  function initWeights() {
    H = parseInt(hEl.value, 10);
    var s = activation === "tanh" ? 1.0 : 0.6;
    W1 = []; b1 = [];
    for (var i = 0; i < H; i++) { W1.push([U.randn() * s, U.randn() * s]); b1.push(U.randn() * 0.1); }
    W2 = []; for (var j = 0; j < H; j++) W2.push(U.randn() * s);
    b2 = 0;
    epoch = 0; lossHist = [];
  }

  function forward(p) {
    var z1 = new Array(H), a1 = new Array(H), z2 = b2;
    for (var i = 0; i < H; i++) {
      z1[i] = W1[i][0] * p.x + W1[i][1] * p.y + b1[i];
      a1[i] = act(z1[i]);
      z2 += W2[i] * a1[i];
    }
    return { z1: z1, a1: a1, yhat: sigmoid(z2) };
  }

  function trainEpoch() {
    var lr = parseFloat(lrEl.value), n = data.length, loss = 0;
    var gW1 = W1.map(function () { return [0, 0]; }), gb1 = new Array(H).fill(0);
    var gW2 = new Array(H).fill(0), gb2 = 0;
    for (var k = 0; k < n; k++) {
      var p = data[k], f = forward(p);
      var eps = 1e-7;
      loss += -(p.t * Math.log(f.yhat + eps) + (1 - p.t) * Math.log(1 - f.yhat + eps));
      var d2 = f.yhat - p.t;
      gb2 += d2;
      for (var i = 0; i < H; i++) {
        gW2[i] += d2 * f.a1[i];
        var d1 = d2 * W2[i] * actD(f.z1[i]);
        gW1[i][0] += d1 * p.x; gW1[i][1] += d1 * p.y; gb1[i] += d1;
      }
    }
    for (var j = 0; j < H; j++) {
      W2[j] -= lr * gW2[j] / n;
      W1[j][0] -= lr * gW1[j][0] / n; W1[j][1] -= lr * gW1[j][1] / n; b1[j] -= lr * gb1[j] / n;
    }
    b2 -= lr * gb2 / n;
    epoch++;
    loss /= n;
    lossHist.push(loss);
    if (lossHist.length > 300) lossHist.shift();
    return loss;
  }

  // ---- drawing ----
  function drawBoundary() {
    var fc = U.fitCanvas(cv, { maxSize: 420 });
    var ctx = fc.ctx, Wd = fc.w, Hd = fc.h, col = U.palette();
    ctx.clearRect(0, 0, Wd, Hd);
    var g = 50, cw = Wd / g, ch = Hd / g;
    for (var i = 0; i < g; i++) for (var j = 0; j < g; j++) {
      var x = ((i + 0.5) / g) * 2 * DOM - DOM;
      var y = DOM - ((j + 0.5) / g) * 2 * DOM;
      var p1 = forward({ x: x, y: y }).yhat;
      ctx.fillStyle = p1 >= 0.5 ? col.accent : col.primary;
      ctx.globalAlpha = 0.1 + Math.abs(p1 - 0.5) * 0.6;
      ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
    }
    ctx.globalAlpha = 1;
    for (var k = 0; k < data.length; k++) {
      var p = data[k];
      var px = ((p.x + DOM) / (2 * DOM)) * Wd, py = Hd - ((p.y + DOM) / (2 * DOM)) * Hd;
      ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = p.t === 0 ? col.primary : col.accent; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = col.base; ctx.stroke();
    }
  }

  function drawNet() {
    if (!netCv) return;
    var fc = U.fitCanvas(netCv, { maxSize: 240, aspect: 150 / 240 });
    var ctx = fc.ctx, Wd = fc.w, Hd = fc.h, col = U.palette();
    ctx.clearRect(0, 0, Wd, Hd);
    var inX = 24, hX = Wd / 2, outX = Wd - 24;
    var inY = [Hd * 0.35, Hd * 0.65];
    var hY = [];
    for (var i = 0; i < H; i++) hY.push(14 + (i + 0.5) * (Hd - 28) / H);
    var outY = Hd / 2;

    var maxW = 0.5;
    for (var a = 0; a < H; a++) { maxW = Math.max(maxW, Math.abs(W1[a][0]), Math.abs(W1[a][1]), Math.abs(W2[a])); }

    function edge(x1, y1, x2, y2, w) {
      ctx.strokeStyle = w >= 0 ? col.primary : col.accent;
      ctx.globalAlpha = U.clamp(Math.abs(w) / maxW, 0.08, 1) * 0.9;
      ctx.lineWidth = 0.5 + 2.5 * Math.abs(w) / maxW;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    for (var h = 0; h < H; h++) {
      edge(inX, inY[0], hX, hY[h], W1[h][0]);
      edge(inX, inY[1], hX, hY[h], W1[h][1]);
      edge(hX, hY[h], outX, outY, W2[h]);
    }
    ctx.globalAlpha = 1;
    function node(x, y, c) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = col.base; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = c; ctx.stroke(); }
    node(inX, inY[0], col.accent); node(inX, inY[1], col.accent);
    for (var n2 = 0; n2 < H; n2++) node(hX, hY[n2], col.primary);
    node(outX, outY, col.contrast);
  }

  function drawLoss() {
    if (!lossCv) return;
    var fc = U.fitCanvas(lossCv, { maxSize: 240, aspect: 90 / 240 });
    var ctx = fc.ctx, Wd = fc.w, Hd = fc.h, col = U.palette();
    ctx.clearRect(0, 0, Wd, Hd);
    if (lossHist.length < 2) return;
    var mx = Math.max.apply(null, lossHist), mn = Math.min.apply(null, lossHist);
    var range = mx - mn || 1;
    ctx.strokeStyle = col.primary; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i < lossHist.length; i++) {
      var x = (i / (lossHist.length - 1)) * Wd;
      var y = Hd - ((lossHist[i] - mn) / range) * (Hd - 8) - 4;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function accuracy() {
    var c = 0;
    for (var i = 0; i < data.length; i++) if ((forward(data[i]).yhat >= 0.5 ? 1 : 0) === data[i].t) c++;
    return data.length ? c / data.length : 0;
  }

  function draw() {
    drawBoundary(); drawNet(); drawLoss();
    epochEl.textContent = String(epoch);
    lossEl.textContent = lossHist.length ? lossHist[lossHist.length - 1].toFixed(3) : "—";
    accEl.textContent = (accuracy() * 100).toFixed(0) + "%";
    hV.textContent = hEl.value; lrV.textContent = parseFloat(lrEl.value).toFixed(2);
  }

  function run() {
    if (timer) { stop(); return; }
    document.getElementById("nn-run").textContent = "⏸ Пауза";
    timer = setInterval(function () { for (var s = 0; s < 4; s++) trainEpoch(); draw(); }, 30);
  }
  function stop() { clearInterval(timer); timer = null; document.getElementById("nn-run").textContent = "▶ Обучить"; }
  function reset() { stop(); initWeights(); draw(); }

  document.querySelectorAll("[data-data]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-data]").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active"); dataset = b.getAttribute("data-data");
      genData(); reset();
    });
  });
  document.querySelectorAll("[data-act]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-act]").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active"); activation = b.getAttribute("data-act");
      reset();
    });
  });
  document.getElementById("nn-run").addEventListener("click", run);
  document.getElementById("nn-reset").addEventListener("click", reset);
  hEl.addEventListener("input", reset);
  lrEl.addEventListener("input", function () { lrV.textContent = parseFloat(lrEl.value).toFixed(2); });
  U.onRedraw(draw);

  genData(); initWeights(); draw();
})();
