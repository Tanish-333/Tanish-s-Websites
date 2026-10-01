// Expressive Unicorns: booking form handling
// Designed so it can be wired to a Google Apps Script Web App (writing to a
// Google Sheet) simply by pasting the deployment URL into assets/js/config.js
// No changes needed here. See README.md, "Connecting Google Sheets".

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  if (!form) return;

  const statusEl = document.getElementById("form-status");
  const confirmEl = document.getElementById("booking-confirm");
  const submitBtn = form.querySelector('button[type="submit"]');

  const dateInput = form.querySelector("#event-date");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
  }

  const requiredFields = form.querySelectorAll("[required]");

  function setFieldError(field, message) {
    const wrapper = field.closest(".field");
    if (!wrapper) return;
    wrapper.classList.add("error");
    const msg = wrapper.querySelector(".field-error-msg");
    if (msg) msg.textContent = message;
  }

  function clearFieldError(field) {
    const wrapper = field.closest(".field");
    if (!wrapper) return;
    wrapper.classList.remove("error");
  }

  requiredFields.forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field));
    field.addEventListener("change", () => clearFieldError(field));
  });

  function validate() {
    let valid = true;

    requiredFields.forEach((field) => {
      clearFieldError(field);
      if (!field.value.trim()) {
        setFieldError(field, "This field is required.");
        valid = false;
      }
    });

    const emailField = form.querySelector("#email");
    if (emailField && emailField.value.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailField.value.trim())) {
        setFieldError(emailField, "Please enter a valid email address.");
        valid = false;
      }
    }

    const dateField = form.querySelector("#event-date");
    if (dateField && dateField.value) {
      const chosen = new Date(dateField.value + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (chosen < today) {
        setFieldError(dateField, "Please choose a date in the future.");
        valid = false;
      }
    }

    return valid;
  }

  function showStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = "form-status visible " + type;
  }

  function saveLocally(payload) {
    try {
      const existing = JSON.parse(localStorage.getItem("eu_bookings") || "[]");
      existing.push(payload);
      localStorage.setItem("eu_bookings", JSON.stringify(existing));
    } catch (err) {
      console.warn("Could not save booking locally:", err);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Honeypot spam trap: if filled, silently pretend success.
    const honeypot = form.querySelector('input[name="company"]');
    if (honeypot && honeypot.value) {
      form.reset();
      return;
    }

    if (!validate()) {
      showStatus("Please fix the highlighted fields and try again.", "error");
      return;
    }

    const formData = new FormData(form);
    const payload = {
      timestamp: new Date().toISOString(),
      name: formData.get("name") || "",
      email: formData.get("email") || "",
      phone: formData.get("phone") || "",
      eventDate: formData.get("eventDate") || "",
      startTime: formData.get("startTime") || "",
      duration: formData.get("duration") || "",
      eventType: formData.get("eventType") || "",
      guestCount: formData.get("guestCount") || "",
      location: formData.get("location") || "",
      details: formData.get("details") || "",
      hearAbout: formData.get("hearAbout") || "",
    };

    submitBtn?.setAttribute("disabled", "true");
    showStatus("Sending your booking request…", "");

    const scriptUrl = typeof CONFIG !== "undefined" ? CONFIG.GOOGLE_SCRIPT_URL : "";

    try {
      if (scriptUrl) {
        // Google Apps Script web apps need a "simple" request to avoid a
        // CORS preflight, so we send text/plain and parse JSON server-side.
        await fetch(scriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      }

      saveLocally(payload);
      form.style.display = "none";
      statusEl?.classList.remove("visible");
      confirmEl?.classList.add("visible");
      confirmEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      console.error(err);
      saveLocally(payload);
      showStatus(
        "We couldn't reach our booking system, but your request was saved. Please also reach out on Instagram to confirm.",
        "error"
      );
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
});
