(function () {
  "use strict";

  // ===== Course structure: single source of truth =========================
  // Chapters either have `items` (sub-lessons) or their own `slug` (leaf page).
  var CHAPTERS = [
    { slug: "about", n: "", title: "Об авторе" },
    { slug: "index", n: "", title: "Введение" },
    {
      n: "1",
      title: "Линейные модели",
      items: [
        { slug: "linear-regression", n: "1.1", title: "Линейная регрессия", desc: "SGD, функция потерь и регуляризация на простейшей модели." },
        { slug: "linear-classification", n: "1.2", title: "Линейная классификация", desc: "Перцептрон и разделяющая гиперплоскость." },
        { slug: "logistic-regression", n: "1.3", title: "Логистическая регрессия", desc: "Сигмоида, вероятности и log-loss." },
        { slug: "svm", n: "1.4", title: "Метод опорных векторов", desc: "Максимальный зазор, опорные векторы, параметр C." },
      ],
    },
    { n: "2", slug: "decision-trees", title: "Решающие деревья", desc: "Жадные пороговые разбиения и критерий Джини." },
    {
      n: "3",
      title: "Ансамбли",
      items: [
        { slug: "random-forest", n: "3.1", title: "Случайный лес", desc: "Бэггинг: усреднение множества деревьев." },
        { slug: "gradient-boosting", n: "3.2", title: "Градиентный бустинг", desc: "Последовательное исправление ошибок." },
      ],
    },
    { n: "4", slug: "metrics", title: "Оценка качества моделей", desc: "Метрики регрессии и классификации, ROC-AUC." },
    {
      n: "5",
      title: "Кластеризация",
      items: [
        { slug: "kmeans", n: "5.1", title: "K-Means", desc: "Алгоритм Ллойда и инерция." },
        { slug: "hierarchical", n: "5.2", title: "Иерархическая кластеризация", desc: "Агломерация и дендрограмма." },
        { slug: "dbscan", n: "5.3", title: "DBSCAN", desc: "Кластеры по плотности, шум и выбросы." },
      ],
    },
    { n: "6", slug: "neural-networks", title: "Полносвязные нейросети", desc: "Многослойный перцептрон и обратное распространение." },
    { n: "7", slug: "cnn", title: "Свёрточные сети (CNN)", desc: "Свёртки, ядра и пулинг в компьютерном зрении." },
    { n: "8", slug: "nlp", title: "Обработка языка (NLP)", desc: "word2vec, RNN/LSTM/GRU и трансформеры." },
  ];

  // Flattened ordered list of leaf pages (for prev/next + search).
  var PAGES = [];
  CHAPTERS.forEach(function (ch) {
    if (ch.items) ch.items.forEach(function (it) { PAGES.push(it); });
    else PAGES.push({ slug: ch.slug, n: ch.n, title: ch.title });
  });

  var page = document.body.getAttribute("data-page") || "";

  function current() {
    return PAGES.find(function (p) { return p.slug === page; });
  }

  // ===== Header ===========================================================
  function buildHeader() {
    var cur = current();
    var crumb = cur ? (cur.n ? "Глава " + cur.n + " · " + cur.title : cur.title) : "";
    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<div class="header-top">' +
        '<a class="site-author" href="about.html">' +
          '<img src="фото.jpg" alt="Курченко Матвей" class="author-avatar">' +
          '<span class="author-name">Курченко Матвей</span>' +
        "</a>" +
        '<button type="button" class="btn-toc" id="toc-toggle" aria-label="Оглавление">☰ оглавление</button>' +
        '<span class="crumb">' + crumb + "</span>" +
      "</div>";
    return header;
  }

  // ===== Sidebar table of contents ========================================
  function buildSidebar() {
    var aside = document.createElement("aside");
    aside.className = "course-sidebar";
    aside.id = "course-sidebar";

    var html = '<nav class="toc-nav">';
    CHAPTERS.forEach(function (ch) {
      html += '<div class="toc-chapter">';
      if (ch.items) {
        html += '<p class="toc-chapter-title"><span class="toc-n">' + ch.n + "</span> " + ch.title + "</p>";
        html += "<ul>";
        ch.items.forEach(function (it) {
          var active = it.slug === page ? ' class="active"' : "";
          html += '<li' + active + '><a href="' + it.slug + '.html"><span class="toc-n">' + it.n + "</span> " + it.title + "</a></li>";
        });
        html += "</ul>";
      } else {
        var act = ch.slug === page ? ' class="active toc-leaf"' : ' class="toc-leaf"';
        var num = ch.n ? '<span class="toc-n">' + ch.n + "</span> " : "";
        html += '<p' + act + '><a href="' + ch.slug + '.html">' + num + ch.title + "</a></p>";
      }
      html += "</div>";
    });
    html += "</nav>";

    aside.innerHTML = html;
    return aside;
  }

  function buildScrim() {
    var s = document.createElement("div");
    s.className = "toc-scrim";
    s.id = "toc-scrim";
    return s;
  }

  // ===== Footer ===========================================================
  function buildFooter() {
    var cur = current();
    var idx = cur ? PAGES.indexOf(cur) : -1;
    var navHtml = "";
    if (idx !== -1) {
      var prev = PAGES[idx - 1];
      var next = PAGES[idx + 1];
      if (prev || next) {
        navHtml += '<nav class="lesson-nav">';
        if (prev) navHtml += '<a class="lesson-nav-link prev" href="' + prev.slug + '.html">← ' + (prev.n ? prev.n + " · " : "") + prev.title + "</a>";
        if (next) navHtml += '<a class="lesson-nav-link next" href="' + next.slug + '.html">' + (next.n ? next.n + " · " : "") + next.title + " →</a>";
        navHtml += "</nav>";
      }
    }
    var footer = document.createElement("footer");
    footer.className = "site-footer-wrap";
    footer.innerHTML =
      navHtml +
      '<div class="site-footer">' +
        "<p>Copyright (c) 2008–2026 ML Lab · собрано с любовью к градиентам</p>" +
        '<a href="index.html">Site Map</a>' +
      "</div>";
    return footer;
  }

  // ===== TOC drawer ========================================================
  function initToc() {
    var sidebar = document.getElementById("course-sidebar");
    var scrim = document.getElementById("toc-scrim");
    var toggle = document.getElementById("toc-toggle");
    function close() {
      sidebar.classList.remove("open");
      scrim.classList.remove("show");
    }
    if (toggle) {
      toggle.addEventListener("click", function () {
        sidebar.classList.toggle("open");
        scrim.classList.toggle("show");
      });
    }
    if (scrim) scrim.addEventListener("click", close);

    // active item scrolled into view inside sidebar
    var act = sidebar.querySelector(".active");
    if (act && act.scrollIntoView) act.scrollIntoView({ block: "center" });
  }

  // ===== Mount ============================================================
  function mount() {
    var blocks = document.querySelector(".wp-site-blocks");
    if (!blocks) return;
    document.body.appendChild(buildSidebar());
    document.body.appendChild(buildScrim());
    var main = blocks.querySelector(".site-main");
    if (page !== "about") blocks.insertBefore(buildHeader(), main);
    blocks.appendChild(buildFooter());
    initToc();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
