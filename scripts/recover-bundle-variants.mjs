// Add only missing variant records from product pages already captured locally.
import fs from 'node:fs/promises';
import { load } from 'cheerio';
const file = 'public/catalog.json';
const catalog = JSON.parse(await fs.readFile(file, 'utf8'));
let added = 0;
for (const product of catalog) {
  let html;
  try { html = await fs.readFile(`public${product.url}/index.html`, 'utf8'); } catch { continue; }
  const $ = load(html);
  $('script[type="application/ld+json"]').each((_, element) => {
    let data;
    try { data = JSON.parse($(element).text()); } catch { return; }
    if (!['Product', 'ProductGroup'].includes(data['@type'])) return;
    for (const item of data.hasVariant || [data]) {
      const id = Number(new URL(item.offers?.url || item['@id'] || product.url, 'https://oakandlily.in').searchParams.get('variant'));
      const price = Math.round(Number(item.offers?.price) * 100);
      if (!id || !Number.isSafeInteger(price) || price <= 0 || product.variants.some(v => String(v.id) === String(id))) continue;
      const title = item.name.startsWith(data.name + ' - ') ? item.name.slice(data.name.length + 3) : 'Default Title';
      product.variants.push({ id, title, price, available: /\/InStock$/.test(item.offers?.availability || ''), options: title.split(' / ') });
      added++;
    }
  });
}
if (added) await fs.writeFile(file, JSON.stringify(catalog));
console.log(`Recovered ${added} missing variants from existing local product pages.`);
