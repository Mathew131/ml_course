(function () {
  "use strict";
  var singleCv = document.getElementById("rf-single");
  var forestCv = document.getElementById("rf-forest");
  if (!singleCv || !forestCv || !window.MLDemo || !window.CART) return;
  var U = window.MLDemo, CART = window.CART;

  var nEl = document.getElementById("rf-n");
  var nV = document.getElementById("rf-n-v");
  var acc1El = document.getElementById("rf-acc1");
  var acc2El = document.getElementById("rf-acc2");

  var DOM = 10;
  var MAX_TREES = 60;
  var points = [];     // training set (drawn on canvases)
  var testPoints = []; // held-out set for honest accuracy
  var forest = [];
  var singleTree = null;

  function makeMoons(n, noise) {
    var arr = [];
    for (var i = 0; i < n; i++) {
      var t = Math.PI * (Math.random());
      arr.push({ x: U.clamp(3 + 3 * Math.cos(t) + U.randn() * noise, 0, DOM), y: U.clamp(5 + 3 * Math.sin(t) + U.randn() * noise, 0, DOM), t: 0 });
      arr.push({ x: U.clamp(6 - 3 * Math.cos(t) + U.randn() * noise, 0, DOM), y: U.clamp(4 - 3 * Math.sin(t) + U.randn() * noise, 0, DOM), t: 1 });
    }
    return arr;
  }

  function bootstrap() {
    var s = [];
    for (var i = 0; i < points.length; i++) s.push(points[(Math.random() * points.length) | 0]);
    return s;
  }

  function growForest() {
    // one strong tree on all data (overfits) vs a bagged, feature-randomised forest
    singleTree = CART.build(points, { features: ["x", "y"], nClasses: 2, maxDepth: 9, minSamples: 1 });
    forest = [];
    for (var t = 0; t < MAX_TREES; t++) {
      forest.push(CART.build(bootstrap(), { features: ["x", "y"], nClasses: 2, maxDepth: 9, minSamples: 1, featureSubset: 1 }));
    }
  }

  function forestProba(k, point) {
    var p0 = 0, p1 = 0;
    for (var t = 0; t < k; t++) {
      var pr = CART.predictProba(forest[t], point);
      p0 += pr[0]; p1 += pr[1];
    }
    return p1 / (p0 + p1 || 1);
  }

  function drawBoundary(cv, probaFn) {
    var f = U.fitCanvas(cv, { maxSize: 360 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);
    var g = 56, cw = W / g, ch = H / g;
    for (var i = 0; i < g; i++) for (var j = 0; j < g; j++) {
      var x = ((i + 0.5) / g) * DOM, y = DOM - ((j + 0.5) / g) * DOM;
      var p1 = probaFn({ x: x, y: y });
      ctx.fillStyle = p1 >= 0.5 ? col.accent : col.primary;
      ctx.globalAlpha = 0.12 + Math.abs(p1 - 0.5) * 0.66;
      ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
    }
    ctx.globalAlpha = 1;
    for (var k = 0; k < points.length; k++) {
      var p = points[k], px = (p.x / DOM) * W, py = H - (p.y / DOM) * H;
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = p.t === 0 ? col.primary : col.accent; ctx.fill();
    }
  }

  function accuracy(probaFn) {
    var c = 0;
    for (var i = 0; i < testPoints.length; i++) {
      var p1 = probaFn(testPoints[i]);
      if ((p1 >= 0.5 ? 1 : 0) === testPoints[i].t) c++;
    }
    return testPoints.length ? c / testPoints.length : 0;
  }

  function draw() {
    var k = parseInt(nEl.value, 10);
    var singleFn = function (pt) { return CART.predictProba(singleTree, pt)[1]; };
    var forestFn = function (pt) { return forestProba(k, pt); };
    drawBoundary(singleCv, singleFn);
    drawBoundary(forestCv, forestFn);
    acc1El.textContent = (accuracy(singleFn) * 100).toFixed(0) + "%";
    acc2El.textContent = (accuracy(forestFn) * 100).toFixed(0) + "%";
    nV.textContent = String(k);
  }

  function regen() {
    points = makeMoons(30, 0.45);
    testPoints = makeMoons(40, 0.45);
    growForest();
    draw();
  }

  nEl.addEventListener("input", draw);
  document.getElementById("rf-regen").addEventListener("click", regen);
  U.onRedraw(draw);

  regen();
})();
