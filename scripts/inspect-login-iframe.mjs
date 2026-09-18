import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.route(/facebook|clarity|google-analytics|googletagmanager|breeze.in|shopify-speed|aov-offer|standard-actions|web-pixels|trekkie|shopify-perf/, r => r.abort());
await page.goto('https://oakandlily.in/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

console.log('Clicking login button...');
await page.locator('#kp-login-button-header-logo').click();
await page.waitForTimeout(4000);

const iframeElement = await page.$('#iframe-kp');
const frame = await iframeElement.contentFrame();

const iframeHtml = await frame.content();
fs.writeFileSync('qa/login-modal-frame.html', iframeHtml);

const details = await frame.evaluate(() => {
  function getStyle(el) {
    if (!el) return null;
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      class: el.className,
      id: el.id,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      width: s.width,
      height: s.height,
      padding: s.padding,
      margin: s.margin,
      background: s.background,
      backgroundColor: s.backgroundColor,
      borderRadius: s.borderRadius,
      boxShadow: s.boxShadow,
      color: s.color,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      display: s.display,
      flexDirection: s.flexDirection,
      alignItems: s.alignItems,
      justifyContent: s.justifyContent
    };
  }

  const modal = document.querySelector('[class*=\"modal\"], [class*=\"container\"], [class*=\"card\"], [class*=\"popup\"], [id*=\"modal\"]') || document.body.firstElementChild;
  const allElements = Array.from(document.querySelectorAll('*')).slice(0, 50).map(el => ({
    tag: el.tagName,
    class: el.className,
    id: el.id,
    rect: el.getBoundingClientRect(),
    computed: {
      width: window.getComputedStyle(el).width,
      height: window.getComputedStyle(el).height,
      color: window.getComputedStyle(el).color,
      background: window.getComputedStyle(el).backgroundColor,
      fontSize: window.getComputedStyle(el).fontSize,
      fontWeight: window.getComputedStyle(el).fontWeight,
      fontFamily: window.getComputedStyle(el).fontFamily
    }
  }));

  return {
    title: document.title,
    bodyStyle: getStyle(document.body),
    allElements: allElements.filter(e => e.rect.width > 0 && e.rect.height > 0)
  };
});

fs.writeFileSync('qa/login-modal-details.json', JSON.stringify(details, null, 2));
console.log('Iframe inspection written to qa/login-modal-frame.html and qa/login-modal-details.json');

// Now check mobile view
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'qa/live-login-modal-mobile.png' });
console.log('Mobile screenshot captured to qa/live-login-modal-mobile.png');

await browser.close();
