import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { load } from 'cheerio';

// The storefront is served directly from public; no compilation is required.
for (const file of ['server.mjs', 'public/replica.js', 'public/bundle.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
const catalog = JSON.parse(await readFile('public/catalog.json', 'utf8'));
assert.ok(Array.isArray(catalog) && catalog.length > 0, 'Catalog must contain products');
const $ = load(await readFile('public/bundle/index.html', 'utf8'));
assert.equal($('[data-oak-bundle]').length, 1, 'Bundle builder must be present');
const cards = $('[data-product]').toArray();
assert.ok(cards.length > 0, 'Bundle builder must contain products');
for (const card of cards) {
  const product = JSON.parse($(card).find('script').text());
  assert.ok(product.variants.length > 0, `${product.handle}: missing variants`);
  for (const variant of product.variants) {
    assert.ok(Number.isSafeInteger(variant.id), 'Variant ID must be an integer');
    assert.ok(Number.isSafeInteger(variant.price) && variant.price >= 0, 'Price must be integer paise');
  }
}
for (const file of ['public/index.html', 'public/bundle.css', 'public/replica.css']) await access(file);
console.log(`PASS: JavaScript syntax, catalog, and ${cards.length} bundle product records`);
