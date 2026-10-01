// RJ Mowing KW - booking form logic
//
// Time slots:
//   Monday to Friday: 3:00 PM to 9:00 PM, 30 minute intervals
//   Saturday and Sunday: 9:00 AM to 9:00 PM, 30 minute intervals
//
// Submission target:
//   Bookings are sent to the deployed Google Apps Script Web App, which
//   appends each one as a row in a Google Sheet. See apps-script/Code.gs
//   and README.md for the backend code and setup steps.

var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyh14t0yzmq2VBBDE4nvwsRNqSaplEQFTfp3fJduIXUTJSBJzi0vAKeEs3Z7AeQskCfDA/exec";

function normalizePhoneDigits(value) {
  var digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.charAt(0) === "1") {
    digits = digits.slice(1);
  }
  return digits;
}

function isRepetitiveOrSequentialDigits(digits) {
  if (/^(\d)\1+$/.test(digits)) {
    return true;
  }
  var ascending = "01234567890123456789";
  var descending = "98765432109876543210";
  return ascending.indexOf(digits) !== -1 || descending.indexOf(digits) !== -1;
}

function isValidPhoneNumber(rawValue) {
  var digits = normalizePhoneDigits(rawValue);
  if (digits.length !== 10 || isRepetitiveOrSequentialDigits(digits)) {
    return false;
  }
  var areaCode = digits.slice(0, 3);
  var exchangeCode = digits.slice(3, 6);
  return /^[2-9]\d{2}$/.test(areaCode) && /^[2-9]\d{2}$/.test(exchangeCode);
}

function isValidServiceAddress(rawValue) {
  var value = (rawValue || "").trim();
  if (value.length < 8) {
    return false;
  }

  var match = value.match(/^(\d{1,6})\s+([A-Za-z][A-Za-z0-9'.-]*(?:\s+[A-Za-z0-9'.-]+)*)/);
  if (!match) {
    return false;
  }

  var letters = match[2].replace(/[^A-Za-z]/g, "");
  if (letters.length < 3 || /^(.)\1+$/i.test(letters)) {
    return false;
  }

  return true;
}

function buildTimeSlots(dayOfWeek) {
  var isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  var startMinutes = isWeekend ? 9 * 60 : 15 * 60;
  var endMinutes = 21 * 60;
  var slots = [];

  for (var minutes = startMinutes; minutes <= endMinutes; minutes += 30) {
    var hour24 = Math.floor(minutes / 60);
    var minute = minutes % 60;
    var period = hour24 >= 12 ? "PM" : "AM";
    var hour12 = hour24 % 12;
    if (hour12 === 0) {
      hour12 = 12;
    }
    var label = hour12 + ":" + (minute === 0 ? "00" : minute) + " " + period;
    slots.push(label);
  }

  return slots;
}

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("bookingForm");
  if (!form) {
    return;
  }

  var dateInput = document.getElementById("preferredDate");
  var timeSelect = document.getElementById("preferredTime");
  var timeHelp = document.getElementById("timeHelp");
  var statusBox = document.getElementById("formStatus");
  var submitBtn = document.getElementById("submitBtn");
  var phoneInput = document.getElementById("customerPhone");
  var addressInput = document.getElementById("serviceAddress");

  function validatePhoneField() {
    if (phoneInput.value.trim() === "") {
      phoneInput.setCustomValidity("");
      return;
    }
    phoneInput.setCustomValidity(
      isValidPhoneNumber(phoneInput.value)
        ? ""
        : "Enter a valid 10-digit phone number, e.g. (519) 555-0123."
    );
  }

  function validateAddressField() {
    if (addressInput.value.trim() === "") {
      addressInput.setCustomValidity("");
      return;
    }
    addressInput.setCustomValidity(
      isValidServiceAddress(addressInput.value)
        ? ""
        : "Enter a full street address with a street number and street name, e.g. 123 Main St, Kitchener."
    );
  }

  phoneInput.addEventListener("input", validatePhoneField);
  phoneInput.addEventListener("blur", validatePhoneField);
  addressInput.addEventListener("input", validateAddressField);
  addressInput.addEventListener("blur", validateAddressField);

  var today = new Date();
  var todayIso = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");
  dateInput.min = todayIso;

  function populateTimeSlots() {
    timeSelect.innerHTML = "";

    if (!dateInput.value) {
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Choose a date first";
      timeSelect.appendChild(placeholder);
      timeSelect.disabled = true;
      timeHelp.textContent = "Select your preferred date to see available times.";
      return;
    }

    var parts = dateInput.value.split("-").map(Number);
    var selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
    var dayOfWeek = selectedDate.getDay();
    var isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    var slots = buildTimeSlots(dayOfWeek);

    var firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = "Select an estimated time";
    timeSelect.appendChild(firstOption);

    slots.forEach(function (slot) {
      var option = document.createElement("option");
      option.value = slot;
      option.textContent = slot;
      timeSelect.appendChild(option);
    });

    timeSelect.disabled = false;
    timeHelp.textContent = isWeekend
      ? "Weekend hours: 9:00 AM to 9:00 PM. This is your estimated arrival window."
      : "Weekday hours: 3:00 PM to 9:00 PM. This is your estimated arrival window.";
  }

  dateInput.addEventListener("change", populateTimeSlots);
  populateTimeSlots();

  function setStatus(type, message) {
    statusBox.className = "form-status visible " + type;
    statusBox.textContent = message;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    validatePhoneField();
    validateAddressField();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var payload = {
      name: document.getElementById("customerName").value.trim(),
      email: document.getElementById("customerEmail").value.trim(),
      phone: document.getElementById("customerPhone").value.trim(),
      address: document.getElementById("serviceAddress").value.trim(),
      service: document.getElementById("serviceType").value,
      date: dateInput.value,
      time: timeSelect.value,
      notes: document.getElementById("extraNotes").value.trim(),
      submittedAt: new Date().toISOString(),
      source: "rjmowingkw.com"
    };

    if (GOOGLE_SCRIPT_URL.indexOf("PASTE_YOUR") === 0) {
      setStatus(
        "error",
        "Booking is not connected yet. Add the Google Apps Script Web App URL in js/booking.js before going live."
      );
      return;
    }

    submitBtn.disabled = true;
    setStatus("loading", "Sending your booking request...");

    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    })
      .then(function () {
        setStatus(
          "success",
          "Thank you, " + payload.name + ". Your request for " + payload.date + " at " + payload.time +
          " has been received. You will get a text or a call as soon as possible to confirm your appointment."
        );
        form.reset();
        populateTimeSlots();
      })
      .catch(function () {
        setStatus(
          "error",
          "Something went wrong sending your request. Please call or email us directly, or try again in a moment."
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
});
