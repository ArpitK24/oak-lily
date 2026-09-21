import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto('http://localhost:5173/bundle', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Empty state screenshot
    await page.screenshot({ path: `qa/bundle-premium-${width}-0-items.png`, fullPage: false });
    console.log(`Captured qa/bundle-premium-${width}-0-items.png`);

    // Add 3 products
    const cards = page.locator('.oak-bundle-card:not([hidden])');
    await cards.nth(0).locator('[data-add]').click();
    await page.waitForTimeout(300);
    await cards.nth(1).locator('[data-add]').click();
    await page.waitForTimeout(300);
    await cards.nth(2).locator('[data-add]').click();
    await page.waitForTimeout(500);

    // Selected state screenshot
    await page.screenshot({ path: `qa/bundle-premium-${width}-3-items.png`, fullPage: false });
    console.log(`Captured qa/bundle-premium-${width}-3-items.png`);

    await page.close();
  }

  await browser.close();
  console.log('Capture complete!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
