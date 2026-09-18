import fs from 'node:fs/promises';import {load} from 'cheerio';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const banner=`<section class="oak-bundle-banner"><h2>BUILD YOUR OWN BUNDLE</h2><p>Pick your favourite Oak &amp; Lily products and save more when you bundle.</p><p>BUY 2 → SAVE 10% &nbsp; | &nbsp; BUY 3 → SAVE 15%</p><a class="button" href="/bundle">BUILD YOUR BUNDLE</a></section>`;
const shell = (cards, filters = '') => `
<section class="oak-bundle page-width" data-oak-bundle data-currency="INR">
  <div class="oak-bundle-heading">
    <h1>BUILD YOUR BUNDLE</h1>
    <p>Your favourites, better together. Choose 2 and save 10%, or 3 or more and save 15%.</p>
  </div>
  <div class="oak-bundle-layout">
    <div class="oak-bundle-shopping" id="bundle-products">
      <div class="oak-bundle-toolbar">
        <div><h2>Choose your favourites</h2><p>Mix and match Oak &amp; Lily essentials.</p></div>
        ${filters}
      </div>
      <div class="oak-bundle-grid">${cards}</div>
    </div>
    <aside class="oak-bundle-summary" id="your-bundle" aria-labelledby="oak-bundle-summary-title">
      <div class="oak-bundle-panel-heading">
        <div><h2 id="oak-bundle-summary-title">YOUR BUNDLE</h2><p>Review your bundle</p></div>
        <span class="oak-bundle-count" data-unit-count>0 items</span>
      </div>
      <div class="oak-bundle-empty" data-empty>
        <p>Add products to your bundle to get started.</p>
      </div>
      <div class="oak-bundle-progress" aria-label="Bundle discount progress">
        <div class="oak-bundle-tiers">
          <div class="oak-bundle-tier" data-milestone="2"><span>2 PACK</span><strong>Save 10%</strong><span class="oak-bundle-tier-state" data-tier-state="2">Add 2 items</span></div>
          <div class="oak-bundle-tier" data-milestone="3"><span>3 PACK</span><strong>Save 15%</strong><span class="oak-bundle-tier-state" data-tier-state="3">Add 3 items</span></div>
        </div>
        <div class="oak-bundle-progress-track" role="progressbar" aria-label="Progress to 15% bundle savings" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0" data-progress><span></span><i class="oak-bundle-marker oak-bundle-marker-two"></i><i class="oak-bundle-marker oak-bundle-marker-three"></i></div>
        <p class="oak-bundle-progress-message" data-tier tabindex="-1" aria-live="polite">Add products to unlock your bundle</p>
      </div>
      <div class="oak-bundle-selected" data-selected aria-label="Selected products"></div>
      <div class="oak-bundle-panel-footer">
        <dl>
          <div><dt>Subtotal</dt><dd data-subtotal></dd></div>
          <div class="oak-bundle-savings"><dt>Bundle discount <span data-discount-rate></span></dt><dd data-discount></dd></div>
          <div class="oak-bundle-total"><dt>Bundle total</dt><dd data-total></dd></div>
        </dl>
        <button class="button" data-checkout disabled>ADD BUNDLE TO CART</button>
        <p class="oak-bundle-footnote">15% off on 3+ units. No bundle size limit.</p>
        <a class="oak-bundle-back" href="#bundle-products">Continue choosing products</a>
        <p class="oak-bundle-status" data-status role="status"></p>
      </div>
    </aside>
  </div>
  <a class="oak-bundle-jump" href="#your-bundle"><span><strong data-mobile-count>YOUR BUNDLE · 0 ITEMS</strong><span data-mobile-tier>Add 2 items to save 10%</span></span><span class="oak-bundle-jump-action">REVIEW BUNDLE <span aria-hidden="true">↑</span></span></a>
</section>`;
const catalog=JSON.parse(await fs.readFile('public/catalog.json','utf8')).filter(p=>p.variants?.length&&!p.url.endsWith('/gift-card')).map(p=>({...p,handle:p.url.split('/').pop()}));
const cats=[];for(const [label,handle]of [['Kitchen','kitchen-linens'],['Table','table-linens'],['Bed','bed-linens'],['Living','living-space'],['Gifts','gift-collections']]){try{const $=load(await fs.readFile(`public/collections/${handle}/index.html`,'utf8'));const urls=new Set($('a[href*="/products/"]').map((i,e)=>'/products/'+$(e).attr('href').split('/products/')[1].split('?')[0]).get());if(catalog.some(p=>urls.has(p.url)))cats.push({label,handle,urls});}catch{}}
const cards=catalog.map(p=>`<article class="oak-bundle-card" data-product="${p.handle}" data-categories="${cats.filter(c=>c.urls.has(p.url)).map(c=>c.handle)}"><a class="oak-bundle-product-image" href="${p.url}"><span class="oak-bundle-product-badge" data-product-badge hidden></span><img src="${esc(p.image)}" alt="${esc(p.title)}" width="400" height="400" loading="lazy"></a><h3><a href="${p.url}">${esc(p.title)}</a></h3><span data-price></span><select aria-label="${esc(p.title)} variant">${p.variants.map(v=>`<option value="${v.id}" ${!v.available?'disabled':''}>${esc(v.title==='Default Title'?'Standard':v.title)}${!v.available?' — unavailable':''}</option>`).join('')}</select><button class="button button--secondary" data-add>ADD TO BUNDLE</button><script type="application/json">${JSON.stringify(p).replace(/</g,'\\u003c')}</script></article>`).join('');
const filters=cats.length?`<label class="oak-bundle-filter">Shop by category <select data-filter><option value="">All</option>${cats.map(c=>`<option value="${c.handle}">${c.label}</option>`).join('')}</select></label>`:'';
async function visit(dir){for(const d of await fs.readdir(dir,{withFileTypes:true})){const file=dir+'/'+d.name;if(d.isDirectory())await visit(file);else if(d.name==='index.html'){const $=load(await fs.readFile(file,'utf8'));$('a[href="/pages/build-your-bundle"]').attr('href','/bundle');for(const id of ['HeaderMenu-gifts','HeaderDrawer-gifts']){const anchor=$('#'+id);if(anchor.length&&!$('#'+id+'-bundle').length)anchor.closest('li').after(`<li><a id="${id}-bundle" class="${esc(anchor.attr('class'))}" href="/bundle">BUILD YOUR BUNDLE</a></li>`);}if(file==='public/index.html'&&!$('.oak-bundle-banner').length){$('main').children().first().after(banner);$('head').append('<link rel="stylesheet" href="/bundle.css">');}await fs.writeFile(file,$.html());}}}
if (!process.argv.includes('--bundle-only')) await visit('public');const $=load(await fs.readFile('public/index.html','utf8'));$('main').html(shell(cards,filters));$('title').text('Build Your Bundle | Oak & Lily');$('header [aria-current]').removeAttr('aria-current');$('header .header__active-menu-item').removeClass('header__active-menu-item');$('header .menu-drawer__menu-item--active').removeClass('menu-drawer__menu-item--active');$('#HeaderMenu-gifts-bundle,#HeaderDrawer-gifts-bundle').attr('aria-current','page');$('link[rel=canonical]').attr('href','https://oakandlily.in/bundle');$('body').append('<script src="/bundle.js" defer></script>');await fs.mkdir('public/bundle',{recursive:true});await fs.writeFile('public/bundle/index.html',$.html());
