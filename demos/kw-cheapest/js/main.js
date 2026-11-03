// Public storefront: catalog loading, filters, product pop-up, designer
// banner, header/drawer chrome. Data comes from KWStore (js/store.js).
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = KWStore.escapeHtml;
  const money = KWStore.formatPrice;
  const LABEL = KWStore.STATUS_LABEL;

  let allProducts = [];
  let hasLoadedOnce = false;
  const filters = { q: '', cat: 'all', max: 0, inStock: false, sort: 'new' };

  // ---------- icons ----------
  const ICON = {
    sms: '<path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4 8.5 8.5 0 0 1-3.8-.9L3 20l1-5.8a8.4 8.4 0 0 1-.9-3.8A8.4 8.4 0 0 1 11.6 2a8.4 8.4 0 0 1 9.4 9.5z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    snapchat: '<path d="M12 2.5C8.7 2.5 6.3 5.1 6.3 8.3v3.3c-1.1.3-2.1 1-2.1 1.9 0 .8.7 1.4 1.5 1.7-.2.5-.4.9-.4 1.3 0 .7.7.9 1.5.8.3.6 1 1 1.7 1 .5 0 .9-.2 1.3-.4.4.6 1.2 1 2.2 1s1.8-.4 2.2-1c.4.2.8.4 1.3.4.7 0 1.4-.4 1.7-1 .8.1 1.5-.1 1.5-.8 0-.4-.2-.8-.4-1.3.8-.3 1.5-.9 1.5-1.7 0-.9-1-1.6-2.1-1.9V8.3c0-3.2-2.4-5.8-5.7-5.8z"/>',
    tiktok: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
  };
  const icon = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;

  // ---------- helpers ----------
  // Vercel Web Analytics custom event (a no-op until the script loads, and
  // only recorded on plans that include custom events).
  function track(name, data) {
    try {
      if (window.va) window.va('event', { name, data });
    } catch (e) {}
  }

  const savings = (p) =>
    p.originalPrice && Number(p.originalPrice) > Number(p.price)
      ? Math.round((1 - p.price / p.originalPrice) * 100)
      : 0;

  function smsHref(body) {
    const { phone } = KWStore.CONTACT;
    return body ? `sms:${phone}?&body=${encodeURIComponent(body)}` : `sms:${phone}`;
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  // Scroll-in reveal
  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('is-in');
                io.unobserve(e.target);
              }
            }),
          { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
        )
      : null;
  function reveal(nodes) {
    [...nodes].forEach((n, i) => {
      if (!io) return n.classList.add('is-in');
      n.classList.add('reveal');
      n.style.setProperty('--d', `${Math.min(i, 8) * 40}ms`);
      io.observe(n);
    });
  }

  // ---------- chrome: header, drawer, announcement, contact links ----------
  function initChrome() {
    $('year').textContent = new Date().getFullYear();

    const header = $('site-header');
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });

    const drawer = $('drawer');
    const scrim = $('drawer-scrim');
    const openBtn = $('menu-open');
    const setDrawer = (v) => {
      drawer.classList.toggle('is-open', v);
      scrim.classList.toggle('is-open', v);
      drawer.setAttribute('aria-hidden', String(!v));
      openBtn.setAttribute('aria-expanded', String(v));
      document.body.classList.toggle('no-scroll', v);
    };
    openBtn.onclick = () => setDrawer(true);
    $('menu-close').onclick = () => setDrawer(false);
    scrim.onclick = () => setDrawer(false);
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setDrawer(false)));
    addEventListener('keydown', (e) => e.key === 'Escape' && drawer.classList.contains('is-open') && setDrawer(false));

    const announce = $('announce');
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem('kwcheapest_announce_x') === '1';
    } catch (e) {}
    announce.hidden = dismissed;
    $('announce-close').onclick = () => {
      announce.hidden = true;
      try {
        sessionStorage.setItem('kwcheapest_announce_x', '1');
      } catch (e) {}
    };

    $('search-jump').addEventListener('click', () => setTimeout(() => $('search-input').focus({ preventScroll: true }), 350));

    const { phoneDisplay } = KWStore.CONTACT;
    const faqPhone = $('faq-phone');
    faqPhone.href = smsHref();
    faqPhone.textContent = phoneDisplay;
    $('cta-text').href = smsHref("Hi! I'm looking at KW's Cheapest.");
    $('footer-text').href = smsHref();

    reveal(document.querySelectorAll('[data-reveal]'));
  }

  // ---------- designer banner ----------
  // Endless, gap-free: one set of names is repeated until it is wider than the
  // screen, then the track slides exactly half its width and loops.
  let marqueeWidth = 0;
  function buildMarquee() {
    const track = $('marquee-track');
    if (!track || (marqueeWidth && innerWidth <= marqueeWidth)) return;
    marqueeWidth = innerWidth;
    const once = KWStore.DESIGNERS.map((b) => `<span>${esc(b)}</span><i></i>`).join('');
    track.innerHTML = `<div class="marquee__group">${once}</div>`;
    const copies = Math.max(1, Math.ceil((innerWidth + 200) / Math.max(track.firstElementChild.scrollWidth, 1)));
    const half = once.repeat(copies);
    track.innerHTML = `<div class="marquee__group">${half}</div><div class="marquee__group" aria-hidden="true">${half}</div>`;
    track.style.setProperty('--marquee-s', `${Math.round(track.firstElementChild.scrollWidth / 60)}s`);
  }
  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(buildMarquee, 200);
  });

  // ---------- filters ----------
  function filtered() {
    const term = filters.q.trim().toLowerCase();
    const list = allProducts.filter((p) => {
      if (term && ![p.name, p.brand, p.description].some((v) => String(v || '').toLowerCase().includes(term))) return false;
      if (filters.cat !== 'all' && p.category !== filters.cat) return false;
      if (filters.max && Number(p.price) >= filters.max) return false;
      if (filters.inStock && KWStore.statusOf(p) !== 'available') return false;
      return true;
    });
    // Sold pieces always sink to the bottom so live stock leads.
    const rank = (p) => (KWStore.statusOf(p) === 'sold_out' ? 1 : 0);
    const by = {
      new: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      deal: (a, b) => savings(b) - savings(a) || a.price - b.price,
    }[filters.sort];
    return list.sort((a, b) => rank(a) - rank(b) || by(a, b));
  }

  const isFiltered = () => filters.q || filters.cat !== 'all' || filters.max || filters.inStock;

  function syncChips() {
    document.querySelectorAll('#chips .chip').forEach((c) => {
      let on = false;
      if (c.dataset.cat) on = filters.cat === c.dataset.cat;
      if (c.dataset.max) on = filters.max === Number(c.dataset.max);
      if (c.dataset.instock) on = filters.inStock;
      c.classList.toggle('is-active', on);
    });
  }

  function resetFilters() {
    Object.assign(filters, { q: '', cat: 'all', max: 0, inStock: false });
    $('search-input').value = '';
    $('search-box').classList.remove('has-value');
    syncChips();
    render();
  }

  function goToShop() {
    $('shop').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function initFilters() {
    const input = $('search-input');
    input.addEventListener('input', () => {
      filters.q = input.value;
      $('search-box').classList.toggle('has-value', Boolean(input.value));
      render();
    });
    $('search-clear').addEventListener('click', () => {
      input.value = '';
      filters.q = '';
      $('search-box').classList.remove('has-value');
      input.focus();
      render();
    });
    $('sort-select').addEventListener('change', (e) => {
      filters.sort = e.target.value;
      render();
    });
    $('chips').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      if (c.dataset.cat) filters.cat = c.dataset.cat;
      if (c.dataset.max) filters.max = filters.max === Number(c.dataset.max) ? 0 : Number(c.dataset.max);
      if (c.dataset.instock) filters.inStock = !filters.inStock;
      syncChips();
      render();
    });
    $('reset-filters').addEventListener('click', resetFilters);
    $('empty-reset').addEventListener('click', resetFilters);

    document.querySelectorAll('[data-jump-max]').forEach((b) =>
      b.addEventListener('click', () => {
        filters.max = Number(b.dataset.jumpMax);
        filters.sort = 'low';
        $('sort-select').value = 'low';
        syncChips();
        render();
        goToShop();
      })
    );
    document.querySelectorAll('[data-footer-cat]').forEach((a) =>
      a.addEventListener('click', () => {
        filters.cat = a.dataset.footerCat;
        syncChips();
        render();
      })
    );
  }

  // ---------- render ----------
  function cardHtml(p) {
    const status = KWStore.statusOf(p);
    const imgs = KWStore.productImages(p);
    const off = savings(p);
    const meta = [p.brand || p.category, p.size].filter(Boolean).join(' · ');
    return `
    <article class="card card--${status}">
      <button type="button" class="card" data-open="${esc(p.id)}" aria-label="View ${esc(p.name)}, ${LABEL[status]}">
        <div class="card__media">
          ${
            imgs[0]
              ? `<img src="${esc(imgs[0])}" alt="${esc(p.name)}" width="480" height="600" loading="lazy" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'card__ph',textContent:'KW'}))" />`
              : '<div class="card__ph">KW</div>'
          }
          <div class="card__badges">
            <span class="badge badge--${status}">${LABEL[status]}</span>
            ${off && status === 'available' ? `<span class="badge badge--deal">-${off}%</span>` : ''}
          </div>
          ${imgs.length > 1 ? `<span class="card__count">1/${imgs.length}</span>` : ''}
        </div>
        <div class="card__body">
          ${meta ? `<p class="card__meta">${esc(meta)}</p>` : ''}
          <h3 class="card__name">${esc(p.name)}</h3>
          <p class="card__price"><span>${money(p.price)}</span>${off ? `<s>${money(p.originalPrice)}</s>` : ''}</p>
        </div>
      </button>
    </article>`;
  }

  function renderStats() {
    const live = allProducts.filter((p) => KWStore.statusOf(p) === 'available');
    $('stat-live').textContent = live.length;
    $('stat-low').textContent = live.length ? money(Math.min(...live.map((p) => Number(p.price) || 0))).replace(/\.00$/, '') : '–';
    $('live-count').textContent = live.length
      ? `${live.length} piece${live.length === 1 ? '' : 's'} live now`
      : 'Kitchener-Waterloo streetwear';
    document.querySelectorAll('[data-count-max]').forEach((el) => {
      const max = Number(el.dataset.countMax);
      const n = live.filter((p) => !max || Number(p.price) < max).length;
      el.textContent = `${n} available`;
    });
  }

  function render() {
    const grid = $('product-grid');
    const empty = $('empty-state');
    const list = filtered();
    renderStats();
    $('sync-note').hidden = KWStore.getSyncStatus().ok;
    $('reset-filters').hidden = !isFiltered();

    // Before the first successful load we can't tell "empty" from "still
    // loading", so keep the skeletons instead of flashing "no drops".
    if (!hasLoadedOnce) return;

    $('result-count').textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;

    if (!list.length) {
      grid.hidden = true;
      grid.innerHTML = '';
      empty.hidden = false;
      const nothingAtAll = allProducts.length === 0;
      $('empty-title').textContent = nothingAtAll ? 'No drops live right now' : 'Nothing matches that';
      $('empty-sub').textContent = nothingAtAll
        ? 'Check back soon. New fits go up regularly.'
        : 'Try a different search or filter.';
      $('empty-reset').hidden = nothingAtAll;
      return;
    }
    empty.hidden = true;
    grid.hidden = false;
    grid.innerHTML = list.map(cardHtml).join('');
    reveal(grid.querySelectorAll('article.card'));
  }

  // ---------- product pop-up ----------
  const modal = $('product-modal');
  const pm = { product: null, i: 0, lastFocus: null };

  function claimHtml(p, status) {
    if (status === 'sold_out') {
      return `<div class="claim"><button type="button" class="btn btn--primary btn--block" data-close data-show-available>See what's available</button></div>`;
    }
    const { phone, snapchatHandle, tiktokHandle } = KWStore.CONTACT;
    const msg = `Hi! I want to claim "${p.name}" (${money(p.price)}) from KW's Cheapest.`;
    const label = status === 'reserved' ? 'Ask about this piece' : 'Contact to claim';
    return `<div class="claim">
      <p class="claim__label">${label}</p>
      <a class="btn btn--primary btn--block" data-claim="Text" href="${esc(smsHref(msg))}">${icon('sms')} Text to claim</a>
      <div class="claim__row">
        <a class="btn btn--ghost" data-claim="Call" href="tel:${esc(phone)}">${icon('phone')} Call</a>
        <a class="btn btn--ghost" data-claim="Snapchat" target="_blank" rel="noopener" href="https://www.snapchat.com/add/${esc(snapchatHandle)}" data-copy="${esc(msg)}">${icon('snapchat')} Snap</a>
        <a class="btn btn--ghost" data-claim="TikTok" target="_blank" rel="noopener" href="https://www.tiktok.com/@${esc(tiktokHandle)}" data-copy="${esc(msg)}">${icon('tiktok')} TikTok</a>
      </div>
      <p class="pm__small">First to confirm gets it. All sales final, see our <a href="terms/">Terms</a>.</p>
    </div>`;
  }

  function drawModal() {
    const p = pm.product;
    const status = KWStore.statusOf(p);
    const imgs = KWStore.productImages(p);
    const i = pm.i;
    const off = savings(p);
    const facts = [
      ['Designer', p.brand],
      ['Size', p.size],
      ['Condition', p.condition],
      ['Category', p.category],
    ].filter((f) => f[1]);

    modal.innerHTML = `
    <div class="pm" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
      <button class="icon-btn pm__close" data-close aria-label="Close">${icon('close')}</button>
      <div class="pm__gallery">
        <div class="pm__main">${imgs[i] ? `<img src="${esc(imgs[i])}" alt="${esc(p.name)}, photo ${i + 1}" />` : '<div class="card__ph">KW</div>'}</div>
        ${
          imgs.length > 1
            ? `<button class="pm__nav pm__nav--prev" data-step="-1" aria-label="Previous photo">${icon('left')}</button>
               <button class="pm__nav pm__nav--next" data-step="1" aria-label="Next photo">${icon('right')}</button>
               <div class="pm__thumbs">${imgs
                 .map((u, k) => `<button data-thumb="${k}" class="${k === i ? 'is-active' : ''}" aria-label="Photo ${k + 1}"><img src="${esc(u)}" alt="" loading="lazy" /></button>`)
                 .join('')}</div>`
            : ''
        }
      </div>
      <div class="pm__info">
        <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge badge--${status}">${LABEL[status]}</span></div>
        <h2>${esc(p.name)}</h2>
        <p class="pm__price"><span>${money(p.price)}</span>${off ? `<s>${money(p.originalPrice)}</s><em>SAVE ${off}%</em>` : ''}</p>
        ${status === 'reserved' ? '<p class="pm__notice pm__notice--reserved">Someone has claimed this piece. Message us to get in line in case it falls through.</p>' : ''}
        ${status === 'sold_out' ? '<p class="pm__notice pm__notice--sold_out">This piece has sold. Check out what is still available.</p>' : ''}
        ${facts.length ? `<div class="pm__facts">${facts.map((f) => `<div class="fact"><small>${f[0]}</small><b>${esc(f[1])}</b></div>`).join('')}</div>` : ''}
        ${p.description ? `<p class="pm__desc">${esc(p.description)}</p>` : ''}
        ${claimHtml(p, status)}
      </div>
    </div>`;
  }

  function openModal(id) {
    const p = allProducts.find((x) => x.id === id);
    if (!p) return;
    pm.product = p;
    pm.i = 0;
    track('Product View', { product: String(p.name).slice(0, 100), price: Number(p.price) || 0 });
    pm.lastFocus = document.activeElement;
    drawModal();
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    modal.querySelector('[data-close]').focus({ preventScroll: true });
    const u = new URL(location.href);
    u.searchParams.set('p', p.id);
    history.replaceState(null, '', u);
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    modal.innerHTML = '';
    document.body.classList.remove('no-scroll');
    const u = new URL(location.href);
    if (u.searchParams.has('p')) {
      u.searchParams.delete('p');
      history.replaceState(null, '', u);
    }
    pm.lastFocus?.focus?.({ preventScroll: true });
  }

  function step(n) {
    const total = KWStore.productImages(pm.product).length;
    if (total < 2) return;
    pm.i = (pm.i + n + total) % total;
    drawModal();
  }

  function initModal() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-open]');
      if (card) return openModal(card.dataset.open);
      if (modal.hidden) return;
      if (e.target.closest('[data-show-available]')) {
        closeModal();
        filters.inStock = true;
        syncChips();
        render();
        return goToShop();
      }
      if (e.target === modal || e.target.closest('[data-close]')) return closeModal();
      const claim = e.target.closest('[data-claim]');
      if (claim) track('Claim Click', { method: claim.dataset.claim, product: String(pm.product.name).slice(0, 100) });
      const copy = e.target.closest('[data-copy]');
      if (copy && navigator.clipboard) {
        navigator.clipboard.writeText(copy.dataset.copy).then(() => toast('Message copied, paste it in the chat'), () => {});
      }
      const s = e.target.closest('[data-step]');
      const t = e.target.closest('[data-thumb]');
      if (s) step(Number(s.dataset.step));
      else if (t) {
        pm.i = Number(t.dataset.thumb);
        drawModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
    let x0 = null;
    modal.addEventListener('touchstart', (e) => (x0 = e.target.closest('.pm__main') ? e.touches[0].clientX : null), { passive: true });
    modal.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  let deepLinkDone = false;
  function openFromUrl() {
    if (deepLinkDone || !hasLoadedOnce) return;
    deepLinkDone = true;
    const id = new URLSearchParams(location.search).get('p');
    if (id) openModal(id);
  }

  // ---------- boot ----------
  async function init() {
    initChrome();
    buildMarquee();
    initFilters();
    initModal();

    // Paint instantly from the local cache, then reconcile with the shared store.
    const cached = KWStore.getCachedProducts();
    if (cached) {
      allProducts = cached;
      hasLoadedOnce = true;
      render();
    }
    allProducts = await KWStore.getProducts();
    hasLoadedOnce = true;
    render();
    openFromUrl();

    // Pick up changes made from another device without a reload.
    setInterval(async () => {
      allProducts = await KWStore.getProducts();
      if (!modal.hidden && pm.product) {
        const fresh = allProducts.find((p) => p.id === pm.product.id);
        if (fresh) pm.product = fresh;
      }
      render();
    }, 20000);
  }

  init();
})();
