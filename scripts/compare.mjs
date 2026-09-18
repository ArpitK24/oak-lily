import { chromium } from 'playwright';
import fs from 'node:fs/promises';

let records = {};
try {
  records = JSON.parse(await fs.readFile('qa/comparison.json', 'utf8'));
} catch {}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext();
await context.route(/^https?:\/\/(?!localhost)/, route => route.abort());

const page = await context.newPage();
for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
  await page.setViewportSize({ width, height });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: '.banner-slider{transform:translateX(0)!important;transition:none!important}.scroll-trigger{opacity:1!important;transform:none!important}.announcement-bar__message{opacity:1!important}'
  });
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach(v => {
      try { v.pause(); v.currentTime = 0; } catch {}
    });
    if (window.jQuery) {
      try {
        window.jQuery('.slick-initialized').slick('slickPause').slick('slickGoTo', 0, true);
      } catch {}
    }
  });
  await page.screenshot({ path: `qa/local-${name}-final.png`, fullPage: true, timeout: 30000 });
  records['local-' + name] = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    sections: [...document.querySelectorAll('main > *')].map(e => ({
      id: e.id,
      height: Math.round(e.getBoundingClientRect().height),
      top: Math.round(e.getBoundingClientRect().top)
    })),
    header: document.querySelector('header').getBoundingClientRect().toJSON()
  }));
}

await context.close();
await fs.writeFile('qa/comparison.json', JSON.stringify(records, null, 2));
console.log('Comparison records updated:', records);
await browser.close();
