(function () {
  "use strict";
  var ptsCv = document.getElementById("hc-points");
  var denCv = document.getElementById("hc-dendro");
  if (!ptsCv || !denCv || !window.MLDemo) return;
  var U = window.MLDemo;

  var cutEl = document.getElementById("hc-cut");
  var kEl = document.getElementById("hc-k");
  var CLUSTER = ["#7fff7f", "#0099cc", "#ff6b6b", "#ffd24d", "#c77dff", "#ff9e64", "#5ad1c8", "#e87fb0"];
  var DOM = 10;

  var points = [];
  var linkage = "single";
  var root = null, maxH = 1, leafOrder = [];

  function regen() {
    points = [];
    var blobs = [{ x: 3, y: 3 }, { x: 7, y: 7 }, { x: 3, y: 7.5 }, { x: 7.5, y: 3 }];
    blobs.forEach(function (b) {
      for (var i = 0; i < 7; i++) points.push({ x: U.clamp(b.x + U.randn() * 0.7, 0, DOM), y: U.clamp(b.y + U.randn() * 0.7, 0, DOM) });
    });
    cluster();
  }

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  function linkDist(A, B) {
    var best = linkage === "complete" ? -Infinity : Infinity, sum = 0, cnt = 0;
    for (var i = 0; i < A.leaves.length; i++) for (var j = 0; j < B.leaves.length; j++) {
      var d = dist(points[A.leaves[i]], points[B.leaves[j]]);
      if (linkage === "single") best = Math.min(best, d);
      else if (linkage === "complete") best = Math.max(best, d);
      else { sum += d; cnt++; }
    }
    return linkage === "average" ? sum / cnt : best;
  }

  function cluster() {
    // each point a leaf node
    var nodes = points.map(function (p, i) { return { leaf: true, idx: i, leaves: [i], height: 0 }; });
    var active = nodes.slice();
    while (active.length > 1) {
      var bi = 0, bj = 1, bd = Infinity;
      for (var i = 0; i < active.length; i++) for (var j = i + 1; j < active.length; j++) {
        var d = linkDist(active[i], active[j]);
        if (d < bd) { bd = d; bi = i; bj = j; }
      }
      var a = active[bi], b = active[bj];
      var parent = { leaf: false, left: a, right: b, leaves: a.leaves.concat(b.leaves), height: bd };
      active.splice(bj, 1); active.splice(bi, 1); active.push(parent);
    }
    root = active[0];
    maxH = root.height || 1;
    // assign leaf order via in-order traversal
    leafOrder = [];
    (function ord(n) { if (n.leaf) { leafOrder.push(n.idx); n._x = leafOrder.length - 1; } else { ord(n.left); ord(n.right); n._x = (n.left._x + n.right._x) / 2; } })(root);
    draw();
  }

  function clustersAt(h) {
    var out = [];
    (function rec(n) { if (n.leaf || n.height <= h) out.push(n); else { rec(n.left); rec(n.right); } })(root);
    return out;
  }

  function draw() {
    var cutH = parseFloat(cutEl.value) * maxH;
    var clusters = clustersAt(cutH);
    // assign colors to points
    var colorOf = {};
    clusters.forEach(function (c, ci) { c.leaves.forEach(function (li) { colorOf[li] = ci; }); });
    kEl.textContent = clusters.length + (clusters.length === 1 ? " кластер" : (clusters.length < 5 ? " кластера" : " кластеров"));

    drawPoints(colorOf);
    drawDendro(cutH, colorOf, clusters);
  }

  function drawPoints(colorOf) {
    var f = U.fitCanvas(ptsCv, { maxSize: 360 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = col.midtone; ctx.globalAlpha = 0.2;
    for (var g = 1; g < DOM; g++) { ctx.beginPath(); ctx.moveTo((g / DOM) * W, 0); ctx.lineTo((g / DOM) * W, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, (g / DOM) * H); ctx.lineTo(W, (g / DOM) * H); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (var i = 0; i < points.length; i++) {
      var p = points[i], px = (p.x / DOM) * W, py = H - (p.y / DOM) * H;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = CLUSTER[colorOf[i] % CLUSTER.length]; ctx.fill();
      ctx.lineWidth = 1.3; ctx.strokeStyle = col.base; ctx.stroke();
    }
  }

  function drawDendro(cutH, colorOf, clusters) {
    var f = U.fitCanvas(denCv, { maxSize: 360 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);
    var padL = 10, padR = 10, padT = 14, padB = 22;
    var n = leafOrder.length;
    function lx(xIdx) { return padL + (n === 1 ? 0 : (xIdx / (n - 1)) * (W - padL - padR)); }
    function ly(h) { return H - padB - (h / maxH) * (H - padT - padB); }

    // which cluster a node belongs to (for coloring branches below cut)
    function branchColor(node) { return CLUSTER[(colorOf[node.leaves[0]] || 0) % CLUSTER.length]; }

    (function rec(node) {
      if (node.leaf) return;
      var yl = ly(node.height);
      var lxn = lx(node.left._x), rxn = lx(node.right._x);
      var below = node.height <= cutH;
      ctx.strokeStyle = below ? branchColor(node) : col.contrast;
      ctx.lineWidth = below ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(lxn, ly(node.left.height)); ctx.lineTo(lxn, yl);
      ctx.lineTo(rxn, yl); ctx.lineTo(rxn, ly(node.right.height));
      ctx.stroke();
      rec(node.left); rec(node.right);
    })(root);

    // leaf ticks
    ctx.fillStyle = col.midtone;
    for (var i = 0; i < n; i++) { var x = lx(i); ctx.beginPath(); ctx.arc(x, ly(0), 2.5, 0, Math.PI * 2); ctx.fillStyle = CLUSTER[colorOf[leafOrder[i]] % CLUSTER.length]; ctx.fill(); }

    // cut line
    var cy = ly(cutH);
    ctx.strokeStyle = col.accent; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.accent; ctx.font = "11px Menlo, monospace";
    ctx.fillText("срез → " + clusters.length, 6, cy - 4);
    ctx.fillStyle = col.contrast; ctx.fillText("расстояние ↑", 6, 12);
  }

  document.querySelectorAll("[data-link]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-link]").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      linkage = btn.getAttribute("data-link");
      cluster();
    });
  });
  cutEl.addEventListener("input", draw);
  document.getElementById("hc-regen").addEventListener("click", regen);
  U.onRedraw(draw);

  regen();
})();
