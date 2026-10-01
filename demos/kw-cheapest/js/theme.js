(function () {
  const THEME_KEY = 'kwcheapest_theme';

  function current() {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function apply(theme) {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
  }

  function updateIcon(theme) {
    const moon = document.getElementById('theme-icon-moon');
    const sun = document.getElementById('theme-icon-sun');
    if (!moon || !sun) return;
    // Show the icon for the theme a click would switch TO.
    moon.classList.toggle('hidden', theme !== 'light');
    sun.classList.toggle('hidden', theme === 'light');
  }

  function init() {
    const theme = current();
    updateIcon(theme);
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = current() === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* ignore */
      }
      apply(next);
      updateIcon(next);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
