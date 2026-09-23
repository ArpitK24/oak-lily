import { chromium } from 'playwright';

async function captureMobileSummary() {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:5173/bundle', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Add 3 items
  const cards = page.locator('.oak-bundle-card:not([hidden])');
  await cards.nth(0).locator('[data-add]').click();
  await page.waitForTimeout(200);
  await cards.nth(1).locator('[data-add]').click();
  await page.waitForTimeout(200);
  await cards.nth(2).locator('[data-add]').click();
  await page.waitForTimeout(300);

  // Click jump to review bundle
  await page.locator('.oak-bundle-jump').click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'qa/bundle-premium-390-review.png' });
  console.log('Saved qa/bundle-premium-390-review.png');

  await browser.close();
}

captureMobileSummary().catch(console.error);
