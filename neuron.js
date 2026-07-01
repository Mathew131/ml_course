(function () {
  "use strict";
  var canvas = document.getElementById("neuron-canvas");
  if (!canvas || !window.MLDemo) return;
  var U = window.MLDemo;

  var w1El = document.getElementById("nw1");
  var w2El = document.getElementById("nw2");
  var bEl = document.getElementById("nb");
  var w1v = document.getElementById("nw1-v");
  var w2v = document.getElementById("nw2-v");
  var bv = document.getElementById("nb-v");
  var accEl = document.getElementById("n-acc");
  var lossEl = document.getElementById("n-loss");

  var DOMAIN = 3; // plane spans [-3, 3] in both axes
  var points = [];

  function sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  function regen() {
    points = [];
    var cx = 1.1,
      cy = 1.0; // class A centre, B is mirrored
    for (var i = 0; i < 40; i++) {
      points.push({ x: U.randn() * 0.8 + cx, y: U.randn() * 0.8 + cy, t: 1 });
      points.push({ x: U.randn() * 0.8 - cx, y: U.randn() * 0.8 - cy, t: 0 });
    }
  }

  function params() {
    return {
      w1: parseFloat(w1El.value),
      w2: parseFloat(w2El.value),
      b: parseFloat(bEl.value),
    };
  }

  function metrics(p) {
    var correct = 0,
      loss = 0;
    for (var i = 0; i < points.length; i++) {
      var pt = points[i];
      var yhat = sigmoid(p.w1 * pt.x + p.w2 * pt.y + p.b);
      var pred = yhat >= 0.5 ? 1 : 0;
      if (pred === pt.t) correct++;
      var e = 1e-7;
      loss += -(pt.t * Math.log(yhat + e) + (1 - pt.t) * Math.log(1 - yhat + e));
    }
    return { acc: correct / points.length, loss: loss / points.length };
  }

  function toPx(x, y, w, h) {
    return {
      px: ((x + DOMAIN) / (2 * DOMAIN)) * w,
      py: h - ((y + DOMAIN) / (2 * DOMAIN)) * h,
    };
  }

  function draw() {
    var fit = U.fitCanvas(canvas, { maxSize: 420 });
    var ctx = fit.ctx,
      w = fit.w,
      h = fit.h;
    var col = U.palette();
    var p = params();

    ctx.clearRect(0, 0, w, h);

    // confidence field
    var cells = 42;
    var cw = w / cells,
      ch = h / cells;
    for (var i = 0; i < cells; i++) {
      for (var j = 0; j < cells; j++) {
        var x = (i / cells) * 2 * DOMAIN - DOMAIN + DOMAIN / cells;
        var y = DOMAIN - (j / cells) * 2 * DOMAIN - DOMAIN / cells;
        var s = sigmoid(p.w1 * x + p.w2 * y + p.b);
        ctx.fillStyle = s >= 0.5 ? col.primary : col.accent;
        ctx.globalAlpha = Math.abs(s - 0.5) * 0.5;
        ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
      }
    }
    ctx.globalAlpha = 1;

    // decision line: w1*x + w2*y + b = 0
    ctx.strokeStyle = col.contrast;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (Math.abs(p.w2) > 1e-4) {
      var x1 = -DOMAIN,
        x2 = DOMAIN;
      var y1 = -(p.w1 * x1 + p.b) / p.w2;
      var y2 = -(p.w1 * x2 + p.b) / p.w2;
      var a = toPx(x1, y1, w, h),
        bb = toPx(x2, y2, w, h);
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(bb.px, bb.py);
    } else if (Math.abs(p.w1) > 1e-4) {
      var xv = -p.b / p.w1;
      var c1 = toPx(xv, -DOMAIN, w, h),
        c2 = toPx(xv, DOMAIN, w, h);
      ctx.moveTo(c1.px, c1.py);
      ctx.lineTo(c2.px, c2.py);
    }
    ctx.stroke();

    // points
    for (var k = 0; k < points.length; k++) {
      var pt = points[k];
      var c = toPx(pt.x, pt.y, w, h);
      ctx.beginPath();
      ctx.arc(c.px, c.py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = pt.t === 1 ? col.primary : col.accent;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = col.base;
      ctx.stroke();
    }

    var m = metrics(p);
    accEl.textContent = (m.acc * 100).toFixed(0) + "%";
    lossEl.textContent = m.loss.toFixed(3);
    w1v.textContent = p.w1.toFixed(2);
    w2v.textContent = p.w2.toFixed(2);
    bv.textContent = p.b.toFixed(2);
  }

  // gradient descent on BCE to auto-fit
  function autoFit() {
    var w1 = parseFloat(w1El.value),
      w2 = parseFloat(w2El.value),
      b = parseFloat(bEl.value);
    var lr = 0.5;
    var steps = 0;
    var timer = setInterval(function () {
      for (var iter = 0; iter < 8; iter++) {
        var g1 = 0,
          g2 = 0,
          gb = 0;
        for (var i = 0; i < points.length; i++) {
          var pt = points[i];
          var yhat = sigmoid(w1 * pt.x + w2 * pt.y + b);
          var err = yhat - pt.t;
          g1 += err * pt.x;
          g2 += err * pt.y;
          gb += err;
        }
        var n = points.length;
        w1 -= (lr * g1) / n;
        w2 -= (lr * g2) / n;
        b -= (lr * gb) / n;
      }
      w1El.value = U.clamp(w1, -4, 4);
      w2El.value = U.clamp(w2, -4, 4);
      bEl.value = U.clamp(b, -4, 4);
      draw();
      if (++steps > 60) clearInterval(timer);
    }, 30);
  }

  [w1El, w2El, bEl].forEach(function (el) {
    el.addEventListener("input", draw);
  });
  document.getElementById("n-fit").addEventListener("click", autoFit);
  document.getElementById("n-regen").addEventListener("click", function () {
    regen();
    draw();
  });
  U.onRedraw(draw);

  regen();
  draw();
})();
