/* Shared CART classifier (Gini, axis-aligned splits). window.CART */
(function () {
  "use strict";

  function classCounts(samples, nClasses) {
    var c = new Array(nClasses).fill(0);
    for (var i = 0; i < samples.length; i++) c[samples[i].t]++;
    return c;
  }

  function gini(counts, total) {
    if (total === 0) return 0;
    var s = 1;
    for (var k = 0; k < counts.length; k++) {
      var p = counts[k] / total;
      s -= p * p;
    }
    return s;
  }

  function argmax(arr) {
    var bi = 0;
    for (var i = 1; i < arr.length; i++) if (arr[i] > arr[bi]) bi = i;
    return bi;
  }

  // features: array of accessor keys, e.g. ['x','y']
  function bestSplit(samples, opts) {
    var feats = opts.features;
    // optional random feature subset (random forest)
    if (opts.featureSubset && opts.featureSubset < feats.length) {
      feats = feats.slice();
      // shuffle + take subset
      for (var s = feats.length - 1; s > 0; s--) {
        var r = (Math.random() * (s + 1)) | 0;
        var tmp = feats[s]; feats[s] = feats[r]; feats[r] = tmp;
      }
      feats = feats.slice(0, opts.featureSubset);
    }

    var total = samples.length;
    var parentCounts = classCounts(samples, opts.nClasses);
    var parentGini = gini(parentCounts, total);
    var best = null;

    for (var fi = 0; fi < feats.length; fi++) {
      var key = feats[fi];
      var sorted = samples.slice().sort(function (a, b) { return a[key] - b[key]; });
      // accumulate left counts as threshold moves
      var leftCounts = new Array(opts.nClasses).fill(0);
      for (var i = 0; i < sorted.length - 1; i++) {
        leftCounts[sorted[i].t]++;
        if (sorted[i][key] === sorted[i + 1][key]) continue;
        var thr = (sorted[i][key] + sorted[i + 1][key]) / 2;
        var nLeft = i + 1, nRight = total - nLeft;
        var rightCounts = parentCounts.map(function (c, k) { return c - leftCounts[k]; });
        var gl = gini(leftCounts, nLeft);
        var gr = gini(rightCounts, nRight);
        var weighted = (nLeft * gl + nRight * gr) / total;
        var gain = parentGini - weighted;
        if (!best || gain > best.gain) best = { feature: key, threshold: thr, gain: gain };
      }
    }
    return best;
  }

  function build(samples, opts, depth) {
    depth = depth || 0;
    var counts = classCounts(samples, opts.nClasses);
    var total = samples.length;
    var node = {
      samples: total,
      counts: counts,
      pred: argmax(counts),
      proba: counts.map(function (c) { return total ? c / total : 0; }),
      gini: gini(counts, total),
      depth: depth,
      leaf: true,
    };
    if (depth >= opts.maxDepth || total < (opts.minSamples || 2) || node.gini === 0) return node;
    var split = bestSplit(samples, opts);
    if (!split || split.gain <= 1e-9) return node;

    var left = [], right = [];
    for (var i = 0; i < samples.length; i++) {
      (samples[i][split.feature] <= split.threshold ? left : right).push(samples[i]);
    }
    if (!left.length || !right.length) return node;

    node.leaf = false;
    node.feature = split.feature;
    node.threshold = split.threshold;
    node.left = build(left, opts, depth + 1);
    node.right = build(right, opts, depth + 1);
    return node;
  }

  function predictProba(node, point) {
    while (!node.leaf) node = point[node.feature] <= node.threshold ? node.left : node.right;
    return node.proba;
  }
  function predict(node, point) {
    while (!node.leaf) node = point[node.feature] <= node.threshold ? node.left : node.right;
    return node.pred;
  }

  function countLeaves(node) {
    return node.leaf ? 1 : countLeaves(node.left) + countLeaves(node.right);
  }

  window.CART = {
    build: build,
    predict: predict,
    predictProba: predictProba,
    countLeaves: countLeaves,
  };
})();
