import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.route(/facebook|clarity|google-analytics|googletagmanager|breeze.in|shopify-speed|aov-offer|standard-actions|web-pixels|trekkie|shopify-perf/, r => r.abort());
await page.goto('https://oakandlily.in/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
await page.locator('#kp-login-button-header-logo').click();
await page.waitForTimeout(3000);

const iframeElement = await page.$('#iframe-kp');
const frame = await iframeElement.contentFrame();

const info = await frame.evaluate(() => {
  function q(sel) {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel,
      tag: el.tagName,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      padding: s.padding,
      margin: s.margin,
      borderRadius: s.borderRadius,
      border: s.border,
      background: s.backgroundColor,
      color: s.color,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      boxShadow: s.boxShadow,
      display: s.display
    };
  }
  return {
    wrapper: q('#login-wrapper'),
    leftSection: q('.left-section'),
    rightSection: q('.login-form'),
    logo: q('.header-img'),
    tagline: q('.header-text'),
    card: q('.slider-container'),
    starImg: q('.star-icon-img'),
    slideText: q('.slide .text'),
    slideDesc: q('.slide .description'),
    circles: q('.circles'),
    dialCode: q('#states-button'),
    phoneInput: q('#phone-input'),
    submitBtn: q('#submit-button'),
    checkbox: q('#kp-marketing-checkbox'),
    checkboxLabel: q('.kp-checkbox-text'),
    readDetails: q('.kp-read-details-btn'),
    footer: q('footer'),
    poweredByImg: q('.poweredBy-section img'),
    closeBtn: q('#desktop_close_button'),
    images: Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src, alt: i.alt })),
    cssText: Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n').slice(0, 5000)
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
