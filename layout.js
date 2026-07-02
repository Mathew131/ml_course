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
    { n: "2", slug: "metrics", title: "Оценка качества моделей", desc: "Метрики регрессии и классификации, ROC-AUC." },
    { n: "3", slug: "decision-trees", title: "Решающие деревья", desc: "Жадные пороговые разбиения и критерий Джини." },
    {
      n: "4",
      title: "Ансамбли",
      items: [
        { slug: "random-forest", n: "4.1", title: "Случайный лес", desc: "Бэггинг: усреднение множества деревьев." },
        { slug: "gradient-boosting", n: "4.2", title: "Градиентный бустинг", desc: "Последовательное исправление ошибок." },
      ],
    },
    {
      n: "5",
      title: "Кластеризация",
      items: [
        { slug: "kmeans", n: "5.1", title: "K-Means", desc: "Алгоритм Ллойда и инерция." },
        { slug: "hierarchical", n: "5.2", title: "Иерархическая кластеризация", desc: "Агломерация и дендрограмма." },
        { slug: "dbscan", n: "5.3", title: "DBSCAN", desc: "Кластеры по плотности, шум и выбросы." },
      ],
    },
  ];

  // Flattened ordered list of leaf pages for sidebar state and search.
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
      if (ch.items) {
        var listId = "toc-list-" + ch.n;
        html += '<div class="toc-chapter toc-collapsible" data-toc-chapter="' + ch.n + '">';
        html += '<button class="toc-chapter-title" type="button" aria-expanded="true" aria-controls="' + listId + '">';
        html += '<span><span class="toc-n">' + ch.n + "</span> " + ch.title + "</span>";
        html += '<span class="toc-caret" aria-hidden="true">▾</span>';
        html += "</button>";
        html += '<ul id="' + listId + '">';
        ch.items.forEach(function (it) {
          var active = it.slug === page ? ' class="active"' : "";
          html += '<li' + active + '><a href="' + it.slug + '.html"><span class="toc-n">' + it.n + "</span> " + it.title + "</a></li>";
        });
        html += "</ul>";
      } else {
        html += '<div class="toc-chapter">';
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

    sidebar.querySelectorAll(".toc-collapsible").forEach(function (chapter) {
      var button = chapter.querySelector(".toc-chapter-title");
      var list = chapter.querySelector("ul");
      if (!button || !list) return;

      var key = "ml-course-toc-" + chapter.getAttribute("data-toc-chapter");
      var hasActive = !!chapter.querySelector(".active");
      var saved = null;
      try {
        saved = localStorage.getItem(key);
      } catch (e) {}
      var expanded = hasActive || saved === "open";

      function setExpanded(next) {
        button.setAttribute("aria-expanded", next ? "true" : "false");
        list.hidden = !next;
        chapter.classList.toggle("collapsed", !next);
        try {
          localStorage.setItem(key, next ? "open" : "closed");
        } catch (e) {}
      }

      setExpanded(expanded);
      button.addEventListener("click", function () {
        setExpanded(button.getAttribute("aria-expanded") !== "true");
      });
    });

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
    initToc();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
