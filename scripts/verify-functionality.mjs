import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

// Check Search opens modal
await page.locator('.header__icon--search').click();
await page.waitForTimeout(300);
const searchOpen = await page.evaluate(() => {
  const modal = document.querySelector('details-modal.header__search details');
  return modal && modal.hasAttribute('open');
});

// Close modal
await page.locator('.search-modal__close-button').click();
await page.waitForTimeout(300);

// Check Cart opens drawer
await page.locator('#cart-icon-bubble').click();
await page.waitForTimeout(500);
const cartOpen = await page.evaluate(() => {
  const drawer = document.querySelector('cart-drawer');
  return drawer && drawer.classList.contains('active');
});

// Close cart drawer
await page.evaluate(() => {
  document.querySelector('cart-drawer')?.close();
});
await page.waitForTimeout(300);

// Check Account href
const accountHref = await page.locator('.header__icon--account').getAttribute('href');

// Check header dimensions and logo dimensions
const headerInfo = await page.evaluate(() => {
  const header = document.querySelector('header');
  const logo = document.querySelector('.header__heading');
  const nav = document.querySelector('.header__inline-menu');
  const hr = header.getBoundingClientRect();
  const lr = logo.getBoundingClientRect();
  const nr = nav.getBoundingClientRect();
  return {
    headerHeight: hr.height,
    logoRect: { width: lr.width, height: lr.height },
    navRect: { width: nr.width, height: nr.height }
  };
});

console.log({
  searchOpen,
  cartOpen,
  accountHref,
  headerInfo
});

await browser.close();
