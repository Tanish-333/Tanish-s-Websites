// Header, drawer and announcement bar for the Terms / Privacy pages.
(function () {
  const $ = (id) => document.getElementById(id);
  $('year').textContent = new Date().getFullYear();

  const header = $('site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const drawer = $('drawer');
  const scrim = $('drawer-scrim');
  const openBtn = $('menu-open');
  const set = (v) => {
    drawer.classList.toggle('is-open', v);
    scrim.classList.toggle('is-open', v);
    drawer.setAttribute('aria-hidden', String(!v));
    openBtn.setAttribute('aria-expanded', String(v));
    document.body.classList.toggle('no-scroll', v);
  };
  openBtn.onclick = () => set(true);
  $('menu-close').onclick = () => set(false);
  scrim.onclick = () => set(false);
  addEventListener('keydown', (e) => e.key === 'Escape' && set(false));

  const announce = $('announce');
  try {
    announce.hidden = sessionStorage.getItem('kwcheapest_announce_x') === '1';
  } catch (e) {}
  $('announce-close').onclick = () => {
    announce.hidden = true;
    try {
      sessionStorage.setItem('kwcheapest_announce_x', '1');
    } catch (e) {}
  };

  if (window.KWStore) {
    const text = $('footer-text');
    if (text) text.href = `sms:${KWStore.CONTACT.phone}`;
  }
})();
