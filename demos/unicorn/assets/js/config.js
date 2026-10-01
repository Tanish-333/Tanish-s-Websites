/**
 * Expressive Unicorns: site configuration
 *
 * GOOGLE_SCRIPT_URL: leave this empty for now. Once you deploy the Google
 * Apps Script web app described in README.md ("Connecting Google Sheets"),
 * paste the deployment URL here and bookings will be written straight into
 * your Google Sheet automatically. Until then, submitted bookings are safely
 * kept in the visitor's browser (localStorage) and can still reach you via
 * the Instagram / email fallback shown on the confirmation screen.
 */
const CONFIG = {
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzIKqUQ4GIYBicjrcZfIb9Ft-cFFaN9a7D70P4FAbDIZXyJopAadj723rsBEbjo7KMRgg/exec",
  INSTAGRAM_URL: "https://www.instagram.com/expressive_unicorns/",
  INSTAGRAM_HANDLE: "@expressive_unicorns",
  BUSINESS_NAME: "Expressive Unicorns",
  BUSINESS_EMAIL: "tonirappazzo9@gmail.com",
};
