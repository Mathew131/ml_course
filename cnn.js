(function () {
  "use strict";
  var inCv = document.getElementById("cnn-in");
  var outCv = document.getElementById("cnn-out");
  if (!inCv || !outCv || !window.MLDemo) return;
  var U = window.MLDemo;

  var matrixEl = document.getElementById("cnn-matrix");
  var SRC = 120;
  var src = document.createElement("canvas"); src.width = SRC; src.height = SRC;
  var sctx = src.getContext("2d");
  var gray = null;       // Float32Array SRC*SRC, 0..255
  var kernelName = "sobelx";
  var pooling = false;

  var KERNELS = {
    identity: { k: [0, 0, 0, 0, 1, 0, 0, 0, 0], div: 1, bias: 0 },
    sobelx: { k: [-1, 0, 1, -2, 0, 2, -1, 0, 1], div: 1, bias: 128 },
    sobely: { k: [-1, -2, -1, 0, 0, 0, 1, 2, 1], div: 1, bias: 128 },
    laplace: { k: [0, -1, 0, -1, 4, -1, 0, -1, 0], div: 1, bias: 128 },
    blur: { k: [1, 1, 1, 1, 1, 1, 1, 1, 1], div: 9, bias: 0 },
    sharpen: { k: [0, -1, 0, -1, 5, -1, 0, -1, 0], div: 1, bias: 0 },
    emboss: { k: [-2, -1, 0, -1, 1, 1, 0, 1, 2], div: 1, bias: 128 },
  };

  // ---- built-in procedural grayscale scene ----
  function drawScene() {
    sctx.fillStyle = "#202020"; sctx.fillRect(0, 0, SRC, SRC);
    // gradient sky
    var g = sctx.createLinearGradient(0, 0, 0, SRC);
    g.addColorStop(0, "#3a3a3a"); g.addColorStop(1, "#888");
    sctx.fillStyle = g; sctx.fillRect(0, 0, SRC, SRC);
    // sun
    sctx.fillStyle = "#fff"; sctx.beginPath(); sctx.arc(34, 32, 16, 0, Math.PI * 2); sctx.fill();
    // house body
    sctx.fillStyle = "#cfcfcf"; sctx.fillRect(58, 58, 46, 44);
    // roof
    sctx.fillStyle = "#9a9a9a"; sctx.beginPath(); sctx.moveTo(52, 58); sctx.lineTo(81, 34); sctx.lineTo(110, 58); sctx.closePath(); sctx.fill();
    // door + window
    sctx.fillStyle = "#3a3a3a"; sctx.fillRect(74, 80, 14, 22);
    sctx.fillStyle = "#5a5a5a"; sctx.fillRect(90, 66, 10, 10);
    // diagonal stripes
    sctx.strokeStyle = "#e8e8e8"; sctx.lineWidth = 2;
    for (var i = -SRC; i < SRC; i += 12) { sctx.beginPath(); sctx.moveTo(i, SRC); sctx.lineTo(i + SRC * 0.5, SRC - 26); sctx.stroke(); }
    extractGray();
  }

  function extractGray() {
    var d = sctx.getImageData(0, 0, SRC, SRC).data;
    gray = new Float32Array(SRC * SRC);
    for (var i = 0; i < SRC * SRC; i++) {
      gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    }
    render();
  }

  function loadImage(imgOrCanvas) {
    sctx.fillStyle = "#000"; sctx.fillRect(0, 0, SRC, SRC);
    // cover-fit
    var iw = imgOrCanvas.width, ih = imgOrCanvas.height;
    var scale = Math.max(SRC / iw, SRC / ih);
    var w = iw * scale, h = ih * scale;
    sctx.drawImage(imgOrCanvas, (SRC - w) / 2, (SRC - h) / 2, w, h);
    extractGray();
  }

  function convolve() {
    var ker = KERNELS[kernelName];
    var out = new Float32Array(SRC * SRC);
    for (var y = 0; y < SRC; y++) {
      for (var x = 0; x < SRC; x++) {
        var acc = 0, ki = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            var xx = U.clamp(x + dx, 0, SRC - 1), yy = U.clamp(y + dy, 0, SRC - 1);
            acc += gray[yy * SRC + xx] * ker.k[ki++];
          }
        }
        out[y * SRC + x] = U.clamp(acc / ker.div + ker.bias, 0, 255);
      }
    }
    return out;
  }

  function maxPool(arr, size) {
    var half = size >> 1;
    var out = new Float32Array(SRC * SRC);
    for (var y = 0; y < SRC; y += 2) for (var x = 0; x < SRC; x += 2) {
      var m = 0;
      for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < 2; dx++) {
        var v = arr[U.clamp(y + dy, 0, SRC - 1) * SRC + U.clamp(x + dx, 0, SRC - 1)];
        if (v > m) m = v;
      }
      for (var fy = 0; fy < 2; fy++) for (var fx = 0; fx < 2; fx++) {
        var iy = y + fy, ix = x + fx;
        if (iy < SRC && ix < SRC) out[iy * SRC + ix] = m;
      }
    }
    return out;
  }

  function blit(canvas, arr) {
    var tmp = document.createElement("canvas"); tmp.width = SRC; tmp.height = SRC;
    var tctx = tmp.getContext("2d");
    var img = tctx.createImageData(SRC, SRC);
    for (var i = 0; i < SRC * SRC; i++) {
      var v = arr[i] | 0;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    var f = U.fitCanvas(canvas, { maxSize: 220 });
    f.ctx.imageSmoothingEnabled = false;
    f.ctx.clearRect(0, 0, f.w, f.h);
    f.ctx.drawImage(tmp, 0, 0, f.w, f.h);
  }

  function renderMatrix() {
    var ker = KERNELS[kernelName];
    var html = "";
    for (var r = 0; r < 3; r++) {
      html += "<tr>";
      for (var c = 0; c < 3; c++) {
        var v = ker.k[r * 3 + c];
        html += "<td>" + (ker.div !== 1 ? "1⁄" + ker.div : v) + "</td>";
      }
      html += "</tr>";
    }
    matrixEl.innerHTML = html;
  }

  function render() {
    if (!gray) return;
    blit(inCv, gray);
    var out = convolve();
    if (pooling) out = maxPool(out, 2);
    blit(outCv, out);
    renderMatrix();
  }

  document.querySelectorAll("#cnn-kernels [data-k]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("#cnn-kernels [data-k]").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active"); kernelName = b.getAttribute("data-k"); render();
    });
  });
  document.getElementById("cnn-builtin").addEventListener("click", drawScene);
  document.getElementById("cnn-pool").addEventListener("click", function () {
    pooling = !pooling;
    this.textContent = "Max-pooling 2×2: " + (pooling ? "вкл" : "выкл");
    render();
  });
  document.getElementById("cnn-file").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var img = new Image();
    img.onload = function () { loadImage(img); };
    img.src = URL.createObjectURL(file);
  });
  U.onRedraw(render);

  drawScene();
})();
