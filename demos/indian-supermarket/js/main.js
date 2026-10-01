/*
 * Progressive enhancement only. Every core interaction (directions,
 * calls, branch jump, mobile nav) already works with this file absent.
 * This adds: closing the mobile menu after a link is tapped, and
 * highlighting the current section in the primary nav while scrolling.
 */

(function () {
  var navToggle = document.getElementById("nav-toggle");
  var navLinks = document.querySelectorAll(".nav-list a");

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (navToggle) navToggle.checked = false;
    });
  });

  var sections = ["home", "departments", "deli", "gallery", "locations", "about"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || sections.length === 0) return;

  var linkById = {};
  navLinks.forEach(function (link) {
    var id = link.getAttribute("href").replace("#", "");
    linkById[id] = link;
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var link = linkById[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove("is-active"); });
          link.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach(function (section) { observer.observe(section); });
})();

/*
 * Live Open/Closed badge, computed from the real posted hours
 * (10 AM-9 PM daily, Eastern time) rather than the visitor's own
 * clock, since every branch is in Ontario. Fails silently (badge
 * stays empty and hidden via CSS) if Intl/timeZone support is missing.
 *
 * Holiday-aware: Christmas Day is a confirmed closure for every
 * branch (Ontario's Retail Business Holidays Act closes ALL retail
 * province-wide on Dec 25, with no size or business-type exemption).
 * The other statutory holidays are commonly business-as-usual at
 * independently run grocers, but exact per-branch hours on those
 * days are not publicly confirmed, so the badge says so honestly
 * instead of guessing "Open Now" and risking a wasted trip. As
 * branches confirm their own holiday hours, replace the matching
 * "unknown" status below with "closed" or a specific opens/closes
 * override.
 */
(function () {
  var badges = document.querySelectorAll("[data-open-badge]");
  var notice = document.querySelector("[data-holiday-notice]");
  if (badges.length === 0 && !notice) return;

  var HOLIDAYS = [
    { date: "2026-01-01", name: "New Year's Day", status: "unknown" },
    { date: "2026-02-16", name: "Family Day", status: "unknown" },
    { date: "2026-04-03", name: "Good Friday", status: "unknown" },
    { date: "2026-05-18", name: "Victoria Day", status: "unknown" },
    { date: "2026-07-01", name: "Canada Day", status: "unknown" },
    { date: "2026-09-07", name: "Labour Day", status: "unknown" },
    { date: "2026-10-12", name: "Thanksgiving", status: "unknown" },
    { date: "2026-12-25", name: "Christmas Day", status: "closed" },
    { date: "2027-01-01", name: "New Year's Day", status: "unknown" },
    { date: "2027-02-15", name: "Family Day", status: "unknown" },
    { date: "2027-03-26", name: "Good Friday", status: "unknown" },
    { date: "2027-05-24", name: "Victoria Day", status: "unknown" },
    { date: "2027-07-01", name: "Canada Day", status: "unknown" },
    { date: "2027-09-06", name: "Labour Day", status: "unknown" },
    { date: "2027-10-11", name: "Thanksgiving", status: "unknown" },
    { date: "2027-12-25", name: "Christmas Day", status: "closed" }
  ];

  try {
    var todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
    var todayHoliday = null;
    for (var i = 0; i < HOLIDAYS.length; i++) {
      if (HOLIDAYS[i].date === todayStr) { todayHoliday = HOLIDAYS[i]; break; }
    }

    var timeParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(new Date());
    var hour = 0, minute = 0;
    timeParts.forEach(function (p) {
      if (p.type === "hour") hour = parseInt(p.value, 10) % 24;
      if (p.type === "minute") minute = parseInt(p.value, 10);
    });

    var minutesNow = hour * 60 + minute;
    var opens = 10 * 60;
    var closes = 21 * 60;

    if (todayHoliday && todayHoliday.status === "closed") {
      badges.forEach(function (badge) {
        badge.textContent = "Closed – " + todayHoliday.name;
        badge.classList.add("is-closed");
      });
      if (notice) {
        notice.textContent = "Holiday hours: every branch is closed today for " + todayHoliday.name + ".";
        notice.hidden = false;
      }
    } else if (todayHoliday && todayHoliday.status === "unknown") {
      badges.forEach(function (badge) {
        badge.textContent = "Holiday – Call Ahead";
        badge.classList.add("is-holiday");
      });
      if (notice) {
        notice.textContent = "Holiday hours: today is " + todayHoliday.name + ". Posted hours below may not apply — please call your branch to confirm before heading over.";
        notice.hidden = false;
      }
    } else {
      var isOpen = minutesNow >= opens && minutesNow < closes;
      badges.forEach(function (badge) {
        badge.textContent = isOpen ? "Open Now" : "Closed Now";
        badge.classList.add(isOpen ? "is-open" : "is-closed");
      });
    }
  } catch (e) {
    /* Intl/timeZone unsupported: badges stay empty and hidden. */
  }
})();

/*
 * City filter for the branch grid. Cards stay in the DOM either way
 * (hidden via a CSS class, not removed) so search engines still see
 * every branch regardless of JS.
 */
(function () {
  var filterButtons = document.querySelectorAll(".filter-btn");
  var branchCards = document.querySelectorAll(".branch-card");
  if (filterButtons.length === 0) return;

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var city = btn.getAttribute("data-city");

      filterButtons.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");

      branchCards.forEach(function (card) {
        var show = city === "all" || card.getAttribute("data-city") === city;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });
})();

/*
 * Crossfade engine for the "All Our Branches" gallery strip:
 * advances on a timer and wires up the dot buttons. Only pauses
 * while the browser tab itself is hidden (so it doesn't burn cycles
 * in the background) — it always starts moving on its own the
 * moment the page loads, regardless of the visitor's mouse position
 * or motion-preference settings.
 */
function runSlideshow(slides, dots, intervalMs) {
  if (slides.length < 2) return;

  var current = 0;
  var timer = null;

  function show(index) {
    slides[current].classList.remove("is-active");
    if (dots[current]) {
      dots[current].classList.remove("is-active");
      dots[current].setAttribute("aria-selected", "false");
    }
    current = index;
    slides[current].classList.add("is-active");
    if (dots[current]) {
      dots[current].classList.add("is-active");
      dots[current].setAttribute("aria-selected", "true");
    }
  }

  function advance() { show((current + 1) % slides.length); }

  function start() {
    if (timer) return;
    timer = window.setInterval(advance, intervalMs);
  }
  function stop() {
    window.clearInterval(timer);
    timer = null;
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () {
      stop();
      show(i);
      start();
    });
  });

  start();
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
}

(function () {
  var root = document.querySelector(".branch-slideshow");
  if (!root) return;
  runSlideshow(
    root.querySelectorAll(".branch-slide"),
    root.querySelectorAll(".branch-dot"),
    4500
  );
})();
