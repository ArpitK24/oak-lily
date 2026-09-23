/* Offline commerce adapter. Theme presentation and theme UI remain unchanged. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const money = n => '₹ ' + (n / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let catalog = [];
  let catalogPromise = nativeFetch('/catalog.json').then(r => r.json()).then(data => {
    catalog = Array.isArray(data) ? data : [];
    renderCart();
    return catalog;
  });
  let cart;
  try { cart = JSON.parse(localStorage.getItem('oak-lily-cart') || '[]'); } catch { cart = []; }
  const save = () => { localStorage.setItem('oak-lily-cart', JSON.stringify(cart)); renderCart(); };
  const subtotal = () => cart.reduce((n, x) => n + x.price * x.quantity, 0);
  const bundleUnits = id => cart.filter(x => x.bundleId === id).reduce((n,x) => n + x.quantity, 0);
  const bundleRate = item => item.bundleId ? (bundleUnits(item.bundleId) >= 3 ? 15 : bundleUnits(item.bundleId) === 2 ? 10 : 0) : 0;
  const lineDiscount = item => Math.round(item.price * item.quantity * bundleRate(item) / 100);
  const bundleDiscount = () => cart.reduce((n,x) => n + lineDiscount(x), 0);
  const discount = () => bundleDiscount() + rewardDiscount();
  const total = () => subtotal() - discount();
  const usableVariant = product => product?.variants?.find(v => v?.available && Number(v.price) > 0) || product?.variants?.find(v => Number(v.price) > 0);
  const recommendationItems = () => {
    const cartIds = new Set(cart.map(item => String(item.id)));
    return catalog
      .filter(product => product?.url !== '/products/gift-card' && product?.image)
      .map(product => ({ product, variant: usableVariant(product) }))
      .filter(({ variant }) => variant?.available && !cartIds.has(String(variant.id)))
      .slice(0, 8);
  };
  const couponNames = ['LILY10', 'OAKWELCOME', 'HOMEJOY15', 'LINENLOVE', 'TABLETREAT', 'BEDBONUS', 'FRESHFIVE', 'OAKTREAT', 'LILYFRESH'];
  const bonusCouponNames = ['BUNDLEPLUS', 'SHIPJOY', 'HOMEEXTRA', 'LINENBOOST', 'TABLEBONUS', 'BEDTREAT', 'SOFTSAVE', 'OAKEXTRA', 'LILYPLUS'];
  const cartUnits = () => cart.reduce((sum, item) => sum + (item.rewardGiftId ? 0 : item.quantity), 0);
  const stableHash = value => {
    let hash = 0;
    String(value).split('').forEach(char => {
      hash = ((hash << 5) - hash) + char.charCodeAt(0);
      hash |= 0;
    });
    return Math.abs(hash);
  };
  const productCodeSeed = item => String(item.title || item.variantTitle || item.id || 'ITEM')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 5) || 'ITEM';
  const couponContext = item => {
    if (item?.bundleId) return 'bundle';
    if (cart.length > 1 || cartUnits() > item.quantity) return 'combo';
    return 'single';
  };
  const couponFor = (item, index, type = 'primary') => {
    const context = couponContext(item);
    const sourceNames = type === 'bonus' ? bonusCouponNames : couponNames;
    const seed = stableHash(`${item?.id}-${item?.title}-${context}-${type}`);
    const prefix = context === 'bundle' ? 'BND' : context === 'combo' ? 'MIX' : 'OAK';
    const name = sourceNames[seed % sourceNames.length].replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const code = `${prefix}${productCodeSeed(item)}${name.slice(0, 4)}${(seed % 89) + 10}`;
    const amount = context === 'bundle'
      ? (type === 'bonus' ? 'Bundle bonus ₹75 off' : 'Bundle reward 12% off')
      : context === 'combo'
        ? (type === 'bonus' ? 'Combo bonus 7% off' : 'Combo reward ₹60 off')
        : (type === 'bonus' ? 'Product bonus 5% off' : 'Product reward ₹50 off');
    return { code, amount, label: `${code} · ${amount}` };
  };
  const rewardConfigStorageKey = 'oak-lily-reward-configs';
  localStorage.removeItem('oak-lily-active-reward-campaign');
  const moneyShort = n => '₹' + Math.round(n / 100).toLocaleString('en-IN');
  const defaultRewardConfigs = [
    {
      id: 'festival-value-saver',
      name: 'Festival Value Saver',
      description: 'Seasonal value reward for larger home orders.',
      type: 'percentage_discount',
      rewardLabel: '10% OFF',
      couponCode: 'FESTIVE10',
      discountValue: 10,
      minCartValue: 109900,
      minQuantity: 0,
      minUniqueItems: 0,
      requiredProducts: '',
      requiredCategories: '',
      bundleOnly: false,
      priority: 10,
      active: true,
      startAt: '',
      endAt: '',
      delivery: 'Delivery in 3-7 days',
      adminNote: 'Default editable reward.'
    },
    {
      id: 'napkin-quantity-gift',
      name: 'Napkin Quantity Gift',
      description: 'Free napkins when shoppers add enough products.',
      type: 'free_gift',
      rewardLabel: 'Free Napkins',
      couponCode: 'NAPKINGIFT',
      freeProductTitle: 'Oak & Lily Table Napkins Gift',
      minCartValue: 0,
      minQuantity: 3,
      minUniqueItems: 0,
      requiredProducts: '',
      requiredCategories: '',
      bundleOnly: false,
      priority: 20,
      active: true,
      startAt: '',
      endAt: '',
      delivery: 'Delivery in 4-7 days',
      adminNote: 'Default editable reward.'
    },
    {
      id: 'mixed-home-edit-voucher',
      name: 'Mixed Home Edit Voucher',
      description: 'Voucher for mixing different home products.',
      type: 'gift_voucher',
      rewardLabel: '₹100 Voucher',
      couponCode: 'HOMEDIT100',
      discountValue: 10000,
      minCartValue: 0,
      minQuantity: 0,
      minUniqueItems: 3,
      requiredProducts: '',
      requiredCategories: '',
      bundleOnly: false,
      priority: 30,
      active: true,
      startAt: '',
      endAt: '',
      delivery: 'Delivery in 5-8 days',
      adminNote: 'Default editable reward.'
    },
    {
      id: 'bundle-styling-gift',
      name: 'Bundle Styling Gift',
      description: 'Special gift for bundle selections.',
      type: 'bundle_reward',
      rewardLabel: 'Free Styling Gift',
      couponCode: 'BUNDLESTYLE',
      freeProductTitle: 'Oak & Lily Styling Gift',
      minCartValue: 0,
      minQuantity: 2,
      minUniqueItems: 0,
      requiredProducts: '',
      requiredCategories: '',
      bundleOnly: true,
      priority: 40,
      active: true,
      startAt: '',
      endAt: '',
      delivery: 'Delivery in 3-6 days',
      adminNote: 'Default editable reward.'
    }
  ];
  const cloneReward = reward => JSON.parse(JSON.stringify(reward));
  const rewardNow = () => Date.now();
  const loadRewardConfigs = () => {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(rewardConfigStorageKey) || 'null'); } catch { stored = null; }
    if (!Array.isArray(stored)) {
      localStorage.setItem(rewardConfigStorageKey, '[]');
      return [];
    }
    return stored.map(normalizeRewardConfig).sort((a, b) => Number(a.priority) - Number(b.priority));
  };
  const saveRewardConfigs = configs => {
    localStorage.setItem(rewardConfigStorageKey, JSON.stringify(configs.map(normalizeRewardConfig)));
    renderCart();
  };
  const normalizeRewardConfig = reward => ({
    id: reward.id || `reward-${Date.now()}`,
    name: reward.name || 'Untitled reward',
    description: reward.description || '',
    type: reward.type || 'coupon_code',
    rewardLabel: reward.rewardLabel || reward.couponCode || 'Reward',
    couponCode: reward.couponCode || '',
    discountValue: Number(reward.discountValue) || 0,
    freeProductTitle: reward.freeProductTitle || '',
    minCartValue: Number(reward.minCartValue) || 0,
    minQuantity: Number(reward.minQuantity) || 0,
    minUniqueItems: Number(reward.minUniqueItems) || 0,
    requiredProducts: reward.requiredProducts || '',
    requiredCategories: reward.requiredCategories || '',
    bundleOnly: Boolean(reward.bundleOnly),
    priority: Number(reward.priority) || 100,
    active: reward.active !== false,
    startAt: reward.startAt || '',
    endAt: reward.endAt || '',
    delivery: reward.delivery || 'Delivery in 3-7 days',
    adminNote: reward.adminNote || ''
  });
  const splitKeywords = value => String(value || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  const dateInRange = reward => {
    const now = rewardNow();
    const start = reward.startAt ? new Date(reward.startAt).getTime() : 0;
    const end = reward.endAt ? new Date(reward.endAt).getTime() : Infinity;
    return (!start || start <= now) && (!Number.isFinite(end) || end >= now);
  };
  const activeRewardConfigs = () => loadRewardConfigs()
    .filter(reward => reward.active && dateInRange(reward))
    .sort((a, b) => Number(a.priority) - Number(b.priority));
  const cartText = () => cart.map(item => `${item.title || ''} ${item.variantTitle || ''} ${item.url || ''}`).join(' ').toLowerCase();
  const rewardableProductCount = () => cart.filter(item => !item.rewardGiftId).length;
  const keywordMatch = keywords => !keywords.length || keywords.some(keyword => cartText().includes(keyword));
  const metricForReward = reward => {
    if (reward.minCartValue > 0) return { key: 'value', current: subtotal() - bundleDiscount(), target: reward.minCartValue };
    if (reward.minUniqueItems > 0) return { key: 'products', current: rewardableProductCount(), target: reward.minUniqueItems };
    return { key: 'items', current: cartUnits(), target: reward.minQuantity || 1 };
  };
  const rewardRequirementText = reward => {
    const rules = [];
    if (reward.minCartValue > 0) rules.push(`cart value ${moneyShort(reward.minCartValue)}`);
    if (reward.minQuantity > 0) rules.push(`${reward.minQuantity} item${reward.minQuantity === 1 ? '' : 's'}`);
    if (reward.minUniqueItems > 0) rules.push(`${reward.minUniqueItems} different product${reward.minUniqueItems === 1 ? '' : 's'}`);
    if (splitKeywords(reward.requiredProducts).length) rules.push('matching products');
    if (splitKeywords(reward.requiredCategories).length) rules.push('matching categories');
    if (reward.bundleOnly) rules.push('bundle items');
    return rules.length ? rules.join(', ') : 'any cart item';
  };
  const rewardEligibility = reward => {
    if (!cart.length) return { eligible: false, reason: 'Add products to unlock rewards.' };
    if (reward.bundleOnly && !cart.some(item => item.bundleId)) return { eligible: false, reason: 'Add a bundle item to unlock this reward.' };
    if (!keywordMatch(splitKeywords(reward.requiredProducts))) return { eligible: false, reason: 'Add a required product to unlock this reward.' };
    if (!keywordMatch(splitKeywords(reward.requiredCategories))) return { eligible: false, reason: 'Add a required category item to unlock this reward.' };
    const checks = [
      { ok: subtotal() - bundleDiscount() >= reward.minCartValue, missing: Math.max(0, reward.minCartValue - (subtotal() - bundleDiscount())), type: 'value' },
      { ok: cartUnits() >= reward.minQuantity, missing: Math.max(0, reward.minQuantity - cartUnits()), type: 'items' },
      { ok: rewardableProductCount() >= reward.minUniqueItems, missing: Math.max(0, reward.minUniqueItems - rewardableProductCount()), type: 'products' }
    ];
    const failed = checks.find(check => !check.ok);
    if (!failed) return { eligible: true, reason: `${reward.rewardLabel} unlocked.` };
    if (failed.type === 'value') return { eligible: false, reason: `Add ${moneyShort(failed.missing)} more to unlock ${reward.rewardLabel}.` };
    if (failed.type === 'products') return { eligible: false, reason: `Add ${failed.missing} more product${failed.missing === 1 ? '' : 's'} to unlock ${reward.rewardLabel}.` };
    return { eligible: false, reason: `Add ${failed.missing} more item${failed.missing === 1 ? '' : 's'} to unlock ${reward.rewardLabel}.` };
  };
  const rewardIcon = reward => {
    if (reward.type === 'percentage_discount') return '%';
    if (reward.type === 'fixed_discount' || reward.type === 'gift_voucher') return '₹';
    if (reward.type === 'free_product' || reward.type === 'free_gift') return 'G';
    if (reward.type === 'bundle_reward') return 'B';
    return 'C';
  };
  const rewardAmountText = reward => {
    if (reward.type === 'percentage_discount') return `${reward.discountValue}% discount`;
    if (reward.type === 'fixed_discount') return `${moneyShort(reward.discountValue)} discount`;
    if (reward.type === 'gift_voucher') return `${moneyShort(reward.discountValue)} voucher`;
    if (reward.type === 'free_product') return reward.freeProductTitle || 'Free product';
    if (reward.type === 'free_gift') return reward.freeProductTitle || 'Free gift';
    if (reward.type === 'bundle_reward') return reward.rewardLabel || 'Bundle reward';
    return reward.couponCode || reward.rewardLabel || 'Coupon';
  };
  const rewardDiscount = () => activeRewardConfigs().reduce((sum, reward) => {
    const eligibility = rewardEligibility(reward);
    if (!eligibility.eligible) return sum;
    if (reward.type === 'percentage_discount') return sum + Math.round((subtotal() - bundleDiscount()) * reward.discountValue / 100);
    if (reward.type === 'fixed_discount' || reward.type === 'gift_voucher') return sum + Math.min(reward.discountValue, Math.max(0, subtotal() - bundleDiscount() - sum));
    return sum;
  }, 0);
  const rewardGiftInCart = reward => cart.some(item => item.rewardGiftId === reward.id);
  const giftImage = () => catalog.find(product => product.image && product.url !== '/products/gift-card')?.image || '/assets/logo-oak-lily.png';
  const rewardState = () => {
    if (!cart.length) return null;
    const rewards = activeRewardConfigs().map(reward => {
      const metric = metricForReward(reward);
      const eligibility = rewardEligibility(reward);
      return {
        ...reward,
        metric,
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        progress: Math.min(100, Math.max(0, metric.current / Math.max(1, metric.target) * 100))
      };
    });
    if (!rewards.length) return null;
    const next = rewards.find(reward => !reward.eligible);
    const unlocked = rewards.filter(reward => reward.eligible);
    const last = rewards[rewards.length - 1];
    const message = next ? next.reason : 'All offers unlocked!';
    const help = next
      ? `${next.description || next.name}. Requirement: ${rewardRequirementText(next)}.`
      : `${unlocked.length} reward${unlocked.length === 1 ? '' : 's'} unlocked from active admin campaigns.`;
    const statusReward = next || last;
    const status = statusReward?.endAt
      ? `Campaign ends ${new Date(statusReward.endAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
      : 'Admin-managed campaign';
    return { rewards, next, unlocked, message, help, status, delivery: statusReward?.delivery || 'Delivery in 3-7 days' };
  };
  const rewardMarkup = state => {
    if (!state) return '';
    const visible = state.rewards.slice(0, 4);
    const progress = stagedRewardProgress(visible);
    return `
      <section class="oak-cart-rewards" aria-label="Cart rewards progress">
        <p class="oak-cart-reward-delivery">${escape(state.delivery)}</p>
        <h3>${escape(state.message)}</h3>
        <p class="oak-cart-reward-help">${escape(state.help)}</p>
        <div class="oak-cart-progress-track" style="--cart-progress:${progress}%;--reward-columns:${visible.length || 1}">
          ${visible.map(reward => `<i class="${reward.eligible ? 'is-unlocked' : ''}" title="${escape(reward.rewardLabel)}">${escape(rewardIcon(reward))}</i>`).join('')}
        </div>
        <div class="oak-cart-progress-labels" style="--reward-columns:${visible.length || 1}">
          ${visible.map(reward => `<span class="${reward.eligible ? 'is-unlocked' : ''}"><strong>${escape(formatRewardTarget(reward))}</strong><small>${escape(reward.rewardLabel)}</small></span>`).join('')}
        </div>
        ${state.unlocked.filter(reward => ['free_product', 'free_gift', 'bundle_reward'].includes(reward.type) && !rewardGiftInCart(reward)).map(reward => `
          <button type="button" class="oak-cart-claim-gift" data-claim-reward-gift="${escape(reward.id)}">Add ${escape(reward.freeProductTitle || reward.rewardLabel)}</button>
        `).join('')}
        <p class="oak-cart-reward-status">${escape(state.status)}</p>
      </section>`;
  };
  const stagedRewardProgress = rewards => {
    if (!rewards.length) return 0;
    if (rewards.length === 1) return rewards[0].progress;
    const sameMetric = rewards.every(reward => reward.metric.key === rewards[0].metric.key);
    if (sameMetric) {
      const current = rewards[0].metric.current;
      const lastTarget = Math.max(...rewards.map(reward => reward.metric.target), 1);
      return Math.min(100, Math.max(0, current / lastTarget * 100));
    }
    const segment = 100 / rewards.length;
    const firstLocked = rewards.findIndex(reward => !reward.eligible);
    if (firstLocked === -1) return 100;
    if (firstLocked === 0) return Math.min(segment, rewards[0].progress / 100 * segment);
    const previousComplete = firstLocked * segment;
    const currentPartial = rewards[firstLocked].progress / 100 * segment;
    return Math.min(100, Math.max(0, previousComplete + currentPartial));
  };
  const formatRewardTarget = reward => {
    if (reward.metric.key === 'value') return moneyShort(reward.metric.target);
    if (reward.metric.key === 'products') return `${reward.metric.target} products`;
    return `${reward.metric.target} items`;
  };
  const rewardCoupons = state => (state?.rewards || [])
    .filter(reward => reward.couponCode && reward.eligible)
    .map(reward => ({
      code: reward.couponCode,
      amount: `${reward.name} · ${rewardAmountText(reward)}`,
      label: `${reward.couponCode} · ${rewardAmountText(reward)}`,
      rewardId: reward.id
    }));
  const addRewardGift = rewardId => {
    const reward = activeRewardConfigs().find(item => item.id === rewardId);
    if (!reward || rewardGiftInCart(reward)) return;
    const title = reward.freeProductTitle || reward.rewardLabel || 'Reward gift';
    cart.push({
      id: `reward-${reward.id}`,
      title,
      variantTitle: `${reward.name} reward`,
      image: giftImage(),
      url: '#',
      price: 0,
      quantity: 1,
      rewardGiftId: reward.id
    });
    save();
  };
  function pruneRewardGifts() {
    const validRewardIds = new Set(activeRewardConfigs()
      .filter(reward => rewardEligibility(reward).eligible)
      .map(reward => reward.id));
    const nextCart = cart.filter(item => !item.rewardGiftId || validRewardIds.has(item.rewardGiftId));
    if (nextCart.length !== cart.length) {
      cart = nextCart;
      localStorage.setItem('oak-lily-cart', JSON.stringify(cart));
    }
  }
  window.OakRewardManagement = {
    defaults: () => defaultRewardConfigs.map(cloneReward),
    list: loadRewardConfigs,
    save: saveRewardConfigs,
    active: activeRewardConfigs,
    state: rewardState,
    reset() {
      saveRewardConfigs(defaultRewardConfigs.map(cloneReward));
    }
  };
  const updateCouponLayout = section => {
    if (!section) return;
    const openPanels = [...section.querySelectorAll('.oak-cart-coupon-panel:not([hidden])')];
    const extra = openPanels.reduce((sum, panel) => sum + panel.scrollHeight, 0);
    section.style.setProperty('--coupon-extra-height', `${extra}px`);
    section.classList.toggle('has-open-coupon', extra > 0);
  };
  const updateCartFooterSpace = drawer => {
    const root = drawer || document.querySelector('cart-drawer');
    if (!root) return;
    const footer = root.querySelector('.oak-cart-footer');
    const contents = root.querySelector('.oak-cart-contents');
    if (!footer || !contents) return;
    const footerHeight = Math.ceil(footer.getBoundingClientRect().height);
    contents.style.setProperty('--cart-footer-space', `${footerHeight + 120}px`);
  };
  window.OakRewardCampaigns = {
    reset() {
      localStorage.removeItem(rewardStorageKey);
      renderCart();
    },
    state: rewardState
  };

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

  async function addVariantId(id, quantity = 1) {
    const products = await catalogPromise;
    let product = products.find(p => p.variants?.some(v => String(v.id) === String(id)));
    if (!product) return;
    const variant = product.variants?.find(v => String(v.id) === String(id));
    if (!variant?.available) return;
    let item = cart.find(x => !x.bundleId && String(x.id) === String(variant.id));
    if (item) item.quantity += quantity;
    else cart.push({ id: variant.id, title: product.title, variantTitle: variant.title, image: product.image, url: product.url, price: variant.price || getPrice(product), quantity });
    save();
    document.querySelector('cart-drawer')?.open();
  }

  function renderCart() {
    pruneRewardGifts();
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
    const rewards = rewardState();
    if (!count) {
      drawer.querySelector('.drawer__inner').innerHTML = `
        <div class="drawer__header oak-cart-header">
          <h2 class="drawer__heading">YOUR CART <span>(0)</span></h2>
          <button class="drawer__close" type="button" aria-label="Close">${document.querySelector('svg.icon-close')?.outerHTML || '×'}</button>
        </div>
        <div class="drawer__contents drawer__inner-empty oak-cart-contents oak-cart-contents--empty">
          <div class="oak-cart-empty-state">
            <h3>Your cart is empty</h3>
            <p>Add a product to begin shopping.</p>
            <a href="/collections/all">Continue shopping</a>
          </div>
        </div>`;
      drawer.querySelector('.drawer__close').onclick = () => drawer.close();
      return;
    }
    const saved = discount();
    const bundleSaved = bundleDiscount();
    const rewardSaved = rewardDiscount();
    const adminCoupons = rewardCoupons(rewards);
    const availableCouponCount = adminCoupons.length;
    const showRewardCoupons = adminCoupons.length > 0;
    const recommended = recommendationItems();
    drawer.querySelector('.drawer__inner').innerHTML = `
      <div class="drawer__header oak-cart-header">
        <h2 class="drawer__heading">YOUR CART <span>(${count})</span></h2>
        <button class="drawer__close" type="button" aria-label="Close">${document.querySelector('svg.icon-close')?.outerHTML || '×'}</button>
      </div>
      <div class="drawer__contents oak-cart-contents">
        ${rewardMarkup(rewards)}
        <div class="oak-cart-items">
          ${cart.map((x, i) => {
            const lineTotal = x.price * x.quantity;
            const lineSavings = lineDiscount(x);
            const lineFinal = lineTotal - lineSavings;
            return `<article class="oak-cart-item">
              <a class="oak-cart-item__media" href="${x.url || '#'}"><img class="cart-item__image" src="${x.image}" alt="${escape(x.title)}" width="72" height="72"></a>
              <div class="oak-cart-item__body">
                <div class="oak-cart-item__top">
                  <a class="oak-cart-item__name" href="${x.url || '#'}">${escape(x.title)}</a>
                  <div class="oak-cart-item__price">
                    <strong>${money(lineFinal)}</strong>
                    ${lineSavings ? `<s>${money(lineTotal)}</s>` : ''}
                  </div>
                </div>
                ${x.variantTitle && x.variantTitle !== 'Default Title' ? `<p class="oak-cart-item__variant">${escape(x.variantTitle)}</p>` : ''}
                ${x.bundleId ? `<p class="oak-cart-item__offer">Bundle · ${bundleRate(x)}% OFF</p>` : ''}
                ${x.rewardGiftId ? `<p class="oak-cart-item__offer">Admin reward gift · Free</p>` : ''}
                <div class="oak-cart-item__actions">
                  <button data-remove="${i}" class="oak-cart-remove" aria-label="Remove ${escape(x.title)}">
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h4l.6 1.2H14v1.4H2V3.2h3.4L6 2Zm-2.4 4h8.8l-.7 8H4.3l-.7-8Zm2 1.4.3 5.2h1.1l-.2-5.2H5.6Zm3 0-.2 5.2h1.1l.3-5.2H8.6Z" fill="currentColor"/></svg>
                  </button>
                  <div class="oak-cart-quantity">
                    <button data-quantity="${i}" data-delta="-1" aria-label="Decrease quantity">−</button>
                    <input aria-label="Quantity" type="number" min="1" value="${x.quantity}" data-cart-index="${i}">
                    <button data-quantity="${i}" data-delta="1" aria-label="Increase quantity">+</button>
                  </div>
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>
        ${showRewardCoupons ? `<section class="oak-cart-coupons" aria-label="Available coupons">
          <button type="button" data-coupon-toggle="available" aria-expanded="false" aria-controls="oak-cart-coupon-panel-available"><span>✽</span> ${availableCouponCount} ${availableCouponCount === 1 ? 'coupon' : 'coupons'} available <b>›</b></button>
          <div class="oak-cart-coupon-panel" id="oak-cart-coupon-panel-available" hidden>
            <div class="oak-cart-coupon-panel__header">
              <h3>Available coupons</h3>
              <button type="button" data-coupon-close="available" aria-label="Close available coupon details">×</button>
            </div>
            <div class="oak-cart-coupon-list">
              ${adminCoupons.map(coupon => `<article class="oak-cart-coupon-card">
                <strong>${escape(coupon.code)}</strong>
                <span>${escape(coupon.amount)}</span>
                <button type="button" data-apply-reward-coupon="${escape(coupon.rewardId)}">Apply</button>
              </article>`).join('')}
            </div>
            <p class="oak-cart-coupon-status" role="status" data-coupon-status="available"></p>
          </div>
        </section>` : ''}
        <section class="oak-cart-added">
          <div class="oak-cart-added__header">
            <h3>People also added</h3>
            <div class="oak-cart-added__nav" aria-label="Browse recommended products">
              <button type="button" data-recommendation-slide="-1" aria-label="Previous recommended products">‹</button>
              <button type="button" data-recommendation-slide="1" aria-label="Next recommended products">›</button>
            </div>
          </div>
          <div class="oak-cart-recommendations-wrap">
            <div class="oak-cart-recommendations" aria-label="Recommended products" tabindex="0">
              ${recommended.map(({ product, variant }) => `
                <article class="oak-cart-recommendation">
                  <img src="${product.image}" alt="${escape(product.title)}" width="84" height="84" loading="eager">
                  <div class="oak-cart-recommendation__info">
                    <h4>${escape(product.title)}</h4>
                    <p>${money(variant.price || getPrice(product))}</p>
                  </div>
                  <button type="button" data-add-recommendation="${variant.id}" aria-label="Add ${escape(product.title)} to cart"><span aria-hidden="true">+</span> Add</button>
                </article>
              `).join('')}
            </div>
          </div>
        </section>
      </div>
      <div class="drawer__footer oak-cart-footer">
        ${rewards ? `<div class="oak-cart-unlock">Unlock more discounts on Checkout</div>` : ''}
        <button type="button" class="oak-cart-total-row" data-total-toggle aria-expanded="false" aria-controls="oak-cart-total-details">
          <h2 class="totals__total">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v10H2V3Zm2 2v2h8V5H4Zm0 4v1.5h5V9H4Z" fill="currentColor"/></svg>
            Estimated total
          </h2>
          <p class="totals__total-value">${saved ? `<s>${money(subtotal())}</s> ` : ''}${money(total())}<span aria-hidden="true">⌃</span></p>
        </button>
        <div class="oak-cart-total-details" id="oak-cart-total-details" hidden>
          <div><span>Subtotal</span><strong>${money(subtotal())}</strong></div>
          ${showRewardCoupons ? `<div><span>Reward coupons</span><strong>${availableCouponCount} available</strong></div>` : ''}
          <div><span>Bundle savings</span><strong>${bundleSaved ? `-${money(bundleSaved)}` : money(0)}</strong></div>
          ${rewards ? `<div><span>Reward savings</span><strong>${rewardSaved ? `-${money(rewardSaved)}` : money(0)}</strong></div>` : ''}
          <div><span>Estimated total</span><strong>${money(total())}</strong></div>
        </div>
        ${saved ? `<p class="oak-cart-saved">You saved ${money(saved)}!</p>` : ''}
        <small class="tax-note caption-large rte">Taxes, discounts and <a href="/policies/shipping-policy">shipping</a> calculated at checkout.</small>
        <button class="cart__checkout-button button" data-local-checkout>Proceed</button>
        <p class="oak-cart-powered">Powered by <strong>shopflo</strong></p>
        <p role="status" class="replica-checkout-status" hidden>Checkout requires the original store’s Shopify service. No payment has been taken.</p>
      </div>`;
    drawer.querySelector('.drawer__close').onclick = () => drawer.close();
    requestAnimationFrame(() => updateCartFooterSpace(drawer));
  }

  async function add(form) {
    const data = new FormData(form), id = String(data.get('id'));
    const quantity = Math.max(1, Number(data.get('quantity')) || 1);
    await addVariantId(id, quantity);
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
    const couponToggle = e.target.closest('[data-coupon-toggle]');
    const couponClose = e.target.closest('[data-coupon-close]');
    const applyCoupon = e.target.closest('[data-apply-coupon]');
    const applyRewardCoupon = e.target.closest('[data-apply-reward-coupon]');
    const claimRewardGift = e.target.closest('[data-claim-reward-gift]');
    const totalToggle = e.target.closest('[data-total-toggle]');
    const addRecommendation = e.target.closest('[data-add-recommendation]');
    const recommendationSlide = e.target.closest('[data-recommendation-slide]');
    if (addRecommendation) {
      e.preventDefault();
      e.stopImmediatePropagation();
      addVariantId(addRecommendation.dataset.addRecommendation);
      return;
    }
    if (recommendationSlide) {
      e.preventDefault();
      const rail = recommendationSlide.closest('.oak-cart-added')?.querySelector('.oak-cart-recommendations');
      const firstCard = rail?.querySelector('.oak-cart-recommendation');
      if (rail && firstCard) {
        const gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 14;
        const direction = Number(recommendationSlide.dataset.recommendationSlide) || 1;
        rail.scrollBy({ left: direction * (firstCard.getBoundingClientRect().width + gap), behavior: 'smooth' });
      }
      return;
    }
    if (claimRewardGift) {
      e.preventDefault();
      addRewardGift(claimRewardGift.dataset.claimRewardGift);
      return;
    }
    if (couponToggle) {
      const target = couponToggle.dataset.couponToggle;
      const panel = document.getElementById(`oak-cart-coupon-panel-${target}`);
      if (panel) {
        const open = panel.hidden;
        panel.hidden = !open;
        couponToggle.setAttribute('aria-expanded', String(open));
        updateCouponLayout(couponToggle.closest('.oak-cart-coupons'));
        updateCartFooterSpace();
        if (open) panel.scrollIntoView({ block: 'nearest' });
      }
      return;
    }
    if (couponClose) {
      const target = couponClose.dataset.couponClose;
      const panel = document.getElementById(`oak-cart-coupon-panel-${target}`);
      if (panel) panel.hidden = true;
      document.querySelector(`[data-coupon-toggle="${target}"]`)?.setAttribute('aria-expanded', 'false');
      updateCouponLayout(couponClose.closest('.oak-cart-coupons'));
      updateCartFooterSpace();
      return;
    }
    if (applyCoupon) {
      const index = Number(applyCoupon.dataset.applyCoupon);
      const kind = applyCoupon.dataset.couponKind === 'bonus' ? 'bonus' : 'primary';
      const coupon = cart[index] && couponFor(cart[index], index, kind);
      const status = applyCoupon.closest('.oak-cart-coupon-panel')?.querySelector('[data-coupon-status]');
      if (status && coupon) status.textContent = `${coupon.code} is ready to use at checkout.`;
      return;
    }
    if (applyRewardCoupon) {
      const reward = activeRewardConfigs().find(item => item.id === applyRewardCoupon.dataset.applyRewardCoupon);
      const status = applyRewardCoupon.closest('.oak-cart-coupon-panel')?.querySelector('[data-coupon-status]');
      if (status && reward) status.textContent = `${reward.couponCode} from ${reward.name} is ready to use at checkout.`;
      return;
    }
    if (totalToggle) {
      const details = document.getElementById('oak-cart-total-details');
      if (details) {
        const open = details.hidden;
        details.hidden = !open;
        totalToggle.setAttribute('aria-expanded', String(open));
        totalToggle.classList.toggle('is-open', open);
        updateCartFooterSpace();
      }
    }
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

  const toDatetimeInput = value => value ? String(value).slice(0, 16) : '';
  const permittedRewardTypes = ['percentage_discount', 'fixed_discount', 'coupon_code', 'free_product', 'free_gift', 'gift_voucher', 'bundle_reward', 'festival_offer'];
  const couponRewardTypes = ['coupon_code', 'percentage_discount', 'fixed_discount', 'gift_voucher', 'festival_offer'];
  const valueRewardTypes = ['percentage_discount', 'fixed_discount', 'gift_voucher'];
  const giftRewardTypes = ['free_product', 'free_gift', 'bundle_reward'];
  const rewardFormHtml = reward => {
    const r = normalizeRewardConfig(reward || {});
    return `
      <form class="oak-admin-form" data-reward-admin-form novalidate>
        <div class="oak-admin-form-errors" data-admin-form-errors hidden></div>
        <input type="hidden" name="id" value="${escape(r.id.startsWith('reward-') && !reward ? '' : r.id)}">
        <label>Name<input name="name" required minlength="3" maxlength="80" value="${escape(r.name)}"><span data-field-error="name"></span></label>
        <label>Description<textarea name="description" rows="3" maxlength="240">${escape(r.description)}</textarea><span data-field-error="description"></span></label>
        <label>Reward type
          <select name="type">
            ${[
              ['percentage_discount', 'Percentage discount'],
              ['fixed_discount', 'Fixed discount'],
              ['coupon_code', 'Coupon code'],
              ['free_product', 'Free product'],
              ['free_gift', 'Free gift'],
              ['gift_voucher', 'Gift voucher'],
              ['bundle_reward', 'Bundle reward'],
              ['festival_offer', 'Festival/event offer']
            ].map(([value, label]) => `<option value="${value}" ${r.type === value ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
          <span data-field-error="type"></span>
        </label>
        <label>Reward label<input name="rewardLabel" maxlength="60" value="${escape(r.rewardLabel)}" placeholder="10% OFF, Free Napkins"><span data-field-error="rewardLabel"></span></label>
        <label data-reward-field="coupon">Coupon code<input name="couponCode" maxlength="24" value="${escape(r.couponCode)}" placeholder="FESTIVE10"><span data-field-error="couponCode"></span></label>
        <label data-reward-field="value">Discount/voucher value<input name="discountValue" type="number" min="0" step="1" max="50000" value="${r.type === 'percentage_discount' ? r.discountValue : Math.round(r.discountValue / 100)}"><small data-value-help>Use percent for percentage discounts; rupees for fixed/voucher rewards.</small><span data-field-error="discountValue"></span></label>
        <label data-reward-field="gift">Free product/gift name<input name="freeProductTitle" maxlength="80" value="${escape(r.freeProductTitle)}" placeholder="Oak & Lily Table Napkins Gift"><span data-field-error="freeProductTitle"></span></label>
        <label data-reward-field="eligibility">Minimum cart value (₹)<input name="minCartValue" type="number" min="0" max="1000000" step="1" value="${Math.round(r.minCartValue / 100)}"><span data-field-error="minCartValue"></span></label>
        <label data-reward-field="eligibility">Minimum quantity<input name="minQuantity" type="number" min="0" max="999" step="1" value="${r.minQuantity}"><span data-field-error="minQuantity"></span></label>
        <label data-reward-field="eligibility">Minimum different products<input name="minUniqueItems" type="number" min="0" max="200" step="1" value="${r.minUniqueItems}"><span data-field-error="minUniqueItems"></span></label>
        <label data-reward-field="eligibility">Required product keywords<input name="requiredProducts" maxlength="160" value="${escape(r.requiredProducts)}" placeholder="bedsheet, napkin"><span data-field-error="requiredProducts"></span></label>
        <label data-reward-field="eligibility">Required category keywords<input name="requiredCategories" maxlength="160" value="${escape(r.requiredCategories)}" placeholder="kitchen, table"><span data-field-error="requiredCategories"></span></label>
        <label data-reward-field="settings">Priority<input name="priority" type="number" min="1" max="9999" step="1" value="${r.priority}"><span data-field-error="priority"></span></label>
        <label data-reward-field="schedule">Start date<input name="startAt" type="datetime-local" value="${escape(toDatetimeInput(r.startAt))}"><span data-field-error="startAt"></span></label>
        <label data-reward-field="schedule">End date<input name="endAt" type="datetime-local" value="${escape(toDatetimeInput(r.endAt))}"><span data-field-error="endAt"></span></label>
        <label>Delivery text<input name="delivery" maxlength="60" value="${escape(r.delivery)}"><span data-field-error="delivery"></span></label>
        <label class="oak-admin-check" data-reward-field="eligibility"><input name="bundleOnly" type="checkbox" ${r.bundleOnly ? 'checked' : ''}> <span>Requires bundle items<small>Only carts containing bundle-added items can unlock this reward.</small></span></label>
        <label class="oak-admin-check"><input name="active" type="checkbox" ${r.active ? 'checked' : ''}> <span>Active<small>Only active rewards are shown or applied in the Cart Drawer.</small></span></label>
        <div class="oak-admin-actions">
          <button type="submit">${reward ? 'Update reward' : 'Create reward'}</button>
          <button type="button" data-admin-clear-form>Clear</button>
        </div>
      </form>`;
  };
  const rewardFromForm = form => {
    const data = new FormData(form);
    const type = data.get('type') || 'coupon_code';
    const rupeeValue = Math.max(0, Number(data.get('discountValue')) || 0);
    const usesCoupon = couponRewardTypes.includes(type);
    const usesValue = valueRewardTypes.includes(type);
    const usesGift = giftRewardTypes.includes(type);
    return normalizeRewardConfig({
      id: data.get('id') || `reward-${Date.now()}`,
      name: data.get('name'),
      description: data.get('description'),
      type,
      rewardLabel: data.get('rewardLabel'),
      couponCode: usesCoupon ? formValue(data, 'couponCode').toUpperCase() : '',
      discountValue: usesValue ? (type === 'percentage_discount' ? rupeeValue : Math.round(rupeeValue * 100)) : 0,
      freeProductTitle: usesGift ? data.get('freeProductTitle') : '',
      minCartValue: Math.round((Number(data.get('minCartValue')) || 0) * 100),
      minQuantity: Number(data.get('minQuantity')) || 0,
      minUniqueItems: Number(data.get('minUniqueItems')) || 0,
      requiredProducts: data.get('requiredProducts'),
      requiredCategories: data.get('requiredCategories'),
      priority: Number(data.get('priority')) || 100,
      startAt: data.get('startAt'),
      endAt: data.get('endAt'),
      delivery: data.get('delivery'),
      bundleOnly: data.has('bundleOnly'),
      active: data.has('active')
    });
  };
  const formValue = (data, name) => String(data.get(name) || '').trim();
  const isIntegerString = value => /^\d+$/.test(String(value));
  const addValidationError = (errors, field, message) => {
    errors.push({ field, message });
  };
  const validateKeywords = (errors, field, value) => {
    if (!value) return;
    if (value.length > 160) addValidationError(errors, field, 'Use 160 characters or fewer.');
    if (!/^[a-z0-9&,\-\s]+$/i.test(value)) addValidationError(errors, field, 'Use only letters, numbers, spaces, comma, hyphen, or ampersand.');
    const parts = splitKeywords(value);
    if (parts.length > 12) addValidationError(errors, field, 'Use no more than 12 keywords.');
    if (new Set(parts).size !== parts.length) addValidationError(errors, field, 'Remove duplicate keywords.');
  };
  const validateRewardForm = form => {
    const data = new FormData(form);
    const id = formValue(data, 'id');
    const name = formValue(data, 'name');
    const description = formValue(data, 'description');
    const type = formValue(data, 'type');
    const rewardLabel = formValue(data, 'rewardLabel');
    const couponCode = formValue(data, 'couponCode').toUpperCase();
    const freeProductTitle = formValue(data, 'freeProductTitle');
    const delivery = formValue(data, 'delivery');
    const requiredProducts = formValue(data, 'requiredProducts');
    const requiredCategories = formValue(data, 'requiredCategories');
    const usesCoupon = couponRewardTypes.includes(type);
    const usesValue = valueRewardTypes.includes(type);
    const usesGift = giftRewardTypes.includes(type);
    const numberFields = [
      ['minCartValue', 'Minimum cart value', 0, 1000000],
      ['minQuantity', 'Minimum quantity', 0, 999],
      ['minUniqueItems', 'Minimum different products', 0, 200],
      ['priority', 'Priority', 1, 9999]
    ];
    if (usesValue) numberFields.unshift(['discountValue', 'Discount/voucher value', 0, type === 'percentage_discount' ? 100 : 50000]);
    const errors = [];

    if (name.length < 3) addValidationError(errors, 'name', 'Enter at least 3 characters.');
    if (name.length > 80) addValidationError(errors, 'name', 'Use 80 characters or fewer.');
    if (!/^[a-z0-9₹%&().,\-'\s]+$/i.test(name)) addValidationError(errors, 'name', 'Use a clear reward name without special symbols.');
    if (description.length > 240) addValidationError(errors, 'description', 'Use 240 characters or fewer.');
    if (!permittedRewardTypes.includes(type)) addValidationError(errors, 'type', 'Choose a valid reward type.');
    if (rewardLabel.length < 2) addValidationError(errors, 'rewardLabel', 'Enter a reward label.');
    if (rewardLabel.length > 60) addValidationError(errors, 'rewardLabel', 'Use 60 characters or fewer.');
    if (delivery.length < 3) addValidationError(errors, 'delivery', 'Enter delivery text.');
    if (delivery.length > 60) addValidationError(errors, 'delivery', 'Use 60 characters or fewer.');

    numberFields.forEach(([field, label, min, max]) => {
      const value = formValue(data, field);
      if (!isIntegerString(value)) {
        addValidationError(errors, field, `${label} must be a whole number.`);
        return;
      }
      const numeric = Number(value);
      if (numeric < min || numeric > max) addValidationError(errors, field, `${label} must be between ${min} and ${max}.`);
    });

    if (usesValue && Number(formValue(data, 'discountValue')) <= 0) {
      addValidationError(errors, 'discountValue', 'Enter a discount or voucher value greater than 0.');
    }
    if (usesCoupon) {
      if (!couponCode) addValidationError(errors, 'couponCode', 'Enter a coupon code.');
      if (couponCode && !/^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(couponCode)) addValidationError(errors, 'couponCode', 'Use 3-24 uppercase letters, numbers, hyphen, or underscore.');
    }
    if (usesGift) {
      if (freeProductTitle.length < 3) addValidationError(errors, 'freeProductTitle', 'Enter the free product or gift name.');
      if (freeProductTitle.length > 80) addValidationError(errors, 'freeProductTitle', 'Use 80 characters or fewer.');
    }

    const minCartValue = Number(formValue(data, 'minCartValue'));
    const minQuantity = Number(formValue(data, 'minQuantity'));
    const minUniqueItems = Number(formValue(data, 'minUniqueItems'));
    const hasKeywordRules = Boolean(requiredProducts || requiredCategories || data.has('bundleOnly'));
    if (!minCartValue && !minQuantity && !minUniqueItems && !hasKeywordRules) {
      addValidationError(errors, 'minQuantity', 'Add at least one eligibility rule: cart value, quantity, products, keywords, or bundle requirement.');
    }

    validateKeywords(errors, 'requiredProducts', requiredProducts);
    validateKeywords(errors, 'requiredCategories', requiredCategories);

    const startAt = formValue(data, 'startAt');
    const endAt = formValue(data, 'endAt');
    const startMs = startAt ? new Date(startAt).getTime() : 0;
    const endMs = endAt ? new Date(endAt).getTime() : 0;
    if (startAt && Number.isNaN(startMs)) addValidationError(errors, 'startAt', 'Enter a valid start date.');
    if (endAt && Number.isNaN(endMs)) addValidationError(errors, 'endAt', 'Enter a valid end date.');
    if (startAt && endAt && !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
      addValidationError(errors, 'endAt', 'End date must be after start date.');
    }

    const configs = loadRewardConfigs();
    if (configs.some(item => item.id !== id && item.name.trim().toLowerCase() === name.toLowerCase())) {
      addValidationError(errors, 'name', 'A reward with this name already exists.');
    }
    if (usesCoupon && couponCode && configs.some(item => item.id !== id && String(item.couponCode || '').trim().toUpperCase() === couponCode)) {
      addValidationError(errors, 'couponCode', 'This coupon code is already used by another reward.');
    }

    return errors;
  };
  const showRewardFormErrors = (form, errors) => {
    form.querySelectorAll('[data-field-error]').forEach(node => {
      node.textContent = '';
      node.closest('label')?.classList.remove('has-error');
    });
    const summary = form.querySelector('[data-admin-form-errors]');
    if (!errors.length) {
      if (summary) {
        summary.hidden = true;
        summary.innerHTML = '';
      }
      return;
    }
    const grouped = new Map();
    errors.forEach(error => {
      if (!grouped.has(error.field)) grouped.set(error.field, []);
      grouped.get(error.field).push(error.message);
    });
    grouped.forEach((messages, field) => {
      const target = form.querySelector(`[data-field-error="${field}"]`);
      if (target) {
        target.textContent = messages[0];
        target.closest('label')?.classList.add('has-error');
      }
    });
    if (summary) {
      summary.hidden = false;
      summary.innerHTML = `<strong>Please fix ${errors.length} ${errors.length === 1 ? 'issue' : 'issues'} before saving.</strong><ul>${errors.slice(0, 6).map(error => `<li>${escape(error.message)}</li>`).join('')}</ul>`;
    }
    const first = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    first?.focus();
  };
  const updateRewardFormVisibility = form => {
    if (!form) return;
    const type = formValue(new FormData(form), 'type');
    const showCoupon = couponRewardTypes.includes(type);
    const showValue = valueRewardTypes.includes(type);
    const showGift = giftRewardTypes.includes(type);
    const valueHelp = form.querySelector('[data-value-help]');
    const rules = {
      coupon: showCoupon,
      value: showValue,
      gift: showGift,
      eligibility: true,
      settings: true,
      schedule: true
    };
    Object.entries(rules).forEach(([group, visible]) => {
      form.querySelectorAll(`[data-reward-field="${group}"]`).forEach(label => {
        label.hidden = !visible;
        label.querySelectorAll('input, select, textarea').forEach(input => {
          input.disabled = !visible;
          if (!visible) input.required = false;
        });
      });
    });
    const requiredFields = {
      couponCode: showCoupon,
      discountValue: showValue,
      freeProductTitle: showGift
    };
    Object.entries(requiredFields).forEach(([name, required]) => {
      const input = form.elements[name];
      if (input) input.required = required;
    });
    ['name', 'rewardLabel', 'delivery', 'priority', 'minCartValue', 'minQuantity', 'minUniqueItems'].forEach(name => {
      const input = form.elements[name];
      if (input) input.disabled = false;
    });
    if (form.elements.name) form.elements.name.required = true;
    if (form.elements.rewardLabel) form.elements.rewardLabel.required = true;
    if (form.elements.delivery) form.elements.delivery.required = true;
    if (form.elements.priority) form.elements.priority.required = true;
    if (valueHelp) valueHelp.textContent = type === 'percentage_discount'
      ? 'Enter a percentage from 1 to 100.'
      : 'Enter rupees for fixed discounts or gift vouchers.';
    showRewardFormErrors(form, []);
  };
  const renderRewardAdminRows = configs => {
    if (!configs.length) {
      return `<div class="oak-admin-empty">
        <h3>No rewards configured</h3>
        <p>The cart will not show configured reward progress until an administrator creates a reward or explicitly restores defaults.</p>
      </div>`;
    }
    return configs.map(reward => {
    const scheduled = reward.startAt || reward.endAt
      ? `${reward.startAt ? `Starts ${new Date(reward.startAt).toLocaleString('en-IN')}` : 'Starts now'}${reward.endAt ? ` · Ends ${new Date(reward.endAt).toLocaleString('en-IN')}` : ''}`
      : 'No schedule limit';
    return `<article class="oak-admin-card" data-reward-id="${escape(reward.id)}">
      <div>
        <h3>${escape(reward.name)} ${reward.active ? '<span>Active</span>' : '<em>Inactive</em>'}</h3>
        <p>${escape(reward.description || reward.rewardLabel)}</p>
        <small>${escape(reward.type.replace(/_/g, ' '))} · ${escape(rewardAmountText(reward))} · Priority ${escape(reward.priority)}</small>
        <small>${escape(scheduled)}</small>
        <small>Eligibility: ${escape(rewardRequirementText(reward))}</small>
      </div>
      <div class="oak-admin-card__actions">
        <button type="button" data-admin-edit="${escape(reward.id)}">Edit</button>
        <button type="button" data-admin-toggle="${escape(reward.id)}">${reward.active ? 'Deactivate' : 'Activate'}</button>
        <button type="button" data-admin-delete="${escape(reward.id)}">Delete</button>
      </div>
    </article>`;
    }).join('');
  };
  const renderRewardAdminPage = () => {
    const main = document.querySelector('main') || document.body;
    const configs = loadRewardConfigs();
    main.innerHTML = `
      <section class="oak-admin-page">
        <div class="oak-admin-hero">
          <p>Oak & Lily admin</p>
          <h1>Reward management</h1>
          <span>Frontend-only controls for cart progress, coupons, gifts, vouchers, bundles, and scheduled campaigns.</span>
        </div>
        <div class="oak-admin-grid">
          <div class="oak-admin-panel">
            <h2 data-admin-form-title>Create reward</h2>
            <div data-admin-form-wrap>${rewardFormHtml(null)}</div>
          </div>
          <div class="oak-admin-panel">
            <div class="oak-admin-list-head">
              <h2>Configured rewards</h2>
              <div>
                <button type="button" data-admin-seed-defaults>Restore defaults</button>
                <button type="button" data-admin-export>Export JSON</button>
              </div>
            </div>
            <div class="oak-admin-list" data-admin-list>${renderRewardAdminRows(configs)}</div>
            <textarea class="oak-admin-export" data-admin-export-box readonly hidden></textarea>
          </div>
        </div>
      </section>`;
    const refresh = (editReward = null) => {
      const fresh = loadRewardConfigs();
      const list = main.querySelector('[data-admin-list]');
      const wrap = main.querySelector('[data-admin-form-wrap]');
      const title = main.querySelector('[data-admin-form-title]');
      if (list) list.innerHTML = renderRewardAdminRows(fresh);
      if (wrap) wrap.innerHTML = rewardFormHtml(editReward);
      if (title) title.textContent = editReward ? 'Edit reward' : 'Create reward';
      updateRewardFormVisibility(wrap?.querySelector('[data-reward-admin-form]'));
    };
    updateRewardFormVisibility(main.querySelector('[data-reward-admin-form]'));
    main.addEventListener('submit', event => {
      const form = event.target.closest('[data-reward-admin-form]');
      if (!form) return;
      event.preventDefault();
      const errors = validateRewardForm(form);
      showRewardFormErrors(form, errors);
      if (errors.length) return;
      const reward = rewardFromForm(form);
      const configs = loadRewardConfigs().filter(item => item.id !== reward.id);
      configs.push(reward);
      saveRewardConfigs(configs.sort((a, b) => a.priority - b.priority));
      refresh();
    });
    main.addEventListener('click', event => {
      const edit = event.target.closest('[data-admin-edit]');
      const toggle = event.target.closest('[data-admin-toggle]');
      const del = event.target.closest('[data-admin-delete]');
      if (edit) {
        const reward = loadRewardConfigs().find(item => item.id === edit.dataset.adminEdit);
        refresh(reward);
      }
      if (toggle) {
        const configs = loadRewardConfigs().map(item => item.id === toggle.dataset.adminToggle ? { ...item, active: !item.active } : item);
        saveRewardConfigs(configs);
        refresh();
      }
      if (del) {
        const configs = loadRewardConfigs().filter(item => item.id !== del.dataset.adminDelete);
        saveRewardConfigs(configs);
        refresh();
      }
      if (event.target.closest('[data-admin-clear-form]')) refresh();
      if (event.target.closest('[data-admin-seed-defaults]')) {
        saveRewardConfigs(defaultRewardConfigs.map(cloneReward));
        refresh();
      }
      if (event.target.closest('[data-admin-export]')) {
        const box = main.querySelector('[data-admin-export-box]');
        if (box) {
          box.hidden = !box.hidden;
          box.value = JSON.stringify(loadRewardConfigs(), null, 2);
        }
      }
    });
    main.addEventListener('change', event => {
      const form = event.target.closest('[data-reward-admin-form]');
      if (!form) return;
      if (event.target.matches('[name="type"]')) updateRewardFormVisibility(form);
    });
  };
  const mountAdminShortcut = () => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    if (path !== '/') return;
    const icons = document.querySelector('.header__icons');
    const cartIcon = document.querySelector('#cart-icon-bubble');
    if (!icons || document.querySelector('[data-admin-rewards-link]')) return;
    const link = document.createElement('a');
    link.href = '/admin/rewards/';
    link.className = 'header__icon oak-admin-shortcut link focus-inset';
    link.setAttribute('data-admin-rewards-link', '');
    link.setAttribute('aria-label', 'Open rewards admin');
    link.title = 'Rewards admin';
    link.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3.4 14.2 8l5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.7l5-.7L12 3.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12 9.2v3.2l2.4 1.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="visually-hidden">Rewards admin</span>`;
    if (cartIcon?.parentNode === icons) icons.insertBefore(link, cartIcon);
    else icons.append(link);
  };

  const start = async () => {
    renderCart();
    initBuyNow();
    mountAdminShortcut();
    if (location.pathname.replace(/\/$/, '') === '/admin/rewards') {
      renderRewardAdminPage();
      return;
    }
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

    if (location.pathname.replace(/\/$/, '') === '/cart') {
      let attempts = 0;
      const openCartRoute = () => {
        const routeDrawer = document.querySelector('cart-drawer');
        if (routeDrawer?.open) routeDrawer.open();
        else if (attempts++ < 20) setTimeout(openCartRoute, 100);
      };
      openCartRoute();
    }
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
