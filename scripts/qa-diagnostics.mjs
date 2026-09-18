import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext();

// Abort non-local requests to prevent hangs
await context.route(/^https?:\/\/(?!localhost)/, route => {
  route.abort();
});

const pagesToTest = [
  { name: 'home-desktop', url: 'http://localhost:5173/', width: 1440, height: 1000 },
  { name: 'home-mobile', url: 'http://localhost:5173/', width: 390, height: 844 },
  { name: 'collection', url: 'http://localhost:5173/collections/kitchen-napkins', width: 1440, height: 1000 },
  { name: 'product', url: 'http://localhost:5173/products/peach-pink-kitchen-napkins', width: 1440, height: 1000 },
  { name: 'story', url: 'http://localhost:5173/pages/our-story', width: 1440, height: 1000 },
  { name: 'blog-index', url: 'http://localhost:5173/blogs/news', width: 1440, height: 1000 },
  { name: 'blog-article', url: 'http://localhost:5173/blogs/news/kitchen-napkins', width: 1440, height: 1000 },
  { name: 'search', url: 'http://localhost:5173/search?q=peach', width: 1440, height: 1000 },
  { name: 'policies', url: 'http://localhost:5173/policies/refund-policy', width: 1440, height: 1000 }
];

const results = {};

for (const test of pagesToTest) {
  try {
    const page = await context.newPage();
    await page.setViewportSize({ width: test.width, height: test.height });
    
    const local404s = [];
    const consoleErrors = [];
    
    page.on('response', res => {
      if (res.status() >= 400 && res.url().includes('localhost')) {
        local404s.push({ url: res.url(), status: res.status() });
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(String(err));
    });

    await page.goto(test.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      document.querySelectorAll('video').forEach(v => {
        try { v.pause(); } catch {}
      });
      document.querySelectorAll('.scroll-trigger').forEach(e => {
        e.classList.remove('scroll-trigger--offscreen');
      });
    });

    // Take screenshot
    try {
      await page.screenshot({ path: `qa/diag-${test.name}.png`, fullPage: true, timeout: 15000 });
    } catch (e) {
      console.error(`Screenshot error on ${test.name}:`, e.message);
    }

    // Inspect page details
    const inspection = await page.evaluate(() => {
      const brokenImages = Array.from(document.querySelectorAll('img'))
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => ({ src: img.src, alt: img.alt, outer: img.outerHTML.slice(0, 150) }));

      const blueLinks = Array.from(document.querySelectorAll('a'))
        .filter(a => {
          const style = window.getComputedStyle(a);
          const color = style.color;
          return color.includes('0, 0, 238') || color.includes('0, 0, 255');
        })
        .map(a => ({ text: a.innerText.trim(), href: a.href, outer: a.outerHTML.slice(0, 150) }));

      const oversizedSvgs = Array.from(document.querySelectorAll('svg'))
        .filter(svg => {
          const rect = svg.getBoundingClientRect();
          return rect.width > 120 || rect.height > 120;
        })
        .map(svg => {
          const rect = svg.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            class: svg.className?.baseVal || svg.className,
            parent: svg.parentElement?.className,
            outer: svg.outerHTML.slice(0, 150)
          };
        });

      const bodyFont = window.getComputedStyle(document.body).fontFamily;
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');

      return {
        brokenImagesCount: brokenImages.length,
        brokenImages: brokenImages.slice(0, 5),
        blueLinksCount: blueLinks.length,
        blueLinks: blueLinks.slice(0, 10),
        oversizedSvgsCount: oversizedSvgs.length,
        oversizedSvgs,
        bodyFont,
        h1Font: h1 ? window.getComputedStyle(h1).fontFamily : null,
        h2Font: h2 ? window.getComputedStyle(h2).fontFamily : null
      };
    });

    results[test.name] = {
      local404s,
      consoleErrors,
      inspection
    };

    await page.close();
    console.log(`Finished ${test.name}`);
  } catch (err) {
    console.error(`Error processing ${test.name}:`, err.message);
    results[test.name] = { error: err.message };
  }
}

await fs.writeFile('qa/diag-results.json', JSON.stringify(results, null, 2));
console.log('Diagnostics completed successfully.');
await browser.close();
