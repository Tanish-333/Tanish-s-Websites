/**
 * KWStore: shared "database" for the public site and the admin panel.
 *
 * Cloud sync: talks to /api/products, a serverless function backed by
 * Upstash Redis (added via the Vercel dashboard's Storage tab). Once
 * that store is connected to the project, every device reads and writes
 * the same data. See README.md "Cloud sync setup" for the exact steps.
 *
 * If /api/products isn't reachable (no Storage connected yet, or running
 * the site locally with a plain static server), KWStore falls back to
 * localStorage so the app still works, just without cross-device sync.
 */
const KWStore = (function () {
  const PRODUCTS_KEY = 'kwcheapest_products_v1';
  const ADMIN_SESSION_KEY = 'kwcheapest_admin_session_v1';
  const ADMIN_PASSWORD = 'Kareem_123';
  const CATEGORIES = ['Clothes', 'Accessories'];
  const API_BASE = '/api/products';

  const CONTACT = {
    phone: '+12265074421',
    phoneDisplay: '(226) 507-4421',
    snapchatHandle: 'kareemokla2023',
    tiktokHandle: 'kareemokla',
  };

  // --- localStorage fallback (used only when /api/products isn't reachable) ---
  function safeParse(raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function localGetProducts() {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    const parsed = raw ? safeParse(raw) : null;
    if (parsed) return parsed;
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
    return [];
  }

  function localSaveProducts(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  // Instant, synchronous read of whatever was last cached locally. Used to
  // paint the page immediately on load instead of showing a blank/empty
  // state while the network request to /api/products is still in flight.
  function getCachedProducts() {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    return raw ? safeParse(raw) || [] : null;
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  function localAddProduct(data) {
    const product = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      createdAt: Date.now(),
      status: 'available',
      ...data,
    };
    const products = localGetProducts();
    products.unshift(product);
    localSaveProducts(products);
    return product;
  }

  function localUpdateProduct(id, updates) {
    const products = localGetProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...updates };
    localSaveProducts(products);
    return products[idx];
  }

  function localDeleteProduct(id) {
    localSaveProducts(localGetProducts().filter((p) => p.id !== id));
  }

  function localToggleSoldOut(id) {
    const products = localGetProducts();
    const product = products.find((p) => p.id === id);
    if (!product) return null;
    product.status = product.status === 'sold_out' ? 'available' : 'sold_out';
    localSaveProducts(products);
    return product;
  }

  // --- Cloud API (falls back to local on any network/route failure, and
  // times out fast so a slow or unreachable API can't hang the page) ---
  const TIMEOUT_MS = 4000;

  // Falling back to localStorage used to be completely silent: the admin
  // panel would show "Product added" whether or not it actually reached
  // the shared store, which is exactly how products end up stuck on one
  // device with no error anywhere. Every API call now records whether it
  // actually reached the cloud store, and why if not, so the UI can warn
  // instead of lying about success.
  let syncOk = true;
  let syncDetail = '';

  function setSyncStatus(ok, detail) {
    syncOk = ok;
    syncDetail = detail || '';
  }

  function getSyncStatus() {
    return { ok: syncOk, detail: syncDetail };
  }

  async function apiRequest(url, options) {
    try {
      const res = await fetchWithTimeout(url, options, TIMEOUT_MS);
      if (res.ok) {
        // A 204 (e.g. DELETE) has no body by design; anything else with a
        // body that isn't valid JSON (an HTML error/redirect page from
        // some intermediary, say) is not a successful sync, so don't
        // report success for that case until the parse actually works.
        if (res.status === 204) {
          setSyncStatus(true);
          return { ok: true, data: null };
        }
        try {
          const data = await res.json();
          setSyncStatus(true);
          return { ok: true, data };
        } catch (e) {
          setSyncStatus(false, 'Server responded with an unexpected (non-JSON) body');
          return { ok: false, data: null };
        }
      }
      let detail = `Server responded ${res.status}`;
      try {
        const body = await res.json();
        detail = body.error || body.detail || detail;
      } catch (e) {
        /* body wasn't JSON, keep the status-based detail */
      }
      setSyncStatus(false, detail);
      return { ok: false, data: null };
    } catch (e) {
      setSyncStatus(false, e.name === 'AbortError' ? 'Request timed out' : e.message);
      return { ok: false, data: null };
    }
  }

  async function getProducts() {
    const { ok, data } = await apiRequest(API_BASE);
    if (ok && Array.isArray(data)) {
      localSaveProducts(data); // keep the local cache fresh for instant next-load
      return data;
    }
    return localGetProducts();
  }

  async function addProduct(data) {
    const { ok, data: product } = await apiRequest(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (ok) return product;
    return localAddProduct(data);
  }

  async function updateProduct(id, updates) {
    const { ok, data: product } = await apiRequest(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (ok) return product;
    return localUpdateProduct(id, updates);
  }

  async function deleteProduct(id) {
    const { ok } = await apiRequest(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (ok) return;
    localDeleteProduct(id);
  }

  async function toggleSoldOut(id) {
    const { ok, data: products } = await apiRequest(API_BASE);
    if (ok) {
      const product = products.find((p) => p.id === id);
      if (!product) return null;
      const nextStatus = product.status === 'sold_out' ? 'available' : 'sold_out';
      return await updateProduct(id, { status: nextStatus });
    }
    return localToggleSoldOut(id);
  }

  function isAdminLoggedIn() {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  }

  function login(password) {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  }

  function formatPrice(n) {
    const num = Number(n) || 0;
    return '$' + num.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return {
    CATEGORIES,
    CONTACT,
    getCachedProducts,
    getSyncStatus,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleSoldOut,
    isAdminLoggedIn,
    login,
    logout,
    escapeHtml,
    formatPrice,
  };
})();
