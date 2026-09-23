import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve('public');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let requested = decodeURIComponent(url.pathname);

    if (requested.startsWith('/collections/') && requested.includes('/products/')) {
      requested = requested.slice(requested.indexOf('/products/'));
    }

    if (requested === '/recommendations/products') {
      try {
        const catalogData = JSON.parse(await fs.readFile(path.join(root, 'catalog.json'), 'utf8'));
        const pid = url.searchParams.get('product_id');
        const limit = Number(url.searchParams.get('limit') || 4);
        const sectionId = url.searchParams.get('section_id') || 'template--related-products';
        const items = catalogData.filter(p => !p.variants?.some(v => String(v.id) === pid)).slice(0, limit);
        const money = n => '₹ ' + (n / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const getPrice = p => {
          if (p.variants && p.variants.length > 0 && p.variants[0].price) return p.variants[0].price;
          if (p.price) {
            const n = typeof p.price === 'number' ? p.price : parseFloat(p.price);
            return Math.round(n * 100);
          }
          return 0;
        };
        const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const cardsHtml = items.map(p => `
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
          </li>
        `).join('');

        const html = `<div id="shopify-section-${sectionId}" class="shopify-section section"><product-recommendations class="related-products page-width isolate scroll-trigger animate--slide-in product-recommendations--loaded" data-url="/recommendations/products?limit=${limit}" data-section-id="${sectionId}"><h2 class="related-products__heading inline-richtext h2">You may also like</h2><ul class="grid product-grid grid--2-col-tablet-down grid--4-col-desktop" role="list">${cardsHtml}</ul></product-recommendations></div>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        return res.end(html);
      } catch (err) {
        res.writeHead(500);
        return res.end(err.message);
      }
    }

    let file = path.resolve(root, '.' + requested);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      return res.end();
    }

    let stat;
    try {
      stat = await fs.stat(file);
    } catch {}

    if (stat?.isDirectory()) file = path.join(file, 'index.html');
    if (!stat) {
      if (requested === '/admin/rewards' || requested === '/admin/rewards/') {
        file = path.join(root, 'index.html');
      } else if (requested === '/search') {
        file = path.join(root, 'search/index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        return res.end('<!doctype html><title>Page not found</title><p>This page is not included in the replica.</p><a href="/">Continue shopping</a>');
      }
    }

    let data = await fs.readFile(file);

    if (requested.startsWith('/collections/') && url.search) {
      const $ = load(data.toString());
      const grid = $('#product-grid');
      const cards = grid.children('li').toArray();
      const price = e => Number($(e).find('.price__regular .price-item').first().text().replace(/[^0-9.]/g, ''));
      const title = e => $(e).find('.card__heading').first().text().trim();
      const min = Number(url.searchParams.get('filter.v.price.gte') || 0);
      const max = Number(url.searchParams.get('filter.v.price.lte') || Infinity);
      let filtered = cards.filter(e => price(e) >= min && price(e) <= max);
      const sort = url.searchParams.get('sort_by');
      if (sort === 'price-ascending') filtered.sort((a, b) => price(a) - price(b));
      if (sort === 'price-descending') filtered.sort((a, b) => price(b) - price(a));
      if (sort === 'title-ascending') filtered.sort((a, b) => title(a).localeCompare(title(b)));
      if (sort === 'title-descending') filtered.sort((a, b) => title(b).localeCompare(title(a)));
      grid.empty().append(filtered);
      data = Buffer.from($.html());
    }

    const headers = {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    };

    if (req.headers.range) {
      const [a, b] = req.headers.range.replace('bytes=', '').split('-');
      const start = Number(a), end = b ? Number(b) : data.length - 1;
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${data.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1
      });
      return res.end(data.subarray(start, end + 1));
    }

    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 5173;
server.listen(PORT, '0.0.0.0', () => console.log('Oak & Lily replica: http://localhost:' + PORT));
