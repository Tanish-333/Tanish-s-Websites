/* Angad Ahluwalia Real Estate site behaviour */

/* ============================================================
   SITE-WIDE SETTINGS
   Edit the values below and every page updates automatically.
   Phone, email, and address are pulled from here into any
   element carrying the matching data-attribute.
   ============================================================ */
const SITE = {
  phone: "(647) 300-2322",
  phoneHref: "tel:+16473002322",
  email: "info@ahluwaliarealestate.com",
  addressLine1: "5111 New St",
  addressLine2: "Burlington, ON L7L 1V2",
  hours: "Monday to Saturday, 9:00am to 6:00pm",
  /* Paste the Google Apps Script "Web app" URL here (see /google-apps-script/SETUP-GOOGLE-SHEETS.md) */
  formEndpoint: "https://script.google.com/macros/s/AKfycbyfwFZAGsfqF83KRqklcdm_20UwRvYdab6FpzIpizZnQwA2w3MxAjGcuqOr_LgYx32fEQ/exec",
};

document.addEventListener("DOMContentLoaded", () => {
  injectSiteInfo();
  initHeader();
  initMobileNav();
  initHeroCarousel();
  initReveal();
  initForms();
  initFaq();
  initMortgageCalculator();
  initBackToTop();
  setActiveNav();
  document.querySelectorAll("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));
});

/* Populate phone/email/address everywhere they're referenced */
function injectSiteInfo() {
  document.querySelectorAll("[data-site-phone]").forEach(el => (el.textContent = SITE.phone));
  document.querySelectorAll("[data-site-phone-href]").forEach(el => el.setAttribute("href", SITE.phoneHref));
  document.querySelectorAll("[data-site-email]").forEach(el => (el.textContent = SITE.email));
  document.querySelectorAll("[data-site-email-href]").forEach(el => el.setAttribute("href", `mailto:${SITE.email}`));
  document.querySelectorAll("[data-site-address-1]").forEach(el => (el.textContent = SITE.addressLine1));
  document.querySelectorAll("[data-site-address-2]").forEach(el => (el.textContent = SITE.addressLine2));
  document.querySelectorAll("[data-site-hours]").forEach(el => (el.textContent = SITE.hours));
}

/* Header: solid background once scrolled */
function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* Mobile hamburger nav */
function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.classList.remove("is-open");
      document.body.style.overflow = "";
    })
  );
}

/* Highlight the current page in the nav */
function setActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a[href]").forEach(a => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) a.classList.add("active");
  });
}

/* Slideshow: drives the full homepage hero and the smaller interior-page banners alike */
function initHeroCarousel() {
  document.querySelectorAll(".hero, .page-banner").forEach(setUpCarousel);
}

function setUpCarousel(container) {
  const slides = [...container.querySelectorAll(".hero-slide")];
  const dots = [...container.querySelectorAll(".hero-dots button")];
  if (!slides.length) return;
  let index = 0;
  let timer;

  function show(i) {
    slides[index]?.classList.remove("is-active");
    dots[index]?.classList.remove("is-active");
    index = (i + slides.length) % slides.length;
    slides[index]?.classList.add("is-active");
    dots[index]?.classList.add("is-active");
  }
  function next() { show(index + 1); }
  function restart() { clearInterval(timer); timer = setInterval(next, 6500); }

  dots.forEach((dot, i) => dot.addEventListener("click", () => { show(i); restart(); }));
  container.querySelector(".hero-arrow.next")?.addEventListener("click", () => { next(); restart(); });
  container.querySelector(".hero-arrow.prev")?.addEventListener("click", () => { show(index - 1); restart(); });

  show(0);
  restart();
}

/* Fade/slide elements in as they enter the viewport */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || !els.length) {
    els.forEach(el => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.15 }
  );
  els.forEach(el => observer.observe(el));
}

/* Contact / lead forms -> Google Sheet via Apps Script web app */
function initForms() {
  document.querySelectorAll("form[data-lead-form]").forEach(form => {
    const status = form.querySelector(".form-status");
    const submitBtn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", async e => {
      e.preventDefault();

      /* honeypot: real visitors never fill this hidden field */
      if (form.querySelector(".hp-field")?.value) {
        showStatus(status, "success", "Thanks! Your message has been sent.");
        form.reset();
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!SITE.formEndpoint || SITE.formEndpoint.includes("PASTE_YOUR")) {
        showStatus(status, "error", "Form isn't connected yet. See google-apps-script/SETUP-GOOGLE-SHEETS.md.");
        return;
      }

      const originalLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

      const data = new FormData(form);
      data.append("sourcePage", document.title);
      data.append("pageUrl", location.href);

      try {
        /* Apps Script web apps don't return CORS-readable responses, so we
           fire the request in no-cors mode and treat a resolved fetch as success. */
        await fetch(SITE.formEndpoint, { method: "POST", mode: "no-cors", body: data });
        showStatus(status, "success", "Thank you! I'll be in touch shortly.");
        form.reset();
      } catch (err) {
        showStatus(status, "error", "Something went wrong. Please call or email me directly.");
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      }
    });
  });
}

function showStatus(el, type, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove("is-success", "is-error");
  el.classList.add("is-visible", type === "success" ? "is-success" : "is-error");
}

/* FAQ accordion */
function initFaq() {
  document.querySelectorAll(".faq-item").forEach(item => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    if (!question || !answer) return;
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      item.parentElement.querySelectorAll(".faq-item").forEach(other => {
        other.classList.remove("is-open");
        other.querySelector(".faq-answer").style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("is-open");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });
}

/* Mortgage payment calculator */
function initMortgageCalculator() {
  const form = document.querySelector("#mortgage-calculator");
  if (!form) return;
  const priceEl = form.querySelector("#calc-price");
  const downEl = form.querySelector("#calc-down");
  const rateEl = form.querySelector("#calc-rate");
  const termEl = form.querySelector("#calc-term");
  const resultEl = form.querySelector("#calc-result");

  function calculate() {
    const price = parseFloat(priceEl.value) || 0;
    const downPct = parseFloat(downEl.value) || 0;
    const rate = parseFloat(rateEl.value) || 0;
    const years = parseFloat(termEl.value) || 25;

    const principal = price * (1 - downPct / 100);
    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;

    let payment = 0;
    if (principal > 0 && numPayments > 0) {
      payment = monthlyRate === 0
        ? principal / numPayments
        : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));
    }
    resultEl.textContent = payment > 0
      ? payment.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
      : "$0";
  }

  form.querySelectorAll("input").forEach(input => input.addEventListener("input", calculate));
  calculate();
}

/* Back-to-top button */
function initBackToTop() {
  const btn = document.querySelector(".back-to-top");
  if (!btn) return;
  window.addEventListener("scroll", () => btn.classList.toggle("is-visible", window.scrollY > 600), { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}
