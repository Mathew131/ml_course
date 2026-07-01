(function () {
  "use strict";
  var U = window.MLDemo;
  if (!U) return;

  /* ============ word2vec map ============ */
  (function () {
    var canvas = document.getElementById("w2v-canvas");
    if (!canvas) return;

    // crafted 2D embeddings with honest parallelogram geometry
    var WORDS = [
      { w: "king", x: -6, y: 5 }, { w: "queen", x: -9, y: 5 },
      { w: "man", x: -6, y: 3 }, { w: "woman", x: -9, y: 3 },
      { w: "prince", x: -6.8, y: 4.2 }, { w: "princess", x: -8.4, y: 4.2 },
      { w: "boy", x: -6.5, y: 2.2 }, { w: "girl", x: -8.7, y: 2.2 },
      { w: "cat", x: 7, y: 4 }, { w: "dog", x: 8.4, y: 4 },
      { w: "kitten", x: 7, y: 2.2 }, { w: "puppy", x: 8.4, y: 2.2 },
      { w: "lion", x: 6.2, y: 5.2 }, { w: "wolf", x: 9.1, y: 5.2 },
      { w: "france", x: -7, y: -5 }, { w: "paris", x: -7, y: -7 },
      { w: "germany", x: -4, y: -4.5 }, { w: "berlin", x: -4, y: -6.5 },
      { w: "italy", x: -1, y: -5 }, { w: "rome", x: -1, y: -7 },
      { w: "spain", x: -9.5, y: -4.5 }, { w: "madrid", x: -9.5, y: -6.5 },
    ];
    var byName = {};
    WORDS.forEach(function (o) { byName[o.w] = o; });

    var mode = "nn";
    var selected = byName["king"];
    var analogy = { a: "king", b: "man", c: "woman", result: null };

    var aSel = document.getElementById("w2v-a"), bSel = document.getElementById("w2v-b"), cSel = document.getElementById("w2v-c");
    [aSel, bSel, cSel].forEach(function (sel) {
      WORDS.map(function (o) { return o.w; }).sort().forEach(function (name) {
        var opt = document.createElement("option"); opt.value = name; opt.textContent = name; sel.appendChild(opt);
      });
    });
    aSel.value = "king"; bSel.value = "man"; cSel.value = "woman";

    function bounds() {
      var xs = WORDS.map(function (o) { return o.x; }), ys = WORDS.map(function (o) { return o.y; });
      return { x0: Math.min.apply(null, xs) - 1.5, x1: Math.max.apply(null, xs) + 1.5, y0: Math.min.apply(null, ys) - 1.5, y1: Math.max.apply(null, ys) + 1.5 };
    }

    function nearestWords(pt, k, exclude) {
      return WORDS.filter(function (o) { return !exclude || exclude.indexOf(o.w) === -1; })
        .map(function (o) { return { o: o, d: Math.hypot(o.x - pt.x, o.y - pt.y) }; })
        .sort(function (a, b) { return a.d - b.d; }).slice(0, k);
    }

    function computeAnalogy() {
      var A = byName[aSel.value], B = byName[bSel.value], C = byName[cSel.value];
      var target = { x: A.x - B.x + C.x, y: A.y - B.y + C.y };
      var res = nearestWords(target, 1, [aSel.value, bSel.value, cSel.value])[0];
      analogy = { a: aSel.value, b: bSel.value, c: cSel.value, result: res.o.w, target: target };
      document.getElementById("w2v-result").textContent = res.o.w;
      draw();
    }

    function draw() {
      var f = U.fitCanvas(canvas, { maxSize: 460, aspect: 360 / 460 });
      var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
      var b = bounds();
      function px(x, y) { return { x: ((x - b.x0) / (b.x1 - b.x0)) * (W - 20) + 10, y: H - (((y - b.y0) / (b.y1 - b.y0)) * (H - 20) + 10) }; }
      ctx.clearRect(0, 0, W, H);

      var highlight = {};
      if (mode === "nn" && selected) {
        nearestWords(selected, 4, null).forEach(function (n) { highlight[n.o.w] = true; });
      }

      if (mode === "an" && analogy.result) {
        var A = byName[analogy.a], B = byName[analogy.b], C = byName[analogy.c], R = byName[analogy.result];
        ctx.strokeStyle = col.midtone; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]);
        arrow(ctx, px(B.x, B.y), px(A.x, A.y), col.midtone);
        arrow(ctx, px(C.x, C.y), px(R.x, R.y), col.accent);
        ctx.setLineDash([]);
        highlight[analogy.a] = highlight[analogy.b] = highlight[analogy.c] = true;
      }

      if (mode === "nn" && selected) {
        var s = px(selected.x, selected.y);
        ctx.strokeStyle = col.midtone; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        nearestWords(selected, 4, null).forEach(function (n) {
          if (n.o.w === selected.w) return;
          var p = px(n.o.x, n.o.y); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      WORDS.forEach(function (o) {
        var p = px(o.x, o.y);
        var isSel = (mode === "nn" && selected === o) || (mode === "an" && o.w === analogy.result);
        var hl = highlight[o.w] || isSel;
        ctx.beginPath(); ctx.arc(p.x, p.y, isSel ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? col.accent : (hl ? col.primary : col.midtone);
        ctx.fill();
        ctx.fillStyle = hl ? col.contrast : col.midtone;
        ctx.font = (isSel ? "bold " : "") + "11px Menlo, monospace";
        ctx.fillText(o.w, p.x + 7, p.y + 3);
      });
    }

    function arrow(ctx, from, to, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
      var ang = Math.atan2(to.y - from.y, to.x - from.x);
      ctx.beginPath(); ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - 8 * Math.cos(ang - 0.4), to.y - 8 * Math.sin(ang - 0.4));
      ctx.lineTo(to.x - 8 * Math.cos(ang + 0.4), to.y - 8 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }

    canvas.addEventListener("click", function (e) {
      if (mode !== "nn") return;
      var f = U.fitCanvas(canvas, { maxSize: 460, aspect: 360 / 460 }); // recompute mapping
      var b = bounds(), W = f.w, H = f.h;
      var r = canvas.getBoundingClientRect();
      var mx = (e.clientX - r.left) / r.width * W, my = (e.clientY - r.top) / r.height * H;
      var best = null, bd = Infinity;
      WORDS.forEach(function (o) {
        var pxX = ((o.x - b.x0) / (b.x1 - b.x0)) * (W - 20) + 10;
        var pxY = H - (((o.y - b.y0) / (b.y1 - b.y0)) * (H - 20) + 10);
        var d = Math.hypot(pxX - mx, pxY - my); if (d < bd) { bd = d; best = o; }
      });
      selected = best; draw();
    });

    function setMode(m) {
      mode = m;
      document.getElementById("w2v-mode-nn").classList.toggle("active", m === "nn");
      document.getElementById("w2v-mode-an").classList.toggle("active", m === "an");
      document.getElementById("w2v-analogy").style.display = m === "an" ? "" : "none";
      if (m === "an") computeAnalogy(); else draw();
    }
    document.getElementById("w2v-mode-nn").addEventListener("click", function () { setMode("nn"); });
    document.getElementById("w2v-mode-an").addEventListener("click", function () { setMode("an"); });
    [aSel, bSel, cSel].forEach(function (s) { s.addEventListener("change", computeAnalogy); });
    document.querySelectorAll("[data-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = btn.getAttribute("data-preset").split(",");
        aSel.value = p[0]; bSel.value = p[1]; cSel.value = p[2]; computeAnalogy();
      });
    });
    U.onRedraw(draw);
    draw();
  })();

  /* ============ self-attention heatmap ============ */
  (function () {
    var canvas = document.getElementById("attn-canvas");
    if (!canvas) return;
    var tokens = ["the", "cat", "sat", "on", "the", "mat", "because", "it", "was", "tired"];
    var n = tokens.length;

    // handcrafted affinities -> readable, then softmax per row
    var links = {
      "1": { "1": 2 }, "2": { "1": 3, "2": 1 }, "5": { "3": 2, "1": 1 },
      "7": { "1": 3, "5": 2.5, "7": 1 }, "9": { "1": 2, "7": 2.5 },
    };
    var attn = [];
    for (var i = 0; i < n; i++) {
      var row = new Array(n).fill(0.2);
      row[i] += 0.6; // self
      if (i > 0) row[i - 1] += 0.5; // mild recency
      var lk = links[String(i)];
      if (lk) for (var key in lk) row[+key] += lk[key];
      // softmax
      var mx = Math.max.apply(null, row), sum = 0;
      for (var j = 0; j < n; j++) { row[j] = Math.exp(row[j] - mx); sum += row[j]; }
      for (var k = 0; k < n; k++) row[k] /= sum;
      attn.push(row);
    }

    var hoverRow = -1;
    var GUT = 70, TOP = 64;

    function draw() {
      var f = U.fitCanvas(canvas, { maxSize: 460, aspect: 380 / 460 });
      var ctx = f.ctx, W = f.w, H = f.h, col = U.palette();
      ctx.clearRect(0, 0, W, H);
      var gridW = W - GUT - 8, gridH = H - TOP - 8;
      var cw = gridW / n, ch = gridH / n;

      // column labels (vertical)
      ctx.fillStyle = col.contrast; ctx.font = "10px Menlo, monospace";
      for (var c = 0; c < n; c++) {
        ctx.save();
        ctx.translate(GUT + c * cw + cw / 2, TOP - 6);
        ctx.rotate(-Math.PI / 3);
        ctx.fillStyle = col.midtone; ctx.fillText(tokens[c], 0, 0);
        ctx.restore();
      }

      for (var r = 0; r < n; r++) {
        // row label
        ctx.fillStyle = (r === hoverRow) ? col.accent : col.contrast;
        ctx.font = (r === hoverRow ? "bold " : "") + "11px Menlo, monospace";
        ctx.textAlign = "right";
        ctx.fillText(tokens[r], GUT - 8, TOP + r * ch + ch / 2 + 4);
        ctx.textAlign = "start";

        var rowMax = Math.max.apply(null, attn[r]);
        for (var cc = 0; cc < n; cc++) {
          var wgt = attn[r][cc];
          var alpha = (wgt / rowMax);
          var dim = (hoverRow !== -1 && hoverRow !== r) ? 0.18 : 1;
          ctx.fillStyle = col.primary;
          ctx.globalAlpha = alpha * 0.85 * dim;
          ctx.fillRect(GUT + cc * cw + 1, TOP + r * ch + 1, cw - 2, ch - 2);
          ctx.globalAlpha = 1;
        }
        if (r === hoverRow) {
          ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5;
          ctx.strokeRect(GUT, TOP + r * ch, gridW, ch);
        }
      }
      // axis hints
      ctx.fillStyle = col.midtone; ctx.font = "10px Menlo, monospace";
      ctx.fillText("запрос ↓", 6, TOP - 6);
    }

    canvas.addEventListener("mousemove", function (e) {
      var f = U.fitCanvas(canvas, { maxSize: 460, aspect: 380 / 460 });
      var H = f.h, gridH = H - TOP - 8, ch = gridH / n;
      var r = canvas.getBoundingClientRect();
      var my = (e.clientY - r.top) / r.height * H;
      var row = Math.floor((my - TOP) / ch);
      hoverRow = (row >= 0 && row < n) ? row : -1;
      draw();
    });
    canvas.addEventListener("mouseleave", function () { hoverRow = -1; draw(); });
    U.onRedraw(draw);
    draw();
  })();
})();
