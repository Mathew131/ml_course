(function () {
  "use strict";
  var canvas = document.getElementById("db-canvas");
  if (!canvas || !window.MLDemo) return;
  var U = window.MLDemo;

  var epsEl = document.getElementById("db-eps");
  var minEl = document.getElementById("db-min");
  var epsV = document.getElementById("db-eps-v");
  var minV = document.getElementById("db-min-v");
  var clustersEl = document.getElementById("db-clusters");
  var noiseEl = document.getElementById("db-noise");
  var eps2 = document.getElementById("db-eps2");
  var min2 = document.getElementById("db-min2");

  var CLUSTER = ["#7fff7f", "#0099cc", "#ff6b6b", "#ffd24d", "#c77dff", "#ff9e64"];
  var DOM = 10;
  var points = [];

  function regen() {
    points = [];
    for (var i = 0; i < 55; i++) {
      var t = Math.PI * (i / 55);
      points.push({ x: U.clamp(3 + 2.6 * Math.cos(t) + U.randn() * 0.22, 0, DOM), y: U.clamp(5 + 2.6 * Math.sin(t) + U.randn() * 0.22, 0, DOM) });
      points.push({ x: U.clamp(6 - 2.6 * Math.cos(t) + U.randn() * 0.22, 0, DOM), y: U.clamp(4 - 2.6 * Math.sin(t) + U.randn() * 0.22, 0, DOM) });
    }
    // uniform noise
    for (var k = 0; k < 16; k++) points.push({ x: Math.random() * DOM, y: Math.random() * DOM });
    run();
  }

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  function run() {
    var eps = parseFloat(epsEl.value), minPts = parseInt(minEl.value, 10);
    var n = points.length;
    var neighbors = [];
    for (var i = 0; i < n; i++) {
      var nb = [];
      for (var j = 0; j < n; j++) if (i !== j && dist(points[i], points[j]) <= eps) nb.push(j);
      neighbors.push(nb);
    }
    var label = new Array(n).fill(-2); // -2 unvisited, -1 noise, >=0 cluster
    var isCore = new Array(n).fill(false);
    for (var c = 0; c < n; c++) isCore[c] = neighbors[c].length >= minPts - 1; // self not counted in nb

    var cid = -1;
    for (var p = 0; p < n; p++) {
      if (label[p] !== -2) continue;
      if (!isCore[p]) { label[p] = -1; continue; }
      cid++;
      label[p] = cid;
      var queue = neighbors[p].slice();
      for (var q = 0; q < queue.length; q++) {
        var pt = queue[q];
        if (label[pt] === -1) label[pt] = cid;       // border previously noise
        if (label[pt] !== -2) continue;
        label[pt] = cid;
        if (isCore[pt]) queue = queue.concat(neighbors[pt]);
      }
    }

    var noise = 0;
    for (var z = 0; z < n; z++) {
      points[z].label = label[z];
      points[z].core = isCore[z] && label[z] >= 0;
      if (label[z] === -1) noise++;
    }
    clustersEl.textContent = String(cid + 1);
    noiseEl.textContent = String(noise);
    eps2.textContent = eps.toFixed(2);
    min2.textContent = String(minPts);
    epsV.textContent = eps.toFixed(2);
    minV.textContent = String(minPts);
    draw();
  }

  function draw() {
    var f = U.fitCanvas(canvas, { maxSize: 420 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    var eps = parseFloat(epsEl.value);
    ctx.clearRect(0, 0, W, H);
    function px(x, y) { return { x: (x / DOM) * W, y: H - (y / DOM) * H }; }

    // eps scale reference circle (bottom-left)
    var ref = px(1, 1), epsPx = (eps / DOM) * W;
    ctx.strokeStyle = col.midtone; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(ref.x, ref.y, epsPx, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = col.midtone; ctx.font = "10px Menlo, monospace";
    ctx.fillText("eps", ref.x - 8, ref.y - epsPx - 4);

    for (var i = 0; i < points.length; i++) {
      var p = points[i], c = px(p.x, p.y);
      if (p.label === -1) {
        ctx.strokeStyle = col.midtone; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(c.x - 4, c.y - 4); ctx.lineTo(c.x + 4, c.y + 4);
        ctx.moveTo(c.x + 4, c.y - 4); ctx.lineTo(c.x - 4, c.y + 4); ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      var color = CLUSTER[p.label % CLUSTER.length];
      ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      if (p.core) { ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = col.base; ctx.stroke(); }
      else { ctx.fillStyle = col.base; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke(); }
    }
  }

  epsEl.addEventListener("input", run);
  minEl.addEventListener("input", run);
  document.getElementById("db-regen").addEventListener("click", regen);
  U.onRedraw(draw);

  regen();
})();
