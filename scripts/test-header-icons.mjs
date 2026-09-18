import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ args: ['--no-sandbox'] });

// Test desktop
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.fonts.ready);

  const desktopData = await page.evaluate(() => {
    function getDetails(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
      let svgData = null;
      if (svg) {
        const sr = svg.getBoundingClientRect();
        const ss = window.getComputedStyle(svg);
        svgData = {
          rect: { x: sr.x, y: sr.y, width: sr.width, height: sr.height },
          width: ss.width,
          height: ss.height,
          display: ss.display,
          color: ss.color
        };
      }
      return {
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        width: s.width,
        height: s.height,
        display: s.display,
        svg: svgData
      };
    }
    return {
      searchIcon: getDetails('.header__icon--search'),
      searchSvg: getDetails('.modal__toggle-open.icon-search'),
      account: getDetails('.header__icon--account'),
      accountSvg: getDetails('#svgkp'),
      cart: getDetails('.header__icon--cart'),
      cartSvg: getDetails('.icon-cart-empty')
    };
  });

  console.log('=== LOCAL DESKTOP ===');
  console.log(JSON.stringify(desktopData, null, 2));

  await page.screenshot({
    path: 'qa/test-local-desktop-header.png',
    clip: { x: 900, y: 0, width: 540, height: 160 }
  });
  await page.close();
}

// Test mobile
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.fonts.ready);

  const mobileData = await page.evaluate(() => {
    function getDetails(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
      let svgData = null;
      if (svg) {
        const sr = svg.getBoundingClientRect();
        const ss = window.getComputedStyle(svg);
        svgData = {
          rect: { x: sr.x, y: sr.y, width: sr.width, height: sr.height },
          width: ss.width,
          height: ss.height,
          display: ss.display,
          color: ss.color
        };
      }
      return {
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        width: s.width,
        height: s.height,
        display: s.display,
        svg: svgData
      };
    }
    return {
      searchIcon: getDetails('.header__icon--search'),
      searchSvg: getDetails('.modal__toggle-open.icon-search'),
      account: getDetails('.header__icon--account'),
      accountSvg: getDetails('#svgkp'),
      cart: getDetails('.header__icon--cart'),
      cartSvg: getDetails('.icon-cart-empty')
    };
  });

  console.log('=== LOCAL MOBILE ===');
  console.log(JSON.stringify(mobileData, null, 2));

  await page.screenshot({
    path: 'qa/test-local-mobile-header.png',
    clip: { x: 0, y: 0, width: 390, height: 120 }
  });
  await page.close();
}

await browser.close();
