(function () {
  "use strict";
  var canvas = document.getElementById("rm-canvas");
  if (!canvas || !window.MLDemo) return;
  var U = window.MLDemo;

  var outEl = document.getElementById("rm-out");
  var outV = document.getElementById("rm-out-v");
  var maeEl = document.getElementById("rm-mae");
  var mseEl = document.getElementById("rm-mse");
  var rmseEl = document.getElementById("rm-rmse");
  var r2El = document.getElementById("rm-r2");

  var DOM = 10;
  var pts = [];

  function regen() {
    pts = [];
    for (var i = 0; i < 16; i++) {
      var x = 0.6 + Math.random() * (DOM - 1.2);
      pts.push({ x: x, y: U.clamp(x + U.randn() * 0.55, 0, DOM), outlier: false });
    }
    // designated outlier at mid-x
    pts.push({ x: 5, y: 6, outlier: true });
    draw();
  }

  function applyOutlier() {
    var off = parseFloat(outEl.value);
    for (var i = 0; i < pts.length; i++) if (pts[i].outlier) pts[i].y = U.clamp(5 + off, 0, DOM + 4);
  }

  function metrics() {
    var n = pts.length, sae = 0, sse = 0, sy = 0;
    for (var i = 0; i < n; i++) { sy += pts[i].y; }
    var my = sy / n, sst = 0;
    for (var k = 0; k < n; k++) {
      var e = pts[k].y - pts[k].x; // model ŷ = x
      sae += Math.abs(e); sse += e * e;
      sst += (pts[k].y - my) * (pts[k].y - my);
    }
    return { mae: sae / n, mse: sse / n, rmse: Math.sqrt(sse / n), r2: sst > 1e-9 ? 1 - sse / sst : 0 };
  }

  function px(x, y, W, H) { return { x: (x / DOM) * W, y: H - (y / (DOM)) * H }; }

  function draw() {
    applyOutlier();
    var f = U.fitCanvas(canvas, { maxSize: 460, aspect: 320 / 460 });
    var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = col.midtone; ctx.globalAlpha = 0.25;
    for (var g = 1; g < DOM; g++) {
      ctx.beginPath(); ctx.moveTo((g / DOM) * W, 0); ctx.lineTo((g / DOM) * W, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (g / DOM) * H); ctx.lineTo(W, (g / DOM) * H); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // model line y = x
    var a = px(0, 0, W, H), b = px(DOM, DOM, W, H);
    ctx.strokeStyle = col.primary; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

    // residuals + points
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var pp = px(p.x, U.clamp(p.y, 0, DOM), W, H);
      var pl = px(p.x, p.x, W, H); // on the line
      ctx.strokeStyle = p.outlier ? col.accent : col.midtone;
      ctx.lineWidth = p.outlier ? 2 : 1.3;
      ctx.beginPath(); ctx.moveTo(pp.x, pp.y); ctx.lineTo(pl.x, pl.y); ctx.stroke();

      ctx.beginPath(); ctx.arc(pp.x, pp.y, p.outlier ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = p.outlier ? col.accent : col.contrast; ctx.fill();
      ctx.lineWidth = 1.3; ctx.strokeStyle = col.base; ctx.stroke();
      if (p.outlier) { ctx.beginPath(); ctx.arc(pp.x, pp.y, 9, 0, Math.PI * 2); ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    var m = metrics();
    maeEl.textContent = m.mae.toFixed(3);
    mseEl.textContent = m.mse.toFixed(3);
    rmseEl.textContent = m.rmse.toFixed(3);
    r2El.textContent = m.r2.toFixed(3);
    outV.textContent = parseFloat(outEl.value).toFixed(1);
  }

  outEl.addEventListener("input", draw);
  U.onRedraw(draw);
  regen();
})();
