(function () {
  "use strict";
  var canvas = document.getElementById("km-canvas");
  if (!canvas || !window.MLDemo) return;
  var U = window.MLDemo;

  var kEl = document.getElementById("km-k");
  var kV = document.getElementById("km-k-v");
  var iterEl = document.getElementById("km-iter");
  var inertiaEl = document.getElementById("km-inertia");
  var statusEl = document.getElementById("km-status");

  // theme-independent cluster hues, readable on dark & light
  var CLUSTER = ["#7fff7f", "#0099cc", "#ff6b6b", "#ffd24d", "#c77dff", "#ff9e64"];
  var DOM = 10;

  var points = [];
  var centroids = [];
  var iter = 0;
  var timer = null;

  function regenPoints() {
    points = [];
    var blobs = 3 + Math.floor(Math.random() * 3); // 3..5 true blobs
    for (var b = 0; b < blobs; b++) {
      var cx = 1.5 + Math.random() * (DOM - 3);
      var cy = 1.5 + Math.random() * (DOM - 3);
      var n = 18 + Math.floor(Math.random() * 14);
      for (var i = 0; i < n; i++) {
        points.push({
          x: U.clamp(cx + U.randn() * 0.9, 0, DOM),
          y: U.clamp(cy + U.randn() * 0.9, 0, DOM),
          c: 0,
        });
      }
    }
  }

  function initCentroids() {
    var k = parseInt(kEl.value, 10);
    centroids = [];
    var used = {};
    while (centroids.length < k && centroids.length < points.length) {
      var idx = Math.floor(Math.random() * points.length);
      if (used[idx]) continue;
      used[idx] = true;
      centroids.push({ x: points[idx].x, y: points[idx].y });
    }
    iter = 0;
    statusEl.textContent = "";
    assign();
  }

  function assign() {
    var changed = 0;
    for (var i = 0; i < points.length; i++) {
      var best = 0,
        bd = Infinity;
      for (var c = 0; c < centroids.length; c++) {
        var dx = points[i].x - centroids[c].x;
        var dy = points[i].y - centroids[c].y;
        var d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      if (points[i].c !== best) changed++;
      points[i].c = best;
    }
    return changed;
  }

  function update() {
    var sums = centroids.map(function () {
      return { x: 0, y: 0, n: 0 };
    });
    for (var i = 0; i < points.length; i++) {
      var s = sums[points[i].c];
      s.x += points[i].x;
      s.y += points[i].y;
      s.n++;
    }
    for (var c = 0; c < centroids.length; c++) {
      if (sums[c].n > 0) {
        centroids[c].x = sums[c].x / sums[c].n;
        centroids[c].y = sums[c].y / sums[c].n;
      }
    }
  }

  function inertia() {
    var sum = 0;
    for (var i = 0; i < points.length; i++) {
      var dx = points[i].x - centroids[points[i].c].x;
      var dy = points[i].y - centroids[points[i].c].y;
      sum += dx * dx + dy * dy;
    }
    return sum;
  }

  function step() {
    update();
    var changed = assign();
    iter++;
    if (changed === 0) {
      statusEl.textContent = "✓ сошлось — назначения больше не меняются";
      stop();
    } else {
      statusEl.textContent = changed + " точек сменили кластер";
    }
    draw();
  }

  function toPx(x, y, w, h) {
    return { px: (x / DOM) * w, py: h - (y / DOM) * h };
  }

  function draw() {
    var f = U.fitCanvas(canvas, { maxSize: 420 });
    var ctx = f.ctx,
      w = f.w,
      h = f.h;
    var col = U.palette();
    ctx.clearRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = col.midtone;
    ctx.globalAlpha = 0.25;
    for (var g = 1; g < DOM; g++) {
      ctx.beginPath();
      ctx.moveTo((g / DOM) * w, 0);
      ctx.lineTo((g / DOM) * w, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (g / DOM) * h);
      ctx.lineTo(w, (g / DOM) * h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // points
    for (var i = 0; i < points.length; i++) {
      var p = toPx(points[i].x, points[i].y, w, h);
      ctx.beginPath();
      ctx.arc(p.px, p.py, 4, 0, Math.PI * 2);
      ctx.fillStyle = CLUSTER[points[i].c % CLUSTER.length];
      ctx.globalAlpha = 0.85;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // centroids
    for (var c = 0; c < centroids.length; c++) {
      var cp = toPx(centroids[c].x, centroids[c].y, w, h);
      ctx.save();
      ctx.translate(cp.px, cp.py);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = CLUSTER[c % CLUSTER.length];
      ctx.fillRect(-8, -8, 16, 16);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = col.contrast;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }

    iterEl.textContent = String(iter);
    inertiaEl.textContent = inertia().toFixed(1);
    kV.textContent = kEl.value;
  }

  function run() {
    if (timer) {
      stop();
      return;
    }
    document.getElementById("km-run").textContent = "⏸ Пауза";
    timer = setInterval(step, 500);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
    document.getElementById("km-run").textContent = "▶ Запустить";
  }

  document.getElementById("km-run").addEventListener("click", run);
  document.getElementById("km-step").addEventListener("click", function () {
    stop();
    step();
  });
  document.getElementById("km-regen").addEventListener("click", function () {
    stop();
    regenPoints();
    initCentroids();
    draw();
  });
  kEl.addEventListener("input", function () {
    stop();
    initCentroids();
    draw();
  });
  U.onRedraw(draw);

  regenPoints();
  initCentroids();
  draw();
})();
