import { chromium } from 'playwright';

async function testRegression() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Test 1: Collections page
  await page.goto('http://localhost:5173/collections/all', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const accountIconCollections = page.locator('.header__icon--account').first();
  await accountIconCollections.click();
  await page.waitForTimeout(300);
  const modalOpenCollections = await page.locator('#oak-login-modal-overlay').evaluate(el => el.classList.contains('active'));
  console.log('Modal opens on /collections/all:', modalOpenCollections);
  await page.keyboard.press('Escape');

  // Test 2: Search page
  await page.goto('http://localhost:5173/search?q=towel', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const accountIconSearch = page.locator('.header__icon--account').first();
  await accountIconSearch.click();
  await page.waitForTimeout(300);
  const modalOpenSearch = await page.locator('#oak-login-modal-overlay').evaluate(el => el.classList.contains('active'));
  console.log('Modal opens on /search:', modalOpenSearch);
  await page.keyboard.press('Escape');

  // Test 3: Cart drawer
  const cartIcon = page.locator('.header__icon--cart').first();
  await cartIcon.click();
  await page.waitForTimeout(400);
  const cartDrawerOpen = await page.locator('cart-drawer.active').count();
  console.log('Cart drawer works:', cartDrawerOpen > 0);

  await browser.close();
  console.log('Regression tests passed!');
}

testRegression().catch(err => {
  console.error(err);
  process.exit(1);
});
