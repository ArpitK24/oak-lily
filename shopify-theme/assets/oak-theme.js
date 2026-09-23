(() => {
  const config = window.oakTheme || {};
  const routes = config.routes || {};
  const moneyFormat = config.moneyFormat || 'Rs. {{amount}}';

  const formatMoney = cents => {
    const value = (Number(cents || 0) / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return moneyFormat
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, value.replace(/,/g, 'X').replace('.', ',').replace(/X/g, '.'))
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(Number(cents || 0) / 100).toLocaleString('en-IN'))
      .replace(/\{\{\s*amount\s*\}\}/, value);
  };

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  };

  const drawer = () => document.querySelector('[data-cart-drawer]');
  const drawerBody = () => document.querySelector('[data-cart-drawer-body]');
  const drawerFooter = () => document.querySelector('[data-cart-drawer-footer]');

  const updateCartCount = count => {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.hidden = Number(count) <= 0;
    });
  };

  const lineImage = item => {
    if (!item.image) return '';
    return `<img src="${item.image}" alt="${item.product_title || item.title || ''}" loading="lazy">`;
  };

  const renderCart = async () => {
    const body = drawerBody();
    const footer = drawerFooter();
    if (!body || !footer) return;
    const cart = await fetchJson(`${routes.cart || '/cart'}.js`);
    updateCartCount(cart.item_count);
    document.querySelector('[data-cart-drawer-total]')?.replaceChildren(document.createTextNode(formatMoney(cart.total_price)));

    if (!cart.item_count) {
      footer.hidden = true;
      body.innerHTML = `
        <div class="oak-drawer-empty">
          <div>
            <h3>Your cart is empty</h3>
            <p class="oak-muted">Add a product to begin your Oak & Lily order.</p>
            <a class="oak-button" href="${routes.allProducts || '/collections/all'}">Continue shopping</a>
          </div>
        </div>`;
      return;
    }

    footer.hidden = false;
    body.innerHTML = `
      <div class="oak-drawer-items">
        ${cart.items.map((item, index) => `
          <article class="oak-drawer-item">
            <a href="${item.url}" aria-label="${item.product_title}">${lineImage(item)}</a>
            <div>
              <h3><a href="${item.url}">${item.product_title}</a></h3>
              ${item.variant_title && item.variant_title !== 'Default Title' ? `<p>${item.variant_title}</p>` : ''}
              <div class="oak-drawer-item__meta">
                <div class="oak-drawer-quantity" aria-label="Quantity for ${item.product_title}">
                  <button type="button" data-cart-line="${index + 1}" data-cart-quantity="${Math.max(0, item.quantity - 1)}" aria-label="Decrease quantity">-</button>
                  <span>${item.quantity}</span>
                  <button type="button" data-cart-line="${index + 1}" data-cart-quantity="${item.quantity + 1}" aria-label="Increase quantity">+</button>
                </div>
                <strong>${formatMoney(item.final_line_price)}</strong>
              </div>
              <button class="oak-link" type="button" data-cart-line="${index + 1}" data-cart-quantity="0">Remove</button>
            </div>
          </article>
        `).join('')}
      </div>`;
  };

  const openCart = async () => {
    const el = drawer();
    if (!el) return;
    await renderCart();
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('oak-cart-open');
    el.querySelector('[data-cart-close]')?.focus({ preventScroll: true });
  };

  const closeCart = () => {
    const el = drawer();
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('oak-cart-open');
  };

  const changeCartLine = async (line, quantity) => {
    await fetchJson(`${routes.cartChange || '/cart/change'}.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line: Number(line), quantity: Number(quantity) })
    });
    await renderCart();
  };

  const addProductForm = async form => {
    const formData = new FormData(form);
    await fetchJson(`${routes.cartAdd || '/cart/add'}.js`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    });
    await openCart();
  };

  document.addEventListener('click', async event => {
    const toggle = event.target.closest('[data-mobile-menu-toggle]');
    if (toggle) {
      const mobileMenu = document.querySelector('[data-mobile-menu]');
      if (!mobileMenu) return;
      mobileMenu.toggleAttribute('open');
      toggle.setAttribute('aria-expanded', mobileMenu.hasAttribute('open') ? 'true' : 'false');
      return;
    }

    const bundleFilter = event.target.closest('[data-bundle-filter]');
    if (bundleFilter) {
      const target = bundleFilter.dataset.bundleFilter;
      document.querySelectorAll('[data-bundle-filter]').forEach(button => {
        button.classList.toggle('is-active', button === bundleFilter);
      });
      document.querySelectorAll('[data-bundle-card]').forEach(card => {
        card.hidden = target !== 'all' && card.dataset.bundleCard !== target;
      });
      return;
    }

    const cartTrigger = event.target.closest('[data-cart-trigger]');
    if (cartTrigger) {
      event.preventDefault();
      await openCart();
      return;
    }

    if (event.target.closest('[data-cart-close]')) {
      closeCart();
      return;
    }

    const quantityButton = event.target.closest('[data-cart-line][data-cart-quantity]');
    if (quantityButton) {
      await changeCartLine(quantityButton.dataset.cartLine, quantityButton.dataset.cartQuantity);
    }
  });

  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!form.matches('form[action*="/cart/add"]')) return;
    event.preventDefault();
    try {
      await addProductForm(form);
    } catch (error) {
      form.submit();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeCart();
  });

  renderCart().catch(() => {});
})();
