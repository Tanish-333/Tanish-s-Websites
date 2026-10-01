(function () {
  let allProducts = [];
  let searchTerm = '';
  let sortHighToLow = false;
  let hasLoadedOnce = false;

  const grid = document.getElementById('product-grid');
  const emptyState = document.getElementById('empty-state');
  const resultCount = document.getElementById('result-count');
  const searchInput = document.getElementById('search-input');
  const sortToggle = document.getElementById('sort-toggle');

  async function init() {
    document.getElementById('year').textContent = new Date().getFullYear();

    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      render();
    });

    sortToggle.addEventListener('click', () => {
      sortHighToLow = !sortHighToLow;
      updateSortButton();
      render();
    });

    setupContactModal();
    startHeroClock();

    // Paint instantly from whatever's cached locally, so there's nothing to
    // "flash empty" while the network request is still in flight.
    const cached = KWStore.getCachedProducts();
    if (cached) {
      allProducts = cached;
      hasLoadedOnce = true;
      render();
    }

    // Then reconcile with the shared store (may be the same data, may not).
    allProducts = await KWStore.getProducts();
    hasLoadedOnce = true;
    render();

    // Pick up products added/changed from another device without a manual reload.
    setInterval(async () => {
      allProducts = await KWStore.getProducts();
      render();
    }, 20000);
  }

  function startHeroClock() {
    const clock = document.getElementById('hero-clock');
    if (!clock) return;
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    tick();
    setInterval(tick, 1000);
  }

  function updateSortButton() {
    sortToggle.setAttribute('aria-pressed', String(sortHighToLow));
    if (sortHighToLow) {
      sortToggle.classList.add('bg-white', 'text-zinc-950', 'border-white', 'shadow-lg', 'shadow-black/40');
      sortToggle.classList.remove('bg-zinc-950', 'text-zinc-300');
    } else {
      sortToggle.classList.remove('bg-white', 'text-zinc-950', 'border-white', 'shadow-lg', 'shadow-black/40');
      sortToggle.classList.add('bg-zinc-950', 'text-zinc-300');
    }
  }

  function getFilteredSorted() {
    const term = searchTerm.trim().toLowerCase();
    let list = allProducts.filter((p) => !term || p.name.toLowerCase().includes(term));

    if (sortHighToLow) {
      list.sort((a, b) => b.price - a.price);
    } else {
      list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }

  function savingsPercent(p) {
    if (!p.originalPrice || p.originalPrice <= p.price) return null;
    return Math.round((1 - p.price / p.originalPrice) * 100);
  }

  function renderCard(p, index) {
    const soldOut = p.status === 'sold_out';
    const savings = savingsPercent(p);

    return `
      <div class="deal-card hud-panel card-in bg-zinc-900 rounded-md border border-zinc-800 overflow-hidden flex flex-col" style="animation-delay:${Math.min(index * 40, 300)}ms">
        <div class="relative aspect-[4/3] overflow-hidden bg-zinc-800">
          <img src="${KWStore.escapeHtml(p.image)}" alt="${KWStore.escapeHtml(p.name)}"
            class="w-full h-full object-cover ${soldOut ? 'grayscale' : ''}" loading="lazy"
            onerror="this.src='https://placehold.co/640x480/18181b/71717a?text=No+Image'" />
          <span class="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur text-zinc-300 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm border border-zinc-700">
            ${KWStore.escapeHtml(p.category)}
          </span>
          ${
            savings && !soldOut
              ? `<span class="absolute top-2.5 right-2.5 bg-white text-zinc-950 text-[10px] font-mono font-bold px-2 py-1 rounded-sm shadow-md shadow-black/40">-${savings}%</span>`
              : ''
          }
          ${soldOut ? `<div class="sold-out-ribbon"><span>SOLD OUT</span></div>` : ''}
        </div>

        <div class="p-4 flex flex-col flex-1">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-semibold text-zinc-100 leading-snug">${KWStore.escapeHtml(p.name)}</h3>
          </div>
          <p class="text-sm text-zinc-400 mt-1.5 line-clamp-2 flex-1">${KWStore.escapeHtml(p.description)}</p>

          <div class="flex items-center gap-2 mt-3 font-mono">
            <span class="text-xl font-bold text-zinc-50">${KWStore.formatPrice(p.price)}</span>
            ${
              p.originalPrice && p.originalPrice > p.price
                ? `<span class="text-sm text-zinc-500 line-through">${KWStore.formatPrice(p.originalPrice)}</span>`
                : ''
            }
            <span class="ml-auto text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-sm border border-zinc-700 ${
              soldOut ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-800 text-zinc-50'
            }">${soldOut ? 'Sold Out' : 'Available'}</span>
          </div>

          <button data-id="${p.id}" ${soldOut ? 'disabled' : ''}
            class="buy-btn mt-4 w-full font-semibold py-2.5 rounded-sm transition text-sm
            ${
              soldOut
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-md shadow-black/40'
            }">
            ${soldOut ? 'Sold Out' : 'Contact to Claim'}
          </button>
        </div>
      </div>`;
  }

  const emptyStateTitle = document.getElementById('empty-state-title');
  const emptyStateSubtitle = document.getElementById('empty-state-subtitle');

  function render() {
    const list = getFilteredSorted();
    const offlineNote = KWStore.getSyncStatus().ok ? '' : ' · showing saved copy, live sync unavailable';
    resultCount.textContent = `${list.length} item${list.length === 1 ? '' : 's'}${offlineNote}`;

    const heroCount = document.getElementById('hero-stat-count');
    if (heroCount) heroCount.textContent = allProducts.filter((p) => p.status !== 'sold_out').length;

    if (list.length === 0) {
      grid.innerHTML = '';
      grid.classList.add('hidden');

      // Before the first successful load, we don't yet know if the catalog
      // is really empty or we're just still waiting on the network, so
      // don't show "no drops" prematurely, just stay blank a moment.
      if (!hasLoadedOnce) {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
        return;
      }

      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');

      if (allProducts.length === 0) {
        emptyStateTitle.textContent = 'No drops live right now';
        emptyStateSubtitle.textContent = 'Check back soon. New fits go up regularly.';
      } else {
        emptyStateTitle.textContent = 'Nothing matches that search';
        emptyStateSubtitle.textContent = 'Try a different name or check back for the next drop.';
      }
      return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    grid.innerHTML = list.map((p, i) => renderCard(p, i)).join('');

    grid.querySelectorAll('.buy-btn').forEach((btn) => {
      btn.addEventListener('click', () => openContactModal(btn.dataset.id));
    });
  }

  // --- Contact modal ---
  const modal = document.getElementById('contact-modal');
  const modalTitle = document.getElementById('contact-modal-title');
  const contactLinkPhone = document.getElementById('contact-link-phone');
  const contactLinkSnapchat = document.getElementById('contact-link-snapchat');
  const contactLinkTiktok = document.getElementById('contact-link-tiktok');
  const contactPhoneDisplay = document.getElementById('contact-phone-display');

  function openContactModal(productId) {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    modalTitle.textContent = `Interested in "${product.name}"?`;

    const { phone, phoneDisplay, snapchatHandle, tiktokHandle } = KWStore.CONTACT;
    contactLinkPhone.href = `tel:${phone}`;
    contactLinkSnapchat.href = `https://www.snapchat.com/add/${snapchatHandle}`;
    contactLinkTiktok.href = `https://www.tiktok.com/@${tiktokHandle}`;
    contactPhoneDisplay.textContent = phoneDisplay;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeContactModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function setupContactModal() {
    document.getElementById('contact-modal-close').addEventListener('click', closeContactModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeContactModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeContactModal();
    });
  }

  init();
})();
