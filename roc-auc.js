(function () {
  const canvas = document.getElementById("roc-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const separationInput = document.getElementById("roc-separation");
  const thresholdInput = document.getElementById("roc-threshold");
  const aucEl = document.getElementById("roc-auc");
  const tprEl = document.getElementById("roc-tpr");
  const fprEl = document.getElementById("roc-fpr");
  const precisionEl = document.getElementById("roc-precision");
  const thresholdValEl = document.getElementById("roc-threshold-val");
  const separationValEl = document.getElementById("roc-separation-val");
  const cmTp = document.getElementById("cm-tp");
  const cmFp = document.getElementById("cm-fp");
  const cmFn = document.getElementById("cm-fn");
  const cmTn = document.getElementById("cm-tn");

  function themeColors() {
    const style = getComputedStyle(document.documentElement);
    const get = (name) => style.getPropertyValue(name).trim();
    return {
      grid: get("--midtone"),
      diagonal: get("--midtone"),
      curve: get("--primary"),
      point: get("--accent"),
      pointRing: get("--contrast"),
      text: get("--contrast"),
      posBar: get("--chart-pos-bar"),
      negBar: get("--chart-neg-bar"),
    };
  }

  const SAMPLE_SIZE = 120;
  let posScores = [];
  let negScores = [];
  let rocPoints = [];
  let auc = 0;

  function randn() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function generateScores(separation) {
    const pos = [];
    const neg = [];
    const posMean = 0.55 + separation * 0.35;
    const negMean = 0.45 - separation * 0.35;
    const spread = Math.max(0.08, 0.22 - separation * 0.06);

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      pos.push(clamp(randn() * spread + posMean, 0, 1));
      neg.push(clamp(randn() * spread + negMean, 0, 1));
    }

    posScores = pos.sort((a, b) => a - b);
    negScores = neg.sort((a, b) => a - b);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function metricsAtThreshold(threshold) {
    let tp = 0;
    let fn = 0;
    let fp = 0;
    let tn = 0;

    for (const score of posScores) {
      if (score >= threshold) tp++;
      else fn++;
    }
    for (const score of negScores) {
      if (score >= threshold) fp++;
      else tn++;
    }

    const tpr = tp / posScores.length;
    const fpr = fp / negScores.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;

    return { tp, fn, fp, tn, tpr, fpr, precision };
  }

  function buildRocCurve() {
    const thresholds = new Set([0, 1]);
    for (const score of posScores) thresholds.add(score);
    for (const score of negScores) thresholds.add(score);

    const sorted = [...thresholds].sort((a, b) => b - a);
    rocPoints = sorted.map((threshold) => {
      const { tpr, fpr } = metricsAtThreshold(threshold);
      return { threshold, tpr, fpr };
    });

    rocPoints.push({ threshold: -1, tpr: 1, fpr: 1 });

    auc = 0;
    for (let i = 1; i < rocPoints.length; i++) {
      const prev = rocPoints[i - 1];
      const curr = rocPoints[i];
      auc += (curr.fpr - prev.fpr) * (curr.tpr + prev.tpr) / 2;
    }
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(rect.width, 420);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function plotPadding(size) {
    return {
      left: 44,
      top: 16,
      right: 16,
      bottom: 44,
      size,
      plotW: size - 60,
      plotH: size - 60,
    };
  }

  function toCanvas(fpr, tpr, pad) {
    return {
      x: pad.left + fpr * pad.plotW,
      y: pad.top + (1 - tpr) * pad.plotH,
    };
  }

  function drawScoreHistogram(pad, threshold, colors) {
    const histH = 28;
    const histY = pad.top + pad.plotH + 8;
    const bins = 20;

    function drawBars(scores, color) {
      const counts = new Array(bins).fill(0);
      for (const score of scores) {
        counts[Math.min(bins - 1, Math.floor(score * bins))]++;
      }
      const maxCount = Math.max(...counts, 1);
      ctx.fillStyle = color;
      const barW = pad.plotW / bins;
      for (let i = 0; i < bins; i++) {
        const h = (counts[i] / maxCount) * histH;
        ctx.fillRect(pad.left + i * barW, histY + histH - h, barW - 1, h);
      }
    }

    drawBars(negScores, colors.negBar);
    drawBars(posScores, colors.posBar);

    const tx = pad.left + threshold * pad.plotW;
    ctx.strokeStyle = colors.point;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, histY - 2);
    ctx.lineTo(tx, histY + histH + 2);
    ctx.stroke();
  }

  function draw(threshold) {
    const colors = themeColors();
    resizeCanvas();
    const size = parseFloat(canvas.style.width);
    const pad = plotPadding(size);
    const current = metricsAtThreshold(threshold);

    ctx.clearRect(0, 0, size, size);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.font = "11px Menlo, Consolas, monospace";
    ctx.fillStyle = colors.text;

    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const x = pad.left + t * pad.plotW;
      const y = pad.top + t * pad.plotH;

      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + pad.plotH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pad.plotW, y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillText(t.toFixed(1), x - 8, pad.top + pad.plotH + 16);
      ctx.fillText((1 - t).toFixed(1), 8, y + 4);
    }

    ctx.fillText("FPR", pad.left + pad.plotW / 2 - 10, size - 6);
    ctx.save();
    ctx.translate(12, pad.top + pad.plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("TPR", -10, 0);
    ctx.restore();

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = colors.diagonal;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + pad.plotH);
    ctx.lineTo(pad.left + pad.plotW, pad.top);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = colors.curve;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < rocPoints.length; i++) {
      const { x, y } = toCanvas(rocPoints[i].fpr, rocPoints[i].tpr, pad);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const { x, y } = toCanvas(current.fpr, current.tpr, pad);
    ctx.fillStyle = colors.pointRing;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.point;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    drawScoreHistogram(pad, threshold, colors);

    aucEl.textContent = auc.toFixed(3);
    tprEl.textContent = current.tpr.toFixed(3);
    fprEl.textContent = current.fpr.toFixed(3);
    precisionEl.textContent = current.precision.toFixed(3);
    thresholdValEl.textContent = threshold.toFixed(2);
    separationValEl.textContent = Number(separationInput.value).toFixed(2);

    cmTp.textContent = String(current.tp);
    cmFp.textContent = String(current.fp);
    cmFn.textContent = String(current.fn);
    cmTn.textContent = String(current.tn);
  }

  function updateFromInputs() {
    generateScores(Number(separationInput.value));
    buildRocCurve();
    draw(Number(thresholdInput.value));
  }

  separationInput.addEventListener("input", updateFromInputs);
  thresholdInput.addEventListener("input", () => draw(Number(thresholdInput.value)));
  window.addEventListener("resize", () => draw(Number(thresholdInput.value)));
  window.addEventListener("themechange", () => draw(Number(thresholdInput.value)));

  updateFromInputs();
})();
