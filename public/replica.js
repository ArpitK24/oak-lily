/* Offline commerce adapter. Theme presentation and theme UI remain unchanged. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const money = n => '₹ ' + (n / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let catalogPromise = nativeFetch('/catalog.json').then(r => r.json());
  let cart;
  try { cart = JSON.parse(localStorage.getItem('oak-lily-cart') || '[]'); } catch { cart = []; }
  const save = () => { localStorage.setItem('oak-lily-cart', JSON.stringify(cart)); renderCart(); };
  const subtotal = () => cart.reduce((n, x) => n + x.price * x.quantity, 0);
  const bundleUnits = id => cart.filter(x => x.bundleId === id).reduce((n,x) => n + x.quantity, 0);
  const bundleRate = item => item.bundleId ? (bundleUnits(item.bundleId) >= 3 ? 15 : bundleUnits(item.bundleId) === 2 ? 10 : 0) : 0;
  const lineDiscount = item => Math.round(item.price * item.quantity * bundleRate(item) / 100);
  const discount = () => cart.reduce((n,x) => n + lineDiscount(x), 0);
  const total = () => subtotal() - discount();

  // One cart and one persistence path for ordinary products and bundle selections.
  window.OakLocalCart = {
    async addBundle(selections) {
      if (!Array.isArray(selections) || selections.some(x => !Number.isSafeInteger(x.quantity) || x.quantity < 1)) throw new Error('Please check bundle quantities.');
      const units = selections.reduce((n,x) => n + x.quantity, 0);
      if (units < 2) throw new Error('Choose at least 2 items for your bundle.');
      const products = await catalogPromise;
      const bundleId = crypto.randomUUID();
      const items = selections.map(selection => {
        const product = products.find(p => p.variants?.some(v => String(v.id) === String(selection.id)));
        const variant = product?.variants.find(v => String(v.id) === String(selection.id));
        if (!variant?.available || product.url === '/products/gift-card') throw new Error('A selected product is unavailable. Please review your bundle.');
        return {id:variant.id, title:product.title, variantTitle:variant.title, image:product.image, url:product.url, price:variant.price, quantity:selection.quantity, bundleId};
      });
      cart.push(...items);
      save();
      document.querySelector('cart-drawer')?.open();
      return {bundleId};
    }
  };

  const getPrice = p => {
    if (p.variants && p.variants.length > 0 && p.variants[0].price) return p.variants[0].price;
    if (p.price) {
      const n = typeof p.price === 'number' ? p.price : parseFloat(p.price);
      return Math.round(n * 100);
    }
    return 0;
  };

  const renderCard = p => `
    <li class="grid__item scroll-trigger animate--slide-in" data-cascade>
      <div class="card-wrapper product-card-wrapper underline-links-hover">
        <div class="card card--standard card--media" style="--ratio-percent: 100.0%;">
          <div class="card__inner color-scheme-1 gradient ratio" style="--ratio-percent: 100.0%;">
            <div class="card__media">
              <div class="media media--transparent media--hover-effect">
                <img src="${p.image}" alt="${escape(p.title)}" class="motion-reduce" loading="lazy" width="533" height="533">
              </div>
            </div>
            <div class="card__content">
              <div class="card__information">
                <h3 class="card__heading">
                  <a href="${p.url}" class="full-unstyled-link">${escape(p.title)}</a>
                </h3>
              </div>
            </div>
          </div>
          <div class="card__content">
            <div class="card__information">
              <h3 class="card__heading h5">
                <a href="${p.url}" class="full-unstyled-link">${escape(p.title)}</a>
              </h3>
              <div class="card-information">
                <div class="price">
                  <div class="price__container">
                    <div class="price__regular">
                      <span class="price-item price-item--regular">${money(getPrice(p))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="quick-add no-js-hidden" style="margin-top: 1.5rem;">
              <a href="${p.url}" class="quick-add__submit button button--full-width button--secondary" style="text-decoration:none;">Choose Options</a>
            </div>
          </div>
        </div>
      </div>
    </li>`;

  function initBuyNow() {
    document.querySelectorAll('.shopify-payment-button').forEach(container => {
      if (!container.querySelector('.shopify-payment-button__button--unbranded')) {
        container.innerHTML = `<button type="button" class="shopify-payment-button__button shopify-payment-button__button--unbranded" data-local-checkout>Buy it now</button>`;
      }
    });
  }

  function renderCart() {
    const drawer = document.querySelector('cart-drawer');
    const count = cart.reduce((n, x) => n + x.quantity, 0);
    let bubble = document.querySelector('#cart-icon-bubble .cart-count-bubble');
    if (!bubble && count) {
      bubble = document.createElement('div');
      bubble.className = 'cart-count-bubble';
      document.querySelector('#cart-icon-bubble')?.append(bubble);
    }
    if (bubble) {
      bubble.innerHTML = `<span aria-hidden="true">${count}</span><span class="visually-hidden">${count} items</span>`;
      bubble.hidden = !count;
    }
    if (!drawer) return;
    drawer.classList.toggle('is-empty', !count);
    if (!drawer.dataset.emptyMarkup) drawer.dataset.emptyMarkup = drawer.querySelector('.drawer__inner').innerHTML;
    if (!count) {
      drawer.querySelector('.drawer__inner').innerHTML = drawer.dataset.emptyMarkup;
      drawer.querySelectorAll('.drawer__close').forEach(b => b.onclick = () => drawer.close());
      return;
    }
    drawer.querySelector('.drawer__inner').innerHTML = `
      <div class="drawer__header">
        <h2 class="drawer__heading">Your cart</h2>
        <button class="drawer__close" type="button" aria-label="Close">${document.querySelector('svg.icon-close')?.outerHTML || '×'}</button>
      </div>
      <div class="drawer__contents" style="overflow:auto;flex:1">
        <table class="cart-items" role="table">
          <thead><tr><th colspan="2">Product</th><th>Total</th></tr></thead>
          <tbody>
            ${cart.map((x, i) => `
              <tr class="cart-item">
                <td class="cart-item__media"><a href="${x.url}"><img class="cart-item__image" src="${x.image}" alt="${escape(x.title)}" width="100" height="100"></a></td>
                <td class="cart-item__details">
                  <a class="cart-item__name h4 break" href="${x.url}">${escape(x.title)}</a>
                  <div class="product-option">${money(x.price)}</div>
                  <div class="product-option">${escape(x.variantTitle === 'Default Title' ? '' : x.variantTitle)}</div>
                  ${x.bundleId ? `<div class="product-option">Bundle · ${bundleRate(x)}% OFF</div>` : ''}
                  <div class="quantity" style="margin-top:12px;width:120px;min-height:36px">
                    <button class="quantity__button" data-quantity="${i}" data-delta="-1" aria-label="Decrease quantity">−</button>
                    <input class="quantity__input" aria-label="Quantity" type="number" min="1" value="${x.quantity}" data-cart-index="${i}">
                    <button class="quantity__button" data-quantity="${i}" data-delta="1" aria-label="Increase quantity">+</button>
                  </div>
                  <button data-remove="${i}" class="button button--tertiary" style="min-height:32px">Remove</button>
                </td>
                <td class="cart-item__totals right">${lineDiscount(x) ? `<span style="display:block;white-space:nowrap"><s style="display:block">${money(x.price * x.quantity)}</s>${money(x.price * x.quantity - lineDiscount(x))}</span>` : money(x.price * x.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="drawer__footer">
        ${discount() ? `<div class="totals"><span>Subtotal</span><span>${money(subtotal())}</span></div><div class="totals"><span>Bundle savings</span><span>−${money(discount())}</span></div>` : ''}
        <div class="totals"><h2 class="totals__total">Estimated total</h2><p class="totals__total-value">${money(total())}</p></div>
        <small class="tax-note caption-large rte">Taxes, discounts and <a href="/policies/shipping-policy">shipping</a> calculated at checkout.</small>
        <button class="cart__checkout-button button" data-local-checkout>Check out</button>
        <p role="status" class="replica-checkout-status" hidden>Checkout requires the original store’s Shopify service. No payment has been taken.</p>
      </div>`;
    drawer.querySelector('.drawer__close').onclick = () => drawer.close();
  }

  async function add(form) {
    const data = new FormData(form), id = String(data.get('id'));
    const products = await catalogPromise;
    let product = products.find(p => p.variants?.some(v => String(v.id) === id)) || products.find(p => p.url === location.pathname);
    if (!product) return;
    const variant = product.variants?.find(v => String(v.id) === id) || product.variants?.[0] || { id, title: 'Default', price: getPrice(product), available: true };
    if (!variant?.available) return;
    const quantity = Math.max(1, Number(data.get('quantity')) || 1);
    let item = cart.find(x => !x.bundleId && String(x.id) === String(variant.id));
    if (item) item.quantity += quantity;
    else cart.push({ id: variant.id, title: product.title, variantTitle: variant.title, image: product.image, url: product.url, price: variant.price || getPrice(product), quantity });
    save();
    document.querySelector('cart-drawer')?.open();
  }

  document.addEventListener('submit', async e => {
    const form = e.target;
    if (form.matches('form[action*="/cart/add"]')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      await add(form);
    } else if (form.matches('form[action*="/contact"]')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!form.reportValidity()) return;
      let p = form.querySelector('[role="status"]');
      if (!p) {
        p = document.createElement('p');
        p.setAttribute('role', 'status');
        form.append(p);
      }
      p.textContent = 'Email signup requires the original store’s service. Your email has not been sent.';
    }
  }, true);

  document.addEventListener('click', e => {
    const remove = e.target.closest('[data-remove]'), quantity = e.target.closest('[data-quantity]');
    if (remove) {
      cart.splice(Number(remove.dataset.remove), 1);
      save();
    }
    if (quantity) {
      const item = cart[Number(quantity.dataset.quantity)];
      item.quantity = Math.max(1, item.quantity + Number(quantity.dataset.delta));
      save();
    }
    if (e.target.closest('[data-local-checkout], [name="checkout"], .shopify-payment-button')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const status = document.querySelector('.replica-checkout-status');
      if (status) status.hidden = false;
    }
  }, true);

  document.addEventListener('change', async e => {
    if (e.target.matches('[data-cart-index]')) {
      const item = cart[Number(e.target.dataset.cartIndex)];
      item.quantity = Math.max(1, Math.floor(Number(e.target.value)) || 1);
      save();
    }
    if (e.target.closest('variant-selects')) {
      e.stopImmediatePropagation();
      const p = (await catalogPromise).find(p => p.url === location.pathname);
      if (!p) return;
      const labels = [...document.querySelectorAll('variant-selects fieldset')].map(f => f.querySelector('input:checked')?.value);
      const selected = p.variants?.find(v => v.options?.every((x, i) => x === labels[i])) || p.variants?.find(v => labels.includes(v.title));
      if (!selected) return;
      document.querySelectorAll('form[action*="/cart/add"] [name="id"]').forEach(input => input.value = selected.id);
      document.querySelectorAll('product-info .price-item--regular').forEach(el => el.textContent = money(selected.price));
      const button = document.querySelector('product-form button[type="submit"]');
      if (button) {
        button.disabled = !selected.available;
        button.querySelector('span').textContent = selected.available ? 'Add to cart' : 'Sold out';
      }
      history.replaceState({}, '', location.pathname + '?variant=' + selected.id);
    }
  }, true);

  const results = async q => (await catalogPromise).filter(p => q.trim().toLowerCase().split(/\s+/).every(w => p.title.toLowerCase().includes(w)));
  const resultItem = p => `<li class="predictive-search__list-item" role="option"><a href="${p.url}" class="predictive-search__item link link--text"><img class="predictive-search__image" src="${p.image}" alt="" width="50" height="50"><div class="predictive-search__item-content"><h3 class="predictive-search__item-heading h5">${escape(p.title)}</h3><span>${money(getPrice(p))}</span></div></a></li>`;

  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
    if (url.origin !== location.origin) return nativeFetch(input, init);
    if (url.pathname === '/search/suggest') {
      const items = await results(url.searchParams.get('q') || '');
      return new Response(
        `<div id="shopify-section-predictive-search"><div id="predictive-search-results" role="listbox"><h2 id="predictive-search-products" class="predictive-search__heading text-body caption-with-letter-spacing">Products</h2><ul class="predictive-search__results-list list-unstyled">${items.slice(0, 6).map(resultItem).join('')}</ul><div class="predictive-search__loading-state"></div><span data-predictive-search-live-region-count-value>${items.length} results</span></div></div>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    if (url.pathname === '/recommendations/products') {
      const products = await catalogPromise;
      const pid = url.searchParams.get('product_id');
      const items = products.filter(p => !p.variants?.some(v => String(v.id) === pid)).slice(0, 4);
      const cardsHtml = items.map(renderCard).join('');
      return new Response(
        `<div class="shopify-section section"><product-recommendations class="related-products page-width isolate scroll-trigger animate--slide-in product-recommendations--loaded"><h2 class="related-products__heading inline-richtext h2">You may also like</h2><ul class="grid product-grid grid--2-col-tablet-down grid--4-col-desktop" role="list">${cardsHtml}</ul></product-recommendations></div>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    if (url.pathname === '/cart.js') return Response.json({ items: cart, item_count: cart.reduce((n, x) => n + x.quantity, 0), total_price: total(), original_total_price: subtotal(), total_discount: discount() });
    return nativeFetch(input, init);
  };

  const start = async () => {
    renderCart();
    initBuyNow();
    if (location.pathname === '/search') {
      const q = new URLSearchParams(location.search).get('q') || '';
      if (q) {
        const products = await results(q);
        const searchTemplate = document.querySelector('.template-search');
        if (searchTemplate) {
          searchTemplate.classList.remove('template-search--empty');
          const input = searchTemplate.querySelector('input[name="q"]');
          if (input) input.value = q;
          let resultsDiv = searchTemplate.querySelector('.template-search__results');
          if (!resultsDiv) {
            resultsDiv = document.createElement('div');
            resultsDiv.className = 'template-search__results page-width';
            searchTemplate.append(resultsDiv);
          }
          resultsDiv.innerHTML = `<p class="element-margin" role="status" style="margin:20px 0;">${products.length} results found for “${escape(q)}”</p><div class="pagination-wrapper"><ul class="grid product-grid grid--2-col-tablet-down grid--4-col-desktop" role="list">${products.map(renderCard).join('')}</ul></div>`;
        } else {
          const main = document.querySelector('main');
          if (main) {
            main.innerHTML = `<div class="page-width" style="padding-top:40px;padding-bottom:60px"><h1 class="h2 center">Search results</h1><form action="/search" class="search" style="max-width:600px;margin:30px auto"><div class="field"><input class="field__input" name="q" value="${escape(q)}" placeholder="Search"><label class="field__label">Search</label><button class="search__button field__button" aria-label="Search">${document.querySelector('svg.icon-search')?.outerHTML || '→'}</button></div></form><p style="margin:20px 0;">${products.length} results found for “${escape(q)}”</p><ul class="grid product-grid grid--2-col-tablet-down grid--4-col-desktop" role="list">${products.map(renderCard).join('')}</ul></div>`;
          }
        }
      }
    }
    // Ensure header account icon fidelity across all pages
    const accountLink = document.querySelector('.header__icon--account');
    if (accountLink) {
      accountLink.classList.remove('small-hide');
      if (!accountLink.querySelector('#svgkp')) {
        accountLink.innerHTML = `<svg width="23" height="23" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg" id="svgkp" class="icon icon-account"><path d="M22.9129 12.935L13.7571 23.0474C13.5348 23.2929 13.1284 23.1084 13.1669 22.7794L14.0816 14.9731H10.6991C10.4034 14.9731 10.2484 14.6219 10.4478 14.4035L20.3133 3.59739C20.5589 3.32834 20.9984 3.58134 20.8891 3.92887L18.2354 12.3664H22.6607C22.9557 12.3664 23.1109 12.7163 22.9129 12.935Z" fill="#FEA203"/><path id="svgkp-path" fill-rule="evenodd" clip-rule="evenodd" d="M16.6079 5.35819C16.4805 5.1933 16.3421 5.03582 16.1932 4.8869C15.2702 3.96387 14.0183 3.44531 12.7129 3.44531C11.4075 3.44531 10.1556 3.96387 9.2326 4.8869C8.30957 5.80993 7.79102 7.06183 7.79102 8.36719C7.79102 9.67255 8.30957 10.9244 9.2326 11.8475C9.48368 12.0986 9.75909 12.3197 10.0533 12.5086L11.0235 11.4503C10.7335 11.2914 10.4649 11.0911 10.227 10.8531C9.56766 10.1938 9.19727 9.29959 9.19727 8.36719C9.19727 7.43479 9.56766 6.54057 10.227 5.88127C10.8863 5.22196 11.7805 4.85156 12.7129 4.85156C13.6453 4.85156 14.5395 5.22196 15.1988 5.88127C15.3636 6.04604 15.5103 6.22549 15.6377 6.41654L16.6079 5.35819ZM20.6413 18.6497L19.6746 19.7132C20.1676 20.4122 20.4473 21.2264 20.4473 22.0781V23.8359C20.4473 24.2243 20.7621 24.5391 21.1504 24.5391C21.5387 24.5391 21.8535 24.2243 21.8535 23.8359V22.0781C21.8535 20.7863 21.4016 19.6103 20.6413 18.6497ZM12.3111 17.5078H10.3026C7.27113 17.5078 4.97852 19.6394 4.97852 22.0781V23.8359C4.97852 24.2243 4.66372 24.5391 4.27539 24.5391C3.88707 24.5391 3.57227 24.2243 3.57227 23.8359V22.0781C3.57227 18.6922 6.67684 16.1016 10.3026 16.1016H12.4885L12.3111 17.5078Z" fill="currentColor" stroke="currentColor"/></svg><span class="visually-hidden">Log in</span>`;
      }
    }

    function initLoginModal() {
      let overlay = document.getElementById('oak-login-modal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'oak-login-modal-overlay';
        overlay.className = 'oak-login-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
          <div class="oak-login-modal">
            <button type="button" class="oak-modal-close" id="oak-modal-close-btn" aria-label="Close modal">
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="oak-modal-left">
              <div class="oak-modal-logo-wrapper">
                <img src="/assets/modal_oak_logo.png" alt="Oak &amp; Lily" class="oak-modal-logo" width="220">
              </div>
              <div class="oak-modal-left-content">
                <p class="oak-modal-tagline">LIVING SPACES FULL OF LIFE</p>
                <div class="oak-modal-card">
                  <div class="oak-modal-card-icon">
                    <img src="/assets/carousel_icon.svg" alt="star badge" width="24" height="24">
                  </div>
                  <div class="oak-modal-card-content">
                    <div class="oak-modal-card-title">Transparent</div>
                    <div class="oak-modal-card-desc">Honest from the inside out</div>
                  </div>
                </div>
                <div class="oak-modal-dots">
                  <button type="button" class="oak-modal-dot" data-slide="0" aria-label="Slide 1"></button>
                  <button type="button" class="oak-modal-dot active" data-slide="1" aria-label="Slide 2"></button>
                  <button type="button" class="oak-modal-dot" data-slide="2" aria-label="Slide 3"></button>
                </div>
              </div>
            </div>
            <div class="oak-modal-right">
              <h2 class="oak-modal-title" id="oak-modal-title">Login/Signup</h2>
              <span class="oak-modal-subtitle">to get exclusive Offer!</span>
              <form class="oak-modal-form" id="oak-modal-login-form" onsubmit="return false;">
                <div class="oak-modal-input-group">
                  <div class="oak-modal-dial-code">+91</div>
                  <div class="oak-modal-input-wrapper">
                    <input type="tel" class="oak-modal-phone-input" id="oak-modal-phone-input" placeholder="Enter Mobile Number" maxlength="10" autocomplete="tel" inputmode="numeric">
                  </div>
                </div>
                <button type="submit" class="oak-modal-submit-btn" id="oak-modal-submit-btn">Submit</button>
                <div class="oak-modal-feedback" id="oak-modal-feedback" style="display:none; font-size:12px; text-align:center; margin-bottom:8px;"></div>
                <div class="oak-modal-marketing-row">
                  <label class="oak-modal-checkbox-group">
                    <input type="checkbox" class="oak-modal-checkbox" id="oak-modal-checkbox" checked>
                    <span class="oak-modal-checkbox-label">Notify me with offers &amp; updates</span>
                  </label>
                  <button type="button" class="oak-modal-read-details" id="oak-modal-read-details">Read details</button>
                </div>
              </form>
              <footer class="oak-modal-footer">
                <span class="oak-modal-powered-by">Powered by</span>
                <img src="/assets/kwikpass_logo.png" alt="KwikPass" class="oak-modal-powered-img" height="18">
              </footer>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        const slides = [
          { title: 'Customer-first', desc: 'Putting you in the center' },
          { title: 'Transparent', desc: 'Honest from the inside out' },
          { title: 'Innovative', desc: 'Getting the absolute best for you' }
        ];
        let currentSlide = 1;
        let prevOverflow = '';

        const titleEl = overlay.querySelector('.oak-modal-card-title');
        const descEl = overlay.querySelector('.oak-modal-card-desc');
        const dots = overlay.querySelectorAll('.oak-modal-dot');

        function setSlide(idx) {
          currentSlide = (idx + slides.length) % slides.length;
          if (titleEl) titleEl.textContent = slides[currentSlide].title;
          if (descEl) descEl.textContent = slides[currentSlide].desc;
          dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
          });
        }

        dots.forEach(dot => {
          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            setSlide(parseInt(dot.getAttribute('data-slide'), 10));
          });
        });

        function openModal() {
          prevOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
          overlay.classList.add('active');
          overlay.setAttribute('aria-hidden', 'false');
          const input = overlay.querySelector('#oak-modal-phone-input');
          if (input) setTimeout(() => input.focus(), 150);
        }

        function closeModal() {
          overlay.classList.remove('active');
          overlay.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = prevOverflow || '';
        }

        overlay.querySelector('#oak-modal-close-btn')?.addEventListener('click', closeModal);

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) closeModal();
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
        });

        const phoneInput = overlay.querySelector('#oak-modal-phone-input');
        const submitBtn = overlay.querySelector('#oak-modal-submit-btn');
        const feedback = overlay.querySelector('#oak-modal-feedback');

        if (phoneInput) {
          phoneInput.addEventListener('input', () => {
            phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
            if (feedback) feedback.style.display = 'none';
          });
        }

        const form = overlay.querySelector('#oak-modal-login-form');
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!phoneInput) return;
            const val = phoneInput.value.trim();
            if (val.length < 10) {
              if (feedback) {
                feedback.style.display = 'block';
                feedback.style.color = '#d92d20';
                feedback.textContent = 'Please enter a valid 10-digit mobile number';
              }
              phoneInput.focus();
              return;
            }
            if (submitBtn) {
              submitBtn.disabled = true;
              const orig = submitBtn.textContent;
              submitBtn.textContent = 'Sending OTP...';
              setTimeout(() => {
                submitBtn.textContent = '✓ OTP Sent';
                if (feedback) {
                  feedback.style.display = 'block';
                  feedback.style.color = '#027a48';
                  feedback.textContent = `Verification code sent to +91 ${val.slice(0, 5)} ${val.slice(5)}`;
                }
                setTimeout(() => {
                  submitBtn.textContent = orig;
                  submitBtn.disabled = false;
                }, 3000);
              }, 600);
            }
          });
        }

        const readDetails = overlay.querySelector('#oak-modal-read-details');
        if (readDetails) {
          readDetails.addEventListener('click', (e) => {
            e.preventDefault();
            alert('KwikPass SSO: Seamless 1-click login and promotional discount notifications.');
          });
        }

        document.querySelectorAll('.header__icon--account').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
          });
        });
      } else {
        document.querySelectorAll('.header__icon--account').forEach(link => {
          if (!link.dataset.hasModalBind) {
            link.dataset.hasModalBind = 'true';
            link.addEventListener('click', (e) => {
              e.preventDefault();
              document.body.style.overflow = 'hidden';
              overlay.classList.add('active');
              overlay.setAttribute('aria-hidden', 'false');
              overlay.querySelector('#oak-modal-phone-input')?.focus();
            });
          }
        });
      }
    }

    // Initialize Login/Signup Promotional Modal
    initLoginModal();

    if (location.pathname === '/cart') document.querySelector('cart-drawer')?.open();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

// Captured testimonials keep the original styling, five-second rotation, and arrows.
document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.jdgm-testimonials-carousel');
  if (!root) return;
  const cards = [...root.querySelectorAll('.jdgm-card')];
  let index = 0;
  const show = n => {
    index = (n + cards.length) % cards.length;
    cards.forEach((c, i) => c.classList.toggle('active', i === index));
  };
  window.jdgmPreviousCard = () => show(index - 1);
  window.jdgmNextCard = () => show(index + 1);
  let timer = setInterval(window.jdgmNextCard, 5000);
  root.addEventListener('mouseenter', () => clearInterval(timer));
  root.addEventListener('mouseleave', () => {
    clearInterval(timer);
    timer = setInterval(window.jdgmNextCard, 5000);
  });
  show(0);
});
