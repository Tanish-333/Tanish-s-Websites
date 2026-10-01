// Expressive Unicorns: shared site behaviour

document.addEventListener("DOMContentLoaded", () => {
  // Mobile nav toggle
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => navLinks.classList.remove("open"));
    });
  }

  // Reveal-on-scroll animations
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  // Instagram links from CONFIG
  if (typeof CONFIG !== "undefined") {
    document.querySelectorAll("[data-instagram-link]").forEach((el) => {
      el.setAttribute("href", CONFIG.INSTAGRAM_URL);
    });
    document.querySelectorAll("[data-instagram-handle]").forEach((el) => {
      el.textContent = CONFIG.INSTAGRAM_HANDLE;
    });
    document.querySelectorAll("[data-email-link]").forEach((el) => {
      el.setAttribute("href", "mailto:" + CONFIG.BUSINESS_EMAIL);
    });
    document.querySelectorAll("[data-email]").forEach((el) => {
      el.textContent = CONFIG.BUSINESS_EMAIL;
    });
  }

  // Lightbox for gallery
  const lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    const lightboxMedia = lightbox.querySelector(".lightbox-media");
    const lightboxCaption = lightbox.querySelector(".lightbox-caption");
    const closeBtn = lightbox.querySelector(".lightbox-close");

    document.querySelectorAll(".gallery-item").forEach((item) => {
      item.addEventListener("click", () => {
        const caption = item.dataset.caption || "";
        const img = item.querySelector("img");
        const placeholder = item.querySelector(".gallery-placeholder");

        lightboxMedia.innerHTML = "";
        if (img && img.style.display !== "none" && img.complete && img.naturalWidth > 0) {
          const clone = img.cloneNode(true);
          clone.removeAttribute("onload");
          clone.removeAttribute("onerror");
          lightboxMedia.appendChild(clone);
        } else if (placeholder) {
          lightboxMedia.innerHTML = placeholder.innerHTML;
        }

        lightboxCaption.textContent = caption;
        lightbox.classList.add("open");
        document.body.style.overflow = "hidden";
      });
    });

    const closeLightbox = () => {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
    };

    closeBtn?.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }
});
