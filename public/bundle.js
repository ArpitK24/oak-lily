/* Uses the existing OakLocalCart adapter; sessionStorage holds only an unfinished selection. */
(() => {
  const root = document.querySelector('[data-oak-bundle]');
  if (!root) return;

  const money = cents => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR'
  }).format(cents / 100);
  const escape = text => String(text ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const cards = [...root.querySelectorAll('[data-product]')];
  const products = new Map(cards.map(card => {
    const product = JSON.parse(card.querySelector('script').textContent);
    return [product.handle, product];
  }));
  const storageKey = 'oak-lily-bundle-draft-v1';
  const status = root.querySelector('[data-status]');
  const checkout = root.querySelector('[data-checkout]');
  let draft = [];
  let busy = false;
  const variantFor = item => products.get(item.handle)?.variants.find(v => v.id === item.id);
  const count = () => draft.reduce((sum, item) => sum + item.quantity, 0);

  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) draft = saved.filter(item =>
      Number.isSafeInteger(item.id) && Number.isSafeInteger(item.quantity) &&
      item.quantity > 0 && variantFor(item)?.available
    );
  } catch { /* A fresh selection remains usable if storage is unavailable. */ }

  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); } catch {}
  }

  function render() {
    const units = count();
    const rate = units >= 3 ? 15 : units === 2 ? 10 : 0;
    let subtotal = 0;
    let discount = 0;
    root.querySelector('[data-selected]').innerHTML = draft.map((item, index) => {
      const product = products.get(item.handle);
      const variant = variantFor(item);
      const lineTotal = variant.price * item.quantity;
      subtotal += lineTotal;
      // Round each line to paise, identically to the existing cart integration.
      discount += Math.round(lineTotal * rate / 100);
      return `<div class="oak-bundle-row">
        <a class="oak-bundle-row-image" href="${escape(product.url)}" tabindex="-1" aria-hidden="true"><img src="${escape(product.image)}" alt="" width="64" height="76"></a>
        <div class="oak-bundle-row-detail">
          <a class="oak-bundle-row-name" title="${escape(product.title)}" href="${escape(product.url)}">${escape(product.title)}</a>
          ${variant.title === 'Default Title' ? '' : `<p class="oak-bundle-row-variant">${escape(variant.title)}</p>`}
          <div class="oak-bundle-row-bottom">
          <p class="oak-bundle-row-price">${money(variant.price)} <span>each</span></p>
          <div class="oak-bundle-row-controls">
            <div class="oak-bundle-quantity">
              <button data-minus="${index}" aria-label="Decrease quantity of ${escape(product.title)}">−</button>
              <span aria-label="Quantity">${item.quantity}</span>
              <button data-plus="${index}" aria-label="Increase quantity of ${escape(product.title)}">+</button>
            </div>
            <button class="oak-bundle-remove" data-bundle-remove="${index}" aria-label="Remove ${escape(product.title)}">Remove</button>
          </div>
          </div>
        </div>
      </div>`;
    }).join('');
    root.querySelector('[data-tier]').textContent = units >= 3 ? '15% OFF unlocked' :
      units === 2 ? '10% OFF unlocked — add 1 more for 15%' :
      units === 1 ? 'Add 1 more item to unlock 10% OFF' : 'Add products to unlock your bundle';
    root.querySelector('[data-subtotal]').textContent = money(subtotal);
    root.querySelector('[data-discount]').textContent = '−' + money(discount);
    root.querySelector('[data-total]').textContent = money(subtotal - discount);
    // Presentation only: the existing count and rate drive every progress indicator.
    root.querySelector('[data-unit-count]').textContent = `${units} ${units === 1 ? 'item' : 'items'}`;
    root.querySelector('[data-empty]').hidden = units > 0;
    root.classList.toggle('has-selected-items', units > 0);
    root.querySelector('[data-discount-rate]').textContent = rate ? `(${rate}%)` : '';
    root.querySelector('[data-mobile-count]').textContent = `YOUR BUNDLE · ${units} ${units === 1 ? 'ITEM' : 'ITEMS'}`;
    root.querySelector('[data-mobile-tier]').textContent = rate ? `${rate}% OFF · ${money(subtotal - discount)}` :
      `Add ${2 - units} ${units === 1 ? 'item' : 'items'} to save 10%`;
    root.querySelectorAll('[data-milestone]').forEach(tier => {
      const threshold = Number(tier.dataset.milestone);
      const unlocked = units >= threshold;
      const active = threshold === 2 ? units === 2 : units >= 3;
      tier.classList.toggle('is-unlocked', unlocked);
      tier.classList.toggle('is-active', active);
      if (active) tier.setAttribute('aria-current', 'step');
      else tier.removeAttribute('aria-current');
      root.querySelector(`[data-tier-state="${threshold}"]`).textContent =
        active ? 'Active tier' : unlocked ? 'Unlocked' :
        `Add ${threshold - units} ${threshold - units === 1 ? 'item' : 'items'}`;
    });
    const progress = root.querySelector('[data-progress]');
    progress.setAttribute('aria-valuenow', Math.min(units, 3));
    progress.setAttribute('aria-valuetext', `${units} items selected. ${rate}% discount${units >= 3 ? '. Highest tier unlocked.' : '.'}`);
    progress.style.setProperty('--tier-progress', units >= 3 ? '100%' : '0%');
    root.querySelector('.oak-bundle-marker-two').classList.toggle('is-unlocked', units >= 2);
    root.querySelector('.oak-bundle-marker-three').classList.toggle('is-unlocked', units >= 3);

    const headerTier2 = root.querySelector('[data-header-tier="2"]');
    const headerTier3 = root.querySelector('[data-header-tier="3"]');
    const headerState2 = root.querySelector('[data-header-state="2"]');
    const headerState3 = root.querySelector('[data-header-state="3"]');
    const headerProgress = root.querySelector('[data-header-progress]');
    const headerMilestone2 = root.querySelector('[data-milestone-dot="2"]');
    const headerMilestone3 = root.querySelector('[data-milestone-dot="3"]');

    if (headerTier2 && headerState2) {
      const unlocked2 = units >= 2;
      const active2 = units === 2;
      headerTier2.classList.toggle('is-unlocked', unlocked2);
      headerTier2.classList.toggle('is-active', active2);
      headerState2.textContent = active2 ? 'Active tier' : unlocked2 ? 'Unlocked' :
        units === 1 ? 'Add 1 more item' : 'Add 2 items';
    }

    if (headerTier3 && headerState3) {
      const unlocked3 = units >= 3;
      const active3 = units >= 3;
      headerTier3.classList.toggle('is-unlocked', unlocked3);
      headerTier3.classList.toggle('is-active', active3);
      headerState3.textContent = active3 ? 'Active tier' :
        units === 2 ? 'Add 1 more item' :
        units === 1 ? 'Add 2 items' : 'Add 3 items';
    }

    if (headerProgress) {
      const fillPct = units >= 3 ? 100 : units === 2 ? 50 : units === 1 ? 25 : 0;
      headerProgress.style.setProperty('--header-progress', `${fillPct}%`);
      headerProgress.setAttribute('aria-valuenow', Math.min(units, 3));
      if (headerMilestone2) headerMilestone2.classList.toggle('is-unlocked', units >= 2);
      if (headerMilestone3) headerMilestone3.classList.toggle('is-unlocked', units >= 3);
    }

    checkout.disabled = busy || units < 2;

    cards.forEach(card => {
      const product = products.get(card.dataset.product);
      const variant = product.variants.find(v => String(v.id) === card.querySelector('select').value);
      const button = card.querySelector('[data-add]');
      button.disabled = busy || !variant?.available;
      const selected = draft.find(item => item.id === variant?.id);
      button.textContent = !variant?.available ? 'UNAVAILABLE' :
        selected ? 'ADD ANOTHER' : 'ADD TO BUNDLE';
      const productUnits = draft.filter(item => item.handle === product.handle).reduce((sum, item) => sum + item.quantity, 0);
      card.classList.toggle('is-selected', productUnits > 0);
      const badge = card.querySelector('[data-product-badge]');
      badge.hidden = productUnits === 0;
      badge.textContent = `✓ ${productUnits} IN YOUR BUNDLE`;
      card.querySelector('[data-price]').innerHTML = variant ? `${money(variant.price)} ${
        variant.compare_at_price > variant.price ? `<s>${money(variant.compare_at_price)}</s>` : ''
      }` : '';
    });
    persist();
  }

  root.addEventListener('change', event => {
    if (event.target.matches('[data-filter]')) {
      cards.forEach(card => {
        card.hidden = Boolean(event.target.value) && !card.dataset.categories.split(',').includes(event.target.value);
      });
    } else render();
  });

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (busy || !button || button === checkout) return;
    status.textContent = '';
    if (button.hasAttribute('data-add')) {
      const card = button.closest('[data-product]');
      const id = Number(card.querySelector('select').value);
      const product = products.get(card.dataset.product);
      if (!product.variants.find(v => v.id === id)?.available) return;
      const selected = draft.find(item => item.id === id);
      if (selected) selected.quantity++;
      else draft.push({ id, handle: product.handle, quantity: 1 });
    }
    if (button.hasAttribute('data-bundle-remove')) draft.splice(Number(button.dataset.bundleRemove), 1);
    if (button.hasAttribute('data-plus')) draft[Number(button.dataset.plus)].quantity++;
    if (button.hasAttribute('data-minus')) {
      const index = Number(button.dataset.minus);
      if (--draft[index].quantity === 0) draft.splice(index, 1);
    }
    // Keep keyboard focus on quantity controls after updating the summary.
    const focusAttribute = ['data-plus', 'data-minus', 'data-bundle-remove'].find(name => button.hasAttribute(name));
    const focusIndex = focusAttribute && button.getAttribute(focusAttribute);
    render();
    if (focusAttribute) {
      const control = root.querySelector(`[${focusAttribute}="${focusIndex}"]`) ||
        root.querySelector('[data-selected] button');
      if (control) control.focus({ preventScroll: true });
      else root.querySelector('[data-tier]').focus({ preventScroll: true });
    }
  });

  checkout.addEventListener('click', async () => {
    if (busy || count() < 2) return;
    busy = true;
    status.textContent = '';
    render();
    try {
      if (!window.OakLocalCart) throw new Error('The cart is still loading. Please try again.');
      await window.OakLocalCart.addBundle(draft);
      draft = [];
      status.textContent = 'Your bundle has been added to your cart.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      busy = false;
      render();
    }
  });

  // Avoid covering the mobile summary's own action with the review shortcut.
  const summaryObserver = new IntersectionObserver(([entry]) => {
    root.classList.toggle('is-reviewing', entry.isIntersecting);
  });
  summaryObserver.observe(root.querySelector('.oak-bundle-summary'));

  render();
})();
