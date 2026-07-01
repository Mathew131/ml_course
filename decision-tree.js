(function () {
  "use strict";
  var regionsCv = document.getElementById("dt-regions");
  var treeCv = document.getElementById("dt-tree");
  if (!regionsCv || !treeCv || !window.MLDemo || !window.CART) return;
  var U = window.MLDemo, CART = window.CART;

  var depthEl = document.getElementById("dt-depth");
  var depthV = document.getElementById("dt-depth-v");
  var dEl = document.getElementById("dt-d");
  var leavesEl = document.getElementById("dt-leaves");
  var accEl = document.getElementById("dt-acc");
  var btnA = document.getElementById("dt-ca");
  var btnB = document.getElementById("dt-cb");

  var DOM = 10;
  var points = [];
  var tree = null;
  var brush = 0;

  // axis-aligned nested regions: greedy trees handle this cleanly, and
  // deeper trees recover progressively finer rectangles.
  function label(x, y) {
    var c;
    if (x < 3.3) c = 0;
    else if (x > 6.6) c = 1;
    else c = y < 5 ? 1 : 0;
    if (Math.random() < 0.06) c = 1 - c; // a little label noise
    return c;
  }

  function regen() {
    points = [];
    for (var i = 0; i < 90; i++) {
      var x = Math.random() * DOM, y = Math.random() * DOM;
      points.push({ x: x, y: y, t: label(x, y) });
    }
    rebuild();
  }

  function rebuild() {
    tree = CART.build(points, { features: ["x", "y"], nClasses: 2, maxDepth: parseInt(depthEl.value, 10), minSamples: 2 });
    draw();
  }

  function usedDepth(node) { return node.leaf ? node.depth : Math.max(usedDepth(node.left), usedDepth(node.right)); }

  function drawRegions() {
    var f = U.fitCanvas(regionsCv, { maxSize: 360 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);
    var g = 56, cw = W / g, ch = H / g;
    for (var i = 0; i < g; i++) for (var j = 0; j < g; j++) {
      var x = ((i + 0.5) / g) * DOM, y = DOM - ((j + 0.5) / g) * DOM;
      var proba = CART.predictProba(tree, { x: x, y: y });
      var cls = proba[1] >= proba[0] ? 1 : 0;
      var conf = Math.abs(proba[1] - proba[0]);
      ctx.fillStyle = cls === 0 ? col.primary : col.accent;
      ctx.globalAlpha = 0.12 + conf * 0.34;
      ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
    }
    ctx.globalAlpha = 1;
    for (var k = 0; k < points.length; k++) {
      var p = points[k];
      var px = (p.x / DOM) * W, py = H - (p.y / DOM) * H;
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.t === 0 ? col.primary : col.accent; ctx.fill();
      ctx.lineWidth = 1.3; ctx.strokeStyle = col.base; ctx.stroke();
    }
  }

  function drawTree() {
    var f = U.fitCanvas(treeCv, { maxSize: 360 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);

    var leafIdx = 0;
    (function assign(node) {
      if (node.leaf) { node._x = leafIdx++; return node._x; }
      var l = assign(node.left), r = assign(node.right);
      node._x = (l + r) / 2; return node._x;
    })(tree);
    var nLeaves = Math.max(1, leafIdx);
    var maxD = usedDepth(tree);
    var padX = 18, padY = 22;
    var levelH = (H - 2 * padY) / Math.max(1, maxD);

    function nx(node) { return padX + (nLeaves === 1 ? (W - 2 * padX) / 2 : (node._x / (nLeaves - 1)) * (W - 2 * padX)); }
    function ny(node) { return padY + node.depth * levelH; }

    // edges
    ctx.strokeStyle = col.midtone; ctx.lineWidth = 1.2;
    (function edges(node) {
      if (node.leaf) return;
      [node.left, node.right].forEach(function (ch2) {
        ctx.beginPath(); ctx.moveTo(nx(node), ny(node)); ctx.lineTo(nx(ch2), ny(ch2)); ctx.stroke();
        edges(ch2);
      });
    })(tree);

    // nodes
    var boxW = Math.min(48, (W - 2 * padX) / nLeaves * 0.92);
    ctx.font = (nLeaves > 16 ? 8 : 10) + "px Menlo, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (function nodes(node) {
      var x = nx(node), y = ny(node);
      if (node.leaf) {
        ctx.fillStyle = node.pred === 0 ? col.primary : col.accent;
        var r = Math.min(9, boxW / 2);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col.base; ctx.fillText(node.pred === 0 ? "A" : "B", x, y);
      } else {
        var bw = boxW, bh = 16;
        ctx.fillStyle = col.base; ctx.strokeStyle = col.contrast; ctx.lineWidth = 1.2;
        ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
        ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
        ctx.fillStyle = col.contrast;
        ctx.fillText(node.feature + "≤" + node.threshold.toFixed(1), x, y);
        nodes(node.left); nodes(node.right);
      }
    })(tree);
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
  }

  function accuracy() {
    var c = 0;
    for (var i = 0; i < points.length; i++) if (CART.predict(tree, points[i]) === points[i].t) c++;
    return points.length ? c / points.length : 0;
  }

  function draw() {
    drawRegions();
    drawTree();
    dEl.textContent = String(usedDepth(tree));
    leavesEl.textContent = String(CART.countLeaves(tree));
    accEl.textContent = (accuracy() * 100).toFixed(0) + "%";
    depthV.textContent = depthEl.value;
  }

  function setBrush(b) { brush = b; btnA.classList.toggle("active", b === 0); btnB.classList.toggle("active", b === 1); }

  regionsCv.addEventListener("click", function (e) {
    var r = regionsCv.getBoundingClientRect();
    points.push({ x: ((e.clientX - r.left) / r.width) * DOM, y: (1 - (e.clientY - r.top) / r.height) * DOM, t: brush });
    rebuild();
  });
  depthEl.addEventListener("input", rebuild);
  btnA.addEventListener("click", function () { setBrush(0); });
  btnB.addEventListener("click", function () { setBrush(1); });
  document.getElementById("dt-regen").addEventListener("click", regen);
  U.onRedraw(draw);

  regen();
})();
