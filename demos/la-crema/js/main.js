/* La Crema Peruvian Restaurant site behavior */
(function () {
  "use strict";

  var RESTAURANT_EMAIL = "lacremaperuvianrestaurant@gmail.com";

  document.addEventListener("DOMContentLoaded", function () {
    initHeader();
    initMobileNav();
    initReveal();
    initMenuJumpNav();
    initNewsletterForm();
    initContactForm();
    initYear();
    initTodayHighlight();
  });

  /* Highlights today's row in any .hours-table using each row's data-day
     (0 = Sunday ... 6 = Saturday, matching Date#getDay). */
  function initTodayHighlight() {
    var today = new Date().getDay();
    document.querySelectorAll(".hours-table tr[data-day]").forEach(function (row) {
      var days = row.getAttribute("data-day").split(",").map(Number);
      if (days.indexOf(today) !== -1) row.classList.add("today");
    });
  }

  /* Sticky header shadow on scroll */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var toggleClass = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    toggleClass();
    window.addEventListener("scroll", toggleClass, { passive: true });
  }

  /* Mobile nav open/close */
  function initMobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".main-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* Reveal-on-scroll animations */
  function initReveal() {
    var targets = document.querySelectorAll(".reveal, .reveal-stagger");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* Menu page: highlight active category in the jump nav while scrolling */
  function initMenuJumpNav() {
    var nav = document.querySelector(".menu-jump-nav");
    if (!nav) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    var sections = links
      .map(function (link) {
        var id = link.getAttribute("href").replace("#", "");
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (!sections.length || !("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = nav.querySelector('a[href="#' + entry.target.id + '"]');
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach(function (l) { l.classList.remove("is-active"); });
            link.classList.add("is-active");
            link.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* Newsletter form. No backend yet, so we confirm locally and hand the
     signup off to the restaurant's inbox via mailto. Swap this out once a
     real email service (Mailchimp, Klaviyo, etc.) is connected. */
  function initNewsletterForm() {
    var form = document.querySelector("#newsletter-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var emailInput = form.querySelector('input[type="email"]');
      var email = emailInput ? emailInput.value.trim() : "";
      if (!email) return;

      var success = form.querySelector(".form-success");
      var subject = encodeURIComponent("Newsletter signup");
      var body = encodeURIComponent("Please add me to the La Crema newsletter: " + email);
      var mailLink = document.createElement("a");
      mailLink.href = "mailto:" + RESTAURANT_EMAIL + "?subject=" + subject + "&body=" + body;
      mailLink.click();

      if (success) {
        success.textContent = "Thank you! Your email client should have opened, send the message and you're on the list.";
        success.classList.add("is-visible");
      }
      form.reset();
    });
  }

  /* Contact form. Builds a pre-filled mailto so messages land directly in
     the restaurant's inbox until a form backend is wired up. */
  function initContactForm() {
    var form = document.querySelector("#contact-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = (form.querySelector("#contact-name") || {}).value || "";
      var phone = (form.querySelector("#contact-phone") || {}).value || "";
      var email = (form.querySelector("#contact-email") || {}).value || "";
      var message = (form.querySelector("#contact-message") || {}).value || "";
      var success = form.querySelector(".form-success");

      var subject = encodeURIComponent("Website inquiry from " + (name || "a visitor"));
      var bodyLines = [
        "Name: " + name,
        "Phone: " + phone,
        "Email: " + email,
        "",
        message
      ];
      var body = encodeURIComponent(bodyLines.join("\n"));

      var mailLink = document.createElement("a");
      mailLink.href = "mailto:" + RESTAURANT_EMAIL + "?subject=" + subject + "&body=" + body;
      mailLink.click();

      if (success) {
        success.textContent = "Thanks, " + (name || "friend") + "! Your email client should have opened with your message ready to send.";
        success.classList.add("is-visible");
      }
      form.reset();
    });
  }

  function initYear() {
    var el = document.querySelector("#year");
    if (el) el.textContent = new Date().getFullYear();
  }
})();
