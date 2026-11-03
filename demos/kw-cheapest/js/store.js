/**
 * KWStore: shared "database" for the public site and the admin panel.
 *
 * Cloud sync: talks to /api/products, a serverless function backed by
 * Upstash Redis (added via the Vercel dashboard's Storage tab). Once
 * that store is connected to the project, every device reads and writes
 * the same data. See README.md "Cloud sync setup" for the exact steps.
 *
 * Reading: if /api/products isn't reachable, the storefront shows the last
 * copy cached in this browser.
 *
 * Writing (admin only): the server checks the admin login (see lib/auth.js;
 * the password is never in this file). A write that fails throws an Error
 * with a readable message instead of saving to this device only.
 */
const KWStore = (function () {
  const PRODUCTS_KEY = 'kwcheapest_products_v1';
  const CATEGORIES = ['Clothes', 'Accessories'];
  const STATUSES = ['available', 'reserved', 'sold_out'];
  const STATUS_LABEL = { available: 'Available', reserved: 'Reserved', sold_out: 'Sold Out' };
  const CONDITIONS = ['New / Deadstock', 'Like New', 'Good', 'Fair'];
  // Designer names shown in the homepage banner and suggested in the admin
  // "Designer" field. Edit freely; this is just a list of names.
  const DESIGNERS = [
    'Essentials', 'Sp5der', 'Chrome Hearts', 'Stüssy', 'Corteiz', 'Trapstar', 'Nike', 'Jordan',
    'Supreme', 'Off-White', 'Moncler', 'Stone Island', 'Palace', 'Gallery Dept', 'Hellstar', 'Denim Tears',
  ];
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

  try {
    localStorage.removeItem('kwcheapest_admin_session_v1');
  } catch (e) {}

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

  // Writes report failure loudly. err.status is the HTTP status (401 = the
  // admin login expired or is missing), or 0 when the server was unreachable.
  async function write(url, options) {
    let res;
    try {
      res = await fetchWithTimeout(url, { credentials: 'same-origin', ...options }, 10000);
    } catch (e) {
      throw Object.assign(new Error(e.name === 'AbortError' ? 'The server took too long to answer.' : 'Could not reach the server.'), { status: 0 });
    }
    if (res.status === 204) return null;
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      /* no JSON body */
    }
    if (!res.ok) {
      const msg = (body && (body.error || body.detail)) || `Server responded ${res.status}`;
      throw Object.assign(new Error(msg), { status: res.status });
    }
    return body;
  }

  const json = (method, data) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

  async function addProduct(data) {
    return write(API_BASE, json('POST', data));
  }

  async function updateProduct(id, updates) {
    return write(`${API_BASE}/${encodeURIComponent(id)}`, json('PATCH', updates));
  }

  async function deleteProduct(id) {
    await write(`${API_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // --- admin login (checked by the server, see lib/auth.js) ---

  // { authenticated: bool, unavailable: bool }
  async function checkSession() {
    try {
      const res = await fetchWithTimeout('/api/session', { credentials: 'same-origin', cache: 'no-store' }, TIMEOUT_MS);
      const body = await res.json();
      return { authenticated: Boolean(body.authenticated), unavailable: false };
    } catch (e) {
      return { authenticated: false, unavailable: true };
    }
  }

  // { ok: true } or { ok: false, error }
  async function login(password) {
    try {
      const res = await fetchWithTimeout('/api/login', { credentials: 'same-origin', ...json('POST', { password }) }, 10000);
      let body = {};
      try {
        body = await res.json();
      } catch (e) {
        /* not JSON: the login API isn't deployed here */
      }
      if (res.ok && body.ok) return { ok: true };
      if (res.status === 404 || !body.error) return { ok: false, error: 'Login server not found. The admin only works on the deployed site.' };
      return { ok: false, error: body.error };
    } catch (e) {
      return { ok: false, error: 'Could not reach the server. Check your connection.' };
    }
  }

  async function logout() {
    try {
      await fetchWithTimeout('/api/logout', { credentials: 'same-origin', method: 'POST' }, TIMEOUT_MS);
    } catch (e) {
      /* the cookie expires on its own */
    }
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

  // Every photo of a product: the main image plus any extra gallery URLs.
  function productImages(p) {
    const list = [p.image, ...(Array.isArray(p.gallery) ? p.gallery : [])];
    return list.map((u) => String(u || '').trim()).filter(Boolean);
  }

  function statusOf(p) {
    return STATUSES.includes(p.status) ? p.status : 'available';
  }

  function formatPrice(n) {
    const num = Number(n) || 0;
    return '$' + num.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return {
    CATEGORIES,
    STATUSES,
    STATUS_LABEL,
    CONDITIONS,
    DESIGNERS,
    CONTACT,
    productImages,
    statusOf,
    getCachedProducts,
    getSyncStatus,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    checkSession,
    login,
    logout,
    escapeHtml,
    formatPrice,
  };
})();
