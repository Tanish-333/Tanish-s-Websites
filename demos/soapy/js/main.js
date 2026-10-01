// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const siteNav = document.getElementById('site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ===========================================================================
   Order form
   ---------------------------------------------------------------------------
   SETUP: paste the Google Apps Script web app URL between the quotes below.
   Instructions for creating it are in google-apps-script/README.md.

   Until a URL is set, the form still works: it hands the customer a filled-in
   summary they can text or read out over the phone, so nothing is ever lost.
   =========================================================================== */
const ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwXnTXwUqiRwcQph3NYPe8D97zOUCg7AgR7nuPd5T9ufYj3R9LT0PNpi5RBIzvYRRg9/exec';

const SHOP_PHONE = '+12893897750';
const SHOP_PHONE_DISPLAY = '(289) 389-7750';

const orderModal = document.getElementById('order-modal');
const orderForm = document.getElementById('order-form');

if (orderModal && orderForm) {
  const orderPanel = orderModal.querySelector('.order-modal-panel');
  const orderError = document.getElementById('order-error');
  const orderSubmit = document.getElementById('order-submit');
  const orderResult = document.getElementById('order-result');
  const orderResultTitle = document.getElementById('order-result-title');
  const orderResultMsg = document.getElementById('order-result-msg');
  const orderResultActions = document.getElementById('order-result-actions');
  const orderSummary = document.getElementById('order-summary');
  const orderSmsLink = document.getElementById('order-sms-link');
  const orderCopy = document.getElementById('order-copy');
  const orderServiceSelect = document.getElementById('order-service');
  const orderAddressField = document.getElementById('order-address-field');
  const orderAddressInput = document.getElementById('order-address');
  const orderDate = document.getElementById('order-date');
  const methodRadios = orderForm.querySelectorAll('input[name="method"]');

  let lastFocused = null;

  // Don't let anyone book a pickup in the past.
  if (orderDate) orderDate.min = new Date().toISOString().slice(0, 10);

  // ----- Open / close -----
  function openOrderModal(trigger) {
    lastFocused = trigger || document.activeElement;
    orderModal.hidden = false;
    document.body.classList.add('order-open');

    const preset = trigger && trigger.getAttribute('data-order-service');
    if (preset && orderServiceSelect) {
      Array.from(orderServiceSelect.options).forEach((opt) => {
        if (opt.text.trim() === preset.trim()) orderServiceSelect.value = opt.value;
      });
    }

    const firstField = document.getElementById('order-name');
    if (firstField && !orderForm.hidden) firstField.focus();
  }

  function closeOrderModal() {
    orderModal.hidden = true;
    document.body.classList.remove('order-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.querySelectorAll('.js-order-open').forEach((btn) => {
    btn.addEventListener('click', () => openOrderModal(btn));
  });

  orderModal.querySelectorAll('[data-order-close]').forEach((el) => {
    el.addEventListener('click', closeOrderModal);
  });

  document.addEventListener('keydown', (e) => {
    if (orderModal.hidden) return;

    if (e.key === 'Escape') {
      closeOrderModal();
      return;
    }

    // Keep keyboard focus inside the dialog while it's open.
    if (e.key === 'Tab' && orderPanel) {
      const focusable = orderPanel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea'
      );
      const visible = Array.from(focusable).filter((el) => el.offsetParent !== null);
      if (!visible.length) return;

      const first = visible[0];
      const last = visible[visible.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // ----- Address only matters for pickups -----
  function syncAddressField() {
    const method = orderForm.querySelector('input[name="method"]:checked');
    const isPickup = method && method.value.indexOf('pickup') !== -1;
    if (orderAddressField) orderAddressField.hidden = !isPickup;
  }
  methodRadios.forEach((radio) => radio.addEventListener('change', syncAddressField));
  syncAddressField();

  // ----- Validation -----
  function showError(message, field) {
    orderError.textContent = message;
    orderError.hidden = false;
    if (field) {
      field.classList.add('invalid');
      field.focus();
    }
  }

  function clearErrors() {
    orderError.hidden = true;
    orderError.textContent = '';
    orderForm.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  }

  function validate(data) {
    const name = document.getElementById('order-name');
    const phone = document.getElementById('order-phone');
    const email = document.getElementById('order-email');

    if (!data.name) {
      return { message: 'Please enter your name so we know whose laundry it is.', field: name };
    }
    if (data.phone.replace(/\D/g, '').length < 10) {
      return { message: 'Please enter a phone number we can reach you at.', field: phone };
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { message: 'That email address doesn’t look right. Leave it blank if you’d rather not share it.', field: email };
    }
    if (data.method.indexOf('pickup') !== -1 && !data.address) {
      return { message: 'We need a pickup address, or choose "Drop off in store" instead.', field: orderAddressInput };
    }
    return null;
  }

  // ----- Build a readable summary of the order -----
  function buildSummary(data) {
    const lines = [
      'WASH & FOLD ORDER REQUEST',
      '',
      'Name: ' + data.name,
      'Phone: ' + data.phone
    ];
    if (data.email) lines.push('Email: ' + data.email);
    lines.push('Service: ' + data.service);
    lines.push('Amount: ' + data.size);
    lines.push('Method: ' + data.method);
    if (data.address) lines.push('Address: ' + data.address);
    if (data.date) lines.push('Preferred day: ' + data.date);
    if (data.time) lines.push('Preferred time: ' + data.time);
    if (data.notes) lines.push('Notes: ' + data.notes);
    return lines.join('\n');
  }

  // ----- Result panel -----
  function showResult(mode, data, summary) {
    orderForm.hidden = true;
    orderResult.hidden = false;

    if (mode === 'sent') {
      orderResultTitle.textContent = 'Order request sent';
      orderResultMsg.textContent =
        'Thanks ' + data.name.split(' ')[0] + ' — we’ve got your request and we’ll ' +
        'confirm the details by phone shortly.';
      orderResultActions.hidden = true;
    } else {
      orderResultTitle.textContent = 'One last step';
      orderResultMsg.textContent =
        'Send these details to the shop and we’ll confirm right away.';
      orderResultActions.hidden = false;
      orderSmsLink.href = 'sms:' + SHOP_PHONE + '?&body=' + encodeURIComponent(summary);
    }

    orderSummary.textContent = summary;
    orderResult.querySelector('.order-result-done').focus();
  }

  // ----- Submit -----
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const raw = new FormData(orderForm);
    const data = {
      name: (raw.get('name') || '').trim(),
      phone: (raw.get('phone') || '').trim(),
      email: (raw.get('email') || '').trim(),
      service: raw.get('service') || '',
      size: raw.get('size') || '',
      method: raw.get('method') || '',
      address: (raw.get('address') || '').trim(),
      date: raw.get('date') || '',
      time: raw.get('time') || '',
      notes: (raw.get('notes') || '').trim()
    };

    // Bots fill the hidden field. Pretend it worked, send nothing.
    if ((raw.get('company') || '').trim()) {
      showResult('sent', data, '');
      return;
    }

    if (data.method.indexOf('pickup') === -1) data.address = '';

    const problem = validate(data);
    if (problem) {
      showError(problem.message, problem.field);
      return;
    }

    const summary = buildSummary(data);

    if (!ORDER_ENDPOINT) {
      showResult('handoff', data, summary);
      return;
    }

    orderSubmit.disabled = true;
    orderSubmit.textContent = 'Sending…';

    try {
      // Apps Script doesn't return CORS headers we can read, so this is a
      // fire-and-forget POST. text/plain keeps it a simple request (no preflight).
      await fetch(ORDER_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ submittedAt: new Date().toISOString() }, data))
      });
      showResult('sent', data, summary);
    } catch (err) {
      // Never dead-end the customer: hand them the phone instead.
      showResult('handoff', data, summary);
    } finally {
      orderSubmit.disabled = false;
      orderSubmit.textContent = 'Send Order Request';
    }
  });

  // ----- Copy to clipboard -----
  if (orderCopy) {
    orderCopy.addEventListener('click', async () => {
      const text = orderSummary.textContent;
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      orderCopy.textContent = 'Copied';
      setTimeout(() => { orderCopy.textContent = 'Copy details'; }, 2000);
    });
  }
}
